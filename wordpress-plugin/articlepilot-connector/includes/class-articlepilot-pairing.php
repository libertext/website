<?php
/**
 * Pairing token generation and validation.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_Pairing
 *
 * Handles the one-time pairing code used to establish a connection between this
 * WordPress site and the ArticlePilot SaaS platform.
 *
 * Pairing flow:
 *   1. Site owner clicks "Connect" in wp-admin. {@see generate_token()} creates
 *      a short human-friendly code plus a stored record (hashed) with a TTL.
 *   2. Owner pastes the code into the ArticlePilot dashboard.
 *   3. The SaaS backend calls `POST /articlepilot/v1/pair` with the code. The
 *      REST controller validates it here, mints a per-connection shared secret,
 *      marks the token used, and returns the secret + connection id to the SaaS.
 *   4. All subsequent requests are authenticated with HMAC using that secret.
 *
 * The plaintext code is only ever held in memory / shown once in wp-admin; the
 * stored option keeps a hash so a database leak cannot reveal a live code.
 */
class ArticlePilot_Pairing {

	/**
	 * Option key for the current pairing token record.
	 */
	const OPTION_KEY = 'articlepilot_pairing_token';

	/**
	 * Default lifetime of a pairing code, in seconds (15 minutes).
	 */
	const TTL = 900;

	/**
	 * Generate a new one-time pairing code.
	 *
	 * Overwrites any previous unused code. Returns the plaintext code for
	 * one-time display; only a hash is persisted.
	 *
	 * @return string The plaintext pairing code (format: XXXX-XXXX-XXXX).
	 */
	public function generate_token() {
		$raw = strtoupper( wp_generate_password( 12, false, false ) );
		// Format into groups for readability: ABCD-EFGH-IJKL.
		$code = implode( '-', str_split( $raw, 4 ) );

		$record = array(
			'hash'       => wp_hash_password( $code ),
			'created_at' => time(),
			'expires_at' => time() + (int) apply_filters( 'articlepilot_pairing_ttl', self::TTL ),
			'used'       => false,
		);

		update_option( self::OPTION_KEY, $record, false );

		return $code;
	}

	/**
	 * Retrieve the current pairing record, if any.
	 *
	 * @return array|null
	 */
	public function get_record() {
		$record = get_option( self::OPTION_KEY );
		return is_array( $record ) ? $record : null;
	}

	/**
	 * Whether an active (unused, unexpired) pairing code currently exists.
	 *
	 * @return bool
	 */
	public function has_active_token() {
		$record = $this->get_record();
		if ( null === $record ) {
			return false;
		}
		if ( ! empty( $record['used'] ) ) {
			return false;
		}
		return time() < (int) $record['expires_at'];
	}

	/**
	 * Seconds until the current code expires (0 if none / expired).
	 *
	 * @return int
	 */
	public function seconds_until_expiry() {
		$record = $this->get_record();
		if ( null === $record || ! empty( $record['used'] ) ) {
			return 0;
		}
		return max( 0, (int) $record['expires_at'] - time() );
	}

	/**
	 * Validate a submitted pairing code.
	 *
	 * @param string $code The plaintext code submitted by the SaaS.
	 * @return true|WP_Error True when valid, WP_Error otherwise.
	 */
	public function validate_token( $code ) {
		$code   = strtoupper( trim( (string) $code ) );
		$record = $this->get_record();

		if ( null === $record ) {
			return new WP_Error(
				'articlepilot_no_pairing',
				__( 'No pairing code has been generated for this site.', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		if ( ! empty( $record['used'] ) ) {
			return new WP_Error(
				'articlepilot_pairing_used',
				__( 'This pairing code has already been used.', 'articlepilot-connector' ),
				array( 'status' => 409 )
			);
		}

		if ( time() >= (int) $record['expires_at'] ) {
			return new WP_Error(
				'articlepilot_pairing_expired',
				__( 'This pairing code has expired. Please generate a new one.', 'articlepilot-connector' ),
				array( 'status' => 410 )
			);
		}

		if ( ! wp_check_password( $code, $record['hash'] ) ) {
			return new WP_Error(
				'articlepilot_pairing_invalid',
				__( 'The pairing code is invalid.', 'articlepilot-connector' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Mark the current pairing code as used.
	 *
	 * @return void
	 */
	public function mark_used() {
		$record = $this->get_record();
		if ( null === $record ) {
			return;
		}
		$record['used']    = true;
		$record['used_at'] = time();
		update_option( self::OPTION_KEY, $record, false );
	}

	/**
	 * Delete the current pairing code record.
	 *
	 * @return void
	 */
	public function clear() {
		delete_option( self::OPTION_KEY );
	}
}
