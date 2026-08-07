<?php
/**
 * REST API controller.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_REST_Controller
 *
 * Registers and handles every endpoint under the `articlepilot/v1` namespace.
 * All routes except `/pair` require HMAC authentication via
 * {@see ArticlePilot_Auth::authenticate()}.
 */
class ArticlePilot_REST_Controller {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	protected $namespace = ARTICLEPILOT_REST_NAMESPACE;

	/**
	 * Auth handler.
	 *
	 * @var ArticlePilot_Auth
	 */
	protected $auth;

	/**
	 * Pairing handler.
	 *
	 * @var ArticlePilot_Pairing
	 */
	protected $pairing;

	/**
	 * SEO manager.
	 *
	 * @var ArticlePilot_SEO_Manager
	 */
	protected $seo;

	/**
	 * Constructor.
	 *
	 * @param ArticlePilot_SEO_Manager $seo SEO manager instance.
	 */
	public function __construct( ArticlePilot_SEO_Manager $seo ) {
		$this->auth    = new ArticlePilot_Auth();
		$this->pairing = new ArticlePilot_Pairing();
		$this->seo     = $seo;
	}

	/**
	 * Permission callback for authenticated routes.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	public function require_auth( WP_REST_Request $request ) {
		return $this->auth->authenticate( $request );
	}

	/**
	 * Register all routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$ns = $this->namespace;

		// Pairing (protected only by the one-time pairing token in the body).
		register_rest_route(
			$ns,
			'/pair',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_pair' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'code' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Health (authenticated).
		register_rest_route(
			$ns,
			'/health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'handle_health' ),
				'permission_callback' => array( $this, 'require_auth' ),
			)
		);

		// Site info.
		register_rest_route(
			$ns,
			'/site-info',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'handle_site_info' ),
				'permission_callback' => array( $this, 'require_auth' ),
			)
		);

		// SEO plugin.
		register_rest_route(
			$ns,
			'/seo-plugin',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'handle_seo_plugin' ),
				'permission_callback' => array( $this, 'require_auth' ),
			)
		);

		// Secret rotation.
		register_rest_route(
			$ns,
			'/rotate-secret',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_rotate_secret' ),
				'permission_callback' => array( $this, 'require_auth' ),
			)
		);

		// Authors.
		register_rest_route(
			$ns,
			'/authors',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'handle_get_authors' ),
				'permission_callback' => array( $this, 'require_auth' ),
			)
		);

		// Categories (list + create).
		register_rest_route(
			$ns,
			'/categories',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_get_categories' ),
					'permission_callback' => array( $this, 'require_auth' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'handle_create_category' ),
					'permission_callback' => array( $this, 'require_auth' ),
				),
			)
		);

		// Tags (list + create).
		register_rest_route(
			$ns,
			'/tags',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_get_tags' ),
					'permission_callback' => array( $this, 'require_auth' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'handle_create_tag' ),
					'permission_callback' => array( $this, 'require_auth' ),
				),
			)
		);

		// Posts (list + create).
		register_rest_route(
			$ns,
			'/posts',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_get_posts' ),
					'permission_callback' => array( $this, 'require_auth' ),
					'args'                => array(
						'page'     => array(
							'type'              => 'integer',
							'default'           => 1,
							'sanitize_callback' => 'absint',
						),
						'per_page' => array(
							'type'              => 'integer',
							'default'           => 10,
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'handle_create_post' ),
					'permission_callback' => array( $this, 'require_auth' ),
				),
			)
		);

		// Single post (update).
		register_rest_route(
			$ns,
			'/posts/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_get_post' ),
					'permission_callback' => array( $this, 'require_auth' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE, // PUT, PATCH, POST.
					'callback'            => array( $this, 'handle_update_post' ),
					'permission_callback' => array( $this, 'require_auth' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);

		// Media upload.
		register_rest_route(
			$ns,
			'/media',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_upload_media' ),
				'permission_callback' => array( $this, 'require_auth' ),
			)
		);
	}

	/* ---------------------------------------------------------------------
	 * Pairing
	 * ------------------------------------------------------------------- */

