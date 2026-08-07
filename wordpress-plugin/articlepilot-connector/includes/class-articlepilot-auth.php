<?php
/**
 * HMAC request authentication.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_Auth
 *
 * Verifies signed requests from the ArticlePilot SaaS. Every endpoint except
 * `/pair` is protected by this scheme.
 *
 * Required request headers:
 *   - X-ArticlePilot-Key       : the connection / site id.
 *   - X-ArticlePilot-Timestamp : unix seconds. Rejected if skew > 300s.
 *   - X-ArticlePilot-Nonce     : random string, single use (replay protection).
 *   - X-ArticlePilot-Signature : lowercase hex HMAC-SHA256 of the canonical
 *                                string, keyed with the per-connection secret.
 *
 * Canonical string (LF `\n` separated, no trailing newline):
 *   METHOD\nROUTE\nTIMESTAMP\nNONCE\nSHA256_HEX(body)
 *
 * Where:
 *   METHOD          upper-case HTTP verb (GET, POST, PUT, PATCH, DELETE).
 *   ROUTE           the REST route path including namespace, e.g.
 *                   "/articlepilot/v1/posts". No host, no query string.
 *   TIMESTAMP       the exact value of X-ArticlePilot-Timestamp.
 *   NONCE           the exact value of X-ArticlePilot-Nonce.
 *   SHA256_HEX(body) lowercase hex sha256 of the raw request body bytes; for an
 *                   empty body this is the sha256 of the empty string.
 */
class ArticlePilot_Auth {

	/**
	 * Header names.
	 */
	const HEADER_KEY       = 'X-ArticlePilot-Key';
	const HEADER_TIMESTAMP = 'X-ArticlePilot-Timestamp';
	const HEADER_NONCE     = 'X-ArticlePilot-Nonce';
	const HEADER_SIGNATURE = 'X-ArticlePilot-Signature';

	/**
	 * Maximum allowed clock skew in seconds.
	 */
	const MAX_SKEW = 300;

	/**
	 * Transient prefix used to remember seen nonces (replay protection).
	 */
	const NONCE_PREFIX = 'articlepilot_nonce_';

	/**
	 * Option key holding the active connection record.
	 */
	const CONNECTION_OPTION = 'articlepilot_connection';

	/**
	 * The connection record verified during the last successful auth.
	 *
	 * @var array|null
	 */
	protected $verified_connection = null;

