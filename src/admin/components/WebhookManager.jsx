import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice } from '@wordpress/components';
import { getSharedWebhook } from '../../shared/api';

export default function WebhookManager( { advisorCode } ) {
	const [ webhook, setWebhook ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ copied, setCopied ] = useState( false );

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

	const handleCopy = async () => {
		if ( ! webhook?.webhook_url ) {
			return;
		}
		try {
			await navigator.clipboard.writeText( webhook.webhook_url );
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} catch {
			const textarea = document.createElement( 'textarea' );
			textarea.value = webhook.webhook_url;
			document.body.appendChild( textarea );
			textarea.select();
			document.execCommand( 'copy' );
			document.body.removeChild( textarea );
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
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
						<label>Shared Webhook URL</label>
						<div className="advdash-admin__webhook-url-field">
							<input
								type="text"
								readOnly
								value={ webhook.webhook_url }
								className="advdash-admin__webhook-url-input"
								onClick={ ( e ) => e.target.select() }
							/>
							<Button variant="secondary" onClick={ handleCopy }>
								{ copied ? 'Copied!' : 'Copy' }
							</Button>
						</div>
					</div>

					{ advisorCode ? (
						<p className="advdash-admin__webhook-help">
							Include <code>{ `"advisor_code": "${ advisorCode }"` }</code> in your
							HighLevel webhook payload to route contacts to this dashboard.
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
