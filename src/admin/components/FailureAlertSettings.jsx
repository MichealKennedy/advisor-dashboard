import { useState, useEffect } from '@wordpress/element';
import { Button, Spinner, Notice, TextControl } from '@wordpress/components';
import {
	getFailureAlertSettings,
	setFailureAlertSettings,
	testFailureAlert,
} from '../../shared/api';

export default function FailureAlertSettings() {
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isTesting, setIsTesting ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ success, setSuccess ] = useState( null );
	const [ testResult, setTestResult ] = useState( null );
	const [ loggingEnabled, setLoggingEnabled ] = useState( false );

	const [ url, setUrl ] = useState( '' );
	const [ threshold, setThreshold ] = useState( 5 );
	const [ window, setWindow ] = useState( 15 );
	const [ cooldown, setCooldown ] = useState( 60 );

	useEffect( () => {
		getFailureAlertSettings()
			.then( ( data ) => {
				setUrl( data.url || '' );
				setThreshold( data.threshold || 5 );
				setWindow( data.window || 15 );
				setCooldown( data.cooldown || 60 );
				setLoggingEnabled( data.logging_enabled );
			} )
			.catch( ( err ) => setError( err.message || 'Failed to load settings.' ) )
			.finally( () => setIsLoading( false ) );
	}, [] );

	const handleSave = async () => {
		setIsSaving( true );
		setError( null );
		setSuccess( null );
		try {
			const data = await setFailureAlertSettings( {
				url,
				threshold: parseInt( threshold, 10 ) || 5,
				window: parseInt( window, 10 ) || 15,
				cooldown: parseInt( cooldown, 10 ) || 60,
			} );
			setUrl( data.url || '' );
			setThreshold( data.threshold );
			setWindow( data.window );
			setCooldown( data.cooldown );
			setSuccess( 'Settings saved.' );
			setTimeout( () => setSuccess( null ), 3000 );
		} catch ( err ) {
			setError( err.message || 'Failed to save settings.' );
		}
		setIsSaving( false );
	};

	const handleTest = async () => {
		setIsTesting( true );
		setTestResult( null );
		setError( null );
		try {
			const result = await testFailureAlert();
			setTestResult( result );
		} catch ( err ) {
			setError( err.message || 'Test failed.' );
		}
		setIsTesting( false );
	};

	if ( isLoading ) {
		return <Spinner />;
	}

	return (
		<div className="advdash-admin__failure-alerts">
			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }
			{ success && (
				<Notice status="success" isDismissible onDismiss={ () => setSuccess( null ) }>
					{ success }
				</Notice>
			) }
			{ ! loggingEnabled && (
				<Notice status="warning" isDismissible={ false }>
					Webhook logging is currently disabled. Failure alerts require logging to be
					enabled so the plugin can count recent errors.
				</Notice>
			) }

			<p className="advdash-admin__failure-alerts-desc">
				When webhook failures exceed a threshold, an outbound webhook is sent to HighLevel
				to trigger an admin notification workflow.
			</p>

			<TextControl
				label="HighLevel Webhook URL"
				help="The outbound URL that receives failure alerts."
				value={ url }
				onChange={ setUrl }
				placeholder="https://services.leadconnectorhq.com/hooks/..."
			/>

			<div className="advdash-admin__failure-alerts-grid">
				<TextControl
					label="Failure Threshold"
					help="Number of failures to trigger an alert."
					type="number"
					min={ 1 }
					max={ 100 }
					value={ threshold }
					onChange={ ( val ) => setThreshold( val ) }
				/>
				<TextControl
					label="Time Window (minutes)"
					help="Look back this many minutes when counting."
					type="number"
					min={ 1 }
					max={ 1440 }
					value={ window }
					onChange={ ( val ) => setWindow( val ) }
				/>
				<TextControl
					label="Cooldown (minutes)"
					help="Minimum time between alert notifications."
					type="number"
					min={ 1 }
					max={ 1440 }
					value={ cooldown }
					onChange={ ( val ) => setCooldown( val ) }
				/>
			</div>

			{ testResult && (
				<Notice
					status={ testResult.success ? 'success' : 'error' }
					isDismissible
					onDismiss={ () => setTestResult( null ) }
				>
					{ testResult.success
						? `Test alert sent successfully (HTTP ${ testResult.status_code }).`
						: `Test alert failed (HTTP ${ testResult.status_code }).` }
				</Notice>
			) }

			<div className="advdash-admin__failure-alerts-actions">
				<Button
					variant="primary"
					onClick={ handleSave }
					isBusy={ isSaving }
					disabled={ isSaving }
				>
					Save Settings
				</Button>
				<Button
					variant="secondary"
					onClick={ handleTest }
					isBusy={ isTesting }
					disabled={ isTesting || ! url }
				>
					Send Test Alert
				</Button>
			</div>
		</div>
	);
}
