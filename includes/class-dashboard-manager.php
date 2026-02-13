<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Dashboard_Manager {

	private $table_dashboards;
	private $table_webhooks;
	private $table_contacts;

	public function __construct() {
		global $wpdb;
		$this->table_dashboards = $wpdb->prefix . 'advdash_dashboards';
		$this->table_webhooks   = $wpdb->prefix . 'advdash_webhooks';
		$this->table_contacts   = $wpdb->prefix . 'advdash_contacts';
	}

	/* -------------------------------------------------------------------------
	 * Dashboard CRUD
	 * ---------------------------------------------------------------------- */

	public function get_dashboards() {
		global $wpdb;

		return $wpdb->get_results(
			"SELECT d.*,
				u.display_name AS user_display_name,
				w.is_active AS webhook_active,
				( SELECT COUNT(*) FROM {$this->table_contacts} c WHERE c.dashboard_id = d.id ) AS contact_count,
				( SELECT COUNT(*) FROM {$this->table_contacts} c WHERE c.dashboard_id = d.id AND c.tab = 'current_registrations' ) AS tab_current_registrations,
				( SELECT COUNT(*) FROM {$this->table_contacts} c WHERE c.dashboard_id = d.id AND c.tab = 'attended_report' ) AS tab_attended_report,
				( SELECT COUNT(*) FROM {$this->table_contacts} c WHERE c.dashboard_id = d.id AND c.tab = 'attended_other' ) AS tab_attended_other,
				( SELECT COUNT(*) FROM {$this->table_contacts} c WHERE c.dashboard_id = d.id AND c.tab = 'fed_request' ) AS tab_fed_request
			FROM {$this->table_dashboards} d
			LEFT JOIN {$wpdb->users} u ON u.ID = d.wp_user_id
			LEFT JOIN {$this->table_webhooks} w ON w.dashboard_id = d.id
			ORDER BY d.created_at DESC"
		);
	}

	public function get_dashboard( $id ) {
		global $wpdb;

		return $wpdb->get_row( $wpdb->prepare(
			"SELECT d.*, u.display_name AS user_display_name
			FROM {$this->table_dashboards} d
			LEFT JOIN {$wpdb->users} u ON u.ID = d.wp_user_id
			WHERE d.id = %d",
			$id
		) );
	}

	public function get_dashboard_by_user( $wp_user_id ) {
		global $wpdb;

		return $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$this->table_dashboards} WHERE wp_user_id = %d",
			$wp_user_id
		) );
	}

	public function create_dashboard( $data ) {
		global $wpdb;

		$result = $wpdb->insert(
			$this->table_dashboards,
			array(
				'wp_user_id'           => absint( $data['wp_user_id'] ),
				'name'                 => sanitize_text_field( $data['name'] ),
				'member_workshop_code' => sanitize_text_field( $data['member_workshop_code'] ?? '' ),
			),
			array( '%d', '%s', '%s' )
		);

		if ( false === $result ) {
			return false;
		}

		return $this->get_dashboard( $wpdb->insert_id );
	}

	public function update_dashboard( $id, $data ) {
		global $wpdb;

		$update = array();
		$format = array();

		if ( isset( $data['name'] ) ) {
			$update['name'] = sanitize_text_field( $data['name'] );
			$format[]       = '%s';
		}

		if ( isset( $data['wp_user_id'] ) ) {
			$update['wp_user_id'] = absint( $data['wp_user_id'] );
			$format[]             = '%d';
		}

		if ( isset( $data['member_workshop_code'] ) ) {
			$update['member_workshop_code'] = sanitize_text_field( $data['member_workshop_code'] );
			$format[]                       = '%s';
		}

		if ( empty( $update ) ) {
			return false;
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

		// Cascade delete: contacts, webhook, then dashboard.
		$wpdb->delete( $this->table_contacts, array( 'dashboard_id' => $id ), array( '%d' ) );
		$wpdb->delete( $this->table_webhooks, array( 'dashboard_id' => $id ), array( '%d' ) );

		return false !== $wpdb->delete( $this->table_dashboards, array( 'id' => $id ), array( '%d' ) );
	}

	/* -------------------------------------------------------------------------
	 * Webhook management
	 * ---------------------------------------------------------------------- */

	public function get_webhook( $dashboard_id ) {
		global $wpdb;

		$row = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$this->table_webhooks} WHERE dashboard_id = %d",
			$dashboard_id
		) );

		if ( $row ) {
			$row->webhook_url = rest_url( 'advisor-dashboard/v1/webhook/' . $row->webhook_key );
		}

		return $row;
	}

	public function get_webhook_by_key( $webhook_key ) {
		global $wpdb;

		return $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$this->table_webhooks} WHERE webhook_key = %s",
			$webhook_key
		) );
	}

	public function create_webhook( $dashboard_id ) {
		global $wpdb;

		// Delete any existing webhook for this dashboard first.
		$wpdb->delete( $this->table_webhooks, array( 'dashboard_id' => absint( $dashboard_id ) ), array( '%d' ) );

		$key = bin2hex( random_bytes( 32 ) );

		$result = $wpdb->insert(
			$this->table_webhooks,
			array(
				'dashboard_id' => absint( $dashboard_id ),
				'webhook_key'  => $key,
				'is_active'    => 1,
			),
			array( '%d', '%s', '%d' )
		);

		if ( false === $result ) {
			return false;
		}

		return $this->get_webhook( $dashboard_id );
	}

	public function toggle_webhook( $dashboard_id, $is_active ) {
		global $wpdb;

		return false !== $wpdb->update(
			$this->table_webhooks,
			array( 'is_active' => $is_active ? 1 : 0 ),
			array( 'dashboard_id' => absint( $dashboard_id ) ),
			array( '%d' ),
			array( '%d' )
		);
	}

	public function delete_webhook( $dashboard_id ) {
		global $wpdb;

		return false !== $wpdb->delete(
			$this->table_webhooks,
			array( 'dashboard_id' => absint( $dashboard_id ) ),
			array( '%d' )
		);
	}

	/* -------------------------------------------------------------------------
	 * Contacts
	 * ---------------------------------------------------------------------- */

	private static $allowed_orderby = array(
		'first_name',
		'last_name',
		'workshop_date',
		'city',
		'state',
		'agency',
		'status',
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

		// Build WHERE clause.
		$where_parts  = array( 'dashboard_id = %d', 'tab = %s' );
		$where_values = array( absint( $dashboard_id ), sanitize_text_field( $args['tab'] ) );

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

		$results = $wpdb->get_results( $wpdb->prepare(
			"SELECT {$col} AS date_value, COUNT(*) AS count FROM {$this->table_contacts}
			WHERE dashboard_id = %d AND tab = %s AND {$col} IS NOT NULL AND {$col} > '0000-00-00'
			GROUP BY {$col}
			ORDER BY {$col} DESC",
			absint( $dashboard_id ),
			sanitize_text_field( $tab )
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

		// Build WHERE clause (same logic as get_contacts).
		$where_parts  = array( 'dashboard_id = %d', 'tab = %s' );
		$where_values = array( absint( $dashboard_id ), sanitize_text_field( $args['tab'] ) );

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

		// Total registrants.
		$total_registrants = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$this->table_contacts} WHERE {$where_clause}",
			...$where_values
		) );

		// Total guests (rows with non-empty spouse_name).
		$total_guests = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$this->table_contacts} WHERE {$where_clause} AND spouse_name IS NOT NULL AND spouse_name != ''",
			...$where_values
		) );

		// Food/side breakdowns for registrants (fed).
		$food_fed = $wpdb->get_results( $wpdb->prepare(
			"SELECT food_option_fed AS option_name, COUNT(*) AS count FROM {$this->table_contacts}
			WHERE {$where_clause} AND food_option_fed IS NOT NULL AND food_option_fed != ''
			GROUP BY food_option_fed ORDER BY count DESC",
			...$where_values
		) );

		$side_fed = $wpdb->get_results( $wpdb->prepare(
			"SELECT side_option_fed AS option_name, COUNT(*) AS count FROM {$this->table_contacts}
			WHERE {$where_clause} AND side_option_fed IS NOT NULL AND side_option_fed != ''
			GROUP BY side_option_fed ORDER BY count DESC",
			...$where_values
		) );

		// Food/side breakdowns for guests (spouse) — only rows with a spouse.
		$food_spouse = $wpdb->get_results( $wpdb->prepare(
			"SELECT food_option_spouse AS option_name, COUNT(*) AS count FROM {$this->table_contacts}
			WHERE {$where_clause} AND spouse_name IS NOT NULL AND spouse_name != '' AND food_option_spouse IS NOT NULL AND food_option_spouse != ''
			GROUP BY food_option_spouse ORDER BY count DESC",
			...$where_values
		) );

		$side_spouse = $wpdb->get_results( $wpdb->prepare(
			"SELECT side_option_spouse AS option_name, COUNT(*) AS count FROM {$this->table_contacts}
			WHERE {$where_clause} AND spouse_name IS NOT NULL AND spouse_name != '' AND side_option_spouse IS NOT NULL AND side_option_spouse != ''
			GROUP BY side_option_spouse ORDER BY count DESC",
			...$where_values
		) );

		return array(
			'total_registrants'     => $total_registrants,
			'total_guests'          => $total_guests,
			'food_fed_breakdown'    => $food_fed ? $food_fed : array(),
			'side_fed_breakdown'    => $side_fed ? $side_fed : array(),
			'food_spouse_breakdown' => $food_spouse ? $food_spouse : array(),
			'side_spouse_breakdown' => $side_spouse ? $side_spouse : array(),
		);
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
}
