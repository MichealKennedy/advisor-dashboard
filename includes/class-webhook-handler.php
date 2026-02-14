<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Webhook_Handler {

	private $manager;

	private static $valid_actions = array(
		'register',
		'cancel',
		'attended',
		'attended_other',
		'fed_request',
	);

	private static $action_status_map = array(
		'register'       => 'registered',
		'cancel'         => 'cancelled',
		'attended'       => 'attended_report',
		'attended_other' => 'attended_other',
		'fed_request'    => 'fed_request',
	);

	private static $field_map = array(
		// snake_case and camelCase field names.
		'contact_id'                  => 'contact_id',
		'contactId'                   => 'contact_id',
		'first_name'                  => 'first_name',
		'firstName'                   => 'first_name',
		'last_name'                   => 'last_name',
		'lastName'                    => 'last_name',
		'spouse_name'                 => 'spouse_name',
		'spouseName'                  => 'spouse_name',
		'workshop_date'               => 'workshop_date',
		'workshopDate'                => 'workshop_date',
		'food_option_fed'             => 'food_option_fed',
		'side_option_fed'             => 'side_option_fed',
		'food_option_spouse'          => 'food_option_spouse',
		'side_option_spouse'          => 'side_option_spouse',
		'rsvp_confirmed'              => 'rsvp_confirmed',
		'city'                        => 'city',
		'state'                       => 'state',
		'postal_code'                 => 'postal_code',
		'postalCode'                  => 'postal_code',
		'home_address'                => 'home_address',
		'homeAddress'                 => 'home_address',
		'other_address'               => 'other_address',
		'other_city'                  => 'other_city',
		'other_state'                 => 'other_state',
		'other_postal_code'           => 'other_postal_code',
		'special_provisions'          => 'special_provisions',
		'retirement_system'           => 'retirement_system',
		'registration_form_completed' => 'registration_form_completed',
		'member_workshop_code'        => 'member_workshop_code',
		'work_phone'                  => 'work_phone',
		'cell_phone'                  => 'cell_phone',
		'cellPhone'                   => 'cell_phone',
		'old_phone'                   => 'old_phone',
		'work_email'                  => 'work_email',
		'workEmail'                   => 'work_email',
		'personal_email'              => 'personal_email',
		'personalEmail'               => 'personal_email',
		'other_email'                 => 'other_email',
		'best_email'                  => 'best_email',
		'agency'                      => 'agency',
		'time_frame_for_retirement'   => 'time_frame_for_retirement',
		'comment_on_registration'     => 'comment_on_registration',
		'training_action'             => 'training_action',
		'tell_others'                 => 'tell_others',
		'additional_comments'         => 'additional_comments',
		'rate_material'               => 'rate_material',
		'rate_virtual_environment'    => 'rate_virtual_environment',
		'meet_for_report'             => 'meet_for_report',
		'date_of_lead_request'        => 'date_of_lead_request',
		'status'                      => 'status',

		// HighLevel CRM human-readable field names.
		'Workshop Date'                        => 'workshop_date',
		'Workshop Appointment Date'            => 'workshop_date',
		'Spouse Name'                          => 'spouse_name',
		'Food Option Selected'                 => 'food_option_fed',
		'Food Option Selected for Spouse'      => 'food_option_spouse',
		'Food Side Option Selected'            => 'side_option_fed',
		'Food Side Option Selected for Spouse' => 'side_option_spouse',
		'Lunch Options (Fed)'                  => 'food_option_fed',
		'Lunch Options (Spouse)'               => 'food_option_spouse',
		'Lunch Side Option Selected (Fed)'     => 'side_option_fed',
		'Lunch Side Option Selected (Spouse)'  => 'side_option_spouse',
		'Food Side Options (Fed)'              => 'side_option_fed',
		'Food Side Options (Spouse)'           => 'side_option_spouse',
		'RSVP - Confirmed'                     => 'rsvp_confirmed',
		'Department/Agency'                    => 'agency',
		'Work Phone'                           => 'work_phone',
		'Work Email'                           => 'work_email',
		'Personal Email'                       => 'personal_email',
		'Best Email'                           => 'best_email',
		'Cell Phone'                           => 'cell_phone',
		'Special Provisions'                   => 'special_provisions',
		'Retirement System'                    => 'retirement_system',
		'Timeline for retirement'              => 'time_frame_for_retirement',
		'FRIW Webform Completed'               => 'registration_form_completed',
		'Comments or Questions'                => 'comment_on_registration',
		'Additional Comments on Evaluation'    => 'additional_comments',
		'Member Workshop Code (2-4 letters)'   => 'member_workshop_code',
		'Workshop Status'                      => 'status',
	);

	// Columns that hold DATE values — used for sanitization.
	private static $date_columns = array(
		'workshop_date',
		'registration_form_completed',
		'date_of_lead_request',
	);

	// Reserved fields that are not contact data.
	private static $reserved_fields = array( 'action', 'advisor_code', 'advisorCode' );

	public function __construct( AdvDash_Dashboard_Manager $manager ) {
		$this->manager = $manager;
	}

	public function handle_webhook( WP_REST_Request $request ) {
		$raw_body    = $request->get_body();
		$webhook_key = $request->get_param( 'webhook_key' );
		$ip_address  = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '';

		$result = $this->process_webhook( $request );

		if ( get_option( 'advdash_webhook_logging', '0' ) === '1' ) {
			$this->log_result( $webhook_key, $raw_body, $ip_address, $result );
		}

		return $result;
	}

	private function process_webhook( WP_REST_Request $request ) {
		$webhook_key = $request->get_param( 'webhook_key' );

		// 0. IP-based rate limiting — prevent log flooding from invalid key spam.
		$ip_address  = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
		$ip_rate_key = 'advdash_ip_' . md5( $ip_address );
		$ip_count    = (int) get_transient( $ip_rate_key );

		if ( $ip_count >= 30 ) {
			return new WP_Error( 'rate_limited', 'Too many requests. Try again later.', array( 'status' => 429 ) );
		}

		set_transient( $ip_rate_key, $ip_count + 1, 60 );

		// 1. Validate shared webhook key.
		$stored_key = $this->manager->get_shared_webhook_key();

		if ( empty( $stored_key ) || ! hash_equals( $stored_key, $webhook_key ) ) {
			return new WP_Error( 'invalid_key', 'Invalid webhook key.', array( 'status' => 404 ) );
		}

		// 2. Rate limiting — 120 requests per minute for shared endpoint.
		$rate_key = 'advdash_shared_rate';
		$count    = (int) get_transient( $rate_key );

		if ( $count >= 120 ) {
			return new WP_Error( 'rate_limited', 'Too many requests. Try again later.', array( 'status' => 429 ) );
		}

		set_transient( $rate_key, $count + 1, 60 );

		// 3. Parse payload — handle JSON body, form data, or query params.
		$body = $this->parse_payload( $request );

		if ( ! is_array( $body ) || empty( $body ) ) {
			error_log( '[AdvDash] Webhook bad payload. Content-Type: ' . $request->get_content_type()['value'] . ' Body length: ' . strlen( $request->get_body() ) );
			return new WP_Error( 'invalid_payload', 'Request body could not be parsed.', array( 'status' => 400 ) );
		}

		// 4. Extract advisor_code — REQUIRED for shared webhook.
		$advisor_code = isset( $body['advisor_code'] ) ? sanitize_text_field( $body['advisor_code'] ) : '';
		if ( empty( $advisor_code ) && isset( $body['advisorCode'] ) ) {
			$advisor_code = sanitize_text_field( $body['advisorCode'] );
		}

		if ( empty( $advisor_code ) ) {
			return new WP_Error(
				'missing_advisor_code',
				'The "advisor_code" field is required.',
				array( 'status' => 400 )
			);
		}

		// 5. Look up dashboard by advisor code.
		$dashboard = $this->manager->get_dashboard_by_workshop_code( $advisor_code );

		if ( ! $dashboard ) {
			return new WP_Error(
				'unknown_advisor_code',
				'No dashboard found for advisor_code: ' . $advisor_code,
				array( 'status' => 404 )
			);
		}

		$dashboard_id = (int) $dashboard->id;

		// 6. Extract action (required).
		$action = isset( $body['action'] ) ? sanitize_text_field( $body['action'] ) : '';

		if ( ! in_array( $action, self::$valid_actions, true ) ) {
			return new WP_Error(
				'invalid_action',
				'The "action" field is required and must be one of: ' . implode( ', ', self::$valid_actions ),
				array( 'status' => 400 )
			);
		}

		$contact_status = self::$action_status_map[ $action ];

		// 7. Map fields.
		$mapped_data = array();
		foreach ( $body as $key => $value ) {
			if ( in_array( $key, self::$reserved_fields, true ) ) {
				continue; // Skip reserved fields.
			}
			// Skip non-scalar values (arrays/objects that weren't flattened).
			if ( ! is_scalar( $value ) ) {
				continue;
			}
			if ( isset( self::$field_map[ $key ] ) ) {
				$col = self::$field_map[ $key ];
				// Don't overwrite an already-mapped column (snake_case takes priority over camelCase).
				if ( ! isset( $mapped_data[ $col ] ) ) {
					$mapped_data[ $col ] = $this->sanitize_value( $col, $value );
				}
			}
		}

		$contact_id = isset( $mapped_data['contact_id'] ) ? $mapped_data['contact_id'] : null;

		// contact_id is required for all actions (needed for unique key).
		if ( empty( $contact_id ) ) {
			return new WP_Error(
				'missing_contact_id',
				'The "contact_id" field is required.',
				array( 'status' => 400 )
			);
		}

		// 8. Dispatch action.
		if ( 'cancel' === $action ) {
			return $this->handle_cancel( $dashboard_id, $mapped_data, $contact_id );
		}

		return $this->handle_upsert( $dashboard_id, $contact_status, $mapped_data, $contact_id );
	}

	/**
	 * Parse the incoming webhook payload from HighLevel.
	 *
	 * HighLevel can send data in various formats:
	 * - JSON body (application/json)
	 * - Form-encoded (application/x-www-form-urlencoded)
	 * - Nested structures with contact data inside sub-objects
	 *
	 * This method normalizes everything into a single flat associative array.
	 */
	private function parse_payload( WP_REST_Request $request ) {
		// Try JSON body first.
		$body = json_decode( $request->get_body(), true );

		// Fall back to WP's parsed body params (handles form-encoded data).
		if ( ! is_array( $body ) || empty( $body ) ) {
			$body = $request->get_body_params();
		}

		if ( ! is_array( $body ) || empty( $body ) ) {
			return null;
		}

		// Flatten the payload: HighLevel may nest contact fields inside sub-objects
		// like "contact", "customData", "data", etc. Pull everything up to the top level.
		$flat = array();

		foreach ( $body as $key => $value ) {
			if ( is_array( $value ) ) {
				// Flatten one level of nesting — pull sub-object fields to the top.
				foreach ( $value as $sub_key => $sub_value ) {
					if ( is_scalar( $sub_value ) || is_null( $sub_value ) ) {
						// Don't overwrite top-level keys (they take priority).
						if ( ! isset( $flat[ $sub_key ] ) ) {
							$flat[ $sub_key ] = $sub_value;
						}
					}
				}
			} else {
				$flat[ $key ] = $value;
			}
		}

		return $flat;
	}

	private function handle_upsert( $dashboard_id, $contact_status, $mapped_data, $contact_id ) {
		global $wpdb;

		if ( empty( $mapped_data ) ) {
			return new WP_Error( 'empty_payload', 'No valid contact fields provided.', array( 'status' => 400 ) );
		}

		$table = $wpdb->prefix . 'advdash_contacts';

		// Always include dashboard_id and contact_status.
		$mapped_data['dashboard_id']    = $dashboard_id;
		$mapped_data['contact_status']  = $contact_status;

		// Build columns, placeholders, and values.
		$columns       = array();
		$placeholders  = array();
		$values        = array();
		$update_parts  = array();

		foreach ( $mapped_data as $col => $val ) {
			$columns[]      = $col;
			$placeholder    = $this->get_placeholder( $col );
			$placeholders[] = $placeholder;
			$values[]       = $val;

			// Don't include identity columns in the UPDATE clause.
			if ( in_array( $col, array( 'dashboard_id', 'contact_id' ), true ) ) {
				continue;
			}

			if ( 'contact_status' === $col ) {
				// Save the previous status before overwriting.
				$update_parts[] = 'previous_status = contact_status';
				$update_parts[] = 'contact_status = VALUES(contact_status)';
			} else {
				$update_parts[] = "{$col} = VALUES({$col})";
			}
		}

		$columns_str      = implode( ', ', $columns );
		$placeholders_str = implode( ', ', $placeholders );

		// Always update updated_at.
		$update_parts[] = 'updated_at = NOW()';
		$update_clause  = implode( ', ', $update_parts );

		$sql = "INSERT INTO {$table} ({$columns_str}) VALUES ({$placeholders_str})
				ON DUPLICATE KEY UPDATE {$update_clause}";

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- query built with placeholders.
		$result = $wpdb->query( $wpdb->prepare( $sql, ...$values ) );

		if ( false === $result ) {
			error_log( '[AdvDash] Webhook upsert failed: ' . $wpdb->last_error );
			return new WP_Error( 'db_error', 'Failed to save contact.', array( 'status' => 500 ) );
		}

		return new WP_REST_Response(
			array(
				'success'        => true,
				'action'         => 'upsert',
				'contact_status' => $contact_status,
				'contact_id'     => $contact_id,
			),
			200
		);
	}

	private function handle_cancel( $dashboard_id, $mapped_data, $contact_id ) {
		global $wpdb;

		$table = $wpdb->prefix . 'advdash_contacts';

		// Check that the contact exists.
		$existing = $wpdb->get_row( $wpdb->prepare(
			"SELECT id, contact_status FROM {$table} WHERE dashboard_id = %d AND contact_id = %s",
			$dashboard_id,
			$contact_id
		) );

		if ( ! $existing ) {
			return new WP_Error( 'not_found', 'No matching contact found to cancel.', array( 'status' => 404 ) );
		}

		// Build update data: set previous_status, contact_status, and merge any extra fields.
		$update_data = array(
			'previous_status' => $existing->contact_status,
			'contact_status'  => 'cancelled',
			'updated_at'      => current_time( 'mysql', true ),
		);

		// Merge any additional fields sent with the cancel action.
		foreach ( $mapped_data as $col => $val ) {
			if ( in_array( $col, array( 'dashboard_id', 'contact_id', 'contact_status', 'previous_status' ), true ) ) {
				continue;
			}
			$update_data[ $col ] = $val;
		}

		$formats = array();
		foreach ( $update_data as $col => $val ) {
			$formats[] = $this->get_placeholder( $col );
		}

		$result = $wpdb->update(
			$table,
			$update_data,
			array( 'id' => $existing->id ),
			$formats,
			array( '%d' )
		);

		if ( false === $result ) {
			error_log( '[AdvDash] Webhook cancel failed: ' . $wpdb->last_error );
			return new WP_Error( 'db_error', 'Failed to cancel contact.', array( 'status' => 500 ) );
		}

		return new WP_REST_Response(
			array(
				'success'        => true,
				'action'         => 'cancel',
				'contact_status' => 'cancelled',
				'contact_id'     => $contact_id,
			),
			200
		);
	}

	private function sanitize_value( $column, $value ) {
		if ( is_null( $value ) || '' === $value ) {
			return null;
		}

		if ( in_array( $column, self::$date_columns, true ) ) {
			// Validate date format (YYYY-MM-DD).
			if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
				return $value;
			}
			// Try to parse other date formats.
			$timestamp = strtotime( $value );
			if ( false !== $timestamp ) {
				return gmdate( 'Y-m-d', $timestamp );
			}
			return null;
		}

		return sanitize_text_field( $value );
	}

	private function get_placeholder( $column ) {
		if ( 'dashboard_id' === $column ) {
			return '%d';
		}
		return '%s';
	}

	private function log_result( $webhook_key, $raw_body, $ip_address, $result ) {
		// Parse action/contact_id from raw body for indexable columns.
		$body_data         = json_decode( $raw_body, true );
		$parsed_tab        = null;
		$parsed_action     = null;
		$parsed_contact_id = null;
		$dashboard_id      = null;

		if ( is_array( $body_data ) ) {
			// Check customData for fields that HighLevel may nest there.
			$custom = isset( $body_data['customData'] ) && is_array( $body_data['customData'] ) ? $body_data['customData'] : array();

			$parsed_action = isset( $body_data['action'] ) ? $body_data['action']
						   : ( isset( $custom['action'] ) ? $custom['action'] : null );

			// Derive tab/status from action for log indexing.
			if ( $parsed_action && isset( self::$action_status_map[ $parsed_action ] ) ) {
				$parsed_tab = self::$action_status_map[ $parsed_action ];
			}

			$parsed_contact_id = isset( $body_data['contact_id'] ) ? $body_data['contact_id']
							   : ( isset( $body_data['contactId'] ) ? $body_data['contactId'] : null );

			// Resolve dashboard_id from advisor_code.
			$advisor_code = isset( $body_data['advisor_code'] ) ? $body_data['advisor_code']
						  : ( isset( $body_data['advisorCode'] ) ? $body_data['advisorCode']
						  : ( isset( $custom['advisor_code'] ) ? $custom['advisor_code'] : null ) );

			if ( $advisor_code ) {
				$dashboard = $this->manager->get_dashboard_by_workshop_code( $advisor_code );
				if ( $dashboard ) {
					$dashboard_id = (int) $dashboard->id;
				}
			}
		}

		if ( is_wp_error( $result ) ) {
			$error_data    = $result->get_error_data();
			$status_code   = isset( $error_data['status'] ) ? (int) $error_data['status'] : 500;
			$error_code    = $result->get_error_code();
			$error_message = $result->get_error_message();
			$response_body = wp_json_encode( array(
				'code'    => $error_code,
				'message' => $error_message,
			) );
		} else {
			$status_code   = $result->get_status();
			$error_code    = null;
			$error_message = null;
			$response_body = wp_json_encode( $result->get_data() );
		}

		$this->manager->create_webhook_log( array(
			'dashboard_id'      => $dashboard_id,
			'webhook_key'       => 'shared',
			'request_body'      => $raw_body,
			'parsed_tab'        => $parsed_tab,
			'parsed_action'     => $parsed_action,
			'parsed_contact_id' => $parsed_contact_id,
			'status_code'       => $status_code,
			'error_code'        => $error_code,
			'error_message'     => $error_message,
			'response_body'     => $response_body,
			'ip_address'        => $ip_address,
		) );
	}
}
