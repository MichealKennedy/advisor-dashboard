import { useState, useEffect, useCallback } from '@wordpress/element';
import { updateContactNotes } from '../../../shared/api';
import { ADVISOR_STATUSES, formatDate } from '../../../shared/utils';

export default function ContactDetailPanel( { contact, columns, dashboardId, onClose, onSaved } ) {
	const [ advisorStatus, setAdvisorStatus ] = useState( contact.advisor_status || '' );
	const [ advisorNotes, setAdvisorNotes ] = useState( contact.advisor_notes || '' );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ saveError, setSaveError ] = useState( null );

	// Reset local state when a different contact is selected.
	useEffect( () => {
		setAdvisorStatus( contact.advisor_status || '' );
		setAdvisorNotes( contact.advisor_notes || '' );
		setSaveError( null );
	}, [ contact.id ] );

	// Close on Escape.
	useEffect( () => {
		const handleKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				onClose();
			}
		};
		document.addEventListener( 'keydown', handleKey );
		return () => document.removeEventListener( 'keydown', handleKey );
	}, [ onClose ] );

	// Auto-save status on change.
	const handleStatusChange = useCallback( async ( newStatus ) => {
		setAdvisorStatus( newStatus );
		setSaveError( null );
		try {
			await updateContactNotes( contact.id, { advisor_status: newStatus }, dashboardId );
		} catch ( err ) {
			setSaveError( 'Failed to save status: ' + ( err.message || 'Unknown error' ) );
		}
	}, [ contact.id, dashboardId ] );

	// Save notes.
	const handleSaveNotes = async () => {
		setIsSaving( true );
		setSaveError( null );
		try {
			await updateContactNotes( contact.id, { advisor_notes: advisorNotes }, dashboardId );
			onSaved();
		} catch ( err ) {
			setSaveError( 'Failed to save notes: ' + ( err.message || 'Unknown error' ) );
		}
		setIsSaving( false );
	};

	const isDirty = advisorNotes !== ( contact.advisor_notes || '' );

	// Columns to display in the detail view (exclude advisor_status since it has its own section).
	const detailColumns = columns.filter( ( c ) => c.key !== 'advisor_status' );

	return (
		<>
			<div
				className="advdash__panel-overlay"
				onClick={ onClose }
			/>
			<div className="advdash__detail-panel">
				<div className="advdash__detail-header">
					<h3 className="advdash__detail-name">
						{ contact.first_name } { contact.last_name }
					</h3>
					<button
						className="advdash__detail-close"
						onClick={ onClose }
						type="button"
					>
						&times;
					</button>
				</div>

				<div className="advdash__detail-body">
					<div className="advdash__detail-section">
						<label className="advdash__detail-label">Status</label>
						<select
							className="advdash__status-select"
							value={ advisorStatus }
							onChange={ ( e ) => handleStatusChange( e.target.value ) }
						>
							{ ADVISOR_STATUSES.map( ( s ) => (
								<option key={ s.value } value={ s.value }>
									{ s.label }
								</option>
							) ) }
						</select>
					</div>

					<div className="advdash__detail-section">
						<label className="advdash__detail-label">Notes</label>
						<textarea
							className="advdash__notes-textarea"
							value={ advisorNotes }
							onChange={ ( e ) => setAdvisorNotes( e.target.value ) }
							rows={ 4 }
							placeholder="Add notes about this contact..."
						/>
						<button
							className="advdash__detail-save-btn"
							onClick={ handleSaveNotes }
							disabled={ ! isDirty || isSaving }
							type="button"
						>
							{ isSaving ? 'Saving...' : 'Save Notes' }
						</button>
					</div>

					{ saveError && (
						<div className="advdash__detail-error">
							{ saveError }
						</div>
					) }

					<div className="advdash__detail-section">
						<label className="advdash__detail-label">Contact Details</label>
						<dl className="advdash__detail-fields">
							{ detailColumns.map( ( col ) => {
								let val = contact[ col.key ];
								if ( col.type === 'date' ) {
									val = formatDate( val );
								}
								return (
									<div key={ col.key } className="advdash__detail-field">
										<dt>{ col.label }</dt>
										<dd>{ val || '\u2014' }</dd>
									</div>
								);
							} ) }
						</dl>
					</div>
				</div>
			</div>
		</>
	);
}
