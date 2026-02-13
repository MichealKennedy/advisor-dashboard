<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Activator {

	public static function activate() {
		self::create_tables();
		flush_rewrite_rules();
	}

	private static function create_tables() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();

		$sql = [];

		// Dashboards table.
		$table_dashboards = $wpdb->prefix . 'advdash_dashboards';
		$sql[] = "CREATE TABLE {$table_dashboards} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			wp_user_id bigint(20) unsigned NOT NULL,
			name varchar(255) NOT NULL,
			member_workshop_code varchar(100) DEFAULT NULL,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY wp_user_id (wp_user_id),
			UNIQUE KEY member_workshop_code (member_workshop_code)
		) {$charset_collate};";

		// Contacts table.
		$table_contacts = $wpdb->prefix . 'advdash_contacts';
		$sql[] = "CREATE TABLE {$table_contacts} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			dashboard_id bigint(20) unsigned NOT NULL,
			tab varchar(50) NOT NULL,
			contact_id varchar(100) DEFAULT NULL,
			first_name varchar(255) DEFAULT NULL,
			last_name varchar(255) DEFAULT NULL,
			spouse_name varchar(255) DEFAULT NULL,
			workshop_date date DEFAULT NULL,
			food_option_fed varchar(255) DEFAULT NULL,
			side_option_fed varchar(255) DEFAULT NULL,
			food_option_spouse varchar(255) DEFAULT NULL,
			side_option_spouse varchar(255) DEFAULT NULL,
			rsvp_confirmed varchar(100) DEFAULT NULL,
			city varchar(255) DEFAULT NULL,
			state varchar(255) DEFAULT NULL,
			postal_code varchar(20) DEFAULT NULL,
			home_address varchar(500) DEFAULT NULL,
			other_address varchar(500) DEFAULT NULL,
			other_city varchar(255) DEFAULT NULL,
			other_state varchar(255) DEFAULT NULL,
			other_postal_code varchar(20) DEFAULT NULL,
			special_provisions varchar(255) DEFAULT NULL,
			retirement_system varchar(255) DEFAULT NULL,
			registration_form_completed date DEFAULT NULL,
			member_workshop_code varchar(100) DEFAULT NULL,
			work_phone varchar(50) DEFAULT NULL,
			cell_phone varchar(50) DEFAULT NULL,
			old_phone varchar(50) DEFAULT NULL,
			work_email varchar(255) DEFAULT NULL,
			personal_email varchar(255) DEFAULT NULL,
			other_email varchar(255) DEFAULT NULL,
			best_email varchar(255) DEFAULT NULL,
			agency varchar(255) DEFAULT NULL,
			time_frame_for_retirement varchar(255) DEFAULT NULL,
			comment_on_registration text DEFAULT NULL,
			training_action text DEFAULT NULL,
			tell_others text DEFAULT NULL,
			additional_comments text DEFAULT NULL,
			rate_material varchar(100) DEFAULT NULL,
			rate_virtual_environment varchar(100) DEFAULT NULL,
			meet_for_report varchar(10) DEFAULT NULL,
			date_of_lead_request date DEFAULT NULL,
			status varchar(100) DEFAULT NULL,
			advisor_status varchar(50) DEFAULT NULL,
			advisor_notes text DEFAULT NULL,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY dashboard_tab (dashboard_id, tab),
			UNIQUE KEY dashboard_tab_contact (dashboard_id, tab, contact_id)
		) {$charset_collate};";

		// Webhook logs table.
		$table_webhook_logs = $wpdb->prefix . 'advdash_webhook_logs';
		$sql[] = "CREATE TABLE {$table_webhook_logs} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			dashboard_id bigint(20) unsigned DEFAULT NULL,
			webhook_key varchar(64) NOT NULL,
			request_body longtext DEFAULT NULL,
			parsed_tab varchar(50) DEFAULT NULL,
			parsed_action varchar(20) DEFAULT NULL,
			parsed_contact_id varchar(100) DEFAULT NULL,
			status_code smallint(5) unsigned NOT NULL DEFAULT 200,
			error_code varchar(50) DEFAULT NULL,
			error_message text DEFAULT NULL,
			response_body text DEFAULT NULL,
			ip_address varchar(45) DEFAULT NULL,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY dashboard_id (dashboard_id),
			KEY status_code (status_code),
			KEY error_code (error_code),
			KEY created_at (created_at)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		foreach ( $sql as $query ) {
			dbDelta( $query );
		}

		update_option( 'advdash_db_version', ADVDASH_DB_VERSION );
	}
}
