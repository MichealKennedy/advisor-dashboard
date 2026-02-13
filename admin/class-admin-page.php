<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Admin_Page {

	private static $hook_suffix = null;

	public static function register_menu() {
		self::$hook_suffix = add_menu_page(
			'Dashboards',
			'Dashboards',
			'manage_options',
			'advisor-dashboard',
			array( __CLASS__, 'render_page' ),
			'dashicons-businessman',
			30
		);
	}

	public static function render_page() {
		echo '<div class="wrap"><div id="advisor-dashboard-admin"></div></div>';
	}

	public static function enqueue_assets( $hook ) {
		if ( self::$hook_suffix !== $hook ) {
			return;
		}

		$asset_file = ADVDASH_PLUGIN_DIR . 'build/admin/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'advdash-admin',
			ADVDASH_PLUGIN_URL . 'build/admin/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		// Enqueue CSS if it exists.
		$css_path = ADVDASH_PLUGIN_DIR . 'build/admin/index.css';
		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'advdash-admin',
				ADVDASH_PLUGIN_URL . 'build/admin/index.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		// Always load wp-components styles for the admin UI.
		wp_enqueue_style( 'wp-components' );

		wp_localize_script( 'advdash-admin', 'advdashAdmin', array(
			'restUrl' => esc_url_raw( rest_url( 'advisor-dashboard/v1' ) ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
			'siteUrl' => site_url(),
		) );
	}
}
