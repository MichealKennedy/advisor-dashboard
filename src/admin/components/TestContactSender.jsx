import { useState, useEffect } from '@wordpress/element';
import { SelectControl, Button, Notice, RangeControl, Spinner } from '@wordpress/components';
import { getDashboards, getSharedWebhook } from '../../shared/api';
import { TAB_CONFIG } from '../../shared/utils';
import generateTestContact from '../utils/generateTestContact';

export default function TestContactSender( { onBack } ) {
	const [ dashboards, setDashboards ] = useState( [] );
	const [ selectedDashboardId, setSelectedDashboardId ] = useState( '' );
	const [ selectedTab, setSelectedTab ] = useState( TAB_CONFIG[ 0 ].key );
	const [ count, setCount ] = useState( 1 );
	const [ webhook, setWebhook ] = useState( null );
	const [ isSending, setIsSending ] = useState( false );
	const [ results, setResults ] = useState( null );
	const [ error, setError ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );

	useEffect( () => {
		Promise.all( [ getDashboards(), getSharedWebhook() ] )
			.then( ( [ dashboardData, webhookData ] ) => {
				setDashboards( dashboardData );
				setWebhook( webhookData.exists ? webhookData : null );
				setIsLoading( false );
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to load data.' );
				setIsLoading( false );
			} );
	}, [] );

	const selectedDashboard = dashboards.find( ( d ) => String( d.id ) === selectedDashboardId );
	const advisorCode = selectedDashboard?.member_workshop_code || '';

	const TAB_TO_ACTION = {
		current_registrations: 'register',
		attended_report: 'attended',
		attended_other: 'attended_other',
		fed_request: 'fed_request',
	};

	const handleSend = async () => {
		if ( ! webhook?.webhook_url || ! advisorCode ) {
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
			payload.action = TAB_TO_ACTION[ selectedTab ];
			payload.advisor_code = advisorCode;

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

	const canSend = webhook?.webhook_url && advisorCode && selectedDashboardId && ! isSending;

	const dashboardOptions = [
		{ label: '-- Select a dashboard --', value: '' },
		...dashboards.map( ( d ) => ( {
			label: `${ d.name }${ d.member_workshop_code ? ` (${ d.member_workshop_code })` : '' }`,
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
	if ( ! webhook ) {
		webhookStatus = (
			<div className="advdash-admin__webhook-status advdash-admin__webhook-status--missing">
				No shared webhook configured. Generate one from the main dashboard page first.
			</div>
		);
	} else if ( selectedDashboardId && ! advisorCode ) {
		webhookStatus = (
			<div className="advdash-admin__webhook-status advdash-admin__webhook-status--inactive">
				This dashboard has no Member Workshop Code set. Set one in the dashboard editor first.
			</div>
		);
	} else if ( selectedDashboardId && advisorCode ) {
		webhookStatus = (
			<div className="advdash-admin__webhook-status advdash-admin__webhook-status--active">
				Ready to send test data as advisor code "{ advisorCode }".
			</div>
		);
	}

	return (
		<div className="advdash-admin__test-section">
			<div className="advdash-admin__test-header">
				<Button variant="link" onClick={ onBack }>
					&larr; Back to Dashboards
				</Button>
				<h2>Test Dashboard</h2>
				<p className="description">
					Send test contacts with random data to any dashboard via the shared webhook.
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
					onChange={ ( val ) => {
						setSelectedDashboardId( val );
						setResults( null );
					} }
				/>

				{ webhookStatus }

				<SelectControl
					label="Action"
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