	/**
	 * Finalize pairing.
	 *
	 * Flow:
	 *   - The site owner generated a one-time code in wp-admin and pasted it
	 *     into the ArticlePilot dashboard.
	 *   - ArticlePilot's backend calls this endpoint with `code` (and optional
	 *     `callback_url` / `platform_site_id` metadata).
	 *   - We validate the code, mint a per-connection 32-byte shared secret and
	 *     a connection id, mark the code used, and return the secret + ids.
	 *   - The SaaS stores the secret and signs all further requests with HMAC.
	 *
	 * The secret is returned exactly once, in this response only.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_pair( WP_REST_Request $request ) {
		$code = $request->get_param( 'code' );

		$valid = $this->pairing->validate_token( $code );
		if ( is_wp_error( $valid ) ) {
			return $valid;
		}

		$connection_id = get_option( 'articlepilot_site_id' );
		if ( ! $connection_id ) {
			$connection_id = 'ap_site_' . wp_generate_password( 24, false, false );
			update_option( 'articlepilot_site_id', $connection_id, false );
		}

		$callback_url     = esc_url_raw( (string) $request->get_param( 'callback_url' ) );
		$platform_site_id = sanitize_text_field( (string) $request->get_param( 'platform_site_id' ) );

		$record = $this->auth->create_connection(
			$connection_id,
			array(
				'callback_url'     => $callback_url,
				'platform_site_id' => $platform_site_id,
			)
		);

		// One-time code is now spent.
		$this->pairing->mark_used();
		$this->pairing->clear();

		return new WP_REST_Response(
			array(
				'connection_id' => $record['connection_id'],
				'secret'        => $record['secret'],
				'site'          => $this->site_info_payload(),
				'paired_at'     => gmdate( 'c', (int) $record['created_at'] ),
			),
			200
		);
	}

	/* ---------------------------------------------------------------------
	 * Info / health
	 * ------------------------------------------------------------------- */

	/**
	 * Health check.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_health( WP_REST_Request $request ) {
		return new WP_REST_Response(
			array(
				'plugin'    => 'articlepilot-connector',
				'version'   => ARTICLEPILOT_VERSION,
				'connected' => $this->auth->is_connected(),
				'time'      => gmdate( 'c' ),
			),
			200
		);
	}

	/**
	 * Site information.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_site_info( WP_REST_Request $request ) {
		return new WP_REST_Response( $this->site_info_payload(), 200 );
	}

	/**
	 * Build the site info payload.
	 *
	 * @return array
	 */
	protected function site_info_payload() {
		return array(
			'site_id'     => get_option( 'articlepilot_site_id' ),
			'name'        => get_bloginfo( 'name' ),
			'description' => get_bloginfo( 'description' ),
			'url'         => home_url(),
			'wp_version'  => get_bloginfo( 'version' ),
			'language'    => get_bloginfo( 'language' ),
			'timezone'    => wp_timezone_string(),
			'seo_plugin'  => $this->seo->detect_plugin(),
		);
	}

	/**
	 * Detected SEO plugin.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_seo_plugin( WP_REST_Request $request ) {
		return new WP_REST_Response(
			array(
				'slug' => $this->seo->detect_plugin(),
				'name' => $this->seo->detect_plugin_name(),
			),
			200
		);
	}

	/**
	 * Rotate the shared secret.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_rotate_secret( WP_REST_Request $request ) {
		$record = $this->auth->rotate_secret();
		if ( is_wp_error( $record ) ) {
			return $record;
		}

		return new WP_REST_Response(
			array(
				'connection_id' => $record['connection_id'],
				'secret'        => $record['secret'],
				'rotated_at'    => gmdate( 'c', (int) $record['rotated_at'] ),
			),
			200
		);
	}

	/* ---------------------------------------------------------------------
	 * Read collections
	 * ------------------------------------------------------------------- */

