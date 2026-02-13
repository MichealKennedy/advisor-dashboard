import apiFetch from '@wordpress/api-fetch';

/* -------------------------------------------------------------------------
 * Admin API
 * ---------------------------------------------------------------------- */

export const getDashboards = () =>
	apiFetch( { path: '/advisor-dashboard/v1/dashboards' } );

export const getDashboard = ( id ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ id }` } );

export const createDashboard = ( data ) =>
	apiFetch( { path: '/advisor-dashboard/v1/dashboards', method: 'POST', data } );

export const updateDashboard = ( id, data ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ id }`, method: 'PUT', data } );

export const deleteDashboard = ( id ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ id }`, method: 'DELETE' } );

export const getDashboardUsers = ( dashboardId ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/users` } );

export const addDashboardUser = ( dashboardId, wpUserId ) =>
	apiFetch( {
		path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/users`,
		method: 'POST',
		data: { wp_user_id: wpUserId },
	} );

export const removeDashboardUser = ( dashboardId, wpUserId ) =>
	apiFetch( {
		path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/users/${ wpUserId }`,
		method: 'DELETE',
	} );

export const getSharedWebhook = () =>
	apiFetch( { path: '/advisor-dashboard/v1/shared-webhook' } );

export const generateSharedWebhook = () =>
	apiFetch( { path: '/advisor-dashboard/v1/shared-webhook', method: 'POST' } );

export const deleteSharedWebhook = () =>
	apiFetch( { path: '/advisor-dashboard/v1/shared-webhook', method: 'DELETE' } );

/* -------------------------------------------------------------------------
 * Frontend API
 * ---------------------------------------------------------------------- */

export const getMyDashboard = ( dashboardId ) => {
	const params = dashboardId ? `?dashboard_id=${ dashboardId }` : '';
	return apiFetch( { path: `/advisor-dashboard/v1/my-dashboard${ params }` } );
};

export const getFilterDates = ( tab, dateField, dashboardId ) => {
	let path = `/advisor-dashboard/v1/my-dashboard/workshop-dates?tab=${ tab }&date_field=${ dateField }`;
	if ( dashboardId ) {
		path += `&dashboard_id=${ dashboardId }`;
	}
	return apiFetch( { path } );
};

export const getContacts = ( params ) => {
	const query = new URLSearchParams();
	Object.entries( params ).forEach( ( [ key, value ] ) => {
		if ( value !== undefined && value !== null && value !== '' ) {
			query.set( key, value );
		}
	} );

	return apiFetch( {
		path: `/advisor-dashboard/v1/my-dashboard/contacts?${ query.toString() }`,
		parse: false,
	} ).then( async ( response ) => {
		const data = await response.json();
		return {
			data,
			total: parseInt( response.headers.get( 'X-WP-Total' ), 10 ) || 0,
			totalPages: parseInt( response.headers.get( 'X-WP-TotalPages' ), 10 ) || 0,
		};
	} );
};

export const getContactSummary = ( params ) => {
	const query = new URLSearchParams();
	Object.entries( params ).forEach( ( [ key, value ] ) => {
		if ( value !== undefined && value !== null && value !== '' ) {
			query.set( key, value );
		}
	} );
	return apiFetch( { path: `/advisor-dashboard/v1/my-dashboard/contact-summary?${ query.toString() }` } );
};

export const saveColumnPrefs = ( prefs ) =>
	apiFetch( { path: '/advisor-dashboard/v1/my-dashboard/column-prefs', method: 'PUT', data: { prefs } } );

export const updateContactNotes = ( contactId, data, dashboardId ) => {
	let path = `/advisor-dashboard/v1/my-dashboard/contacts/${ contactId }`;
	if ( dashboardId ) {
		path += `?dashboard_id=${ dashboardId }`;
	}
	return apiFetch( { path, method: 'PATCH', data } );
};

export const deleteContact = ( contactId, dashboardId ) => {
	let path = `/advisor-dashboard/v1/my-dashboard/contacts/${ contactId }`;
	if ( dashboardId ) {
		path += `?dashboard_id=${ dashboardId }`;
	}
	return apiFetch( { path, method: 'DELETE' } );
};

/* -------------------------------------------------------------------------
 * Webhook Log API (Admin)
 * ---------------------------------------------------------------------- */

export const getWebhookLogs = ( params ) => {
	const query = new URLSearchParams();
	Object.entries( params ).forEach( ( [ key, value ] ) => {
		if ( value !== undefined && value !== null && value !== '' ) {
			query.set( key, value );
		}
	} );

	return apiFetch( {
		path: `/advisor-dashboard/v1/webhook-logs?${ query.toString() }`,
		parse: false,
	} ).then( async ( response ) => {
		const data = await response.json();
		return {
			data,
			total: parseInt( response.headers.get( 'X-WP-Total' ), 10 ) || 0,
			totalPages: parseInt( response.headers.get( 'X-WP-TotalPages' ), 10 ) || 0,
		};
	} );
};

export const getWebhookLogDetail = ( id ) =>
	apiFetch( { path: `/advisor-dashboard/v1/webhook-logs/${ id }` } );

export const getWebhookLogFilters = ( dashboardId ) => {
	let path = '/advisor-dashboard/v1/webhook-logs/filters';
	if ( dashboardId ) {
		path += `?dashboard_id=${ dashboardId }`;
	}
	return apiFetch( { path } );
};

export const clearWebhookLogs = ( dashboardId ) => {
	let path = '/advisor-dashboard/v1/webhook-logs';
	if ( dashboardId ) {
		path += `?dashboard_id=${ dashboardId }`;
	}
	return apiFetch( { path, method: 'DELETE' } );
};

export const getWebhookLoggingSettings = () =>
	apiFetch( { path: '/advisor-dashboard/v1/settings/webhook-logging' } );

export const setWebhookLoggingSettings = ( data ) =>
	apiFetch( { path: '/advisor-dashboard/v1/settings/webhook-logging', method: 'PUT', data } );
