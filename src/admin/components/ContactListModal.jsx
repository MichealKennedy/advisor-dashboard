import { useState, useEffect } from '@wordpress/element';
import { Spinner, Notice } from '@wordpress/components';
import { getContacts } from '../../shared/api';
import { TAB_CONFIG, formatDate } from '../../shared/utils';

export default function ContactListModal( { dashboardId, dashboardName, tabKey } ) {
	const [ contacts, setContacts ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	const tabConfig = TAB_CONFIG.find( ( t ) => t.key === tabKey );

	useEffect( () => {
		setIsLoading( true );
		setError( null );
		getContacts( {
			dashboard_id: dashboardId,
			tab: tabKey,
			per_page: 200,
		} )
			.then( ( result ) => {
				setContacts( result.data );
				setTotal( result.total );
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to load contacts.' );
			} )
			.finally( () => {
				setIsLoading( false );
			} );
	}, [ dashboardId, tabKey ] );

	if ( isLoading ) {
		return (
			<div className="advdash-admin__loading">
				<Spinner />
			</div>
		);
	}

	if ( error ) {
		return (
			<Notice status="error" isDismissible={ false }>
				{ error }
			</Notice>
		);
	}

	const columns = tabConfig?.columns || [];

	if ( contacts.length === 0 ) {
		return (
			<p className="advdash-admin__contacts-empty">
				No contacts in this tab.
			</p>
		);
	}

	return (
		<div className="advdash-admin__contacts-modal">
			<p className="advdash-admin__contacts-count">
				{ total } contact{ total !== 1 ? 's' : '' } in <strong>{ dashboardName }</strong>
			</p>
			<div className="advdash-admin__contacts-scroll">
				<table className="advdash-admin__contacts-table">
					<thead>
						<tr>
							{ columns.map( ( col ) => (
								<th key={ col.key }>{ col.label }</th>
							) ) }
						</tr>
					</thead>
					<tbody>
						{ contacts.map( ( contact ) => (
							<tr key={ contact.id }>
								{ columns.map( ( col ) => (
									<td key={ col.key }>
										{ col.type === 'date'
											? formatDate( contact[ col.key ] )
											: ( contact[ col.key ] || '' ) }
									</td>
								) ) }
							</tr>
						) ) }
					</tbody>
				</table>
			</div>
			{ total > 200 && (
				<p className="advdash-admin__contacts-truncated">
					Showing first 200 of { total } contacts.
				</p>
			) }
		</div>
	);
}
