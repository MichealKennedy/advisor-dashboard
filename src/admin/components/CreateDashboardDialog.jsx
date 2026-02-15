import { useState, useEffect } from '@wordpress/element';
import { TextControl, SelectControl, Button, Spinner, Notice } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { createDashboard } from '../../shared/api';

export default function CreateDashboardDialog( { onCreated, onCancel } ) {
	const [ name, setName ] = useState( '' );
	const [ memberWorkshopCode, setMemberWorkshopCode ] = useState( '' );
	const [ users, setUsers ] = useState( [] );
	const [ assignedUsers, setAssignedUsers ] = useState( [] );
	const [ newUserId, setNewUserId ] = useState( '' );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( null );

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

	const handleAddUser = () => {
		if ( ! newUserId ) {
			return;
		}
		const user = users.find( ( u ) => u.value === newUserId );
		setAssignedUsers( ( prev ) => [
			...prev,
			{ wp_user_id: parseInt( newUserId, 10 ), display_name: user?.label || '' },
		] );
		setNewUserId( '' );
	};

	const handleRemoveUser = ( userId ) => {
		setAssignedUsers( ( prev ) => prev.filter( ( u ) => Number( u.wp_user_id ) !== Number( userId ) ) );
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
			};

			if ( assignedUsers.length > 0 ) {
				data.wp_user_id = assignedUsers[ 0 ].wp_user_id;
				if ( assignedUsers.length > 1 ) {
					data.wp_user_ids = assignedUsers.slice( 1 ).map( ( u ) => u.wp_user_id );
				}
			}

			await createDashboard( data );
			onCreated();
		} catch ( err ) {
			setError( err.message || 'Failed to create dashboard.' );
			setIsSaving( false );
		}
	};

	// Filter out already-assigned users from the dropdown.
	const availableUsers = users.filter(
		( u ) => ! assignedUsers.some( ( au ) => String( au.wp_user_id ) === u.value )
	);

	return (
		<div className="advdash-admin__create-dialog">
			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }

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
							{ label: '\u2014 Select a user \u2014', value: '' },
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
					{ isSaving ? 'Creating...' : 'Create Dashboard' }
				</Button>
				<Button variant="tertiary" onClick={ onCancel }>
					Cancel
				</Button>
			</div>
		</div>
	);
}
