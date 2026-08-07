<?php
/**
 * Main plugin bootstrap class.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_Connector
 *
 * Singleton that wires together the plugin: loads dependencies, registers the
 * REST controller and the admin UI.
 */
final class ArticlePilot_Connector {

	/**
	 * Single shared instance.
	 *
	 * @var ArticlePilot_Connector|null
	 */
	private static $instance = null;

	/**
	 * REST controller instance.
	 *
	 * @var ArticlePilot_REST_Controller
	 */
	public $rest;

	/**
	 * SEO manager instance.
	 *
	 * @var ArticlePilot_SEO_Manager
	 */
	public $seo;

	/**
	 * Admin handler instance.
	 *
	 * @var ArticlePilot_Admin|null
	 */
	public $admin = null;

	/**
	 * Retrieve the shared instance.
	 *
	 * @return ArticlePilot_Connector
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor. Private to enforce the singleton.
	 */
	private function __construct() {
		$this->includes();
		$this->init_hooks();
	}

	/**
	 * Load required files.
	 *
	 * @return void
	 */
	private function includes() {
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/class-articlepilot-pairing.php';
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/class-articlepilot-auth.php';

		// SEO adapters.
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/seo/interface-seo-adapter.php';
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/seo/class-native-adapter.php';
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/seo/class-rankmath-adapter.php';
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/seo/class-yoast-adapter.php';
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/seo/class-aioseo-adapter.php';
		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/class-articlepilot-seo-manager.php';

		require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/class-articlepilot-rest-controller.php';

		if ( is_admin() ) {
			require_once ARTICLEPILOT_PLUGIN_DIR . 'admin/class-articlepilot-admin.php';
		}
	}

	/**
	 * Register WordPress hooks.
	 *
	 * @return void
	 */
	private function init_hooks() {
		add_action( 'init', array( $this, 'load_textdomain' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );

		$this->seo = new ArticlePilot_SEO_Manager();

		if ( is_admin() ) {
			$this->admin = new ArticlePilot_Admin();
			$this->admin->init();

			// Settings link on the plugins list.
			add_filter( 'plugin_action_links_' . ARTICLEPILOT_PLUGIN_BASENAME, array( $this, 'plugin_action_links' ) );
		}
	}

	/**
	 * Load the plugin text domain for translations.
	 *
	 * @return void
	 */
	public function load_textdomain() {
		load_plugin_textdomain(
			'articlepilot-connector',
			false,
			dirname( ARTICLEPILOT_PLUGIN_BASENAME ) . '/languages'
		);
	}

	/**
	 * Register all REST API routes.
	 *
	 * @return void
	 */
	public function register_rest_routes() {
		$this->rest = new ArticlePilot_REST_Controller( $this->seo );
		$this->rest->register_routes();
	}

	/**
	 * Add a "Settings" link to the plugin row.
	 *
	 * @param array $links Existing action links.
	 * @return array
	 */
	public function plugin_action_links( $links ) {
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'options-general.php?page=articlepilot-connector' ) ),
			esc_html__( 'Settings', 'articlepilot-connector' )
		);
		array_unshift( $links, $settings_link );
		return $links;
	}
}
