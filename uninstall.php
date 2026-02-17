<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Drop tables in dependency order.
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_webhook_logs" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_dashboard_users" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_contacts" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_dashboards" );

// Remove options.
delete_option( 'advdash_db_version' );
delete_option( 'advdash_shared_webhook_key' );
delete_option( 'advdash_webhook_logging' );
delete_option( 'advdash_webhook_log_retention_days' );
delete_option( 'advdash_failure_alert_url' );
delete_option( 'advdash_failure_alert_threshold' );
delete_option( 'advdash_failure_alert_window' );
delete_option( 'advdash_failure_alert_cooldown' );

// Remove transients.
delete_transient( 'advdash_failure_alert_cooldown' );

// Remove user meta created by the plugin.
$wpdb->delete( $wpdb->usermeta, array( 'meta_key' => 'advdash_column_prefs' ), array( '%s' ) );

// Clear scheduled events.
wp_clear_scheduled_hook( 'advdash_daily_log_cleanup' );
