<?php
/**
 * Native (no SEO plugin) adapter.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_Native_Adapter
 *
 * Fallback adapter used when no supported SEO plugin is active. Stores SEO
 * fields as plugin-namespaced post meta (`_articlepilot_*`). These can be read
 * by a theme or exposed later if an SEO plugin is installed.
 */
class ArticlePilot_Native_Adapter implements ArticlePilot_SEO_Adapter_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function get_slug() {
		return 'native';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_name() {
		return __( 'Native (post meta)', 'articlepilot-connector' );
	}

	/**
	 * The native adapter is always available.
	 *
	 * @return bool
	 */
	public function is_active() {
		return true;
	}

	/**
	 * {@inheritDoc}
	 */
	public function write_meta( $post_id, array $seo ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}

		$map = array(
			'seo_title'        => '_articlepilot_seo_title',
			'meta_description' => '_articlepilot_meta_description',
			'focus_keyword'    => '_articlepilot_focus_keyword',
			'canonical'        => '_articlepilot_canonical',
			'og_title'         => '_articlepilot_og_title',
			'og_description'   => '_articlepilot_og_description',
		);

		foreach ( $map as $field => $meta_key ) {
			if ( ! isset( $seo[ $field ] ) ) {
				continue;
			}
			$value = ( 'canonical' === $field )
				? esc_url_raw( $seo[ $field ] )
				: sanitize_text_field( $seo[ $field ] );
			update_post_meta( $post_id, $meta_key, $value );
		}

		if ( isset( $seo['robots'] ) ) {
			$robots = $this->normalize_robots( $seo['robots'] );
			update_post_meta( $post_id, '_articlepilot_robots', $robots );
		}
	}

	/**
	 * Normalize a robots directive into a sanitized comma list string.
	 *
	 * @param array|string $robots Robots directives.
	 * @return string
	 */
	protected function normalize_robots( $robots ) {
		if ( is_array( $robots ) ) {
			$robots = array_map( 'sanitize_text_field', $robots );
			return implode( ',', array_filter( $robots ) );
		}
		return sanitize_text_field( $robots );
	}
}
