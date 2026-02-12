<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Drop tables in dependency order.
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_contacts" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_webhooks" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}advdash_dashboards" );

// Remove options.
delete_option( 'advdash_db_version' );
