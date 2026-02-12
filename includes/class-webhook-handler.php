<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Webhook_Handler {

	private $manager;

	private static $valid_tabs = array(
		'current_registrations',
		'attended_report',
		'attended_other',
		'fed_request',
	);

	private static $field_map = array(
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
	);

	// Columns that hold DATE values — used for sanitization.
	private static $date_columns = array(
		'workshop_date',
		'registration_form_completed',
		'date_of_lead_request',
	);

	public function __construct( AdvDash_Dashboard_Manager $manager ) {
		$this->manager = $manager;
	}

	public function handle_webhook( WP_REST_Request $request ) {
		$webhook_key = $request->get_param( 'webhook_key' );

		// 1. Look up webhook key.
		$webhook = $this->manager->get_webhook_by_key( $webhook_key );

		if ( ! $webhook ) {
			error_log( '[AdvDash] Webhook 404: invalid key attempted.' );
			return new WP_Error( 'invalid_key', 'Invalid webhook key.', array( 'status' => 404 ) );
		}

		if ( ! $webhook->is_active ) {
			return new WP_Error( 'inactive_webhook', 'This webhook is currently inactive.', array( 'status' => 403 ) );
		}

		// 2. Rate limiting — 60 requests per minute per key.
		$rate_key = 'advdash_rate_' . substr( $webhook_key, 0, 16 );
		$count    = (int) get_transient( $rate_key );

		if ( $count >= 60 ) {
			return new WP_Error( 'rate_limited', 'Too many requests. Try again later.', array( 'status' => 429 ) );
		}

		set_transient( $rate_key, $count + 1, 60 );

		// 3. Parse payload — handle JSON body, form data, or query params.
		$body = $this->parse_payload( $request );

		if ( ! is_array( $body ) || empty( $body ) ) {
			error_log( '[AdvDash] Webhook bad payload. Content-Type: ' . $request->get_content_type()['value'] . ' Raw body: ' . substr( $request->get_body(), 0, 500 ) );
			return new WP_Error( 'invalid_payload', 'Request body could not be parsed.', array( 'status' => 400 ) );
		}

		// Log the flattened payload for debugging (remove this once stable).
		error_log( '[AdvDash] Webhook received payload: ' . wp_json_encode( $body ) );

		// 4. Extract reserved fields.
		$tab = isset( $body['tab'] ) ? sanitize_text_field( $body['tab'] ) : '';

		if ( ! in_array( $tab, self::$valid_tabs, true ) ) {
			return new WP_Error(
				'invalid_tab',
				'The "tab" field is required and must be one of: ' . implode( ', ', self::$valid_tabs ),
				array( 'status' => 400 )
			);
		}

		$action = isset( $body['_action'] ) ? sanitize_text_field( $body['_action'] ) : 'add';

		if ( ! in_array( $action, array( 'add', 'remove' ), true ) ) {
			return new WP_Error( 'invalid_action', 'The "_action" field must be "add" or "remove".', array( 'status' => 400 ) );
		}

		$dashboard_id = (int) $webhook->dashboard_id;

		// 5. Map fields.
		$mapped_data = array();
		foreach ( $body as $key => $value ) {
			if ( in_array( $key, array( 'tab', '_action' ), true ) ) {
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

		// 6. Dispatch action.
		if ( 'remove' === $action ) {
			return $this->handle_remove( $dashboard_id, $tab, $contact_id );
		}

		return $this->handle_add( $dashboard_id, $tab, $mapped_data, $contact_id );
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

	private function handle_add( $dashboard_id, $tab, $mapped_data, $contact_id ) {
		global $wpdb;

		if ( empty( $mapped_data ) ) {
			return new WP_Error( 'empty_payload', 'No valid contact fields provided.', array( 'status' => 400 ) );
		}

		// Validate minimum data: need at least contact_id OR first + last name.
		$has_contact_id = ! empty( $contact_id );
		$has_name       = ! empty( $mapped_data['first_name'] ) && ! empty( $mapped_data['last_name'] );

		if ( ! $has_contact_id && ! $has_name ) {
			return new WP_Error(
				'insufficient_data',
				'Payload must include contact_id or both first_name and last_name.',
				array( 'status' => 400 )
			);
		}

		$table = $wpdb->prefix . 'advdash_contacts';

		// Always include dashboard_id and tab.
		$mapped_data['dashboard_id'] = $dashboard_id;
		$mapped_data['tab']          = $tab;

		// Build columns, placeholders, and values.
		$columns      = array();
		$placeholders  = array();
		$values       = array();
		$update_parts = array();

		foreach ( $mapped_data as $col => $val ) {
			$columns[]     = $col;
			$placeholder   = $this->get_placeholder( $col );
			$placeholders[] = $placeholder;
			$values[]      = $val;

			// Don't include dashboard_id and tab in the UPDATE clause.
			if ( ! in_array( $col, array( 'dashboard_id', 'tab', 'contact_id' ), true ) ) {
				$update_parts[] = "{$col} = VALUES({$col})";
			}
		}

		$columns_str     = implode( ', ', $columns );
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
				'success'    => true,
				'action'     => 'add',
				'contact_id' => $contact_id,
			),
			200
		);
	}

	private function handle_remove( $dashboard_id, $tab, $contact_id ) {
		global $wpdb;

		if ( empty( $contact_id ) ) {
			return new WP_Error( 'missing_contact_id', 'The "contact_id" field is required for remove actions.', array( 'status' => 400 ) );
		}

		$table  = $wpdb->prefix . 'advdash_contacts';
		$result = $wpdb->delete(
			$table,
			array(
				'dashboard_id' => $dashboard_id,
				'tab'          => $tab,
				'contact_id'   => $contact_id,
			),
			array( '%d', '%s', '%s' )
		);

		if ( 0 === $wpdb->rows_affected ) {
			return new WP_Error( 'not_found', 'No matching contact found to remove.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response(
			array(
				'success'    => true,
				'action'     => 'remove',
				'contact_id' => $contact_id,
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
}