	/**
	 * List authors who can write posts.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_get_authors( WP_REST_Request $request ) {
		$users = get_users(
			array(
				'capability'          => array( 'edit_posts' ),
				'orderby'             => 'display_name',
				'order'               => 'ASC',
				'number'              => 200,
				'has_published_posts' => false,
			)
		);

		$authors = array();
		foreach ( $users as $user ) {
			$authors[] = array(
				'id'           => (int) $user->ID,
				'name'         => $user->display_name,
				'slug'         => $user->user_nicename,
				'email'        => $user->user_email,
				'can_publish'  => user_can( $user, 'publish_posts' ),
			);
		}

		return new WP_REST_Response( $authors, 200 );
	}

	/**
	 * List categories.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_get_categories( WP_REST_Request $request ) {
		return new WP_REST_Response( $this->get_terms_payload( 'category' ), 200 );
	}

	/**
	 * List tags.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_get_tags( WP_REST_Request $request ) {
		return new WP_REST_Response( $this->get_terms_payload( 'post_tag' ), 200 );
	}

	/**
	 * Build a term collection payload.
	 *
	 * @param string $taxonomy Taxonomy name.
	 * @return array
	 */
	protected function get_terms_payload( $taxonomy ) {
		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
				'number'     => 500,
			)
		);

		if ( is_wp_error( $terms ) ) {
			return array();
		}

		$out = array();
		foreach ( $terms as $term ) {
			$out[] = array(
				'id'     => (int) $term->term_id,
				'name'   => $term->name,
				'slug'   => $term->slug,
				'parent' => (int) $term->parent,
				'count'  => (int) $term->count,
			);
		}
		return $out;
	}

	/**
	 * List posts, paginated.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function handle_get_posts( WP_REST_Request $request ) {
		$page     = max( 1, absint( $request->get_param( 'page' ) ) );
		$per_page = absint( $request->get_param( 'per_page' ) );
		$per_page = $per_page > 0 ? min( 100, $per_page ) : 10;

		$query = new WP_Query(
			array(
				'post_type'      => 'post',
				'post_status'    => array( 'publish', 'future', 'draft', 'pending', 'private' ),
				'posts_per_page' => $per_page,
				'paged'          => $page,
				'orderby'        => 'date',
				'order'          => 'DESC',
			)
		);

		$posts = array();
		foreach ( $query->posts as $post ) {
			$posts[] = $this->post_payload( $post );
		}

		$response = new WP_REST_Response( $posts, 200 );
		$response->header( 'X-WP-Total', (string) $query->found_posts );
		$response->header( 'X-WP-TotalPages', (string) $query->max_num_pages );

		return $response;
	}

	/**
	 * Get a single post.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_get_post( WP_REST_Request $request ) {
		$post_id = absint( $request->get_param( 'id' ) );
		$post    = get_post( $post_id );

		if ( ! $post || 'post' !== $post->post_type ) {
			return new WP_Error(
				'articlepilot_post_not_found',
				__( 'Post not found.', 'articlepilot-connector' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response( $this->post_payload( $post ), 200 );
	}

	/**
	 * Build a post payload.
	 *
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	protected function post_payload( $post ) {
		return array(
			'id'         => (int) $post->ID,
			'title'      => get_the_title( $post ),
			'slug'       => $post->post_name,
			'excerpt'    => wp_strip_all_tags( get_the_excerpt( $post ) ),
			'status'     => $post->post_status,
			'categories' => wp_get_post_categories( $post->ID ),
			'tags'       => wp_get_post_tags( $post->ID, array( 'fields' => 'ids' ) ),
			'link'       => get_permalink( $post ),
			'date'       => get_post_time( 'c', true, $post ),
			'modified'   => get_post_modified_time( 'c', true, $post ),
		);
	}

	/* ---------------------------------------------------------------------
	 * Create / update posts
	 * ------------------------------------------------------------------- */

	/**
	 * Create a post.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_create_post( WP_REST_Request $request ) {
		$author_id = $this->resolve_author( $request );
		if ( is_wp_error( $author_id ) ) {
			return $author_id;
		}

		$status = $this->sanitize_status( $request->get_param( 'status' ) );

		// Capability check for the chosen author against the chosen status.
		$cap_check = $this->check_post_capability( $author_id, $status );
		if ( is_wp_error( $cap_check ) ) {
			return $cap_check;
		}

		$postarr = array(
			'post_type'    => 'post',
			'post_title'   => sanitize_text_field( (string) $request->get_param( 'title' ) ),
			'post_content' => $this->sanitize_content( $request->get_param( 'content' ) ),
			'post_status'  => $status,
			'post_author'  => $author_id,
		);

		$excerpt = $request->get_param( 'excerpt' );
		if ( null !== $excerpt ) {
			$postarr['post_excerpt'] = sanitize_textarea_field( (string) $excerpt );
		}

		$slug = $request->get_param( 'slug' );
		if ( ! empty( $slug ) ) {
			$postarr['post_name'] = sanitize_title( (string) $slug );
		}

		// Scheduling.
		$date = $request->get_param( 'date' );
		if ( ! empty( $date ) ) {
			$scheduled = $this->parse_date( $date );
			if ( is_wp_error( $scheduled ) ) {
				return $scheduled;
			}
			$postarr['post_date']     = $scheduled['local'];
			$postarr['post_date_gmt']  = $scheduled['gmt'];
			if ( 'future' === $status && $scheduled['timestamp'] <= time() ) {
				// Scheduling in the past should just publish.
				$postarr['post_status'] = 'publish';
			}
		}

		$post_id = wp_insert_post( $postarr, true );
		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		$this->apply_taxonomies( $post_id, $request );
		$this->apply_featured_media( $post_id, $request );
		$this->apply_seo( $post_id, $request );

		return new WP_REST_Response(
			array(
				'id'        => (int) $post_id,
				'permalink' => get_permalink( $post_id ),
				'status'    => get_post_status( $post_id ),
				'edit_link' => get_edit_post_link( $post_id, 'raw' ),
			),
			201
		);
	}

	/**
	 * Update an existing post.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_update_post( WP_REST_Request $request ) {
		$post_id = absint( $request->get_param( 'id' ) );
		$post    = get_post( $post_id );

		if ( ! $post || 'post' !== $post->post_type ) {
			return new WP_Error(
				'articlepilot_post_not_found',
				__( 'Post not found.', 'articlepilot-connector' ),
				array( 'status' => 404 )
			);
		}

		$postarr = array( 'ID' => $post_id );

		if ( null !== $request->get_param( 'title' ) ) {
			$postarr['post_title'] = sanitize_text_field( (string) $request->get_param( 'title' ) );
		}
		if ( null !== $request->get_param( 'content' ) ) {
			$postarr['post_content'] = $this->sanitize_content( $request->get_param( 'content' ) );
		}
		if ( null !== $request->get_param( 'excerpt' ) ) {
			$postarr['post_excerpt'] = sanitize_textarea_field( (string) $request->get_param( 'excerpt' ) );
		}
		if ( ! empty( $request->get_param( 'slug' ) ) ) {
			$postarr['post_name'] = sanitize_title( (string) $request->get_param( 'slug' ) );
		}

		// Author change (with capability check).
		if ( null !== $request->get_param( 'author' ) ) {
			$author_id = $this->resolve_author( $request );
			if ( is_wp_error( $author_id ) ) {
				return $author_id;
			}
			$postarr['post_author'] = $author_id;
		}

		// Status change.
		if ( null !== $request->get_param( 'status' ) ) {
			$status    = $this->sanitize_status( $request->get_param( 'status' ) );
			$author_id = isset( $postarr['post_author'] ) ? $postarr['post_author'] : (int) $post->post_author;

			$cap_check = $this->check_post_capability( $author_id, $status );
			if ( is_wp_error( $cap_check ) ) {
				return $cap_check;
			}
			$postarr['post_status'] = $status;
		}

		// Date / rescheduling.
		if ( ! empty( $request->get_param( 'date' ) ) ) {
			$scheduled = $this->parse_date( $request->get_param( 'date' ) );
			if ( is_wp_error( $scheduled ) ) {
				return $scheduled;
			}
			$postarr['post_date']     = $scheduled['local'];
			$postarr['post_date_gmt'] = $scheduled['gmt'];
		}

		$result = wp_update_post( $postarr, true );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$this->apply_taxonomies( $post_id, $request );
		$this->apply_featured_media( $post_id, $request );
		$this->apply_seo( $post_id, $request );

		return new WP_REST_Response(
			array(
				'id'        => (int) $post_id,
				'permalink' => get_permalink( $post_id ),
				'status'    => get_post_status( $post_id ),
			),
			200
		);
	}

	/**
	 * Apply category and tag assignments from the request.
	 *
	 * @param int             $post_id Post id.
	 * @param WP_REST_Request $request Request.
	 * @return void
	 */
	protected function apply_taxonomies( $post_id, WP_REST_Request $request ) {
		$category_ids = $request->get_param( 'category_ids' );
		if ( is_array( $category_ids ) ) {
			$ids = array_values( array_filter( array_map( 'absint', $category_ids ) ) );
			wp_set_post_categories( $post_id, $ids );
		}

		$tag_ids = $request->get_param( 'tag_ids' );
		if ( is_array( $tag_ids ) ) {
			$ids = array_values( array_filter( array_map( 'absint', $tag_ids ) ) );
			wp_set_post_terms( $post_id, $ids, 'post_tag', false );
		}
	}

	/**
	 * Apply a featured image if provided.
	 *
	 * @param int             $post_id Post id.
	 * @param WP_REST_Request $request Request.
	 * @return void
	 */
	protected function apply_featured_media( $post_id, WP_REST_Request $request ) {
		$featured = $request->get_param( 'featured_media' );
		if ( null === $featured ) {
			return;
		}
		$attachment_id = absint( $featured );
		if ( $attachment_id && wp_attachment_is_image( $attachment_id ) ) {
			set_post_thumbnail( $post_id, $attachment_id );
		}
	}

	/**
	 * Collect and write SEO fields via the SEO manager.
	 *
	 * @param int             $post_id Post id.
	 * @param WP_REST_Request $request Request.
	 * @return void
	 */
	protected function apply_seo( $post_id, WP_REST_Request $request ) {
		$seo_input = $request->get_param( 'seo' );
		if ( ! is_array( $seo_input ) ) {
			$seo_input = array();
		}

		$fields = array( 'seo_title', 'meta_description', 'focus_keyword', 'canonical', 'og_title', 'og_description' );
		$seo    = array();

		foreach ( $fields as $field ) {
			if ( isset( $seo_input[ $field ] ) ) {
				$seo[ $field ] = ( 'canonical' === $field )
					? esc_url_raw( $seo_input[ $field ] )
					: sanitize_text_field( $seo_input[ $field ] );
			}
		}

		if ( isset( $seo_input['robots'] ) ) {
			if ( is_array( $seo_input['robots'] ) ) {
				$seo['robots'] = array_map( 'sanitize_text_field', $seo_input['robots'] );
			} else {
				$seo['robots'] = sanitize_text_field( $seo_input['robots'] );
			}
		}

		if ( ! empty( $seo ) ) {
			$this->seo->write_seo( $post_id, $seo );
		}
	}

	/* ---------------------------------------------------------------------
	 * Taxonomy creation
	 * ------------------------------------------------------------------- */

	/**
	 * Create a category.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_create_category( WP_REST_Request $request ) {
		return $this->create_term( $request, 'category' );
	}

	/**
	 * Create a tag.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_create_tag( WP_REST_Request $request ) {
		return $this->create_term( $request, 'post_tag' );
	}

	/**
	 * Shared term creation logic.
	 *
	 * @param WP_REST_Request $request  Request.
	 * @param string          $taxonomy Taxonomy name.
	 * @return WP_REST_Response|WP_Error
	 */
	protected function create_term( WP_REST_Request $request, $taxonomy ) {
		if ( ! current_user_can( 'manage_categories' ) && ! $this->connection_can( 'manage_categories' ) ) {
			// Fall through to capability owner check below; managed via mapped user.
			$owner = $this->mapped_user_id();
			if ( ! $owner || ! user_can( $owner, 'manage_categories' ) ) {
				return new WP_Error(
					'articlepilot_forbidden_terms',
					__( 'The connected account cannot manage terms.', 'articlepilot-connector' ),
					array( 'status' => 403 )
				);
			}
		}

		$name = sanitize_text_field( (string) $request->get_param( 'name' ) );
		if ( '' === $name ) {
			return new WP_Error(
				'articlepilot_missing_name',
				__( 'A term name is required.', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		$args = array();

		$slug = $request->get_param( 'slug' );
		if ( ! empty( $slug ) ) {
			$args['slug'] = sanitize_title( (string) $slug );
		}

		$description = $request->get_param( 'description' );
		if ( ! empty( $description ) ) {
			$args['description'] = sanitize_textarea_field( (string) $description );
		}

		if ( 'category' === $taxonomy ) {
			$parent = absint( $request->get_param( 'parent' ) );
			if ( $parent ) {
				$args['parent'] = $parent;
			}
		}

		$result = wp_insert_term( $name, $taxonomy, $args );
		if ( is_wp_error( $result ) ) {
			// If it already exists, return the existing term id gracefully.
			if ( 'term_exists' === $result->get_error_code() ) {
				$existing = (int) $result->get_error_data();
				return new WP_REST_Response(
					array(
						'id'       => $existing,
						'existing' => true,
					),
					200
				);
			}
			return $result;
		}

		return new WP_REST_Response(
			array(
				'id'   => (int) $result['term_id'],
				'name' => $name,
				'slug' => get_term( $result['term_id'], $taxonomy )->slug,
			),
			201
		);
	}

	/* ---------------------------------------------------------------------
	 * Media
	 * ------------------------------------------------------------------- */

	/**
	 * Upload media from a base64 payload or a remote URL.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function handle_upload_media( WP_REST_Request $request ) {
		$owner = $this->mapped_user_id();
		if ( ! $owner || ! user_can( $owner, 'upload_files' ) ) {
			return new WP_Error(
				'articlepilot_forbidden_upload',
				__( 'The connected account cannot upload files.', 'articlepilot-connector' ),
				array( 'status' => 403 )
			);
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$filename = sanitize_file_name( (string) $request->get_param( 'filename' ) );
		$url      = $request->get_param( 'url' );
		$base64   = $request->get_param( 'data' );

		if ( ! empty( $url ) ) {
			$attachment_id = $this->sideload_from_url( esc_url_raw( $url ), $filename );
		} elseif ( ! empty( $base64 ) ) {
			$attachment_id = $this->sideload_from_base64( (string) $base64, $filename );
		} else {
			return new WP_Error(
				'articlepilot_missing_media',
				__( 'Provide either a URL or base64 data.', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		// Alt text and caption.
		$alt = $request->get_param( 'alt' );
		if ( null !== $alt ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );
		}

		$caption = $request->get_param( 'caption' );
		$title   = $request->get_param( 'title' );
		$update  = array( 'ID' => $attachment_id );
		if ( null !== $caption ) {
			$update['post_excerpt'] = sanitize_textarea_field( $caption );
		}
		if ( null !== $title ) {
			$update['post_title'] = sanitize_text_field( $title );
		}
		if ( count( $update ) > 1 ) {
			wp_update_post( $update );
		}

		return new WP_REST_Response(
			array(
				'id'  => (int) $attachment_id,
				'url' => wp_get_attachment_url( $attachment_id ),
			),
			201
		);
	}

	/**
	 * Sideload an image from a URL into the media library.
	 *
	 * @param string $url      Remote URL.
	 * @param string $filename Optional desired filename.
	 * @return int|WP_Error Attachment id or error.
	 */
	protected function sideload_from_url( $url, $filename = '' ) {
		if ( empty( $url ) ) {
			return new WP_Error(
				'articlepilot_bad_url',
				__( 'Invalid media URL.', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		$tmp = download_url( $url );
		if ( is_wp_error( $tmp ) ) {
			return $tmp;
		}

		if ( empty( $filename ) ) {
			$filename = basename( wp_parse_url( $url, PHP_URL_PATH ) );
		}
		$filename = sanitize_file_name( $filename ? $filename : 'articlepilot-upload' );

		$file_array = array(
			'name'     => $filename,
			'tmp_name' => $tmp,
		);

		$attachment_id = media_handle_sideload( $file_array, 0 );

		if ( is_wp_error( $attachment_id ) ) {
			if ( file_exists( $tmp ) ) {
				wp_delete_file( $tmp );
			}
			return $attachment_id;
		}

		return (int) $attachment_id;
	}

	/**
	 * Sideload an image from base64 data.
	 *
	 * @param string $base64   Base64 payload (optionally a data URI).
	 * @param string $filename Desired filename.
	 * @return int|WP_Error
	 */
	protected function sideload_from_base64( $base64, $filename = '' ) {
		// Strip a data URI prefix if present.
		if ( false !== strpos( $base64, ',' ) && 0 === strpos( $base64, 'data:' ) ) {
			$parts  = explode( ',', $base64, 2 );
			$base64 = $parts[1];
		}

		$decoded = base64_decode( $base64, true );
		if ( false === $decoded ) {
			return new WP_Error(
				'articlepilot_bad_base64',
				__( 'Media data is not valid base64.', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		if ( empty( $filename ) ) {
			$filename = 'articlepilot-upload';
		}
		$filename = sanitize_file_name( $filename );

		$upload = wp_upload_bits( $filename, null, $decoded );
		if ( ! empty( $upload['error'] ) ) {
			return new WP_Error(
				'articlepilot_upload_failed',
				$upload['error'],
				array( 'status' => 500 )
			);
		}

		$filetype = wp_check_filetype( $upload['file'] );
		if ( empty( $filetype['type'] ) || 0 !== strpos( $filetype['type'], 'image/' ) ) {
			wp_delete_file( $upload['file'] );
			return new WP_Error(
				'articlepilot_unsupported_media',
				__( 'Only image uploads are supported.', 'articlepilot-connector' ),
				array( 'status' => 415 )
			);
		}

		$attachment = array(
			'post_mime_type' => $filetype['type'],
			'post_title'     => sanitize_file_name( pathinfo( $filename, PATHINFO_FILENAME ) ),
			'post_content'   => '',
			'post_status'    => 'inherit',
		);

		$attachment_id = wp_insert_attachment( $attachment, $upload['file'], 0, true );
		if ( is_wp_error( $attachment_id ) ) {
			wp_delete_file( $upload['file'] );
			return $attachment_id;
		}

		$metadata = wp_generate_attachment_metadata( $attachment_id, $upload['file'] );
		wp_update_attachment_metadata( $attachment_id, $metadata );

		return (int) $attachment_id;
	}

	/* ---------------------------------------------------------------------
	 * Helpers: authors, capabilities, dates
	 * ------------------------------------------------------------------- */

	/**
	 * Resolve the author id to use for a post.
	 *
	 * Priority: explicit `author` param -> mapped connection user -> a site
	 * user who can publish. Returns WP_Error if none is usable.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return int|WP_Error
	 */
	protected function resolve_author( WP_REST_Request $request ) {
		$requested = $request->get_param( 'author' );

		if ( ! empty( $requested ) ) {
			$author_id = absint( $requested );
			$user      = get_user_by( 'id', $author_id );
			if ( ! $user ) {
				return new WP_Error(
					'articlepilot_bad_author',
					__( 'The requested author does not exist.', 'articlepilot-connector' ),
					array( 'status' => 400 )
				);
			}
			if ( ! user_can( $user, 'edit_posts' ) ) {
				return new WP_Error(
					'articlepilot_author_cannot_write',
					__( 'The requested author cannot create posts.', 'articlepilot-connector' ),
					array( 'status' => 403 )
				);
			}
			return $author_id;
		}

		$mapped = $this->mapped_user_id();
		if ( $mapped && user_can( $mapped, 'edit_posts' ) ) {
			return $mapped;
		}

		return new WP_Error(
			'articlepilot_no_author',
			__( 'No valid author is available for this connection. Provide an author id.', 'articlepilot-connector' ),
			array( 'status' => 400 )
		);
	}

	/**
	 * Determine the WP user id mapped to the connection.
	 *
	 * Uses a stored mapped user, else the first available administrator /
	 * editor who can publish, so publishing has a real capability context.
	 *
	 * @return int Zero when none found.
	 */
	protected function mapped_user_id() {
		$connection = $this->auth->get_connection();
		if ( is_array( $connection ) && ! empty( $connection['user_id'] ) ) {
			$mapped = absint( $connection['user_id'] );
			if ( $mapped && get_user_by( 'id', $mapped ) ) {
				return $mapped;
			}
		}

		$candidates = get_users(
			array(
				'capability' => array( 'publish_posts' ),
				'orderby'    => 'ID',
				'order'      => 'ASC',
				'number'     => 1,
				'fields'     => 'ID',
			)
		);

		if ( ! empty( $candidates ) ) {
			return (int) $candidates[0];
		}

		return 0;
	}

	/**
	 * Whether the connection's capability context can do something.
	 *
	 * @param string $capability Capability to check.
	 * @return bool
	 */
	protected function connection_can( $capability ) {
		$owner = $this->mapped_user_id();
		return $owner && user_can( $owner, $capability );
	}

	/**
	 * Verify the author can create a post with the requested status.
	 *
	 * @param int    $author_id Author user id.
	 * @param string $status    Post status.
	 * @return true|WP_Error
	 */
	protected function check_post_capability( $author_id, $status ) {
		$user = get_user_by( 'id', $author_id );
		if ( ! $user ) {
			return new WP_Error(
				'articlepilot_bad_author',
				__( 'Author not found.', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		if ( ! user_can( $user, 'edit_posts' ) ) {
			return new WP_Error(
				'articlepilot_cannot_edit',
				__( 'The author cannot edit posts.', 'articlepilot-connector' ),
				array( 'status' => 403 )
			);
		}

		if ( in_array( $status, array( 'publish', 'future' ), true ) && ! user_can( $user, 'publish_posts' ) ) {
			return new WP_Error(
				'articlepilot_cannot_publish',
				__( 'The author cannot publish posts. Try status "draft" or "pending".', 'articlepilot-connector' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Sanitize the requested post status to an allowed value.
	 *
	 * @param mixed $status Raw status.
	 * @return string One of draft|pending|publish|future.
	 */
	protected function sanitize_status( $status ) {
		$status  = sanitize_key( (string) $status );
		$allowed = array( 'draft', 'pending', 'publish', 'future' );
		return in_array( $status, $allowed, true ) ? $status : 'draft';
	}

	/**
	 * Sanitize post content HTML.
	 *
	 * @param mixed $content Raw content.
	 * @return string
	 */
	protected function sanitize_content( $content ) {
		return wp_kses_post( (string) $content );
	}

	/**
	 * Parse an incoming date string into local + GMT MySQL datetimes.
	 *
	 * Accepts ISO 8601 / anything strtotime understands. The value is treated
	 * as an absolute instant; we derive both site-local and GMT strings.
	 *
	 * @param string $date Raw date.
	 * @return array|WP_Error {local, gmt, timestamp}
	 */
	protected function parse_date( $date ) {
		$timestamp = strtotime( (string) $date );
		if ( false === $timestamp ) {
			return new WP_Error(
				'articlepilot_bad_date',
				__( 'Invalid date format. Use ISO 8601 (e.g. 2026-01-31T09:00:00Z).', 'articlepilot-connector' ),
				array( 'status' => 400 )
			);
		}

		$gmt   = gmdate( 'Y-m-d H:i:s', $timestamp );
		$local = get_date_from_gmt( $gmt, 'Y-m-d H:i:s' );

		return array(
			'local'     => $local,
			'gmt'       => $gmt,
			'timestamp' => $timestamp,
		);
	}
}
