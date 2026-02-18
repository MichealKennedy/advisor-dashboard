import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice, Modal, ToggleControl } from '@wordpress/components';
import { getDashboards, deleteDashboard, updateDashboard } from '../../shared/api';
import { TAB_CONFIG } from '../../shared/utils';
import ContactListModal from './ContactListModal';

export default function DashboardList( { onEdit, onCreate } ) {
	const [ dashboards, setDashboards ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ notice, setNotice ] = useState( null );
	const [ contactView, setContactView ] = useState( null ); // { dashboardId, dashboardName, tabKey }

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
		if ( ! window.confirm( `Are you sure you want to delete "${ name }"? This will also delete all associated contacts.` ) ) {
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

	const handleBadgeClick = ( dashboard, tabKey ) => {
		const tabConfig = TAB_CONFIG.find( ( t ) => t.key === tabKey );
		setContactView( {
			dashboardId: dashboard.id,
			dashboardName: dashboard.name,
			tabKey,
			tabLabel: tabConfig?.label || tabKey,
		} );
	};

	const handleToggleActive = async ( dashboard ) => {
		const newActive = ! Number( dashboard.is_active );
		try {
			await updateDashboard( dashboard.id, { is_active: newActive } );
			setDashboards( ( prev ) =>
				prev.map( ( d ) =>
					d.id === dashboard.id ? { ...d, is_active: newActive ? 1 : 0 } : d
				)
			);
			setNotice(
				`"${ dashboard.name }" is now ${ newActive ? 'active' : 'inactive' }.`
			);
		} catch ( err ) {
			setError( err.message || 'Failed to update dashboard status.' );
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

			{ contactView && (
				<Modal
					title={ `${ contactView.dashboardName } — ${ contactView.tabLabel }` }
					onRequestClose={ () => setContactView( null ) }
					size="large"
					className="advdash-admin__contacts-modal-wrapper"
				>
					<ContactListModal
						dashboardId={ contactView.dashboardId }
						dashboardName={ contactView.dashboardName }
						tabKey={ contactView.tabKey }
					/>
				</Modal>
			) }

			<div className="advdash-admin__list-header">
				<h3>Advisor Dashboards</h3>
				<Button variant="primary" onClick={ onCreate }>
					+ Add New Dashboard
				</Button>
			</div>

			{ dashboards.length === 0 ? (
				<p>No advisor dashboards have been created yet.</p>
			) : (
				<table className="wp-list-table widefat fixed striped">
					<thead>
						<tr>
							<th>Name</th>
							<th>Advisors</th>
							<th>Code</th>
							<th>Status</th>
							<th>Regs</th>
							<th>Said Yes</th>
							<th>Attended Other</th>
							<th>Fed Request</th>
							<th>Total</th>
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
								<td>
									<ToggleControl
										__nextHasNoMarginBottom
										checked={ !! Number( dashboard.is_active ) }
										onChange={ () => handleToggleActive( dashboard ) }
										label={ Number( dashboard.is_active ) ? 'Active' : 'Inactive' }
									/>
								</td>
								<td>
									<button
										type="button"
										className="advdash-admin__stat-badge advdash-admin__stat-badge--registrations advdash-admin__stat-badge--clickable"
										onClick={ () => handleBadgeClick( dashboard, 'current_registrations' ) }
									>
										{ dashboard.tab_current_registrations || 0 }
									</button>
								</td>
								<td>
									<button
										type="button"
										className="advdash-admin__stat-badge advdash-admin__stat-badge--attended advdash-admin__stat-badge--clickable"
										onClick={ () => handleBadgeClick( dashboard, 'attended_report' ) }
									>
										{ dashboard.tab_attended_report || 0 }
									</button>
								</td>
								<td>
									<button
										type="button"
										className="advdash-admin__stat-badge advdash-admin__stat-badge--other advdash-admin__stat-badge--clickable"
										onClick={ () => handleBadgeClick( dashboard, 'attended_other' ) }
									>
										{ dashboard.tab_attended_other || 0 }
									</button>
								</td>
								<td>
									<button
										type="button"
										className="advdash-admin__stat-badge advdash-admin__stat-badge--fed advdash-admin__stat-badge--clickable"
										onClick={ () => handleBadgeClick( dashboard, 'fed_request' ) }
									>
										{ dashboard.tab_fed_request || 0 }
									</button>
								</td>
								<td>
									<span className="advdash-admin__stat-badge advdash-admin__stat-badge--total">
										{ dashboard.contact_count }
									</span>
								</td>
								<td>{ dashboard.created_at }</td>
								<td>
									<div className="advdash-admin__actions">
										<Button
											className="advdash-admin__action-btn advdash-admin__action-btn--edit"
											variant="secondary"
											onClick={ () => onEdit( dashboard.id ) }
										>
											Edit
										</Button>
										<Button
											className="advdash-admin__action-btn advdash-admin__action-btn--delete"
											variant="secondary"
											isDestructive
											onClick={ () => handleDelete( dashboard.id, dashboard.name ) }
										>
											Delete
										</Button>
									</div>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }
		</div>
	);
}
