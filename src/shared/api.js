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

export const getWebhook = ( dashboardId ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/webhook` } );

export const createWebhook = ( dashboardId ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/webhook`, method: 'POST' } );

export const toggleWebhook = ( dashboardId, isActive ) =>
	apiFetch( {
		path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/webhook`,
		method: 'PUT',
		data: { is_active: isActive },
	} );

export const deleteWebhook = ( dashboardId ) =>
	apiFetch( { path: `/advisor-dashboard/v1/dashboards/${ dashboardId }/webhook`, method: 'DELETE' } );

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

export const deleteContact = ( contactId, dashboardId ) => {
	let path = `/advisor-dashboard/v1/my-dashboard/contacts/${ contactId }`;
	if ( dashboardId ) {
		path += `?dashboard_id=${ dashboardId }`;
	}
	return apiFetch( { path, method: 'DELETE' } );
};
