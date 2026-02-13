<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Not logged in — show login prompt.
if ( ! is_user_logged_in() ) {
	printf(
		'<div %s><div class="advdash-login-required"><p>%s</p><p><a href="%s" class="advdash-login-link">%s</a></p></div></div>',
		get_block_wrapper_attributes(),
		esc_html__( 'Please log in to view your advisor dashboard.', 'advisor-dashboard' ),
		esc_url( wp_login_url( get_permalink() ) ),
		esc_html__( 'Log In', 'advisor-dashboard' )
	);
	return;
}

// Check if user has a dashboard.
global $wpdb;
$user_id   = get_current_user_id();
$table     = $wpdb->prefix . 'advdash_dashboards';
$is_admin  = current_user_can( 'manage_options' );
$dashboard = $wpdb->get_row( $wpdb->prepare(
	"SELECT id, name FROM {$table} WHERE wp_user_id = %d",
	$user_id
) );

// For admins, fetch all dashboards so they can switch between them.
$all_dashboards = array();
if ( $is_admin ) {
	$all_dashboards = $wpdb->get_results(
		"SELECT d.id, d.name, u.display_name AS user_display_name
		 FROM {$table} d
		 LEFT JOIN {$wpdb->users} u ON u.ID = d.wp_user_id
		 ORDER BY d.name ASC"
	);
}

if ( ! $dashboard && ! $is_admin ) {
	printf(
		'<div %s><div class="advdash-no-dashboard"><p>%s</p></div></div>',
		get_block_wrapper_attributes(),
		esc_html__( 'No dashboard is configured for your account. Please contact your administrator.', 'advisor-dashboard' )
	);
	return;
}

// Admin without own dashboard — use first available dashboard as default.
if ( ! $dashboard && $is_admin ) {
	if ( empty( $all_dashboards ) ) {
		printf(
			'<div %s><div class="advdash-no-dashboard"><p>%s</p></div></div>',
			get_block_wrapper_attributes(),
			esc_html__( 'No dashboards have been created yet. Visit the admin panel to create one.', 'advisor-dashboard' )
		);
		return;
	}
	$dashboard = $all_dashboards[0];
}

// Inject nonce and dashboard data for the frontend React app.
// Build the script handle manually for compatibility with WP < 6.5.
$view_handle = 'advisor-dashboard-dashboard-view-script';
$column_prefs = get_user_meta( $user_id, 'advdash_column_prefs', true );
if ( ! is_array( $column_prefs ) ) {
	$column_prefs = new \stdClass(); // Empty object for JSON encoding.
}

wp_localize_script( $view_handle, 'advdashFrontend', array(
	'restUrl'        => esc_url_raw( rest_url( 'advisor-dashboard/v1' ) ),
	'nonce'          => wp_create_nonce( 'wp_rest' ),
	'dashboardId'    => (int) $dashboard->id,
	'dashboardName'  => $dashboard->name,
	'isAdmin'        => $is_admin,
	'allDashboards'  => $is_admin ? array_map( function( $d ) {
		return array(
			'id'   => (int) $d->id,
			'name' => $d->name,
			'user' => $d->user_display_name,
		);
	}, $all_dashboards ) : array(),
	'columnPrefs'    => $column_prefs,
) );

// Output the React mount point.
printf(
	'<div %s><div id="advisor-dashboard-app" data-dashboard-id="%s" data-dashboard-name="%s"></div></div>',
	get_block_wrapper_attributes(),
	esc_attr( $dashboard->id ),
	esc_attr( $dashboard->name )
);
