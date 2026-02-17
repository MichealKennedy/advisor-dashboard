import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice } from '@wordpress/components';
import { getSharedWebhook } from '../../shared/api';

export default function WebhookManager( { advisorCode } ) {
	const [ webhook, setWebhook ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ copiedField, setCopiedField ] = useState( null );

	useEffect( () => {
		setIsLoading( true );
		getSharedWebhook()
			.then( ( data ) => {
				setWebhook( data.exists ? data : null );
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to load webhook.' );
			} )
			.finally( () => {
				setIsLoading( false );
			} );
	}, [] );

	const handleCopy = async ( text, field ) => {
		try {
			await navigator.clipboard.writeText( text );
			setCopiedField( field );
			setTimeout( () => setCopiedField( null ), 2000 );
		} catch {
			const textarea = document.createElement( 'textarea' );
			textarea.value = text;
			document.body.appendChild( textarea );
			textarea.select();
			document.execCommand( 'copy' );
			document.body.removeChild( textarea );
			setCopiedField( field );
			setTimeout( () => setCopiedField( null ), 2000 );
		}
	};

	if ( isLoading ) {
		return <Spinner />;
	}

	return (
		<div className="advdash-admin__webhook">
			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }

			{ ! webhook ? (
				<p>No shared webhook has been generated yet. Generate one from the main dashboard list page.</p>
			) : (
				<div className="advdash-admin__webhook-details">
					<div className="advdash-admin__webhook-url-row">
						<label>Webhook URL</label>
						<div className="advdash-admin__webhook-url-field">
							<input
								type="text"
								readOnly
								value={ webhook.webhook_url }
								className="advdash-admin__webhook-url-input"
								onClick={ ( e ) => e.target.select() }
							/>
							<Button variant="secondary" onClick={ () => handleCopy( webhook.webhook_url, 'url' ) }>
								{ copiedField === 'url' ? 'Copied!' : 'Copy' }
							</Button>
						</div>
					</div>

					<div className="advdash-admin__webhook-url-row">
						<label>Webhook Key</label>
						<div className="advdash-admin__webhook-url-field">
							<input
								type="text"
								readOnly
								value={ webhook.webhook_key }
								className="advdash-admin__webhook-url-input"
								onClick={ ( e ) => e.target.select() }
							/>
							<Button variant="secondary" onClick={ () => handleCopy( webhook.webhook_key, 'key' ) }>
								{ copiedField === 'key' ? 'Copied!' : 'Copy' }
							</Button>
						</div>
					</div>

					{ advisorCode ? (
						<p className="advdash-admin__webhook-help">
							In HighLevel, set the URL above and add the key as a custom header
							named <code>X-Webhook-Key</code>. Include <code>{ `"advisor_code": "${ advisorCode }"` }</code> in
							the payload to route contacts to this dashboard.
						</p>
					) : (
						<Notice status="warning" isDismissible={ false }>
							This dashboard has no <strong>Member Workshop Code</strong> set.
							Set one above so the shared webhook can route contacts to this dashboard.
						</Notice>
					) }
				</div>
			) }
		</div>
	);
}
