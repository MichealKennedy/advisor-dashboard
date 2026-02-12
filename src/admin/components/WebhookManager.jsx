import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice, ToggleControl } from '@wordpress/components';
import { getWebhook, createWebhook, toggleWebhook, deleteWebhook } from '../../shared/api';

export default function WebhookManager( { dashboardId } ) {
	const [ webhook, setWebhook ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isWorking, setIsWorking ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ copied, setCopied ] = useState( false );

	const fetchWebhook = async () => {
		setIsLoading( true );
		setError( null );
		try {
			const data = await getWebhook( dashboardId );
			setWebhook( data.exists ? data : null );
		} catch ( err ) {
			setError( err.message || 'Failed to load webhook.' );
		}
		setIsLoading( false );
	};

	useEffect( () => {
		fetchWebhook();
	}, [ dashboardId ] );

	const handleGenerate = async () => {
		setIsWorking( true );
		setError( null );
		try {
			const data = await createWebhook( dashboardId );
			setWebhook( data );
		} catch ( err ) {
			setError( err.message || 'Failed to generate webhook.' );
		}
		setIsWorking( false );
	};

	const handleRegenerate = async () => {
		if ( ! window.confirm( 'Are you sure? This will invalidate the current webhook URL. Any HighLevel workflows using the old URL will stop working.' ) ) {
			return;
		}
		await handleGenerate();
	};

	const handleToggle = async ( isActive ) => {
		setIsWorking( true );
		setError( null );
		try {
			await toggleWebhook( dashboardId, isActive );
			setWebhook( ( prev ) => ( { ...prev, is_active: isActive } ) );
		} catch ( err ) {
			setError( err.message || 'Failed to toggle webhook.' );
		}
		setIsWorking( false );
	};

	const handleDelete = async () => {
		if ( ! window.confirm( 'Are you sure you want to delete this webhook? Any HighLevel workflows using this URL will stop working.' ) ) {
			return;
		}
		setIsWorking( true );
		setError( null );
		try {
			await deleteWebhook( dashboardId );
			setWebhook( null );
		} catch ( err ) {
			setError( err.message || 'Failed to delete webhook.' );
		}
		setIsWorking( false );
	};

	const handleCopy = async () => {
		if ( ! webhook?.webhook_url ) {
			return;
		}
		try {
			await navigator.clipboard.writeText( webhook.webhook_url );
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} catch {
			// Fallback for older browsers.
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
				<div className="advdash-admin__webhook-empty">
					<p>No webhook URL has been generated for this dashboard yet.</p>
					<Button
						variant="primary"
						onClick={ handleGenerate }
						isBusy={ isWorking }
						disabled={ isWorking }
					>
						Generate Webhook URL
					</Button>
				</div>
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
							<Button variant="secondary" onClick={ handleCopy }>
								{ copied ? 'Copied!' : 'Copy' }
							</Button>
						</div>
					</div>

					<ToggleControl
						label="Webhook Active"
						checked={ webhook.is_active }
						onChange={ handleToggle }
						disabled={ isWorking }
						help={ webhook.is_active
							? 'Webhook is accepting incoming data.'
							: 'Webhook is paused. Incoming requests will be rejected.' }
					/>

					<p className="advdash-admin__webhook-help">
						Use this single URL in all your HighLevel workflows for this advisor.
						The <code>tab</code> and <code>_action</code> fields in the JSON payload
						determine where contacts are added or removed.
					</p>

					<div className="advdash-admin__webhook-actions">
						<Button
							variant="secondary"
							onClick={ handleRegenerate }
							isBusy={ isWorking }
							disabled={ isWorking }
						>
							Regenerate URL
						</Button>
						<Button
							variant="tertiary"
							isDestructive
							onClick={ handleDelete }
							disabled={ isWorking }
						>
							Delete Webhook
						</Button>
					</div>
				</div>
			) }
		</div>
	);
}