	/**
	 * Permission callback for protected REST routes.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return true|WP_Error
	 */
	public function authenticate( WP_REST_Request $request ) {
		// Enforce HTTPS in production.
		$https_check = $this->require_https( $request );
		if ( is_wp_error( $https_check ) ) {
			return $https_check;
		}

		$connection = $this->get_connection();
		if ( null === $connection ) {
			return new WP_Error(
				'articlepilot_not_paired',
				__( 'This site is not paired with ArticlePilot.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		$key       = $request->get_header( self::HEADER_KEY );
		$timestamp = $request->get_header( self::HEADER_TIMESTAMP );
		$nonce     = $request->get_header( self::HEADER_NONCE );
		$signature = $request->get_header( self::HEADER_SIGNATURE );

		if ( empty( $key ) || empty( $timestamp ) || empty( $nonce ) || empty( $signature ) ) {
			return new WP_Error(
				'articlepilot_missing_auth',
				__( 'Missing authentication headers.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		// The key must match the paired connection id.
		if ( ! hash_equals( (string) $connection['connection_id'], (string) $key ) ) {
			return new WP_Error(
				'articlepilot_unknown_key',
				__( 'Unknown connection key.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		// Timestamp / replay window.
		if ( ! ctype_digit( (string) $timestamp ) ) {
			return new WP_Error(
				'articlepilot_bad_timestamp',
				__( 'Invalid timestamp.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}
		$skew = abs( time() - (int) $timestamp );
		if ( $skew > self::MAX_SKEW ) {
			return new WP_Error(
				'articlepilot_stale_request',
				__( 'Request timestamp is outside the allowed window.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		// Replay protection: reject reused nonces.
		if ( $this->is_nonce_seen( $nonce ) ) {
			return new WP_Error(
				'articlepilot_replay',
				__( 'Nonce has already been used.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		// Recompute the signature.
		$expected = $this->compute_signature(
			$request->get_method(),
			$this->canonical_route( $request ),
			$timestamp,
			$nonce,
			$request->get_body(),
			$connection['secret']
		);

		if ( ! hash_equals( $expected, strtolower( (string) $signature ) ) ) {
			return new WP_Error(
				'articlepilot_bad_signature',
				__( 'Request signature verification failed.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		// Signature is valid: remember the nonce so it cannot be replayed.
		$this->remember_nonce( $nonce );

		$this->verified_connection = $connection;

		return true;
	}

	/**
	 * Build the canonical route string used in the signature.
	 *
	 * Always a leading-slash path including the REST namespace, e.g.
	 * "/articlepilot/v1/posts". No host, no query args.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return string
	 */
	public function canonical_route( WP_REST_Request $request ) {
		$route = $request->get_route();
		if ( '' === $route || '/' !== $route[0] ) {
			$route = '/' . ltrim( $route, '/' );
		}
		return $route;
	}

	/**
	 * Compute the HMAC-SHA256 signature (lowercase hex) for a request.
	 *
	 * @param string $method    HTTP method.
	 * @param string $route     Canonical route (with leading slash + namespace).
	 * @param string $timestamp Unix timestamp header value.
	 * @param string $nonce     Nonce header value.
	 * @param string $body      Raw request body.
	 * @param string $secret    Per-connection shared secret.
	 * @return string Lowercase hex signature.
	 */
	public function compute_signature( $method, $route, $timestamp, $nonce, $body, $secret ) {
		$body_hash = hash( 'sha256', (string) $body );
		$canonical = implode(
			"\n",
			array(
				strtoupper( $method ),
				$route,
				(string) $timestamp,
				(string) $nonce,
				$body_hash,
			)
		);
		return hash_hmac( 'sha256', $canonical, (string) $secret );
	}

	/**
	 * Retrieve the current connection record.
	 *
	 * @return array|null
	 */
	public function get_connection() {
		$connection = get_option( self::CONNECTION_OPTION );
		if ( ! is_array( $connection ) || empty( $connection['secret'] ) || empty( $connection['connection_id'] ) ) {
			return null;
		}
		return $connection;
	}

	/**
	 * The connection verified during the most recent successful auth.
	 *
	 * @return array|null
	 */
	public function get_verified_connection() {
		return $this->verified_connection;
	}

	/**
	 * Whether the site currently has an active connection.
	 *
	 * @return bool
	 */
	public function is_connected() {
		return null !== $this->get_connection();
	}

	/**
	 * Has this nonce been seen before?
	 *
	 * @param string $nonce Nonce value.
	 * @return bool
	 */
	protected function is_nonce_seen( $nonce ) {
		$transient = self::NONCE_PREFIX . md5( (string) $nonce );
		return false !== get_transient( $transient );
	}

	/**
	 * Remember a nonce for the length of the skew window (plus a margin).
	 *
	 * @param string $nonce Nonce value.
	 * @return void
	 */
	protected function remember_nonce( $nonce ) {
		$transient = self::NONCE_PREFIX . md5( (string) $nonce );
		// Keep a little longer than the skew window so an old timestamp can't
		// slip a replay through the edge of the window.
		set_transient( $transient, 1, self::MAX_SKEW * 2 );
	}

	/**
	 * Enforce HTTPS unless explicitly allowed.
	 *
	 * HTTP is only permitted when WP_DEBUG is on or the
	 * `articlepilot_allow_insecure` filter returns true.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	protected function require_https( WP_REST_Request $request ) {
		if ( is_ssl() ) {
			return true;
		}

		$allow_insecure = ( defined( 'WP_DEBUG' ) && WP_DEBUG );
		/**
		 * Filter whether insecure (HTTP) API requests are allowed.
		 *
		 * @param bool $allow_insecure Default: value of WP_DEBUG.
		 */
		$allow_insecure = (bool) apply_filters( 'articlepilot_allow_insecure', $allow_insecure );

		if ( $allow_insecure ) {
			return true;
		}

		return new WP_Error(
			'articlepilot_https_required',
			__( 'ArticlePilot requires HTTPS for API requests.', 'articlepilot-connector' ),
			array( 'status' => 400 )
		);
	}

	/**
	 * Create and persist a fresh connection record with a new shared secret.
	 *
	 * @param string $connection_id Stable connection / site id.
	 * @param array  $extra         Additional data to store (e.g. callback URL).
	 * @return array The stored connection record (including plaintext secret).
	 */
	public function create_connection( $connection_id, array $extra = array() ) {
		$secret = $this->generate_secret();

		$record = array_merge(
			array(
				'connection_id' => $connection_id,
				'secret'        => $secret,
				'created_at'    => time(),
				'rotated_at'    => time(),
			),
			$extra
		);

		update_option( self::CONNECTION_OPTION, $record, false );
		update_option( 'articlepilot_paired_at', time(), false );

		return $record;
	}

	/**
	 * Rotate the shared secret for the existing connection.
	 *
	 * @return array|WP_Error The updated record (with new secret) or error.
	 */
	public function rotate_secret() {
		$connection = $this->get_connection();
		if ( null === $connection ) {
			return new WP_Error(
				'articlepilot_not_paired',
				__( 'Cannot rotate secret: site is not paired.', 'articlepilot-connector' ),
				array( 'status' => 409 )
			);
		}

		$connection['secret']     = $this->generate_secret();
		$connection['rotated_at'] = time();

		update_option( self::CONNECTION_OPTION, $connection, false );

		return $connection;
	}

	/**
	 * Delete the connection (disconnect).
	 *
	 * @return void
	 */
	public function disconnect() {
		delete_option( self::CONNECTION_OPTION );
		delete_option( 'articlepilot_paired_at' );
	}

	/**
	 * Generate a cryptographically strong shared secret (64 hex chars = 32 bytes).
	 *
	 * @return string
	 */
	public function generate_secret() {
		try {
			return bin2hex( random_bytes( 32 ) );
		} catch ( Exception $e ) {
			// Fallback to WP's CSPRNG-backed generator.
			return hash( 'sha256', wp_generate_password( 64, true, true ) . microtime() );
		}
	}
}
