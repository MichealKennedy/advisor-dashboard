import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice } from '@wordpress/components';
import { getDashboards, deleteDashboard } from '../../shared/api';

export default function DashboardList( { onEdit, onCreate } ) {
	const [ dashboards, setDashboards ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ notice, setNotice ] = useState( null );

	const fetchDashboards = async () => {
		setIsLoading( true );
		setError( null );
		try {
			const data = await getDashboards();
			setDashboards( data );
		} catch ( err ) {
			setError( err.message || 'Failed to load dashboards.' );
		}
		setIsLoading( false );
	};

	useEffect( () => {
		fetchDashboards();
	}, [] );

	const handleDelete = async ( id, name ) => {
		if ( ! window.confirm( `Are you sure you want to delete "${ name }"? This will also delete all associated contacts and the webhook.` ) ) {
			return;
		}

		try {
			await deleteDashboard( id );
			setNotice( `"${ name }" has been deleted.` );
			fetchDashboards();
		} catch ( err ) {
			setError( err.message || 'Failed to delete dashboard.' );
		}
	};

	if ( isLoading ) {
		return (
			<div className="advdash-admin__loading">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="advdash-admin__list">
			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }
			{ notice && (
				<Notice status="success" isDismissible onDismiss={ () => setNotice( null ) }>
					{ notice }
				</Notice>
			) }

			<div className="advdash-admin__list-header">
				<Button variant="primary" onClick={ onCreate }>
					Add New Dashboard
				</Button>
			</div>

			{ dashboards.length === 0 ? (
				<p>No advisor dashboards have been created yet.</p>
			) : (
				<table className="wp-list-table widefat fixed striped">
					<thead>
						<tr>
							<th>Name</th>
							<th>Advisor</th>
							<th>Workshop Code</th>
							<th>Registrations</th>
							<th>Attended &amp; Report</th>
							<th>Attended Other</th>
							<th>Fed Request</th>
							<th>Total</th>
							<th>Webhook</th>
							<th>Created</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{ dashboards.map( ( dashboard ) => (
							<tr key={ dashboard.id }>
								<td>
									<strong>{ dashboard.name }</strong>
								</td>
								<td>{ dashboard.user_display_name || '—' }</td>
								<td>{ dashboard.member_workshop_code || '—' }</td>
								<td>{ dashboard.tab_current_registrations || 0 }</td>
								<td>{ dashboard.tab_attended_report || 0 }</td>
								<td>{ dashboard.tab_attended_other || 0 }</td>
								<td>{ dashboard.tab_fed_request || 0 }</td>
								<td><strong>{ dashboard.contact_count }</strong></td>
								<td>
									{ dashboard.webhook_active === null
										? 'Not configured'
										: dashboard.webhook_active
											? 'Active'
											: 'Inactive' }
								</td>
								<td>{ dashboard.created_at }</td>
								<td>
									<Button
										variant="link"
										onClick={ () => onEdit( dashboard.id ) }
									>
										Edit
									</Button>
									{ ' | ' }
									<Button
										variant="link"
										isDestructive
										onClick={ () => handleDelete( dashboard.id, dashboard.name ) }
									>
										Delete
									</Button>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }
		</div>
	);
}
