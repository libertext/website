<?php
/**
 * Admin settings page.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_Admin
 *
 * Registers the settings page under Settings and handles its POST actions
 * (generate pairing code, regenerate code, disconnect).
 */
class ArticlePilot_Admin {

	/**
	 * Settings page slug.
	 */
	const PAGE_SLUG = 'articlepilot-connector';

	/**
	 * Nonce action name.
	 */
	const NONCE_ACTION = 'articlepilot_admin_action';

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
	 * A freshly generated pairing code to display once (transient state).
	 *
	 * @var string
	 */
	protected $new_code = '';

	/**
	 * Admin notice message queued for display.
	 *
	 * @var array{type:string,message:string}|null
	 */
	protected $notice = null;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->auth    = new ArticlePilot_Auth();
		$this->pairing = new ArticlePilot_Pairing();
	}

	/**
	 * Wire admin hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_init', array( $this, 'handle_actions' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Register the settings submenu page.
	 *
	 * @return void
	 */
	public function register_menu() {
		add_options_page(
			__( 'ArticlePilot Connector', 'articlepilot-connector' ),
			__( 'ArticlePilot', 'articlepilot-connector' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_page' )
		);
	}

	/**
	 * Enqueue admin CSS/JS only on our page.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public function enqueue_assets( $hook ) {
		if ( 'settings_page_' . self::PAGE_SLUG !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'articlepilot-admin',
			ARTICLEPILOT_PLUGIN_URL . 'admin/css/admin.css',
			array(),
			ARTICLEPILOT_VERSION
		);

		wp_enqueue_script(
			'articlepilot-admin',
			ARTICLEPILOT_PLUGIN_URL . 'admin/js/admin.js',
			array(),
			ARTICLEPILOT_VERSION,
			true
		);

		wp_localize_script(
			'articlepilot-admin',
			'ArticlePilotAdmin',
			array(
				'copied'   => __( 'Copied!', 'articlepilot-connector' ),
				'copy'     => __( 'Copy', 'articlepilot-connector' ),
				'copyFail' => __( 'Press Ctrl+C to copy', 'articlepilot-connector' ),
			)
		);
	}

	/**
	 * Handle POST actions from the settings form.
	 *
	 * @return void
	 */
	public function handle_actions() {
		if ( ! isset( $_POST['articlepilot_action'] ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		check_admin_referer( self::NONCE_ACTION );

		$action = sanitize_key( wp_unslash( $_POST['articlepilot_action'] ) );

		switch ( $action ) {
			case 'generate':
			case 'regenerate':
				$this->new_code = $this->pairing->generate_token();
				$this->notice   = array(
					'type'    => 'success',
					'message' => __( 'A new pairing code has been generated. Copy it into ArticlePilot now — it is shown only once.', 'articlepilot-connector' ),
				);
				break;

			case 'disconnect':
				$this->auth->disconnect();
				$this->pairing->clear();
				$this->notice = array(
					'type'    => 'success',
					'message' => __( 'The connection to ArticlePilot has been removed.', 'articlepilot-connector' ),
				);
				break;
		}

		add_action( 'admin_notices', array( $this, 'render_notice' ) );
	}

	/**
	 * Render a queued admin notice.
	 *
	 * @return void
	 */
	public function render_notice() {
		if ( null === $this->notice ) {
			return;
		}
		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
			esc_attr( $this->notice['type'] ),
			esc_html( $this->notice['message'] )
		);
	}

	/**
	 * Render the settings page view.
	 *
	 * @return void
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to access this page.', 'articlepilot-connector' ) );
		}

		// Data passed to the view.
		$connection = $this->auth->get_connection();
		$is_connected = ( null !== $connection );
		$site_id      = get_option( 'articlepilot_site_id' );
		$paired_at    = (int) get_option( 'articlepilot_paired_at' );
		$new_code     = $this->new_code;
		$has_active_code = $this->pairing->has_active_token();
		$code_expiry     = $this->pairing->seconds_until_expiry();
		$seo_plugin      = articlepilot_connector()->seo->detect_plugin_name();
		$nonce_action    = self::NONCE_ACTION;

		require ARTICLEPILOT_PLUGIN_DIR . 'admin/views/settings-page.php';
	}
}
