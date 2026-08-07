<?php
/**
 * Rank Math SEO adapter.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_RankMath_Adapter
 *
 * Writes SEO metadata using the meta keys understood by Rank Math.
 */
class ArticlePilot_RankMath_Adapter implements ArticlePilot_SEO_Adapter_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function get_slug() {
		return 'rank-math';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_name() {
		return 'Rank Math';
	}

	/**
	 * Detect Rank Math.
	 *
	 * @return bool
	 */
	public function is_active() {
		return class_exists( 'RankMath' ) || defined( 'RANK_MATH_VERSION' );
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
			update_post_meta( $post_id, 'rank_math_title', sanitize_text_field( $seo['seo_title'] ) );
		}
		if ( isset( $seo['meta_description'] ) ) {
			update_post_meta( $post_id, 'rank_math_description', sanitize_text_field( $seo['meta_description'] ) );
		}
		if ( isset( $seo['focus_keyword'] ) ) {
			update_post_meta( $post_id, 'rank_math_focus_keyword', sanitize_text_field( $seo['focus_keyword'] ) );
		}
		if ( isset( $seo['canonical'] ) ) {
			update_post_meta( $post_id, 'rank_math_canonical_url', esc_url_raw( $seo['canonical'] ) );
		}
		if ( isset( $seo['og_title'] ) ) {
			update_post_meta( $post_id, 'rank_math_facebook_title', sanitize_text_field( $seo['og_title'] ) );
		}
		if ( isset( $seo['og_description'] ) ) {
			update_post_meta( $post_id, 'rank_math_facebook_description', sanitize_text_field( $seo['og_description'] ) );
		}

		if ( isset( $seo['robots'] ) ) {
			$robots = is_array( $seo['robots'] ) ? $seo['robots'] : array_map( 'trim', explode( ',', (string) $seo['robots'] ) );
			$robots = array_values( array_filter( array_map( 'sanitize_text_field', $robots ) ) );
			// Rank Math stores robots as a serialized array of directives.
			update_post_meta( $post_id, 'rank_math_robots', $robots );
		}
	}
}
