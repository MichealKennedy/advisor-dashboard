<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Rest_API {

	private $manager;
	private $webhook_handler;
	private $namespace = 'advisor-dashboard/v1';

	public function __construct( AdvDash_Dashboard_Manager $manager, AdvDash_Webhook_Handler $webhook_handler ) {
		$this->manager         = $manager;
		$this->webhook_handler = $webhook_handler;
	}

	public function register_routes() {
		// ----- Webhook (public, key-based auth) -----
		register_rest_route( $this->namespace, '/webhook/(?P<webhook_key>[a-f0-9]{64})', array(
			'methods'             => 'POST',
			'callback'            => array( $this->webhook_handler, 'handle_webhook' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'webhook_key' => array(
					'required'          => true,
					'validate_callback' => function ( $param ) {
						return (bool) preg_match( '/^[a-f0-9]{64}$/', $param );
					},
				),
			),
		) );

		// ----- Admin: Dashboard CRUD (manage_options) -----
		register_rest_route( $this->namespace, '/dashboards', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_dashboards' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_dashboard' ),
				'permission_callback' => array( $this, 'check_admin' ),
				'args'                => array(
					'name'       => array( 'required' => true, 'type' => 'string' ),
					'wp_user_id' => array( 'required' => true, 'type' => 'integer' ),
				),
			),
		) );

		register_rest_route( $this->namespace, '/dashboards/(?P<id>\d+)', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_dashboard' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'update_dashboard' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_dashboard' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
		) );

		// ----- Admin: Shared webhook management -----
		register_rest_route( $this->namespace, '/shared-webhook', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_shared_webhook' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'generate_shared_webhook' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_shared_webhook' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
		) );

		// ----- Admin: Webhook logs -----
		register_rest_route( $this->namespace, '/webhook-logs', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_webhook_logs' ),
				'permission_callback' => array( $this, 'check_admin' ),
				'args'                => array(
					'page'          => array( 'default' => 1, 'type' => 'integer' ),
					'per_page'      => array( 'default' => 50, 'type' => 'integer' ),
					'orderby'       => array( 'default' => 'created_at', 'type' => 'string' ),
					'order'         => array( 'default' => 'desc', 'type' => 'string' ),
					'dashboard_id'  => array( 'default' => '', 'type' => 'string' ),
					'status_filter' => array( 'default' => '', 'type' => 'string' ),
					'date_from'     => array( 'default' => '', 'type' => 'string' ),
					'date_to'       => array( 'default' => '', 'type' => 'string' ),
					'search'        => array( 'default' => '', 'type' => 'string' ),
				),
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'clear_webhook_logs' ),
				'permission_callback' => array( $this, 'check_admin' ),
				'args'                => array(
					'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
				),
			),
		) );

		register_rest_route( $this->namespace, '/webhook-logs/(?P<log_id>\d+)', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_webhook_log_detail' ),
			'permission_callback' => array( $this, 'check_admin' ),
			'args'                => array(
				'log_id' => array( 'required' => true, 'type' => 'integer' ),
			),
		) );

		register_rest_route( $this->namespace, '/webhook-logs/filters', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_webhook_log_filters' ),
			'permission_callback' => array( $this, 'check_admin' ),
			'args'                => array(
				'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
			),
		) );

		// ----- Admin: Webhook logging settings -----
		register_rest_route( $this->namespace, '/settings/webhook-logging', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_webhook_logging_settings' ),
				'permission_callback' => array( $this, 'check_admin' ),
			),
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'set_webhook_logging_settings' ),
				'permission_callback' => array( $this, 'check_admin' ),
				'args'                => array(
					'enabled'        => array( 'required' => true, 'type' => 'boolean' ),
					'retention_days' => array( 'type' => 'integer', 'required' => false ),
				),
			),
		) );

		// ----- Frontend: My Dashboard (logged-in user) -----
		register_rest_route( $this->namespace, '/my-dashboard', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_my_dashboard' ),
			'permission_callback' => array( $this, 'check_logged_in' ),
			'args'                => array(
				'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
			),
		) );

		register_rest_route( $this->namespace, '/my-dashboard/contacts', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_my_contacts' ),
			'permission_callback' => array( $this, 'check_logged_in' ),
			'args'                => array(
				'tab'      => array(
					'required'          => true,
					'type'              => 'string',
					'validate_callback' => function ( $param ) {
						return in_array( $param, array( 'current_registrations', 'attended_report', 'attended_other', 'fed_request' ), true );
					},
				),
				'page'     => array( 'default' => 1, 'type' => 'integer' ),
				'per_page' => array( 'default' => 50, 'type' => 'integer' ),
				'orderby'  => array( 'default' => 'created_at', 'type' => 'string' ),
				'order'    => array( 'default' => 'desc', 'type' => 'string' ),
				'search'        => array( 'default' => '', 'type' => 'string' ),
				'date_filter'   => array( 'default' => '', 'type' => 'string' ),
				'date_field'    => array(
					'default'           => 'workshop_date',
					'type'              => 'string',
					'validate_callback' => function ( $param ) {
						return in_array( $param, array( 'workshop_date', 'date_of_lead_request' ), true );
					},
				),
				'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
			),
		) );

		// Workshop dates for filter dropdown.
		register_rest_route( $this->namespace, '/my-dashboard/workshop-dates', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_my_workshop_dates' ),
			'permission_callback' => array( $this, 'check_logged_in' ),
			'args'                => array(
				'tab' => array(
					'required'          => true,
					'type'              => 'string',
					'validate_callback' => function ( $param ) {
						return in_array( $param, array( 'current_registrations', 'attended_report', 'attended_other', 'fed_request' ), true );
					},
				),
				'date_field' => array(
					'default'           => 'workshop_date',
					'type'              => 'string',
					'validate_callback' => function ( $param ) {
						return in_array( $param, array( 'workshop_date', 'date_of_lead_request' ), true );
					},
				),
				'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
			),
		) );

		// Contact summary (aggregated stats).
		register_rest_route( $this->namespace, '/my-dashboard/contact-summary', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_my_contact_summary' ),
			'permission_callback' => array( $this, 'check_logged_in' ),
			'args'                => array(
				'tab' => array(
					'required'          => true,
					'type'              => 'string',
					'validate_callback' => function ( $param ) {
						return in_array( $param, array( 'current_registrations', 'attended_report', 'attended_other', 'fed_request' ), true );
					},
				),
				'search'      => array( 'default' => '', 'type' => 'string' ),
				'date_filter' => array( 'default' => '', 'type' => 'string' ),
				'date_field'  => array(
					'default'           => 'workshop_date',
					'type'              => 'string',
					'validate_callback' => function ( $param ) {
						return in_array( $param, array( 'workshop_date', 'date_of_lead_request' ), true );
					},
				),
				'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
			),
		) );

		// Column visibility preferences (user meta).
		register_rest_route( $this->namespace, '/my-dashboard/column-prefs', array(
			'methods'             => 'PUT',
			'callback'            => array( $this, 'save_column_prefs' ),
			'permission_callback' => array( $this, 'check_logged_in' ),
			'args'                => array(
				'prefs' => array( 'required' => true, 'type' => 'object' ),
			),
		) );

		// Update contact notes/status, and delete a contact.
		register_rest_route( $this->namespace, '/my-dashboard/contacts/(?P<contact_id>\d+)', array(
			array(
				'methods'             => 'PATCH',
				'callback'            => array( $this, 'update_my_contact_notes' ),
				'permission_callback' => array( $this, 'check_logged_in' ),
				'args'                => array(
					'contact_id'     => array( 'required' => true, 'type' => 'integer' ),
					'advisor_notes'  => array( 'type' => 'string', 'required' => false ),
					'advisor_status' => array(
						'type'              => 'string',
						'required'          => false,
						'validate_callback' => function ( $param ) {
							return in_array( $param, AdvDash_Dashboard_Manager::$advisor_statuses, true );
						},
					),
					'dashboard_id'   => array( 'type' => 'integer', 'required' => false ),
				),
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_my_contact' ),
				'permission_callback' => array( $this, 'check_admin' ),
				'args'                => array(
					'contact_id'   => array( 'required' => true, 'type' => 'integer' ),
					'dashboard_id' => array( 'type' => 'integer', 'required' => false ),
				),
			),
		) );
	}

	/* -------------------------------------------------------------------------
	 * Permission callbacks
	 * ---------------------------------------------------------------------- */

	public function check_admin() {
		return current_user_can( 'manage_options' );
	}

	public function check_logged_in() {
		return is_user_logged_in();
	}

	/* -------------------------------------------------------------------------
	 * Admin: Dashboard CRUD
	 * ---------------------------------------------------------------------- */

	public function get_dashboards( WP_REST_Request $request ) {
		$dashboards = $this->manager->get_dashboards();
		return new WP_REST_Response( $dashboards, 200 );
	}

	public function get_dashboard( WP_REST_Request $request ) {
		$dashboard = $this->manager->get_dashboard( $request->get_param( 'id' ) );

		if ( ! $dashboard ) {
			return new WP_Error( 'not_found', 'Dashboard not found.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response( $dashboard, 200 );
	}

	public function create_dashboard( WP_REST_Request $request ) {
		$data = array(
			'name'                 => $request->get_param( 'name' ),
			'wp_user_id'           => $request->get_param( 'wp_user_id' ),
			'member_workshop_code' => $request->get_param( 'member_workshop_code' ),
		);

		$dashboard = $this->manager->create_dashboard( $data );

		if ( ! $dashboard ) {
			return new WP_Error( 'create_failed', 'Failed to create dashboard. The user may already have a dashboard.', array( 'status' => 400 ) );
		}

		return new WP_REST_Response( $dashboard, 201 );
	}

	public function update_dashboard( WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );

		$existing = $this->manager->get_dashboard( $id );
		if ( ! $existing ) {
			return new WP_Error( 'not_found', 'Dashboard not found.', array( 'status' => 404 ) );
		}

		$data = array();
		if ( $request->has_param( 'name' ) ) {
			$data['name'] = $request->get_param( 'name' );
		}
		if ( $request->has_param( 'wp_user_id' ) ) {
			$data['wp_user_id'] = $request->get_param( 'wp_user_id' );
		}
		if ( $request->has_param( 'member_workshop_code' ) ) {
			$data['member_workshop_code'] = $request->get_param( 'member_workshop_code' );
		}

		$result = $this->manager->update_dashboard( $id, $data );

		if ( ! $result ) {
			return new WP_Error( 'update_failed', 'Failed to update dashboard.', array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $this->manager->get_dashboard( $id ), 200 );
	}

	public function delete_dashboard( WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );

		$existing = $this->manager->get_dashboard( $id );
		if ( ! $existing ) {
			return new WP_Error( 'not_found', 'Dashboard not found.', array( 'status' => 404 ) );
		}

		$result = $this->manager->delete_dashboard( $id );

		if ( ! $result ) {
			return new WP_Error( 'delete_failed', 'Failed to delete dashboard.', array( 'status' => 500 ) );
		}

		return new WP_REST_Response( array( 'success' => true, 'message' => 'Dashboard deleted.' ), 200 );
	}

	/* -------------------------------------------------------------------------
	 * Admin: Shared webhook management
	 * ---------------------------------------------------------------------- */

	public function get_shared_webhook( WP_REST_Request $request ) {
		$key = $this->manager->get_shared_webhook_key();

		if ( empty( $key ) ) {
			return new WP_REST_Response( array( 'exists' => false ), 200 );
		}

		return new WP_REST_Response( array(
			'exists'      => true,
			'webhook_key' => $key,
			'webhook_url' => $this->manager->get_shared_webhook_url(),
		), 200 );
	}

	public function generate_shared_webhook( WP_REST_Request $request ) {
		$key = $this->manager->generate_shared_webhook_key();

		return new WP_REST_Response( array(
			'exists'      => true,
			'webhook_key' => $key,
			'webhook_url' => $this->manager->get_shared_webhook_url(),
		), 201 );
	}

	public function delete_shared_webhook( WP_REST_Request $request ) {
		$this->manager->delete_shared_webhook_key();

		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	/* -------------------------------------------------------------------------
	 * Frontend: My Dashboard
	 * ---------------------------------------------------------------------- */

	private function resolve_dashboard( WP_REST_Request $request ) {
		$dashboard_id = $request->get_param( 'dashboard_id' );

		if ( $dashboard_id && current_user_can( 'manage_options' ) ) {
			$dashboard = $this->manager->get_dashboard( (int) $dashboard_id );
			if ( ! $dashboard ) {
				return new WP_Error( 'not_found', 'Dashboard not found.', array( 'status' => 404 ) );
			}
			return $dashboard;
		}

		$user_id   = get_current_user_id();
		$dashboard = $this->manager->get_dashboard_by_user( $user_id );

		if ( ! $dashboard ) {
			return new WP_Error( 'no_dashboard', 'No dashboard is configured for your account.', array( 'status' => 403 ) );
		}

		return $dashboard;
	}

	public function get_my_dashboard( WP_REST_Request $request ) {
		$dashboard = $this->resolve_dashboard( $request );
		if ( is_wp_error( $dashboard ) ) {
			return $dashboard;
		}

		return new WP_REST_Response( array(
			'id'                   => $dashboard->id,
			'name'                 => $dashboard->name,
			'member_workshop_code' => $dashboard->member_workshop_code,
			'tabs'                 => array(
				array( 'key' => 'current_registrations', 'label' => 'Current Registrations' ),
				array( 'key' => 'attended_report', 'label' => 'Attended Workshop & Requested Report' ),
				array( 'key' => 'attended_other', 'label' => "Attended Other Members' Workshop" ),
				array( 'key' => 'fed_request', 'label' => 'Fed Employee Requested Advisor Report' ),
			),
		), 200 );
	}

	public function get_my_contacts( WP_REST_Request $request ) {
		$dashboard = $this->resolve_dashboard( $request );
		if ( is_wp_error( $dashboard ) ) {
			return $dashboard;
		}

		$result = $this->manager->get_contacts( $dashboard->id, array(
			'tab'          => $request->get_param( 'tab' ),
			'page'         => $request->get_param( 'page' ),
			'per_page'     => $request->get_param( 'per_page' ),
			'orderby'      => $request->get_param( 'orderby' ),
			'order'        => $request->get_param( 'order' ),
			'search'       => $request->get_param( 'search' ),
			'date_filter'  => $request->get_param( 'date_filter' ),
			'date_field'   => $request->get_param( 'date_field' ),
		) );

		$response = new WP_REST_Response( $result['data'], 200 );
		$response->header( 'X-WP-Total', $result['total'] );
		$response->header( 'X-WP-TotalPages', $result['total_pages'] );

		return $response;
	}

	public function get_my_workshop_dates( WP_REST_Request $request ) {
		$dashboard = $this->resolve_dashboard( $request );
		if ( is_wp_error( $dashboard ) ) {
			return $dashboard;
		}

		$date_field = $request->get_param( 'date_field' ) ?: 'workshop_date';
		$dates = $this->manager->get_distinct_dates_with_counts( $dashboard->id, $request->get_param( 'tab' ), $date_field );

		return new WP_REST_Response( $dates, 200 );
	}

	public function get_my_contact_summary( WP_REST_Request $request ) {
		$dashboard = $this->resolve_dashboard( $request );
		if ( is_wp_error( $dashboard ) ) {
			return $dashboard;
		}

		$summary = $this->manager->get_contact_summary( $dashboard->id, array(
			'tab'         => $request->get_param( 'tab' ),
			'search'      => $request->get_param( 'search' ),
			'date_filter' => $request->get_param( 'date_filter' ),
			'date_field'  => $request->get_param( 'date_field' ),
		) );

		return new WP_REST_Response( $summary, 200 );
	}

	public function save_column_prefs( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$prefs   = $request->get_param( 'prefs' );

		// Sanitize: only allow valid tab keys with objects of column key => boolean.
		$valid_tabs = array( 'current_registrations', 'attended_report', 'attended_other', 'fed_request' );
		$sanitized  = array();
		if ( is_array( $prefs ) ) {
			foreach ( $prefs as $tab => $visibility ) {
				if ( in_array( $tab, $valid_tabs, true ) && is_array( $visibility ) ) {
					$sanitized[ $tab ] = array();
					foreach ( $visibility as $col_key => $visible ) {
						$sanitized[ $tab ][ sanitize_key( $col_key ) ] = (bool) $visible;
					}
				}
			}
		}

		update_user_meta( $user_id, 'advdash_column_prefs', $sanitized );

		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	public function update_my_contact_notes( WP_REST_Request $request ) {
		$dashboard = $this->resolve_dashboard( $request );
		if ( is_wp_error( $dashboard ) ) {
			return $dashboard;
		}

		$contact_id = (int) $request->get_param( 'contact_id' );
		$update     = array();

		if ( $request->has_param( 'advisor_notes' ) ) {
			$update['advisor_notes'] = sanitize_textarea_field( $request->get_param( 'advisor_notes' ) );
		}
		if ( $request->has_param( 'advisor_status' ) ) {
			$update['advisor_status'] = sanitize_text_field( $request->get_param( 'advisor_status' ) );
		}

		if ( empty( $update ) ) {
			return new WP_Error( 'no_data', 'No data to update.', array( 'status' => 400 ) );
		}

		$result = $this->manager->update_contact_notes( $contact_id, $dashboard->id, $update );

		if ( ! $result ) {
			return new WP_Error( 'update_failed', 'Contact not found or could not be updated.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response( array( 'success' => true, 'contact_id' => $contact_id ), 200 );
	}

	public function delete_my_contact( WP_REST_Request $request ) {
		$dashboard = $this->resolve_dashboard( $request );
		if ( is_wp_error( $dashboard ) ) {
			return $dashboard;
		}

		$contact_id = (int) $request->get_param( 'contact_id' );
		$result     = $this->manager->delete_contact( $contact_id, $dashboard->id );

		if ( ! $result ) {
			return new WP_Error( 'delete_failed', 'Contact not found or could not be deleted.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response( array( 'success' => true, 'deleted_id' => $contact_id ), 200 );
	}

	/* -------------------------------------------------------------------------
	 * Admin: Webhook Logs
	 * ---------------------------------------------------------------------- */

	public function get_webhook_logs( WP_REST_Request $request ) {
		$result = $this->manager->get_webhook_logs( array(
			'dashboard_id'  => $request->get_param( 'dashboard_id' ),
			'page'          => $request->get_param( 'page' ),
			'per_page'      => $request->get_param( 'per_page' ),
			'orderby'       => $request->get_param( 'orderby' ),
			'order'         => $request->get_param( 'order' ),
			'status_filter' => $request->get_param( 'status_filter' ),
			'date_from'     => $request->get_param( 'date_from' ),
			'date_to'       => $request->get_param( 'date_to' ),
			'search'        => $request->get_param( 'search' ),
		) );

		$response = new WP_REST_Response( $result['data'], 200 );
		$response->header( 'X-WP-Total', $result['total'] );
		$response->header( 'X-WP-TotalPages', $result['total_pages'] );

		return $response;
	}

	public function get_webhook_log_detail( WP_REST_Request $request ) {
		$log = $this->manager->get_webhook_log( (int) $request->get_param( 'log_id' ) );

		if ( ! $log ) {
			return new WP_Error( 'not_found', 'Log entry not found.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response( $log, 200 );
	}

	public function get_webhook_log_filters( WP_REST_Request $request ) {
		$dashboard_id = $request->get_param( 'dashboard_id' );
		$filters = $this->manager->get_webhook_log_filters( $dashboard_id ? (int) $dashboard_id : null );

		return new WP_REST_Response( $filters, 200 );
	}

	public function clear_webhook_logs( WP_REST_Request $request ) {
		$dashboard_id = $request->get_param( 'dashboard_id' );
		$this->manager->clear_webhook_logs( $dashboard_id ? (int) $dashboard_id : null );

		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	public function get_webhook_logging_settings( WP_REST_Request $request ) {
		return new WP_REST_Response( array(
			'enabled'        => get_option( 'advdash_webhook_logging', '0' ) === '1',
			'retention_days' => (int) get_option( 'advdash_webhook_log_retention_days', 90 ),
		), 200 );
	}

	public function set_webhook_logging_settings( WP_REST_Request $request ) {
		$enabled = $request->get_param( 'enabled' );
		update_option( 'advdash_webhook_logging', $enabled ? '1' : '0' );

		if ( $request->has_param( 'retention_days' ) ) {
			$days = max( 7, min( 365, (int) $request->get_param( 'retention_days' ) ) );
			update_option( 'advdash_webhook_log_retention_days', $days );
		}

		return new WP_REST_Response( array(
			'enabled'        => (bool) $enabled,
			'retention_days' => (int) get_option( 'advdash_webhook_log_retention_days', 90 ),
		), 200 );
	}
}
