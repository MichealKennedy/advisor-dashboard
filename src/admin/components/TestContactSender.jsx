import { useState, useEffect } from '@wordpress/element';
import { SelectControl, Button, Notice, RangeControl, Spinner } from '@wordpress/components';
import { getDashboards, getWebhook } from '../../shared/api';
import { TAB_CONFIG } from '../../shared/utils';
import generateTestContact from '../utils/generateTestContact';

export default function TestContactSender( { onBack } ) {
	const [ dashboards, setDashboards ] = useState( [] );
	const [ selectedDashboardId, setSelectedDashboardId ] = useState( '' );
	const [ selectedTab, setSelectedTab ] = useState( TAB_CONFIG[ 0 ].key );
	const [ count, setCount ] = useState( 1 );
	const [ webhook, setWebhook ] = useState( null );
	const [ webhookLoading, setWebhookLoading ] = useState( false );
	const [ isSending, setIsSending ] = useState( false );
	const [ results, setResults ] = useState( null );
	const [ error, setError ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );

	useEffect( () => {
		getDashboards()
			.then( ( data ) => {
				setDashboards( data );
				setIsLoading( false );
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to load dashboards.' );
				setIsLoading( false );
			} );
	}, [] );

	useEffect( () => {
		if ( ! selectedDashboardId ) {
			setWebhook( null );
			return;
		}
		setWebhookLoading( true );
		setWebhook( null );
		setResults( null );
		getWebhook( selectedDashboardId )
			.then( ( data ) => {
				setWebhook( data.exists ? data : null );
				setWebhookLoading( false );
			} )
			.catch( () => {
				setWebhook( null );
				setWebhookLoading( false );
			} );
	}, [ selectedDashboardId ] );

	const handleSend = async () => {
		if ( ! webhook?.webhook_url || ! webhook?.is_active ) {
			return;
		}

		setIsSending( true );
		setResults( null );
		setError( null );

		let success = 0;
		let failed = 0;
		const errors = [];

		for ( let i = 0; i < count; i++ ) {
			const payload = generateTestContact( selectedTab );
			payload.tab = selectedTab;

			try {
				const response = await fetch( webhook.webhook_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify( payload ),
				} );
				if ( response.ok ) {
					success++;
				} else {
					const body = await response.json();
					failed++;
					errors.push( body.message || `HTTP ${ response.status }` );
				}
			} catch ( err ) {
				failed++;
				errors.push( err.message );
			}
		}

		setResults( { success, failed, errors } );
		setIsSending( false );
	};

	const canSend = webhook?.is_active && selectedDashboardId && ! isSending;

	const dashboardOptions = [
		{ label: '— Select a dashboard —', value: '' },
		...dashboards.map( ( d ) => ( {
			label: d.name,
			value: String( d.id ),
		} ) ),
	];

	const tabOptions = TAB_CONFIG.map( ( t ) => ( {
		label: t.label,
		value: t.key,
	} ) );

	if ( isLoading ) {
		return (
			<div className="advdash-admin__loading">
				<Spinner />
			</div>
		);
	}

	let webhookStatus = null;
	if ( selectedDashboardId && ! webhookLoading ) {
		if ( ! webhook ) {
			webhookStatus = (
				<div className="advdash-admin__webhook-status advdash-admin__webhook-status--missing">
					No webhook configured for this dashboard. Create one in the dashboard editor first.
				</div>
			);
		} else if ( ! webhook.is_active ) {
			webhookStatus = (
				<div className="advdash-admin__webhook-status advdash-admin__webhook-status--inactive">
					Webhook is inactive. Activate it in the dashboard editor to send test contacts.
				</div>
			);
		} else {
			webhookStatus = (
				<div className="advdash-admin__webhook-status advdash-admin__webhook-status--active">
					Webhook is active and ready to receive test data.
				</div>
			);
		}
	}
	if ( selectedDashboardId && webhookLoading ) {
		webhookStatus = <Spinner />;
	}

	return (
		<div className="advdash-admin__test-section">
			<div className="advdash-admin__test-header">
				<Button variant="link" onClick={ onBack }>
					&larr; Back to Dashboards
				</Button>
				<h2>Test Dashboard</h2>
				<p className="description">
					Send test contacts with random data to any dashboard via its webhook.
				</p>
			</div>

			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }

			<div className="advdash-admin__form">
				<SelectControl
					label="Dashboard"
					value={ selectedDashboardId }
					options={ dashboardOptions }
					onChange={ setSelectedDashboardId }
				/>

				{ webhookStatus }

				<SelectControl
					label="Tab"
					value={ selectedTab }
					options={ tabOptions }
					onChange={ setSelectedTab }
				/>

				<RangeControl
					label="Number of contacts"
					value={ count }
					onChange={ setCount }
					min={ 1 }
					max={ 10 }
				/>

				<div className="advdash-admin__form-actions">
					<Button
						variant="primary"
						onClick={ handleSend }
						isBusy={ isSending }
						disabled={ ! canSend }
					>
						{ isSending
							? 'Sending...'
							: `Send ${ count } Test Contact${ count > 1 ? 's' : '' }` }
					</Button>
				</div>
			</div>

			{ results && (
				<div className="advdash-admin__test-result">
					{ results.success > 0 && (
						<Notice status="success" isDismissible={ false }>
							{ `Successfully sent ${ results.success } test contact${ results.success > 1 ? 's' : '' }.` }
						</Notice>
					) }
					{ results.failed > 0 && (
						<Notice status="error" isDismissible={ false }>
							{ `${ results.failed } contact${ results.failed > 1 ? 's' : '' } failed: ${ results.errors.join( ', ' ) }` }
						</Notice>
					) }
				</div>
			) }
		</div>
	);
}
