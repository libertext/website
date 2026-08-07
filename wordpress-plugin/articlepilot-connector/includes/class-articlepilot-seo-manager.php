<?php
/**
 * SEO manager: chooses and drives the correct SEO adapter.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_SEO_Manager
 *
 * Detects the active SEO plugin and delegates SEO writes to the matching
 * adapter, falling back to the native (post meta) adapter when none is found.
 */
class ArticlePilot_SEO_Manager {

	/**
	 * Ordered list of adapter instances (specific plugins first, native last).
	 *
	 * @var ArticlePilot_SEO_Adapter_Interface[]
	 */
	protected $adapters = array();

	/**
	 * The active adapter, resolved lazily.
	 *
	 * @var ArticlePilot_SEO_Adapter_Interface|null
	 */
	protected $active = null;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->adapters = array(
			new ArticlePilot_RankMath_Adapter(),
			new ArticlePilot_Yoast_Adapter(),
			new ArticlePilot_AIOSEO_Adapter(),
			new ArticlePilot_Native_Adapter(),
		);
	}

	/**
	 * Resolve the active adapter (first that reports active; native is always
	 * active, so this never returns null).
	 *
	 * @return ArticlePilot_SEO_Adapter_Interface
	 */
	public function get_active_adapter() {
		if ( null !== $this->active ) {
			return $this->active;
		}

		foreach ( $this->adapters as $adapter ) {
			if ( $adapter->is_active() ) {
				$this->active = $adapter;
				break;
			}
		}

		// Safety net: native adapter is always active.
		if ( null === $this->active ) {
			$this->active = new ArticlePilot_Native_Adapter();
		}

		return $this->active;
	}

	/**
	 * Return the detected SEO plugin slug.
	 *
	 * @return string One of: rank-math, yoast, aioseo, native.
	 */
	public function detect_plugin() {
		return $this->get_active_adapter()->get_slug();
	}

	/**
	 * Human-readable name of the detected SEO plugin.
	 *
	 * @return string
	 */
	public function detect_plugin_name() {
		return $this->get_active_adapter()->get_name();
	}

	/**
	 * Write normalized SEO metadata for a post using the active adapter.
	 *
	 * @param int   $post_id Post id.
	 * @param array $seo     Normalized SEO fields.
	 * @return void
	 */
	public function write_seo( $post_id, array $seo ) {
		if ( empty( $seo ) ) {
			return;
		}
		$this->get_active_adapter()->write_meta( $post_id, $seo );
	}
}
