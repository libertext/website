=== ArticlePilot Connector ===
Contributors: articlepilot
Tags: seo, ai, content, publishing, automation
Requires at least: 5.6
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Securely connect your WordPress site to the ArticlePilot AI SEO content platform to publish AI-generated articles.

== Description ==

ArticlePilot Connector links your WordPress site to the ArticlePilot AI platform. Once paired, ArticlePilot can create, schedule, and update posts, manage categories and tags, upload media, and write SEO metadata using your active SEO plugin.

**Key features**

* One-time pairing code flow — no passwords or application passwords to copy around.
* Per-connection shared secret with HMAC-SHA256 request signing.
* Replay protection via timestamp window and single-use nonces.
* Secret rotation endpoint.
* Automatic SEO plugin detection: Rank Math, Yoast SEO, All in One SEO, or a native post-meta fallback.
* Capability-aware publishing — respects WordPress roles and permissions.
* HTTPS enforced in production.

**Supported SEO plugins**

* Rank Math
* Yoast SEO
* All in One SEO (AIOSEO)
* Native fallback (stores to `_articlepilot_*` post meta)

== Installation ==

1. Upload the `articlepilot-connector` folder to `/wp-content/plugins/`, or install the ZIP via Plugins > Add New > Upload Plugin.
2. Activate the plugin through the Plugins menu.
3. Go to Settings > ArticlePilot.
4. Click "ArticlePilot'a Bağlan" to generate a one-time pairing code.
5. Paste the code into the ArticlePilot dashboard to complete the connection.

== Frequently Asked Questions ==

= Does this plugin delete my content when removed? =

No. Uninstalling removes only the plugin's own options and secrets (keys prefixed `articlepilot_`). Your posts, media, and terms are never touched.

= Is the connection secure? =

Yes. Every API request (except the initial pairing call) is signed with HMAC-SHA256 using a per-connection secret, includes a timestamp checked against a 5-minute window, and a single-use nonce to prevent replay. HTTPS is required in production.

= What happens if I lose the pairing code? =

Generate a new one from Settings > ArticlePilot. Codes are one-time use and expire after 15 minutes.

== Changelog ==

= 1.0.0 =
* Initial release.
