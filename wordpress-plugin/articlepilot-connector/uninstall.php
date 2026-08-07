<?php
/**
 * Uninstall routine for ArticlePilot Connector.
 *
 * Fired when the plugin is deleted from the WordPress admin. Removes ONLY the
 * plugin's own options / secrets (keys prefixed with `articlepilot_`) and its
 * replay-protection transients. It NEVER deletes posts, media, taxonomy terms,
 * users, or any other user-generated content.
 *
 * @package ArticlePilot_Connector
 */

// Exit if not called by WordPress during uninstall.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Delete all plugin options prefixed with `articlepilot_`.
 *
 * We enumerate our known option keys explicitly (safest) and additionally
 * sweep any stray `articlepilot_` options via a bounded query.
 */
$articlepilot_option_keys = array(
	'articlepilot_site_id',
	'articlepilot_version',
	'articlepilot_connection',
	'articlepilot_paired_at',
	'articlepilot_pairing_token',
	'articlepilot_settings',
);

foreach ( $articlepilot_option_keys as $articlepilot_option_key ) {
	delete_option( $articlepilot_option_key );
}

// Sweep any remaining options that use our prefix (single-site + multisite safe).
global $wpdb;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$articlepilot_stray_options = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
		$wpdb->esc_like( 'articlepilot_' ) . '%'
	)
);

if ( ! empty( $articlepilot_stray_options ) ) {
	foreach ( $articlepilot_stray_options as $articlepilot_stray_option ) {
		delete_option( $articlepilot_stray_option );
	}
}

// Remove replay-protection transients (stored with the `_transient_` prefix).
$articlepilot_transients = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_articlepilot_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_articlepilot_' ) . '%'
	)
);

if ( ! empty( $articlepilot_transients ) ) {
	foreach ( $articlepilot_transients as $articlepilot_transient ) {
		delete_option( $articlepilot_transient );
	}
}
// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
