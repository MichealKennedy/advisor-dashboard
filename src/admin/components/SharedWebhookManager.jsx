import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice } from '@wordpress/components';
import { getSharedWebhook, generateSharedWebhook, deleteSharedWebhook } from '../../shared/api';

export default function SharedWebhookManager() {
	const [ webhook, setWebhook ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isWorking, setIsWorking ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ copied, setCopied ] = useState( false );
	const [ confirmAction, setConfirmAction ] = useState( null ); // 'regenerate' | 'delete' | null

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
		setConfirmAction( null );
		await handleGenerate();
	};

	const handleDelete = async () => {
		setConfirmAction( null );
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
		return <Spinner />;
	}

	return (
		<div className="advdash-admin__shared-webhook">
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
								{ copied ? '\u2713 Copied!' : 'Copy URL' }
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
						{ ! confirmAction && (
							<>
								<Button
									variant="secondary"
									onClick={ () => setConfirmAction( 'regenerate' ) }
									disabled={ isWorking }
								>
									Regenerate URL
								</Button>
								<Button
									variant="tertiary"
									isDestructive
									onClick={ () => setConfirmAction( 'delete' ) }
									disabled={ isWorking }
								>
									Delete Webhook
								</Button>
							</>
						) }
						{ confirmAction === 'regenerate' && (
							<div className="advdash-admin__webhook-confirm">
								<p>
									<strong>Are you sure?</strong> This will invalidate the current URL.
									All HighLevel workflows using it will stop working.
								</p>
								<div className="advdash-admin__webhook-confirm-buttons">
									<Button
										variant="primary"
										isDestructive
										onClick={ handleRegenerate }
										isBusy={ isWorking }
										disabled={ isWorking }
									>
										Yes, Regenerate
									</Button>
									<Button
										variant="tertiary"
										onClick={ () => setConfirmAction( null ) }
										disabled={ isWorking }
									>
										Cancel
									</Button>
								</div>
							</div>
						) }
						{ confirmAction === 'delete' && (
							<div className="advdash-admin__webhook-confirm">
								<p>
									<strong>Are you sure?</strong> This will delete the webhook entirely.
									All HighLevel workflows using this URL will stop working.
								</p>
								<div className="advdash-admin__webhook-confirm-buttons">
									<Button
										variant="primary"
										isDestructive
										onClick={ handleDelete }
										isBusy={ isWorking }
										disabled={ isWorking }
									>
										Yes, Delete
									</Button>
									<Button
										variant="tertiary"
										onClick={ () => setConfirmAction( null ) }
										disabled={ isWorking }
									>
										Cancel
									</Button>
								</div>
							</div>
						) }
					</div>
				</div>
			) }
		</div>
	);
}
