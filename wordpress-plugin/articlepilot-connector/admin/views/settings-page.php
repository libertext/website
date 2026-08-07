<?php
/**
 * Settings page view.
 *
 * Expects the following variables from ArticlePilot_Admin::render_page():
 *
 * @var bool   $is_connected    Whether a connection exists.
 * @var string $site_id         Stable site identifier.
 * @var int    $paired_at       Unix timestamp of pairing.
 * @var string $new_code        Freshly generated pairing code (shown once).
 * @var bool   $has_active_code Whether an unused code is pending.
 * @var int    $code_expiry     Seconds until the pending code expires.
 * @var string $seo_plugin      Detected SEO plugin name.
 * @var string $nonce_action    Nonce action for the form.
 *
 * @package ArticlePilot_Connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap articlepilot-wrap">
	<h1><?php esc_html_e( 'ArticlePilot Connector', 'articlepilot-connector' ); ?></h1>

	<p class="articlepilot-intro">
		<?php esc_html_e( 'ArticlePilot AI ile WordPress sitenizi güvenli bir şekilde bağlayın ve yapay zeka ile üretilen SEO içeriklerini otomatik olarak yayınlayın.', 'articlepilot-connector' ); ?>
	</p>

	<div class="articlepilot-card">
		<h2><?php esc_html_e( 'Bağlantı Durumu', 'articlepilot-connector' ); ?></h2>

		<table class="widefat articlepilot-status-table">
			<tbody>
				<tr>
					<th scope="row"><?php esc_html_e( 'Durum', 'articlepilot-connector' ); ?></th>
					<td>
						<?php if ( $is_connected ) : ?>
							<span class="articlepilot-badge articlepilot-badge--ok"><?php esc_html_e( 'Bağlı', 'articlepilot-connector' ); ?></span>
						<?php else : ?>
							<span class="articlepilot-badge articlepilot-badge--off"><?php esc_html_e( 'Bağlı Değil', 'articlepilot-connector' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Site ID', 'articlepilot-connector' ); ?></th>
					<td><code><?php echo esc_html( $site_id ? $site_id : '—' ); ?></code></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Son Bağlantı Zamanı', 'articlepilot-connector' ); ?></th>
					<td>
						<?php
						if ( $paired_at ) {
							echo esc_html(
								wp_date(
									get_option( 'date_format' ) . ' ' . get_option( 'time_format' ),
									$paired_at
								)
							);
						} else {
							echo '—';
						}
						?>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Algılanan SEO Eklentisi', 'articlepilot-connector' ); ?></th>
					<td><?php echo esc_html( $seo_plugin ); ?></td>
				</tr>
			</tbody>
		</table>
	</div>

	<?php if ( '' !== $new_code ) : ?>
		<div class="articlepilot-card articlepilot-card--highlight">
			<h2><?php esc_html_e( 'Bağlantı Kodunuz', 'articlepilot-connector' ); ?></h2>
			<p><?php esc_html_e( 'Aşağıdaki kodu ArticlePilot panelindeki bağlantı ekranına yapıştırın. Bu kod yalnızca bir kez gösterilir ve tek kullanımlıktır.', 'articlepilot-connector' ); ?></p>
			<div class="articlepilot-code-box">
				<code id="articlepilot-pairing-code"><?php echo esc_html( $new_code ); ?></code>
				<button type="button" class="button button-secondary" id="articlepilot-copy-code" data-target="articlepilot-pairing-code">
					<?php esc_html_e( 'Copy', 'articlepilot-connector' ); ?>
				</button>
			</div>
			<p class="description">
				<?php esc_html_e( 'Kod 15 dakika içinde geçerliliğini yitirir.', 'articlepilot-connector' ); ?>
			</p>
		</div>
	<?php elseif ( $has_active_code ) : ?>
		<div class="articlepilot-card articlepilot-notice-inline">
			<p>
				<?php
				printf(
					/* translators: %d: minutes remaining. */
					esc_html__( 'Kullanılmamış bir bağlantı kodu bekliyor (yaklaşık %d dakika içinde sona erecek). Kaybettiyseniz yeni bir kod oluşturun.', 'articlepilot-connector' ),
					(int) ceil( $code_expiry / 60 )
				);
				?>
			</p>
		</div>
	<?php endif; ?>

	<div class="articlepilot-card">
		<h2><?php esc_html_e( 'İşlemler', 'articlepilot-connector' ); ?></h2>

		<div class="articlepilot-actions">
			<?php if ( ! $is_connected ) : ?>
				<form method="post" class="articlepilot-action-form">
					<?php wp_nonce_field( $nonce_action ); ?>
					<input type="hidden" name="articlepilot_action" value="generate" />
					<button type="submit" class="button button-primary button-hero">
						<?php esc_html_e( "ArticlePilot'a Bağlan", 'articlepilot-connector' ); ?>
					</button>
				</form>
			<?php else : ?>
				<form method="post" class="articlepilot-action-form">
					<?php wp_nonce_field( $nonce_action ); ?>
					<input type="hidden" name="articlepilot_action" value="regenerate" />
					<button type="submit" class="button button-secondary">
						<?php esc_html_e( 'Yeni Bağlantı Kodu Oluştur', 'articlepilot-connector' ); ?>
					</button>
				</form>

				<form method="post" class="articlepilot-action-form" onsubmit="return confirm('<?php echo esc_js( __( 'Bağlantıyı kesmek istediğinize emin misiniz? ArticlePilot artık bu siteye içerik gönderemez.', 'articlepilot-connector' ) ); ?>');">
					<?php wp_nonce_field( $nonce_action ); ?>
					<input type="hidden" name="articlepilot_action" value="disconnect" />
					<button type="submit" class="button button-link-delete">
						<?php esc_html_e( 'Bağlantıyı Kes', 'articlepilot-connector' ); ?>
					</button>
				</form>
			<?php endif; ?>
		</div>
	</div>

	<div class="articlepilot-card">
		<h2><?php esc_html_e( 'İzinler', 'articlepilot-connector' ); ?></h2>
		<p><?php esc_html_e( 'Bağlandığınızda ArticlePilot, güvenli imzalı istekler kullanarak yalnızca aşağıdaki işlemleri gerçekleştirebilir:', 'articlepilot-connector' ); ?></p>
		<ul class="articlepilot-permissions">
			<li><?php esc_html_e( 'Yazı oluşturmak, güncellemek ve zamanlamak (taslak, beklemede veya yayınlanmış).', 'articlepilot-connector' ); ?></li>
			<li><?php esc_html_e( 'Kategori ve etiket oluşturmak ve atamak.', 'articlepilot-connector' ); ?></li>
			<li><?php esc_html_e( 'Görsel yüklemek ve öne çıkan görsel olarak ayarlamak.', 'articlepilot-connector' ); ?></li>
			<li><?php esc_html_e( 'SEO meta verilerini yazmak (başlık, açıklama, odak anahtar kelime vb.).', 'articlepilot-connector' ); ?></li>
			<li><?php esc_html_e( 'Yazar, kategori ve etiket listelerini okumak.', 'articlepilot-connector' ); ?></li>
		</ul>
		<p class="description">
			<?php esc_html_e( 'Her istek HMAC-SHA256 ile imzalanır ve zaman damgası ile tek kullanımlık nonce içerir. Bağlantıyı istediğiniz zaman kesebilirsiniz.', 'articlepilot-connector' ); ?>
		</p>
	</div>
</div>
