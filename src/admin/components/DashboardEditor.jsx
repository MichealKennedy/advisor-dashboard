import { useState, useEffect } from '@wordpress/element';
import { TextControl, SelectControl, Button, Spinner, Notice } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { getDashboard, createDashboard, updateDashboard } from '../../shared/api';
import WebhookManager from './WebhookManager';

export default function DashboardEditor( { id, onBack } ) {
	const isNew = ! id;

	const [ name, setName ] = useState( '' );
	const [ wpUserId, setWpUserId ] = useState( '' );
	const [ memberWorkshopCode, setMemberWorkshopCode ] = useState( '' );
	const [ users, setUsers ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( ! isNew );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ notice, setNotice ] = useState( null );
	const [ savedId, setSavedId ] = useState( id );

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
					setWpUserId( String( data.wp_user_id ) );
					setMemberWorkshopCode( data.member_workshop_code || '' );
					setSavedId( data.id );
				} )
				.catch( ( err ) => {
					setError( err.message || 'Failed to load dashboard.' );
				} )
				.finally( () => {
					setIsLoading( false );
				} );
		}
	}, [ id, isNew ] );

	const handleSave = async () => {
		if ( ! name.trim() ) {
			setError( 'Dashboard name is required.' );
			return;
		}
		if ( ! wpUserId ) {
			setError( 'Please select an advisor.' );
			return;
		}

		setIsSaving( true );
		setError( null );

		try {
			const data = {
				name: name.trim(),
				wp_user_id: parseInt( wpUserId, 10 ),
				member_workshop_code: memberWorkshopCode.trim(),
			};

			if ( isNew && ! savedId ) {
				const result = await createDashboard( data );
				setSavedId( result.id );
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

				<SelectControl
					label="Advisor (WordPress User)"
					value={ wpUserId }
					options={ [
						{ label: '— Select an advisor —', value: '' },
						...users,
					] }
					onChange={ setWpUserId }
				/>

				<TextControl
					label="Member Workshop Code"
					value={ memberWorkshopCode }
					onChange={ setMemberWorkshopCode }
					placeholder="e.g., SFG"
					help="The advisor's member code used in HighLevel."
				/>

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
					<h3>Webhook Configuration</h3>
					<WebhookManager dashboardId={ savedId } />
				</div>
			) }
		</div>
	);
}
