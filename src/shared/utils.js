export const formatDate = ( dateStr ) => {
	if ( ! dateStr ) {
		return '';
	}
	const d = new Date( dateStr + 'T00:00:00' );
	if ( isNaN( d.getTime() ) ) {
		return dateStr;
	}
	return d.toLocaleDateString( 'en-US', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	} );
};

export const TAB_CONFIG = [
	{
		key: 'current_registrations',
		label: 'Current Registrations',
		dateFilterField: 'workshop_date',
		pinnedColumns: [ 'first_name', 'last_name' ],
		columns: [
			{ key: 'workshop_date', label: 'Workshop Date', type: 'date' },
			{ key: 'first_name', label: 'First Name' },
			{ key: 'last_name', label: 'Last Name' },
			{ key: 'spouse_name', label: 'Spouse Name' },
			{ key: 'food_option_fed', label: 'Food Option (Fed)' },
			{ key: 'side_option_fed', label: 'Side (Fed)' },
			{ key: 'food_option_spouse', label: 'Food Option (Spouse)' },
			{ key: 'side_option_spouse', label: 'Side (Spouse)' },
			{ key: 'rsvp_confirmed', label: 'RSVP' },
			{ key: 'city', label: 'City' },
			{ key: 'state', label: 'State' },
			{ key: 'special_provisions', label: 'Special Provisions' },
			{ key: 'retirement_system', label: 'Retirement System' },
			{ key: 'registration_form_completed', label: 'Form Completed', type: 'date' },
			{ key: 'member_workshop_code', label: 'Workshop Code' },
			{ key: 'status', label: 'Status' },
			{ key: 'advisor_status', label: 'Advisor Status' },
		],
		defaultSort: { key: 'workshop_date', direction: 'desc' },
	},
	{
		key: 'attended_report',
		label: 'Attended Workshop & Requested Report',
		dateFilterField: 'workshop_date',
		pinnedColumns: [ 'first_name', 'last_name' ],
		columns: [
			{ key: 'workshop_date', label: 'Workshop Date', type: 'date' },
			{ key: 'first_name', label: 'First Name' },
			{ key: 'last_name', label: 'Last Name' },
			{ key: 'spouse_name', label: 'Spouse Name' },
			{ key: 'cell_phone', label: 'Cell Phone' },
			{ key: 'work_email', label: 'Work Email' },
			{ key: 'personal_email', label: 'Personal Email' },
			{ key: 'best_email', label: 'Best Email' },
			{ key: 'city', label: 'City' },
			{ key: 'state', label: 'State' },
			{ key: 'agency', label: 'Agency' },
			{ key: 'retirement_system', label: 'Retirement System' },
			{ key: 'time_frame_for_retirement', label: 'Retirement Timeframe' },
			{ key: 'meet_for_report', label: 'Meet for Report' },
			{ key: 'rate_material', label: 'Rate Material' },
			{ key: 'additional_comments', label: 'Comments' },
			{ key: 'advisor_status', label: 'Advisor Status' },
		],
		defaultSort: { key: 'workshop_date', direction: 'desc' },
	},
	{
		key: 'attended_other',
		label: "Attended Other Members' Workshop",
		dateFilterField: 'workshop_date',
		pinnedColumns: [ 'first_name', 'last_name' ],
		columns: [
			{ key: 'workshop_date', label: 'Workshop Date', type: 'date' },
			{ key: 'first_name', label: 'First Name' },
			{ key: 'last_name', label: 'Last Name' },
			{ key: 'spouse_name', label: 'Spouse Name' },
			{ key: 'cell_phone', label: 'Cell Phone' },
			{ key: 'work_email', label: 'Work Email' },
			{ key: 'personal_email', label: 'Personal Email' },
			{ key: 'best_email', label: 'Best Email' },
			{ key: 'city', label: 'City' },
			{ key: 'state', label: 'State' },
			{ key: 'agency', label: 'Agency' },
			{ key: 'retirement_system', label: 'Retirement System' },
			{ key: 'time_frame_for_retirement', label: 'Retirement Timeframe' },
			{ key: 'meet_for_report', label: 'Meet for Report' },
			{ key: 'rate_material', label: 'Rate Material' },
			{ key: 'additional_comments', label: 'Comments' },
			{ key: 'advisor_status', label: 'Advisor Status' },
		],
		defaultSort: { key: 'workshop_date', direction: 'desc' },
	},
	{
		key: 'fed_request',
		label: 'Fed Employee Requested Advisor Report',
		dateFilterField: 'date_of_lead_request',
		pinnedColumns: [ 'first_name', 'last_name' ],
		columns: [
			{ key: 'date_of_lead_request', label: 'Lead Request Date', type: 'date' },
			{ key: 'first_name', label: 'First Name' },
			{ key: 'last_name', label: 'Last Name' },
			{ key: 'spouse_name', label: 'Spouse Name' },
			{ key: 'cell_phone', label: 'Cell Phone' },
			{ key: 'work_email', label: 'Work Email' },
			{ key: 'personal_email', label: 'Personal Email' },
			{ key: 'best_email', label: 'Best Email' },
			{ key: 'home_address', label: 'Home Address' },
			{ key: 'city', label: 'City' },
			{ key: 'state', label: 'State' },
			{ key: 'postal_code', label: 'Zip' },
			{ key: 'agency', label: 'Agency' },
			{ key: 'retirement_system', label: 'Retirement System' },
			{ key: 'special_provisions', label: 'Special Provisions' },
			{ key: 'time_frame_for_retirement', label: 'Retirement Timeframe' },
			{ key: 'meet_for_report', label: 'Meet for Report' },
			{ key: 'advisor_status', label: 'Advisor Status' },
		],
		defaultSort: { key: 'date_of_lead_request', direction: 'desc' },
	},
];

export const VALID_TABS = TAB_CONFIG.map( ( t ) => t.key );

export const ADVISOR_STATUSES = [
	{ value: '', label: 'No Status' },
	{ value: 'new', label: 'New' },
	{ value: 'contacted', label: 'Contacted' },
	{ value: 'scheduled', label: 'Scheduled' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'not_interested', label: 'Not Interested' },
];
