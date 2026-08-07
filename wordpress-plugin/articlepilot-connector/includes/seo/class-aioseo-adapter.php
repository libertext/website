<?php
/**
 * All in One SEO (AIOSEO) adapter.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ArticlePilot_AIOSEO_Adapter
 *
 * Writes SEO metadata for All in One SEO. AIOSEO stores per-post SEO in a
 * custom table via its ORM. When the ORM is available we use it; otherwise we
 * fall back to post meta so the data is not lost.
 */
class ArticlePilot_AIOSEO_Adapter implements ArticlePilot_SEO_Adapter_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function get_slug() {
		return 'aioseo';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_name() {
		return 'All in One SEO';
	}

	/**
	 * Detect AIOSEO.
	 *
	 * @return bool
	 */
	public function is_active() {
		return function_exists( 'aioseo' ) || defined( 'AIOSEO_VERSION' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function write_meta( $post_id, array $seo ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}

		// Preferred path: AIOSEO's own post model.
		if ( $this->write_via_orm( $post_id, $seo ) ) {
			return;
		}

		// Fallback: post meta (AIOSEO also reads several of these).
		if ( isset( $seo['seo_title'] ) ) {
			update_post_meta( $post_id, '_aioseo_title', sanitize_text_field( $seo['seo_title'] ) );
		}
		if ( isset( $seo['meta_description'] ) ) {
			update_post_meta( $post_id, '_aioseo_description', sanitize_text_field( $seo['meta_description'] ) );
		}
		if ( isset( $seo['focus_keyword'] ) ) {
			update_post_meta( $post_id, '_aioseo_keywords', sanitize_text_field( $seo['focus_keyword'] ) );
		}
		if ( isset( $seo['canonical'] ) ) {
			update_post_meta( $post_id, '_aioseo_canonical_url', esc_url_raw( $seo['canonical'] ) );
		}
		if ( isset( $seo['og_title'] ) ) {
			update_post_meta( $post_id, '_aioseo_og_title', sanitize_text_field( $seo['og_title'] ) );
		}
		if ( isset( $seo['og_description'] ) ) {
			update_post_meta( $post_id, '_aioseo_og_description', sanitize_text_field( $seo['og_description'] ) );
		}
	}

	/**
	 * Attempt to persist SEO data via the AIOSEO ORM.
	 *
	 * @param int   $post_id Post id.
	 * @param array $seo     Normalized SEO fields.
	 * @return bool True when written through the ORM.
	 */
	protected function write_via_orm( $post_id, array $seo ) {
		if ( ! class_exists( '\AIOSEO\Plugin\Common\Models\Post' ) ) {
			return false;
		}

		try {
			$aioseo_post = \AIOSEO\Plugin\Common\Models\Post::getPost( $post_id );
			if ( ! $aioseo_post ) {
				return false;
			}

			if ( isset( $seo['seo_title'] ) ) {
				$aioseo_post->title = sanitize_text_field( $seo['seo_title'] );
			}
			if ( isset( $seo['meta_description'] ) ) {
				$aioseo_post->description = sanitize_text_field( $seo['meta_description'] );
			}
			if ( isset( $seo['focus_keyword'] ) ) {
				$aioseo_post->keyphrases = wp_json_encode(
					array(
						'focus' => array(
							'keyphrase' => sanitize_text_field( $seo['focus_keyword'] ),
						),
					)
				);
			}
			if ( isset( $seo['canonical'] ) ) {
				$aioseo_post->canonical_url = esc_url_raw( $seo['canonical'] );
			}
			if ( isset( $seo['og_title'] ) ) {
				$aioseo_post->og_title = sanitize_text_field( $seo['og_title'] );
			}
			if ( isset( $seo['og_description'] ) ) {
				$aioseo_post->og_description = sanitize_text_field( $seo['og_description'] );
			}

			if ( isset( $seo['robots'] ) ) {
				$list = is_array( $seo['robots'] ) ? $seo['robots'] : array_map( 'trim', explode( ',', (string) $seo['robots'] ) );
				$list = array_map( 'strtolower', array_map( 'sanitize_text_field', $list ) );

				$aioseo_post->robots_default  = false;
				$aioseo_post->robots_noindex  = in_array( 'noindex', $list, true );
				$aioseo_post->robots_nofollow = in_array( 'nofollow', $list, true );
			}

			$aioseo_post->post_id = $post_id;
			$aioseo_post->save();

			return true;
		} catch ( Exception $e ) {
			return false;
		}
	}
}
