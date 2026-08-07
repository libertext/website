<?php
/**
 * Plugin Name:       ArticlePilot Connector
 * Plugin URI:        https://articlepilot.ai/wordpress
 * Description:       Securely connects your WordPress site to the ArticlePilot AI SEO content platform to publish AI-generated articles.
 * Version:           1.0.0
 * Requires at least: 5.6
 * Requires PHP:      7.4
 * Author:            ArticlePilot
 * Author URI:        https://articlepilot.ai
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       articlepilot-connector
 * Domain Path:       /languages
 *
 * @package ArticlePilot_Connector
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Current plugin version.
 */
define( 'ARTICLEPILOT_VERSION', '1.0.0' );

/**
 * Plugin file path.
 */
define( 'ARTICLEPILOT_PLUGIN_FILE', __FILE__ );

/**
 * Plugin directory path (with trailing slash).
 */
define( 'ARTICLEPILOT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

/**
 * Plugin directory URL (with trailing slash).
 */
define( 'ARTICLEPILOT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Plugin basename.
 */
define( 'ARTICLEPILOT_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * REST API namespace.
 */
define( 'ARTICLEPILOT_REST_NAMESPACE', 'articlepilot/v1' );

/**
 * Load plugin class files.
 */
require_once ARTICLEPILOT_PLUGIN_DIR . 'includes/class-articlepilot-connector.php';

/**
 * Begins execution of the plugin.
 *
 * @return ArticlePilot_Connector
 */
function articlepilot_connector() {
	return ArticlePilot_Connector::instance();
}

// Kick things off.
articlepilot_connector();

/**
 * Activation hook.
 *
 * Sets up a persistent site identifier and default options. Never touches
 * user content. Flushes rewrite rules so REST routes resolve cleanly.
 *
 * @return void
 */
function articlepilot_activate() {
	// Ensure a stable site identifier exists.
	if ( ! get_option( 'articlepilot_site_id' ) ) {
		update_option( 'articlepilot_site_id', 'ap_site_' . wp_generate_password( 24, false, false ), false );
	}

	// Store the plugin version for future migrations.
	update_option( 'articlepilot_version', ARTICLEPILOT_VERSION, false );

	// Flush rewrite rules to register REST routes.
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'articlepilot_activate' );

/**
 * Deactivation hook.
 *
 * Cleans up transient replay-protection data and flushes rewrite rules.
 * Does NOT delete connection secrets (so re-activation keeps the pairing)
 * and never removes user content.
 *
 * @return void
 */
function articlepilot_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'articlepilot_deactivate' );
