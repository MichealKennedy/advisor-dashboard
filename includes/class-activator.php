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
			is_active tinyint(1) NOT NULL DEFAULT 1,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY wp_user_id (wp_user_id),
			UNIQUE KEY member_workshop_code (member_workshop_code)
		) {$charset_collate};";

		// Dashboard-to-user junction table (many-to-many).
		$table_dashboard_users = $wpdb->prefix . 'advdash_dashboard_users';
		$sql[] = "CREATE TABLE {$table_dashboard_users} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			dashboard_id bigint(20) unsigned NOT NULL,
			wp_user_id bigint(20) unsigned NOT NULL,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY dashboard_user (dashboard_id, wp_user_id),
			KEY wp_user_id (wp_user_id)
		) {$charset_collate};";

		// Contacts table.
		$table_contacts = $wpdb->prefix . 'advdash_contacts';
		$sql[] = "CREATE TABLE {$table_contacts} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			dashboard_id bigint(20) unsigned NOT NULL,
			tab varchar(50) DEFAULT NULL,
			contact_id varchar(100) DEFAULT NULL,
			contact_status varchar(50) NOT NULL DEFAULT 'registered',
			previous_status varchar(50) DEFAULT NULL,
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
			KEY dashboard_status (dashboard_id, contact_status),
			UNIQUE KEY dashboard_contact (dashboard_id, contact_id)
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

		// Migration: populate junction table and drop UNIQUE index on wp_user_id.
		$old_version = get_option( 'advdash_db_version', '0' );
		if ( version_compare( $old_version, '1.4.0', '<' ) ) {
			$table_dashboard_users = $wpdb->prefix . 'advdash_dashboard_users';

			// Migrate existing wp_user_id values into the junction table.
			$wpdb->query(
				"INSERT IGNORE INTO {$table_dashboard_users} (dashboard_id, wp_user_id)
				 SELECT id, wp_user_id FROM {$table_dashboards}
				 WHERE wp_user_id IS NOT NULL AND wp_user_id > 0"
			);

			// Drop the UNIQUE index on wp_user_id (if it exists) so multiple
			// dashboards are no longer constrained to unique users.
			$index_exists = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_dashboards}'
				   AND INDEX_NAME = 'wp_user_id'"
			);
			if ( $index_exists ) {
				$wpdb->query( "ALTER TABLE {$table_dashboards} DROP INDEX wp_user_id" );
			}
		}

		// Migration 2.0.0: Replace tab-based model with contact_status.
		if ( version_compare( $old_version, '2.0.0', '<' ) ) {
			$table_contacts = $wpdb->prefix . 'advdash_contacts';

			// Check if the old tab column has data to migrate.
			$has_tab_data = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_contacts}'
				   AND COLUMN_NAME = 'tab'"
			);

			if ( $has_tab_data ) {
				// Step 1: Populate contact_status from existing tab values.
				$wpdb->query(
					"UPDATE {$table_contacts} SET contact_status = CASE tab
						WHEN 'current_registrations' THEN 'registered'
						WHEN 'attended_report' THEN 'attended_report'
						WHEN 'attended_other' THEN 'attended_other'
						WHEN 'fed_request' THEN 'fed_request'
						ELSE 'registered'
					END
					WHERE contact_status = 'registered' OR contact_status = '' OR contact_status IS NULL"
				);

				// Step 2: De-duplicate contacts that exist across multiple tabs.
				// Priority: fed_request(4) > attended_report(3) > attended_other(2) > registered(1).
				// For each (dashboard_id, contact_id) group with multiple rows,
				// keep the highest-priority row and merge advisor data from others.

				// Assign priority scores.
				$priority_case = "CASE contact_status
					WHEN 'fed_request' THEN 4
					WHEN 'attended_report' THEN 3
					WHEN 'attended_other' THEN 2
					ELSE 1
				END";

				// Find the winning row ID for each duplicate group (only non-NULL contact_id).
				// Also merge advisor_notes/advisor_status from lower-priority rows.
				$duplicates = $wpdb->get_results(
					"SELECT dashboard_id, contact_id, COUNT(*) as cnt
					 FROM {$table_contacts}
					 WHERE contact_id IS NOT NULL
					 GROUP BY dashboard_id, contact_id
					 HAVING cnt > 1"
				);

				foreach ( $duplicates as $dup ) {
					// Get all rows for this duplicate, ordered by priority desc.
					$rows = $wpdb->get_results( $wpdb->prepare(
						"SELECT id, contact_status, advisor_status, advisor_notes, {$priority_case} AS priority
						 FROM {$table_contacts}
						 WHERE dashboard_id = %d AND contact_id = %s
						 ORDER BY {$priority_case} DESC, updated_at DESC",
						$dup->dashboard_id,
						$dup->contact_id
					) );

					if ( count( $rows ) < 2 ) {
						continue;
					}

					$winner = $rows[0];
					$loser_ids = array();

					foreach ( array_slice( $rows, 1 ) as $loser ) {
						// Merge advisor_notes if winner lacks them.
						if ( empty( $winner->advisor_notes ) && ! empty( $loser->advisor_notes ) ) {
							$wpdb->update(
								$table_contacts,
								array( 'advisor_notes' => $loser->advisor_notes ),
								array( 'id' => $winner->id ),
								array( '%s' ),
								array( '%d' )
							);
						}
						// Merge advisor_status if winner lacks it.
						if ( empty( $winner->advisor_status ) && ! empty( $loser->advisor_status ) ) {
							$wpdb->update(
								$table_contacts,
								array( 'advisor_status' => $loser->advisor_status ),
								array( 'id' => $winner->id ),
								array( '%s' ),
								array( '%d' )
							);
						}
						$loser_ids[] = (int) $loser->id;
					}

					// Delete losing rows.
					if ( ! empty( $loser_ids ) ) {
						$ids_placeholder = implode( ',', $loser_ids );
						$wpdb->query( "DELETE FROM {$table_contacts} WHERE id IN ({$ids_placeholder})" );
					}
				}
			}

			// Step 3: Drop old indexes and add new ones.
			// dbDelta doesn't handle index changes reliably, so use ALTER TABLE.
			$old_unique_exists = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_contacts}'
				   AND INDEX_NAME = 'dashboard_tab_contact'"
			);
			if ( $old_unique_exists ) {
				$wpdb->query( "ALTER TABLE {$table_contacts} DROP INDEX dashboard_tab_contact" );
			}

			$old_index_exists = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_contacts}'
				   AND INDEX_NAME = 'dashboard_tab'"
			);
			if ( $old_index_exists ) {
				$wpdb->query( "ALTER TABLE {$table_contacts} DROP INDEX dashboard_tab" );
			}

			// Add new indexes (if they don't already exist from dbDelta).
			$new_unique_exists = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_contacts}'
				   AND INDEX_NAME = 'dashboard_contact'"
			);
			if ( ! $new_unique_exists ) {
				$wpdb->query( "ALTER TABLE {$table_contacts} ADD UNIQUE KEY dashboard_contact (dashboard_id, contact_id)" );
			}

			$new_index_exists = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_contacts}'
				   AND INDEX_NAME = 'dashboard_status'"
			);
			if ( ! $new_index_exists ) {
				$wpdb->query( "ALTER TABLE {$table_contacts} ADD KEY dashboard_status (dashboard_id, contact_status)" );
			}
		}

		// Migration 2.1.0: Add is_active column to dashboards.
		if ( version_compare( $old_version, '2.1.0', '<' ) ) {
			$col_exists = $wpdb->get_var(
				"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = '{$table_dashboards}'
				   AND COLUMN_NAME = 'is_active'"
			);
			if ( ! $col_exists ) {
				$wpdb->query(
					"ALTER TABLE {$table_dashboards} ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 1 AFTER member_workshop_code"
				);
			}
		}

		update_option( 'advdash_db_version', ADVDASH_DB_VERSION );
	}
}
