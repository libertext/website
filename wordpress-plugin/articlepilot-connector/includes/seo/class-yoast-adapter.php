<?php
/**
 * Yoast SEO adapter.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_Yoast_Adapter
 *
 * Writes SEO metadata using the `_yoast_wpseo_*` meta keys.
 */
class ArticlePilot_Yoast_Adapter implements ArticlePilot_SEO_Adapter_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function get_slug() {
		return 'yoast';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_name() {
		return 'Yoast SEO';
	}

	/**
	 * Detect Yoast SEO.
	 *
	 * @return bool
	 */
	public function is_active() {
		return defined( 'WPSEO_VERSION' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function write_meta( $post_id, array $seo ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}

		if ( isset( $seo['seo_title'] ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_title', sanitize_text_field( $seo['seo_title'] ) );
		}
		if ( isset( $seo['meta_description'] ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_metadesc', sanitize_text_field( $seo['meta_description'] ) );
		}
		if ( isset( $seo['focus_keyword'] ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_focuskw', sanitize_text_field( $seo['focus_keyword'] ) );
		}
		if ( isset( $seo['canonical'] ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_canonical', esc_url_raw( $seo['canonical'] ) );
		}
		if ( isset( $seo['og_title'] ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_opengraph-title', sanitize_text_field( $seo['og_title'] ) );
		}
		if ( isset( $seo['og_description'] ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_opengraph-description', sanitize_text_field( $seo['og_description'] ) );
		}

		if ( isset( $seo['robots'] ) ) {
			$this->write_robots( $post_id, $seo['robots'] );
		}
	}

	/**
	 * Map robots directives to Yoast's separate noindex / nofollow meta.
	 *
	 * @param int          $post_id Post id.
	 * @param array|string $robots  Robots directives.
	 * @return void
	 */
	protected function write_robots( $post_id, $robots ) {
		$list = is_array( $robots ) ? $robots : array_map( 'trim', explode( ',', (string) $robots ) );
		$list = array_map( 'strtolower', array_map( 'sanitize_text_field', $list ) );

		if ( in_array( 'noindex', $list, true ) ) {
			// Yoast: 1 = noindex, 2 = index.
			update_post_meta( $post_id, '_yoast_wpseo_meta-robots-noindex', '1' );
		} elseif ( in_array( 'index', $list, true ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_meta-robots-noindex', '2' );
		}

		if ( in_array( 'nofollow', $list, true ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_meta-robots-nofollow', 'nofollow' );
		} elseif ( in_array( 'follow', $list, true ) ) {
			update_post_meta( $post_id, '_yoast_wpseo_meta-robots-nofollow', '' );
		}
	}
}
