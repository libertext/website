<?php
/**
 * SEO adapter interface.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Interface ArticlePilot_SEO_Adapter_Interface
 *
 * Contract for writing SEO metadata to a post regardless of which SEO plugin
 * (if any) is active. Implementations translate a normalized SEO payload into
 * the meta keys each plugin expects.
 */
interface ArticlePilot_SEO_Adapter_Interface {

	/**
	 * Machine slug for this adapter (e.g. "rank-math", "yoast", "native").
	 *
	 * @return string
	 */
	public function get_slug();

	/**
	 * Human-readable name of the target SEO plugin.
	 *
	 * @return string
	 */
	public function get_name();

	/**
	 * Whether the underlying SEO plugin is active.
	 *
	 * @return bool
	 */
	public function is_active();

	/**
	 * Write SEO metadata for a post.
	 *
	 * Accepted keys (all optional):
	 *   - seo_title
	 *   - meta_description
	 *   - focus_keyword
	 *   - canonical
	 *   - robots            (array|string, e.g. ['noindex','nofollow'])
	 *   - og_title
	 *   - og_description
	 *
	 * Implementations must ignore unknown keys and skip keys that are not set.
	 *
	 * @param int   $post_id Target post id.
	 * @param array $seo     Normalized SEO fields.
	 * @return void
	 */
	public function write_meta( $post_id, array $seo );
}
