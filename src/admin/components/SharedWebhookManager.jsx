import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice } from '@wordpress/components';
import { getSharedWebhook, generateSharedWebhook, deleteSharedWebhook } from '../../shared/api';

export default function SharedWebhookManager() {
	const [ webhook, setWebhook ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isWorking, setIsWorking ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ copied, setCopied ] = useState( false );

	const fetchWebhook = async () => {
		setIsLoading( true );
		setError( null );
		try {
			const data = await getSharedWebhook();
			setWebhook( data.exists ? data : null );
		} catch ( err ) {
			setError( err.message || 'Failed to load shared webhook.' );
		}
		setIsLoading( false );
	};

	useEffect( () => {
		fetchWebhook();
	}, [] );

	const handleGenerate = async () => {
		setIsWorking( true );
		setError( null );
		try {
			const data = await generateSharedWebhook();
			setWebhook( data );
		} catch ( err ) {
			setError( err.message || 'Failed to generate webhook.' );
		}
		setIsWorking( false );
	};

	const handleRegenerate = async () => {
		if ( ! window.confirm( 'Are you sure? This will invalidate the current webhook URL. All HighLevel workflows using the old URL will stop working.' ) ) {
			return;
		}
		await handleGenerate();
	};

	const handleDelete = async () => {
		if ( ! window.confirm( 'Are you sure you want to delete the shared webhook? All HighLevel workflows using this URL will stop working.' ) ) {
			return;
		}
		setIsWorking( true );
		setError( null );
		try {
			await deleteSharedWebhook();
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
		return (
			<div className="advdash-admin__shared-webhook">
				<h3>Shared Webhook</h3>
				<Spinner />
			</div>
		);
	}

	return (
		<div className="advdash-admin__shared-webhook">
			<h3>Shared Webhook</h3>

			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }

			{ ! webhook ? (
				<div className="advdash-admin__webhook-empty">
					<p>No shared webhook URL has been generated yet.</p>
					<Button
						variant="primary"
						onClick={ handleGenerate }
						isBusy={ isWorking }
						disabled={ isWorking }
					>
						Generate Shared Webhook URL
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

					<p className="advdash-admin__webhook-help">
						This single URL is shared by all advisors. Each HighLevel webhook payload must include an
						{ ' ' }<code>advisor_code</code> field set to the advisor's <strong>Member Workshop Code</strong> (e.g., "SFG"),
						plus the <code>tab</code> field to route contacts to the correct dashboard and tab.
					</p>

					<details className="advdash-admin__webhook-example">
						<summary>Example payload</summary>
						<pre>{ JSON.stringify( {
							advisor_code: 'SFG',
							tab: 'current_registrations',
							contact_id: 'hl_abc123',
							first_name: 'John',
							last_name: 'Doe',
							city: 'Washington',
							state: 'DC',
						}, null, 2 ) }</pre>
					</details>

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
