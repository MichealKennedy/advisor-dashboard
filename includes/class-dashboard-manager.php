<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Dashboard_Manager {

	private $table_dashboards;
	private $table_dashboard_users;
	private $table_contacts;
	private $table_webhook_logs;

	public function __construct() {
		global $wpdb;
		$this->table_dashboards      = $wpdb->prefix . 'advdash_dashboards';
		$this->table_dashboard_users = $wpdb->prefix . 'advdash_dashboard_users';
		$this->table_contacts        = $wpdb->prefix . 'advdash_contacts';
		$this->table_webhook_logs    = $wpdb->prefix . 'advdash_webhook_logs';
	}

	/* -------------------------------------------------------------------------
	 * Dashboard CRUD
	 * ---------------------------------------------------------------------- */

	public function get_dashboards() {
		global $wpdb;

		$dashboards = $wpdb->get_results(
			"SELECT d.*,
				COALESCE(SUM(c.contact_status != 'cancelled'), 0) AS contact_count,
				COALESCE(SUM(c.contact_status = 'registered'), 0) AS tab_current_registrations,
				COALESCE(SUM(c.contact_status = 'attended_report'), 0) AS tab_attended_report,
				COALESCE(SUM(c.contact_status = 'attended_other'), 0) AS tab_attended_other,
				COALESCE(SUM(c.contact_status = 'fed_request'), 0) AS tab_fed_request
			FROM {$this->table_dashboards} d
			LEFT JOIN {$this->table_contacts} c ON c.dashboard_id = d.id
			GROUP BY d.id
			ORDER BY d.created_at DESC"
		);

		$all_users = $wpdb->get_results(
			"SELECT du.dashboard_id, du.wp_user_id, u.display_name
			 FROM {$this->table_dashboard_users} du
			 LEFT JOIN {$wpdb->users} u ON u.ID = du.wp_user_id
			 ORDER BY du.created_at ASC"
		);

		$users_by_dashboard = array();
		foreach ( $all_users as $user ) {
			$users_by_dashboard[ $user->dashboard_id ][] = $user;
		}

		foreach ( $dashboards as $dashboard ) {
			$users                         = isset( $users_by_dashboard[ $dashboard->id ] ) ? $users_by_dashboard[ $dashboard->id ] : array();
			$dashboard->users              = $users;
			$dashboard->user_display_name  = implode( ', ', wp_list_pluck( $users, 'display_name' ) );
		}

		return $dashboards;
	}

	public function get_dashboard( $id ) {
		global $wpdb;

		$dashboard = $wpdb->get_row( $wpdb->prepare(
			"SELECT d.* FROM {$this->table_dashboards} d WHERE d.id = %d",
			$id
		) );

		if ( $dashboard ) {
			$dashboard->users = $wpdb->get_results( $wpdb->prepare(
				"SELECT du.wp_user_id, u.display_name
				 FROM {$this->table_dashboard_users} du
				 LEFT JOIN {$wpdb->users} u ON u.ID = du.wp_user_id
				 WHERE du.dashboard_id = %d
				 ORDER BY du.created_at ASC",
				$dashboard->id
			) );
		}

		return $dashboard;
	}

	public function get_dashboard_by_user( $wp_user_id ) {
		global $wpdb;

		return $wpdb->get_row( $wpdb->prepare(
			"SELECT d.* FROM {$this->table_dashboards} d
			 INNER JOIN {$this->table_dashboard_users} du ON du.dashboard_id = d.id
			 WHERE du.wp_user_id = %d
			 LIMIT 1",
			$wp_user_id
		) );
	}

	public function get_dashboards_by_user( $wp_user_id ) {
		global $wpdb;

		return $wpdb->get_results( $wpdb->prepare(
			"SELECT d.* FROM {$this->table_dashboards} d
			 INNER JOIN {$this->table_dashboard_users} du ON du.dashboard_id = d.id
			 WHERE du.wp_user_id = %d
			 ORDER BY d.name ASC",
			$wp_user_id
		) );
	}

	public function create_dashboard( $data ) {
		global $wpdb;

		$wp_user_id = isset( $data['wp_user_id'] ) ? absint( $data['wp_user_id'] ) : 0;

		$result = $wpdb->insert(
			$this->table_dashboards,
			array(
				'wp_user_id'           => $wp_user_id,
				'name'                 => sanitize_text_field( $data['name'] ),
				'member_workshop_code' => sanitize_text_field( $data['member_workshop_code'] ?? '' ),
			),
			array( '%d', '%s', '%s' )
		);

		if ( false === $result ) {
			return false;
		}

		$dashboard_id = $wpdb->insert_id;

		// Add initial user to junction table.
		if ( $wp_user_id ) {
			$this->add_dashboard_user( $dashboard_id, $wp_user_id );
		}

		return $this->get_dashboard( $dashboard_id );
	}

	public function update_dashboard( $id, $data ) {
		global $wpdb;

		$update = array();
		$format = array();

		if ( isset( $data['name'] ) ) {
			$update['name'] = sanitize_text_field( $data['name'] );
			$format[]       = '%s';
		}

		if ( isset( $data['member_workshop_code'] ) ) {
			$update['member_workshop_code'] = sanitize_text_field( $data['member_workshop_code'] );
			$format[]                       = '%s';
		}

		if ( isset( $data['is_active'] ) ) {
			$update['is_active'] = absint( $data['is_active'] ) ? 1 : 0;
			$format[]            = '%d';
		}

		if ( isset( $data['analytics_enabled'] ) ) {
			$update['analytics_enabled'] = absint( $data['analytics_enabled'] ) ? 1 : 0;
			$format[]                    = '%d';
		}

		if ( array_key_exists( 'tab_visibility', $data ) ) {
			$tv = $data['tab_visibility'];
			if ( is_array( $tv ) ) {
				$update['tab_visibility'] = wp_json_encode( $tv );
			} elseif ( is_string( $tv ) && $tv !== '' ) {
				$update['tab_visibility'] = $tv;
			} else {
				$update['tab_visibility'] = null;
			}
			$format[] = '%s';
		}

		if ( empty( $update ) ) {
			return true;
		}

		$result = $wpdb->update(
			$this->table_dashboards,
			$update,
			array( 'id' => absint( $id ) ),
			$format,
			array( '%d' )
		);

		return false !== $result;
	}

	public function delete_dashboard( $id ) {
		global $wpdb;

		$id = absint( $id );

		// Cascade delete: logs, contacts, users, then dashboard.
		$wpdb->delete( $this->table_webhook_logs, array( 'dashboard_id' => $id ), array( '%d' ) );
		$wpdb->delete( $this->table_contacts, array( 'dashboard_id' => $id ), array( '%d' ) );
		$wpdb->delete( $this->table_dashboard_users, array( 'dashboard_id' => $id ), array( '%d' ) );

		return false !== $wpdb->delete( $this->table_dashboards, array( 'id' => $id ), array( '%d' ) );
	}

	/* -------------------------------------------------------------------------
	 * Dashboard Users (junction table)
	 * ---------------------------------------------------------------------- */

	public function add_dashboard_user( $dashboard_id, $wp_user_id ) {
		global $wpdb;

		return false !== $wpdb->insert(
			$this->table_dashboard_users,
			array(
				'dashboard_id' => absint( $dashboard_id ),
				'wp_user_id'   => absint( $wp_user_id ),
			),
			array( '%d', '%d' )
		);
	}

	public function remove_dashboard_user( $dashboard_id, $wp_user_id ) {
		global $wpdb;

		$result = $wpdb->delete(
			$this->table_dashboard_users,
			array(
				'dashboard_id' => absint( $dashboard_id ),
				'wp_user_id'   => absint( $wp_user_id ),
			),
			array( '%d', '%d' )
		);

		return false !== $result && $wpdb->rows_affected > 0;
	}

	public function get_dashboard_users( $dashboard_id ) {
		global $wpdb;

		return $wpdb->get_results( $wpdb->prepare(
			"SELECT du.wp_user_id, u.display_name, u.user_login, du.created_at
			 FROM {$this->table_dashboard_users} du
			 LEFT JOIN {$wpdb->users} u ON u.ID = du.wp_user_id
			 WHERE du.dashboard_id = %d
			 ORDER BY du.created_at ASC",
			absint( $dashboard_id )
		) );
	}

	/* -------------------------------------------------------------------------
	 * Shared webhook management
	 * ---------------------------------------------------------------------- */

	public function get_dashboard_by_workshop_code( $code ) {
		global $wpdb;

		return $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$this->table_dashboards} WHERE member_workshop_code = %s",
			$code
		) );
	}

	public function get_shared_webhook_key() {
		return get_option( 'advdash_shared_webhook_key', '' );
	}

	public function generate_shared_webhook_key() {
		$key = bin2hex( random_bytes( 32 ) );
		update_option( 'advdash_shared_webhook_key', $key );
		return $key;
	}

	public function delete_shared_webhook_key() {
		delete_option( 'advdash_shared_webhook_key' );
	}

	public function get_shared_webhook_url() {
		return rest_url( 'advisor-dashboard/v1/webhook' );
	}

	/* -------------------------------------------------------------------------
	 * Contacts
	 * ---------------------------------------------------------------------- */

	private static $tab_status_map = array(
		'current_registrations' => array( 'registered' ),
		'attended_report'       => array( 'attended_report' ),
		'attended_other'        => array( 'attended_other' ),
		'fed_request'           => array( 'fed_request' ),
	);

	private static $allowed_orderby = array(
		'first_name',
		'last_name',
		'workshop_date',
		'city',
		'state',
		'agency',
		'status',
		'contact_status',
		'date_of_lead_request',
		'registration_form_completed',
		'created_at',
		'spouse_name',
		'cell_phone',
		'work_email',
		'personal_email',
		'best_email',
		'retirement_system',
		'special_provisions',
		'time_frame_for_retirement',
		'meet_for_report',
		'rate_material',
		'member_workshop_code',
		'rsvp_confirmed',
		'food_option_fed',
		'food_option_spouse',
		'advisor_status',
	);

	public function get_contacts( $dashboard_id, $args = array() ) {
		global $wpdb;

		$defaults = array(
			'tab'          => 'current_registrations',
			'page'         => 1,
			'per_page'     => 50,
			'orderby'      => 'created_at',
			'order'        => 'desc',
			'search'       => '',
			'date_filter'  => '',
			'date_field'   => 'workshop_date',
		);

		$args     = wp_parse_args( $args, $defaults );
		$page     = max( 1, absint( $args['page'] ) );
		$per_page = min( 5000, max( 1, absint( $args['per_page'] ) ) );
		$offset   = ( $page - 1 ) * $per_page;

		// Validate orderby against allowlist.
		$orderby = in_array( $args['orderby'], self::$allowed_orderby, true ) ? $args['orderby'] : 'created_at';
		$order   = strtoupper( $args['order'] ) === 'ASC' ? 'ASC' : 'DESC';

		// Translate tab to contact_status values.
		$tab      = sanitize_text_field( $args['tab'] );
		$statuses = isset( self::$tab_status_map[ $tab ] ) ? self::$tab_status_map[ $tab ] : array( 'registered' );

		// Build WHERE clause.
		$status_placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$where_parts  = array( 'dashboard_id = %d', "contact_status IN ({$status_placeholders})" );
		$where_values = array_merge( array( absint( $dashboard_id ) ), $statuses );

		if ( ! empty( $args['search'] ) ) {
			$like           = '%' . $wpdb->esc_like( sanitize_text_field( $args['search'] ) ) . '%';
			$where_parts[]  = '( first_name LIKE %s OR last_name LIKE %s )';
			$where_values[] = $like;
			$where_values[] = $like;
		}

		if ( ! empty( $args['date_filter'] ) ) {
			$allowed_date_fields = array( 'workshop_date', 'date_of_lead_request' );
			$date_col = in_array( $args['date_field'], $allowed_date_fields, true ) ? $args['date_field'] : 'workshop_date';
			$where_parts[]  = "{$date_col} = %s";
			$where_values[] = sanitize_text_field( $args['date_filter'] );
		}

		$where_clause = implode( ' AND ', $where_parts );

		// Count total.
		$total = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$this->table_contacts} WHERE {$where_clause}",
			...$where_values
		) );

		// Fetch rows.
		$query_values   = array_merge( $where_values, array( $per_page, $offset ) );
		$rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM {$this->table_contacts}
			WHERE {$where_clause}
			ORDER BY {$orderby} {$order}
			LIMIT %d OFFSET %d",
			...$query_values
		) );

		return array(
			'data'        => $rows ? $rows : array(),
			'total'       => $total,
			'total_pages' => (int) ceil( $total / $per_page ),
		);
	}

	public function get_distinct_dates_with_counts( $dashboard_id, $tab, $date_field = 'workshop_date' ) {
		global $wpdb;

		$allowed_date_fields = array( 'workshop_date', 'date_of_lead_request' );
		$col = in_array( $date_field, $allowed_date_fields, true ) ? $date_field : 'workshop_date';

		// Translate tab to contact_status values.
		$statuses            = isset( self::$tab_status_map[ $tab ] ) ? self::$tab_status_map[ $tab ] : array( 'registered' );
		$status_placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );

		$query_values = array_merge( array( absint( $dashboard_id ) ), $statuses );

		$results = $wpdb->get_results( $wpdb->prepare(
			"SELECT {$col} AS date_value, COUNT(*) AS count FROM {$this->table_contacts}
			WHERE dashboard_id = %d AND contact_status IN ({$status_placeholders}) AND {$col} IS NOT NULL AND {$col} > '0000-00-00'
			GROUP BY {$col}
			ORDER BY {$col} DESC",
			...$query_values
		) );

		return $results ? $results : array();
	}

	public function get_contact_summary( $dashboard_id, $args = array() ) {
		global $wpdb;

		$defaults = array(
			'tab'         => 'current_registrations',
			'search'      => '',
			'date_filter' => '',
			'date_field'  => 'workshop_date',
		);

		$args = wp_parse_args( $args, $defaults );
		$tab  = sanitize_text_field( $args['tab'] );

		// Translate tab to contact_status values.
		$statuses            = isset( self::$tab_status_map[ $tab ] ) ? self::$tab_status_map[ $tab ] : array( 'registered' );
		$status_placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );

		// Build WHERE clause (same logic as get_contacts).
		$where_parts  = array( 'dashboard_id = %d', "contact_status IN ({$status_placeholders})" );
		$where_values = array_merge( array( absint( $dashboard_id ) ), $statuses );

		if ( ! empty( $args['search'] ) ) {
			$like           = '%' . $wpdb->esc_like( sanitize_text_field( $args['search'] ) ) . '%';
			$where_parts[]  = '( first_name LIKE %s OR last_name LIKE %s )';
			$where_values[] = $like;
			$where_values[] = $like;
		}

		if ( ! empty( $args['date_filter'] ) ) {
			$allowed_date_fields = array( 'workshop_date', 'date_of_lead_request' );
			$date_col = in_array( $args['date_field'], $allowed_date_fields, true ) ? $args['date_field'] : 'workshop_date';
			$where_parts[]  = "{$date_col} = %s";
			$where_values[] = sanitize_text_field( $args['date_filter'] );
		}

		$where_clause = implode( ' AND ', $where_parts );

		// Total contacts.
		$total = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$this->table_contacts} WHERE {$where_clause}",
			...$where_values
		) );

		if ( 'current_registrations' === $tab ) {
			// Total guests (rows with non-empty spouse_name).
			$total_guests = (int) $wpdb->get_var( $wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->table_contacts} WHERE {$where_clause} AND spouse_name IS NOT NULL AND spouse_name != ''",
				...$where_values
			) );

			return array(
				'total_registrants'     => $total,
				'total_guests'          => $total_guests,
				'food_fed_breakdown'    => $this->get_breakdown( $where_clause, $where_values, 'food_option_fed' ),
				'side_fed_breakdown'    => $this->get_breakdown( $where_clause, $where_values, 'side_option_fed' ),
				'food_spouse_breakdown' => $this->get_breakdown( $where_clause, $where_values, 'food_option_spouse', "spouse_name IS NOT NULL AND spouse_name != ''" ),
				'side_spouse_breakdown' => $this->get_breakdown( $where_clause, $where_values, 'side_option_spouse', "spouse_name IS NOT NULL AND spouse_name != ''" ),
			);
		}

		if ( 'attended_report' === $tab || 'attended_other' === $tab ) {
			return array(
				'total'                        => $total,
				'meet_for_report_breakdown'    => $this->get_breakdown( $where_clause, $where_values, 'meet_for_report' ),
				'retirement_system_breakdown'  => $this->get_breakdown( $where_clause, $where_values, 'retirement_system' ),
				'rate_material_breakdown'      => $this->get_breakdown( $where_clause, $where_values, 'rate_material' ),
			);
		}

		if ( 'fed_request' === $tab ) {
			return array(
				'total'                                   => $total,
				'retirement_system_breakdown'             => $this->get_breakdown( $where_clause, $where_values, 'retirement_system' ),
				'time_frame_for_retirement_breakdown'     => $this->get_breakdown( $where_clause, $where_values, 'time_frame_for_retirement' ),
				'meet_for_report_breakdown'               => $this->get_breakdown( $where_clause, $where_values, 'meet_for_report' ),
			);
		}

		return array( 'total' => $total );
	}

	private function get_breakdown( $where_clause, $where_values, $column, $extra_condition = '' ) {
		global $wpdb;

		$allowed = array(
			'meet_for_report', 'retirement_system', 'rate_material',
			'time_frame_for_retirement', 'food_option_fed', 'side_option_fed',
			'food_option_spouse', 'side_option_spouse',
		);

		if ( ! in_array( $column, $allowed, true ) ) {
			return array();
		}

		$condition = "{$where_clause} AND {$column} IS NOT NULL AND {$column} != ''";
		if ( $extra_condition ) {
			$condition .= " AND {$extra_condition}";
		}

		$results = $wpdb->get_results( $wpdb->prepare(
			"SELECT {$column} AS option_name, COUNT(*) AS count
			FROM {$this->table_contacts}
			WHERE {$condition}
			GROUP BY {$column} ORDER BY count DESC",
			...$where_values
		) );

		return $results ? $results : array();
	}

	public static $advisor_statuses = array( '', 'new', 'contacted', 'scheduled', 'completed', 'not_interested' );

	public function update_contact_notes( $contact_id, $dashboard_id, $data ) {
		global $wpdb;

		$update = array();
		$format = array();

		if ( isset( $data['advisor_notes'] ) ) {
			$update['advisor_notes'] = $data['advisor_notes'];
			$format[]                = '%s';
		}
		if ( isset( $data['advisor_status'] ) ) {
			$update['advisor_status'] = $data['advisor_status'];
			$format[]                 = '%s';
		}

		if ( empty( $update ) ) {
			return false;
		}

		$result = $wpdb->update(
			$this->table_contacts,
			$update,
			array(
				'id'           => absint( $contact_id ),
				'dashboard_id' => absint( $dashboard_id ),
			),
			$format,
			array( '%d', '%d' )
		);

		return false !== $result;
	}

	public function delete_contact( $contact_id, $dashboard_id ) {
		global $wpdb;

		$result = $wpdb->delete(
			$this->table_contacts,
			array(
				'id'           => absint( $contact_id ),
				'dashboard_id' => absint( $dashboard_id ),
			),
			array( '%d', '%d' )
		);

		return false !== $result && $wpdb->rows_affected > 0;
	}

	/* -------------------------------------------------------------------------
	 * Webhook Logs
	 * ---------------------------------------------------------------------- */

	public function create_webhook_log( $data ) {
		global $wpdb;

		return $wpdb->insert(
			$this->table_webhook_logs,
			array(
				'dashboard_id'      => $data['dashboard_id'],
				'webhook_key'       => sanitize_text_field( $data['webhook_key'] ),
				'request_body'      => $data['request_body'],
				'parsed_tab'        => isset( $data['parsed_tab'] ) ? sanitize_text_field( $data['parsed_tab'] ) : null,
				'parsed_action'     => isset( $data['parsed_action'] ) ? sanitize_text_field( $data['parsed_action'] ) : null,
				'parsed_contact_id' => isset( $data['parsed_contact_id'] ) ? sanitize_text_field( $data['parsed_contact_id'] ) : null,
				'status_code'       => (int) $data['status_code'],
				'error_code'        => isset( $data['error_code'] ) ? sanitize_text_field( $data['error_code'] ) : null,
				'error_message'     => isset( $data['error_message'] ) ? sanitize_text_field( $data['error_message'] ) : null,
				'response_body'     => isset( $data['response_body'] ) ? $data['response_body'] : null,
				'ip_address'        => sanitize_text_field( $data['ip_address'] ?? '' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s' )
		);
	}

	private static $allowed_log_orderby = array(
		'created_at', 'status_code', 'error_code', 'parsed_tab', 'parsed_action',
	);

	public function get_webhook_logs( $args = array() ) {
		global $wpdb;

		$defaults = array(
			'dashboard_id'  => '',
			'page'          => 1,
			'per_page'      => 50,
			'orderby'       => 'created_at',
			'order'         => 'desc',
			'status_filter' => '',
			'date_from'     => '',
			'date_to'       => '',
			'search'        => '',
		);

		$args     = wp_parse_args( $args, $defaults );
		$page     = max( 1, absint( $args['page'] ) );
		$per_page = min( 200, max( 1, absint( $args['per_page'] ) ) );
		$offset   = ( $page - 1 ) * $per_page;

		$orderby = in_array( $args['orderby'], self::$allowed_log_orderby, true )
			? $args['orderby'] : 'created_at';
		$order = strtoupper( $args['order'] ) === 'ASC' ? 'ASC' : 'DESC';

		$where_parts  = array( '1=1' );
		$where_values = array();

		if ( ! empty( $args['dashboard_id'] ) ) {
			$where_parts[]  = 'l.dashboard_id = %d';
			$where_values[] = absint( $args['dashboard_id'] );
		}

		if ( $args['status_filter'] === 'success' ) {
			$where_parts[] = 'l.error_code IS NULL';
		} elseif ( $args['status_filter'] === 'error' ) {
			$where_parts[] = 'l.error_code IS NOT NULL';
		} elseif ( ! empty( $args['status_filter'] ) ) {
			$where_parts[]  = 'l.error_code = %s';
			$where_values[] = sanitize_text_field( $args['status_filter'] );
		}

		if ( ! empty( $args['date_from'] ) ) {
			$where_parts[]  = 'l.created_at >= %s';
			$where_values[] = sanitize_text_field( $args['date_from'] ) . ' 00:00:00';
		}
		if ( ! empty( $args['date_to'] ) ) {
			$where_parts[]  = 'l.created_at <= %s';
			$where_values[] = sanitize_text_field( $args['date_to'] ) . ' 23:59:59';
		}

		if ( ! empty( $args['search'] ) ) {
			$like           = '%' . $wpdb->esc_like( sanitize_text_field( $args['search'] ) ) . '%';
			$where_parts[]  = '( l.error_message LIKE %s OR l.parsed_contact_id LIKE %s OR l.ip_address LIKE %s )';
			$where_values[] = $like;
			$where_values[] = $like;
			$where_values[] = $like;
		}

		$where_clause = implode( ' AND ', $where_parts );

		// Build count query.
		$count_sql = "SELECT COUNT(*) FROM {$this->table_webhook_logs} l WHERE {$where_clause}";
		if ( ! empty( $where_values ) ) {
			$total = (int) $wpdb->get_var( $wpdb->prepare( $count_sql, ...$where_values ) );
		} else {
			$total = (int) $wpdb->get_var( $count_sql );
		}

		// Fetch rows (omit request_body and response_body for performance).
		$select_sql = "SELECT l.id, l.dashboard_id, l.webhook_key, l.parsed_tab, l.parsed_action,
				l.parsed_contact_id, l.status_code, l.error_code, l.error_message,
				l.ip_address, l.created_at,
				d.name AS dashboard_name
			FROM {$this->table_webhook_logs} l
			LEFT JOIN {$this->table_dashboards} d ON d.id = l.dashboard_id
			WHERE {$where_clause}
			ORDER BY l.{$orderby} {$order}
			LIMIT %d OFFSET %d";

		$query_values = array_merge( $where_values, array( $per_page, $offset ) );
		$rows = $wpdb->get_results( $wpdb->prepare( $select_sql, ...$query_values ) );

		return array(
			'data'        => $rows ? $rows : array(),
			'total'       => $total,
			'total_pages' => (int) ceil( $total / $per_page ),
		);
	}

	public function get_webhook_log( $log_id ) {
		global $wpdb;

		return $wpdb->get_row( $wpdb->prepare(
			"SELECT l.*, d.name AS dashboard_name
			FROM {$this->table_webhook_logs} l
			LEFT JOIN {$this->table_dashboards} d ON d.id = l.dashboard_id
			WHERE l.id = %d",
			absint( $log_id )
		) );
	}

	public function get_webhook_log_filters( $dashboard_id = null ) {
		global $wpdb;

		$where = '';
		$values = array();

		if ( $dashboard_id ) {
			$where  = 'WHERE dashboard_id = %d AND error_code IS NOT NULL';
			$values = array( absint( $dashboard_id ) );
		} else {
			$where = 'WHERE error_code IS NOT NULL';
		}

		$sql = "SELECT error_code, COUNT(*) AS count
			FROM {$this->table_webhook_logs}
			{$where}
			GROUP BY error_code
			ORDER BY count DESC";

		if ( ! empty( $values ) ) {
			$results = $wpdb->get_results( $wpdb->prepare( $sql, ...$values ) );
		} else {
			$results = $wpdb->get_results( $sql );
		}

		return $results ? $results : array();
	}

	public function delete_old_webhook_logs( $days = 90 ) {
		global $wpdb;

		return $wpdb->query( $wpdb->prepare(
			"DELETE FROM {$this->table_webhook_logs}
			WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
			absint( $days )
		) );
	}

	public function clear_webhook_logs( $dashboard_id = null ) {
		global $wpdb;

		if ( $dashboard_id ) {
			return $wpdb->delete(
				$this->table_webhook_logs,
				array( 'dashboard_id' => absint( $dashboard_id ) ),
				array( '%d' )
			);
		}

		return $wpdb->query( "DELETE FROM {$this->table_webhook_logs}" );
	}

	/**
	 * Count recent webhook failures, excluding noise error codes.
	 *
	 * @param int $window_minutes How many minutes to look back.
	 * @return int
	 */
	public function count_recent_failures( $window_minutes = 15 ) {
		global $wpdb;

		return (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$this->table_webhook_logs}
			 WHERE error_code IS NOT NULL
			 AND error_code NOT IN ('rate_limited', 'invalid_key')
			 AND created_at >= DATE_SUB(NOW(), INTERVAL %d MINUTE)",
			absint( $window_minutes )
		) );
	}

	/**
	 * Get a summary of recent failures grouped by error code.
	 *
	 * @param int $window_minutes How many minutes to look back.
	 * @return array Array of objects with error_code and count.
	 */
	public function get_recent_failure_summary( $window_minutes = 15 ) {
		global $wpdb;

		$results = $wpdb->get_results( $wpdb->prepare(
			"SELECT error_code, COUNT(*) AS count
			 FROM {$this->table_webhook_logs}
			 WHERE error_code IS NOT NULL
			 AND error_code NOT IN ('rate_limited', 'invalid_key')
			 AND created_at >= DATE_SUB(NOW(), INTERVAL %d MINUTE)
			 GROUP BY error_code
			 ORDER BY count DESC",
			absint( $window_minutes )
		) );

		return $results ? $results : array();
	}

	/* -------------------------------------------------------------------------
	 * Workshop Analytics
	 * ---------------------------------------------------------------------- */

	public function get_workshop_analytics( $dashboard_id, $args = array() ) {
		global $wpdb;

		$dashboard_id = absint( $dashboard_id );
		$date_from    = isset( $args['date_from'] ) ? sanitize_text_field( $args['date_from'] ) : '';
		$date_to      = isset( $args['date_to'] ) ? sanitize_text_field( $args['date_to'] ) : '';

		// Build shared date-range clauses.
		$date_where  = "dashboard_id = %d AND workshop_date IS NOT NULL AND workshop_date > '0000-00-00'";
		$date_values = array( $dashboard_id );

		if ( $date_from ) {
			$date_where   .= ' AND workshop_date >= %s';
			$date_values[] = $date_from;
		}
		if ( $date_to ) {
			$date_where   .= ' AND workshop_date <= %s';
			$date_values[] = $date_to;
		}

		// Query 1: per-date breakdown (DESC for table display).
		$by_date_rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT
				workshop_date,
				COUNT(*) AS total_ever_registered,
				SUM(contact_status = 'registered')       AS registered,
				SUM(contact_status = 'cancelled')        AS cancelled,
				SUM(contact_status = 'no_show')          AS no_show,
				SUM(contact_status = 'attended_report')  AS attended_report,
				SUM(contact_status = 'attended_other')   AS attended_other,
				SUM(contact_status = 'fed_request')      AS fed_request,
				SUM(contact_status IN ('attended_report','attended_other') AND spouse_name IS NOT NULL AND spouse_name != '') AS guests_attended,
				SUM(contact_status = 'registered' AND spouse_name IS NOT NULL AND spouse_name != '') AS guests_registered
			FROM {$this->table_contacts}
			WHERE {$date_where}
			GROUP BY workshop_date
			ORDER BY workshop_date DESC",
			...$date_values
		) );

		// Compute derived metrics and build totals.
		$totals = array(
			'registered'      => 0,
			'cancelled'       => 0,
			'no_show'         => 0,
			'attended_report' => 0,
			'attended_other'  => 0,
			'fed_request'     => 0,
			'guests'          => 0,
		);

		foreach ( $by_date_rows as $row ) {
			$row->registered      = (int) $row->registered;
			$row->cancelled       = (int) $row->cancelled;
			$row->no_show         = (int) $row->no_show;
			$row->attended_report = (int) $row->attended_report;
			$row->attended_other  = (int) $row->attended_other;
			$row->fed_request     = (int) $row->fed_request;
			$row->guests_attended = (int) $row->guests_attended;
			$row->guests_registered = (int) $row->guests_registered;
			$total_ever           = (int) $row->total_ever_registered;

			$attended = $row->attended_report + $row->attended_other;
			$denominator_conv   = max( $total_ever - $row->cancelled, 1 );
			$denominator_cancel = max( $total_ever, 1 );

			$row->conversion_rate    = round( $attended / $denominator_conv * 100, 1 );
			$row->cancellation_rate  = round( $row->cancelled / $denominator_cancel * 100, 1 );

			$totals['registered']      += $row->registered;
			$totals['cancelled']       += $row->cancelled;
			$totals['no_show']         += $row->no_show;
			$totals['attended_report'] += $row->attended_report;
			$totals['attended_other']  += $row->attended_other;
			$totals['fed_request']     += $row->fed_request;
			$totals['guests']          += $row->guests_attended;
		}

		// Query 2: trend data (ASC for chart chronological order).
		$trend_rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT workshop_date, COUNT(*) AS registrations
			FROM {$this->table_contacts}
			WHERE {$date_where}
			GROUP BY workshop_date
			ORDER BY workshop_date ASC",
			...$date_values
		) );

		foreach ( $trend_rows as $row ) {
			$row->registrations = (int) $row->registrations;
		}

		// Query 3: food breakdown (exclude cancelled).
		$food_where  = "dashboard_id = %d AND contact_status != 'cancelled' AND workshop_date IS NOT NULL AND workshop_date > '0000-00-00'";
		$food_values = array( $dashboard_id );
		if ( $date_from ) {
			$food_where   .= ' AND workshop_date >= %s';
			$food_values[] = $date_from;
		}
		if ( $date_to ) {
			$food_where   .= ' AND workshop_date <= %s';
			$food_values[] = $date_to;
		}

		$food_fed    = $this->get_breakdown( $food_where, $food_values, 'food_option_fed' );
		$food_spouse = $this->get_breakdown( $food_where, $food_values, 'food_option_spouse', "spouse_name IS NOT NULL AND spouse_name != ''" );

		// Query 4: advisor pipeline (attended_report and fed_request contacts only).
		$pipeline_where  = "dashboard_id = %d AND contact_status IN ('attended_report', 'fed_request') AND workshop_date IS NOT NULL AND workshop_date > '0000-00-00'";
		$pipeline_values = array( $dashboard_id );
		if ( $date_from ) {
			$pipeline_where   .= ' AND workshop_date >= %s';
			$pipeline_values[] = $date_from;
		}
		if ( $date_to ) {
			$pipeline_where   .= ' AND workshop_date <= %s';
			$pipeline_values[] = $date_to;
		}
		$pipeline_rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT COALESCE(advisor_status, '') AS advisor_status, COUNT(*) AS count
			FROM {$this->table_contacts}
			WHERE {$pipeline_where}
			GROUP BY advisor_status",
			...$pipeline_values
		) );

		// Sort pipeline in defined order.
		$status_order = array( '', 'new', 'contacted', 'scheduled', 'completed', 'not_interested' );
		$pipeline_map = array();
		foreach ( $pipeline_rows as $row ) {
			$pipeline_map[ $row->advisor_status ] = (int) $row->count;
		}
		$pipeline = array();
		foreach ( $status_order as $status ) {
			$pipeline[] = array(
				'advisor_status' => $status,
				'count'          => isset( $pipeline_map[ $status ] ) ? $pipeline_map[ $status ] : 0,
			);
		}

		return array(
			'by_date'          => $by_date_rows,
			'trend'            => $trend_rows,
			'food_breakdown'   => array(
				'fed'    => $food_fed,
				'spouse' => $food_spouse,
			),
			'advisor_pipeline' => $pipeline,
			'totals'           => $totals,
		);
	}
}
