import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice } from '@wordpress/components';
import { getSharedWebhook, generateSharedWebhook, deleteSharedWebhook } from '../../shared/api';

export default function SharedWebhookManager() {
	const [ webhook, setWebhook ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isWorking, setIsWorking ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ copiedField, setCopiedField ] = useState( null ); // 'url' | 'key' | null
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
							<Button variant="secondary" onClick={ () => handleCopy( webhook.webhook_url, 'url' ) }>
								{ copiedField === 'url' ? '\u2713 Copied!' : 'Copy URL' }
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
								{ copiedField === 'key' ? '\u2713 Copied!' : 'Copy Key' }
							</Button>
						</div>
					</div>

					<p className="advdash-admin__webhook-help">
						In HighLevel, set the <strong>Webhook URL</strong> above and add the key as a custom header
						named <code>X-Webhook-Key</code>. Each payload must include an
						{ ' ' }<code>advisor_code</code> field set to the advisor's <strong>Member Workshop Code</strong> (e.g., "SFG").
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
