<?php
/**
 * Plugin Name: Advisor Dashboard
 * Plugin URI:  https://profeds.com
 * Description: Workshop advisor dashboard with webhook-driven contact management from HighLevel.
 * Version:     0.6.0
 * Author:      Mike Kennedy
 * Author URI:  https://michealkennedy.com
 * License:     GPL-2.0-or-later
 * Text Domain: advisor-dashboard
 * Requires at least: 6.4
 * Tested up to: 6.7
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ADVDASH_VERSION', '1.0.0' );
define( 'ADVDASH_DB_VERSION', '1.3.0' );
define( 'ADVDASH_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ADVDASH_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Include classes.
require_once ADVDASH_PLUGIN_DIR . 'includes/class-activator.php';
require_once ADVDASH_PLUGIN_DIR . 'includes/class-deactivator.php';
require_once ADVDASH_PLUGIN_DIR . 'includes/class-dashboard-manager.php';
require_once ADVDASH_PLUGIN_DIR . 'includes/class-webhook-handler.php';
require_once ADVDASH_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once ADVDASH_PLUGIN_DIR . 'admin/class-admin-page.php';

// Activation / deactivation hooks.
register_activation_hook( __FILE__, array( 'AdvDash_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'AdvDash_Deactivator', 'deactivate' ) );

// Check DB version on every load — handles upgrades without re-activation.
add_action( 'plugins_loaded', function () {
	if ( get_option( 'advdash_db_version' ) !== ADVDASH_DB_VERSION ) {
		AdvDash_Activator::activate();
	}
} );

// Register REST API routes.
add_action( 'rest_api_init', function () {
	$manager = new AdvDash_Dashboard_Manager();
	$webhook = new AdvDash_Webhook_Handler( $manager );
	$api     = new AdvDash_Rest_API( $manager, $webhook );
	$api->register_routes();
} );

// Register the Gutenberg block.
add_action( 'init', function () {
	$block_path = ADVDASH_PLUGIN_DIR . 'build/blocks/advisor-dashboard';
	if ( file_exists( $block_path . '/block.json' ) ) {
		register_block_type( $block_path );
	}
} );

// Register admin menu.
add_action( 'admin_menu', array( 'AdvDash_Admin_Page', 'register_menu' ) );
add_action( 'admin_enqueue_scripts', array( 'AdvDash_Admin_Page', 'enqueue_assets' ) );

// Daily webhook log cleanup.
add_action( 'advdash_daily_log_cleanup', function () {
	$retention_days = (int) get_option( 'advdash_webhook_log_retention_days', 90 );
	$manager = new AdvDash_Dashboard_Manager();
	$manager->delete_old_webhook_logs( $retention_days );
} );

add_action( 'plugins_loaded', function () {
	if ( ! wp_next_scheduled( 'advdash_daily_log_cleanup' ) ) {
		wp_schedule_event( time(), 'daily', 'advdash_daily_log_cleanup' );
	}
}, 20 );
