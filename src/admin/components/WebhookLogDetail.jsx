import { useState, useEffect } from '@wordpress/element';
import { Modal, Spinner } from '@wordpress/components';
import { getWebhookLogDetail } from '../../shared/api';

function formatJson( str ) {
	if ( ! str ) {
		return '';
	}
	try {
		return JSON.stringify( JSON.parse( str ), null, 2 );
	} catch {
		return str;
	}
}

function StatusBadge( { code } ) {
	const isSuccess = code >= 200 && code < 300;
	const className = isSuccess
		? 'advdash-admin__log-status advdash-admin__log-status--success'
		: 'advdash-admin__log-status advdash-admin__log-status--error';
	return <span className={ className }>{ code }</span>;
}

export default function WebhookLogDetail( { logId, onClose } ) {
	const [ log, setLog ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		setIsLoading( true );
		setError( null );
		getWebhookLogDetail( logId )
			.then( ( data ) => setLog( data ) )
			.catch( ( err ) => setError( err.message || 'Failed to load log entry.' ) )
			.finally( () => setIsLoading( false ) );
	}, [ logId ] );

	const title = log
		? `Webhook Log #${ log.id }`
		: 'Webhook Log';

	return (
		<Modal title={ title } onRequestClose={ onClose } size="large">
			{ isLoading && (
				<div className="advdash-admin__loading">
					<Spinner />
				</div>
			) }

			{ error && <p className="advdash-admin__log-error">{ error }</p> }

			{ log && (
				<div className="advdash-admin__log-detail">
					<table className="widefat striped advdash-admin__log-meta-table">
						<tbody>
							<tr>
								<th>Status</th>
								<td><StatusBadge code={ log.status_code } /></td>
							</tr>
							<tr>
								<th>Date/Time</th>
								<td>{ log.created_at }</td>
							</tr>
							<tr>
								<th>Dashboard</th>
								<td>{ log.dashboard_name || '—' }</td>
							</tr>
							<tr>
								<th>Tab</th>
								<td>{ log.parsed_tab || '—' }</td>
							</tr>
							<tr>
								<th>Action</th>
								<td>{ log.parsed_action || '—' }</td>
							</tr>
							<tr>
								<th>Contact ID</th>
								<td>{ log.parsed_contact_id || '—' }</td>
							</tr>
							<tr>
								<th>IP Address</th>
								<td>{ log.ip_address || '—' }</td>
							</tr>
							{ log.error_code && (
								<tr>
									<th>Error Code</th>
									<td><code>{ log.error_code }</code></td>
								</tr>
							) }
							{ log.error_message && (
								<tr>
									<th>Error Message</th>
									<td>{ log.error_message }</td>
								</tr>
							) }
						</tbody>
					</table>

					<h3>Request Body</h3>
					<pre className="advdash-admin__log-json">
						{ formatJson( log.request_body ) || '(empty)' }
					</pre>

					<h3>Response Body</h3>
					<pre className="advdash-admin__log-json">
						{ formatJson( log.response_body ) || '(empty)' }
					</pre>
				</div>
			) }
		</Modal>
	);
}
