import { useState, useEffect } from '@wordpress/element';
import { TextControl, SelectControl, Button, Spinner, Notice, ToggleControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { getDashboard, createDashboard, updateDashboard, addDashboardUser, removeDashboardUser } from '../../shared/api';
import { TAB_CONFIG } from '../../shared/utils';
import WebhookManager from './WebhookManager';

export default function DashboardEditor( { id, onBack } ) {
	const isNew = ! id;

	const [ name, setName ] = useState( '' );
	const [ memberWorkshopCode, setMemberWorkshopCode ] = useState( '' );
	const [ users, setUsers ] = useState( [] );
	const [ assignedUsers, setAssignedUsers ] = useState( [] );
	const [ newUserId, setNewUserId ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( ! isNew );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ notice, setNotice ] = useState( null );
	const [ savedId, setSavedId ] = useState( id );
	const [ isActive, setIsActive ] = useState( true );
	const [ analyticsEnabled, setAnalyticsEnabled ] = useState( true );
	const [ tabVisibility, setTabVisibility ] = useState( {} );

	// Fetch WP users for the advisor dropdown.
	useEffect( () => {
		apiFetch( { path: '/wp/v2/users?per_page=100&context=edit' } )
			.then( ( data ) => {
				setUsers(
					data.map( ( u ) => ( {
						label: `${ u.name } (${ u.username })`,
						value: String( u.id ),
					} ) )
				);
			} )
			.catch( () => {
				// Fallback: try without context=edit in case of permission issues.
				apiFetch( { path: '/wp/v2/users?per_page=100' } )
					.then( ( data ) => {
						setUsers(
							data.map( ( u ) => ( {
								label: u.name,
								value: String( u.id ),
							} ) )
						);
					} )
					.catch( () => {
						setError( 'Failed to load WordPress users.' );
					} );
			} );
	}, [] );

	// Fetch existing dashboard data if editing.
	useEffect( () => {
		if ( ! isNew && id ) {
			setIsLoading( true );
			getDashboard( id )
				.then( ( data ) => {
					setName( data.name || '' );
					setMemberWorkshopCode( data.member_workshop_code || '' );
					setAssignedUsers( data.users || [] );
					setSavedId( data.id );
					setIsActive( data.is_active !== undefined ? !! Number( data.is_active ) : true );
					setAnalyticsEnabled( data.analytics_enabled !== undefined ? !! Number( data.analytics_enabled ) : true );
					// tab_visibility comes from REST API already decoded as an object.
					const tv = data.tab_visibility;
					setTabVisibility( ( tv && typeof tv === 'object' ) ? tv : {} );
				} )
				.catch( ( err ) => {
					setError( err.message || 'Failed to load dashboard.' );
				} )
				.finally( () => {
					setIsLoading( false );
				} );
		}
	}, [ id, isNew ] );

	const handleAddUser = async () => {
		if ( ! newUserId ) {
			return;
		}

		if ( savedId ) {
			// Existing dashboard: use the REST endpoint.
			try {
				const updatedUsers = await addDashboardUser( savedId, parseInt( newUserId, 10 ) );
				setAssignedUsers( updatedUsers );
				setNewUserId( '' );
			} catch ( err ) {
				setError( err.message || 'Failed to add user.' );
			}
		} else {
			// New dashboard not yet saved: add to local state.
			const user = users.find( ( u ) => u.value === newUserId );
			setAssignedUsers( ( prev ) => [
				...prev,
				{ wp_user_id: parseInt( newUserId, 10 ), display_name: user?.label || '' },
			] );
			setNewUserId( '' );
		}
	};

	const handleRemoveUser = async ( userId ) => {
		if ( savedId ) {
			try {
				await removeDashboardUser( savedId, userId );
				setAssignedUsers( ( prev ) => prev.filter( ( u ) => Number( u.wp_user_id ) !== Number( userId ) ) );
			} catch ( err ) {
				setError( err.message || 'Failed to remove user.' );
			}
		} else {
			setAssignedUsers( ( prev ) => prev.filter( ( u ) => Number( u.wp_user_id ) !== Number( userId ) ) );
		}
	};

	const handleSave = async () => {
		if ( ! name.trim() ) {
			setError( 'Dashboard name is required.' );
			return;
		}

		setIsSaving( true );
		setError( null );

		try {
			const data = {
				name: name.trim(),
				member_workshop_code: memberWorkshopCode.trim(),
				is_active: isActive,
				analytics_enabled: analyticsEnabled,
				tab_visibility: tabVisibility,
			};

			if ( isNew && ! savedId ) {
				// Include users for initial creation.
				if ( assignedUsers.length > 0 ) {
					data.wp_user_id = assignedUsers[ 0 ].wp_user_id;
					if ( assignedUsers.length > 1 ) {
						data.wp_user_ids = assignedUsers.slice( 1 ).map( ( u ) => u.wp_user_id );
					}
				}
				const result = await createDashboard( data );
				setSavedId( result.id );
				setAssignedUsers( result.users || [] );
				setNotice( 'Dashboard created successfully.' );
			} else {
				await updateDashboard( savedId, data );
				setNotice( 'Dashboard updated successfully.' );
			}
		} catch ( err ) {
			setError( err.message || 'Failed to save dashboard.' );
		}

		setIsSaving( false );
	};

	if ( isLoading ) {
		return (
			<div className="advdash-admin__loading">
				<Spinner />
			</div>
		);
	}

	// Filter out already-assigned users from the dropdown.
	const availableUsers = users.filter(
		( u ) => ! assignedUsers.some( ( au ) => String( au.wp_user_id ) === u.value )
	);

	return (
		<div className="advdash-admin__editor">
			<div className="advdash-admin__editor-header">
				<Button variant="tertiary" onClick={ onBack }>
					&larr; Back to List
				</Button>
				<h2>{ isNew && ! savedId ? 'Create New Dashboard' : 'Edit Dashboard' }</h2>
			</div>

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

			<div className="advdash-admin__form">
				<TextControl
					label="Dashboard Name"
					value={ name }
					onChange={ setName }
					placeholder="e.g., SFG Dashboard"
				/>

				<TextControl
					label="Member Workshop Code"
					value={ memberWorkshopCode }
					onChange={ setMemberWorkshopCode }
					placeholder="e.g., SFG"
					help="The advisor's member code used in HighLevel."
				/>

				<ToggleControl
					__nextHasNoMarginBottom
					label="Dashboard Active"
					checked={ isActive }
					onChange={ setIsActive }
					help={ isActive
						? 'This dashboard is active. Advisors can view it and webhooks will be processed.'
						: 'This dashboard is inactive. Advisors will see an unavailable message and webhooks will be rejected.'
					}
				/>

				<ToggleControl
					__nextHasNoMarginBottom
					label="Show Analytics Tab"
					checked={ analyticsEnabled }
					onChange={ setAnalyticsEnabled }
					help={ analyticsEnabled
						? 'Advisors see the Analytics tab with per-workshop trends, conversion funnel, food preferences, and pipeline stats.'
						: 'The Analytics tab is hidden for advisors on this dashboard.'
					}
				/>

				<div className="advdash-admin__tab-visibility">
					<h4>Visible Tabs</h4>
					{ TAB_CONFIG.map( ( tab ) => {
						const visible = tabVisibility[ tab.key ] !== false;
						return (
							<ToggleControl
								key={ tab.key }
								__nextHasNoMarginBottom
								label={ tab.label }
								checked={ visible }
								onChange={ ( checked ) =>
									setTabVisibility( ( prev ) => ( { ...prev, [ tab.key ]: checked } ) )
								}
							/>
						);
					} ) }
				</div>

				<div className="advdash-admin__users-section">
					<h4>Assigned Advisors</h4>
					{ assignedUsers.length === 0 && (
						<p className="advdash-admin__users-empty">No advisors assigned yet.</p>
					) }
					{ assignedUsers.length > 0 && (
						<ul className="advdash-admin__user-list">
							{ assignedUsers.map( ( u ) => (
								<li key={ u.wp_user_id }>
									<span>{ u.display_name }</span>
									<Button
										variant="link"
										isDestructive
										onClick={ () => handleRemoveUser( u.wp_user_id ) }
									>
										Remove
									</Button>
								</li>
							) ) }
						</ul>
					) }
					<div className="advdash-admin__add-user-row">
						<SelectControl
							label="Add Advisor"
							value={ newUserId }
							options={ [
								{ label: '— Select a user —', value: '' },
								...availableUsers,
							] }
							onChange={ setNewUserId }
						/>
						<Button
							variant="secondary"
							onClick={ handleAddUser }
							disabled={ ! newUserId }
						>
							Add
						</Button>
					</div>
				</div>

				<div className="advdash-admin__form-actions">
					<Button
						variant="primary"
						onClick={ handleSave }
						isBusy={ isSaving }
						disabled={ isSaving }
					>
						{ isSaving ? 'Saving...' : 'Save Dashboard' }
					</Button>
					<Button variant="tertiary" onClick={ onBack }>
						Cancel
					</Button>
				</div>
			</div>

			{ savedId && (
				<div className="advdash-admin__webhook-section">
					<h3>Webhook Reference</h3>
					<WebhookManager advisorCode={ memberWorkshopCode } />
				</div>
			) }
		</div>
	);
}
