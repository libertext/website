/**
 * ArticlePilot Connector admin scripts.
 *
 * Provides one-click copy for the pairing code.
 *
 * @package ArticlePilot_Connector
 */
( function () {
	'use strict';

	document.addEventListener( 'DOMContentLoaded', function () {
		var button = document.getElementById( 'articlepilot-copy-code' );
		if ( ! button ) {
			return;
		}

		var strings = window.ArticlePilotAdmin || {};

		button.addEventListener( 'click', function () {
			var targetId = button.getAttribute( 'data-target' );
			var target = document.getElementById( targetId );
			if ( ! target ) {
				return;
			}

			var text = target.textContent.trim();
			var done = function () {
				button.textContent = strings.copied || 'Copied!';
				window.setTimeout( function () {
					button.textContent = strings.copy || 'Copy';
				}, 2000 );
			};

			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( text ).then( done ).catch( function () {
					button.textContent = strings.copyFail || 'Press Ctrl+C to copy';
				} );
			} else {
				// Legacy fallback.
				var range = document.createRange();
				range.selectNodeContents( target );
				var selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange( range );
				try {
					document.execCommand( 'copy' );
					done();
				} catch ( e ) {
					button.textContent = strings.copyFail || 'Press Ctrl+C to copy';
				}
				selection.removeAllRanges();
			}
		} );
	} );
}() );
