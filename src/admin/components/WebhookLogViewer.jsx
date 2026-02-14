import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { Button, Spinner, Notice, ToggleControl, SelectControl } from '@wordpress/components';
import {
	getDashboards,
	getWebhookLogs,
	getWebhookLogFilters,
	getWebhookLoggingSettings,
	setWebhookLoggingSettings,
	clearWebhookLogs,
} from '../../shared/api';
import WebhookLogDetail from './WebhookLogDetail';

function StatusBadge( { code } ) {
	const isSuccess = code >= 200 && code < 300;
	const className = isSuccess
		? 'advdash-admin__log-status advdash-admin__log-status--success'
		: 'advdash-admin__log-status advdash-admin__log-status--error';
	return <span className={ className }>{ code }</span>;
}

export default function WebhookLogViewer( { onBack } ) {
	// Data state.
	const [ logs, setLogs ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ totalPages, setTotalPages ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ notice, setNotice ] = useState( null );

	// Settings state.
	const [ loggingEnabled, setLoggingEnabled ] = useState( false );
	const [ retentionDays, setRetentionDays ] = useState( 90 );
	const [ settingsLoading, setSettingsLoading ] = useState( true );

	// Filter state.
	const [ dashboards, setDashboards ] = useState( [] );
	const [ dashboardFilter, setDashboardFilter ] = useState( '' );
	const [ statusFilter, setStatusFilter ] = useState( '' );
	const [ dateFrom, setDateFrom ] = useState( '' );
	const [ dateTo, setDateTo ] = useState( '' );
	const [ search, setSearch ] = useState( '' );
	const [ page, setPage ] = useState( 1 );
	const [ errorTypes, setErrorTypes ] = useState( [] );

	// Detail modal state.
	const [ selectedLogId, setSelectedLogId ] = useState( null );

	const searchTimer = useRef( null );
	const [ debouncedSearch, setDebouncedSearch ] = useState( '' );

	// Debounce search input.
	useEffect( () => {
		searchTimer.current = setTimeout( () => {
			setDebouncedSearch( search );
			setPage( 1 );
		}, 300 );
		return () => clearTimeout( searchTimer.current );
	}, [ search ] );

	// Load settings + dashboards on mount.
	useEffect( () => {
		getWebhookLoggingSettings()
			.then( ( settings ) => {
				setLoggingEnabled( settings.enabled );
				setRetentionDays( settings.retention_days );
			} )
			.catch( () => {} )
			.finally( () => setSettingsLoading( false ) );

		getDashboards()
			.then( setDashboards )
			.catch( () => {} );
	}, [] );

	// Load error type filters.
	useEffect( () => {
		getWebhookLogFilters( dashboardFilter || undefined )
			.then( setErrorTypes )
			.catch( () => setErrorTypes( [] ) );
	}, [ dashboardFilter ] );

	// Fetch logs.
	const fetchLogs = useCallback( () => {
		setIsLoading( true );
		setError( null );

		getWebhookLogs( {
			dashboard_id: dashboardFilter,
			status_filter: statusFilter,
			date_from: dateFrom,
			date_to: dateTo,
			search: debouncedSearch,
			page,
			per_page: 50,
		} )
			.then( ( result ) => {
				setLogs( result.data );
				setTotal( result.total );
				setTotalPages( result.totalPages );
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to load webhook logs.' );
			} )
			.finally( () => setIsLoading( false ) );
	}, [ dashboardFilter, statusFilter, dateFrom, dateTo, debouncedSearch, page ] );

	useEffect( () => {
		fetchLogs();
	}, [ fetchLogs ] );

	const handleToggleLogging = ( enabled ) => {
		setLoggingEnabled( enabled );
		setWebhookLoggingSettings( { enabled, retention_days: retentionDays } ).catch(
			() => setLoggingEnabled( ! enabled )
		);
	};

	const handleClearLogs = () => {
		const msg = dashboardFilter
			? 'Are you sure you want to clear logs for this dashboard?'
			: 'Are you sure you want to clear ALL webhook logs?';
		if ( ! window.confirm( msg ) ) {
			return;
		}

		clearWebhookLogs( dashboardFilter || undefined )
			.then( () => {
				setNotice( 'Webhook logs cleared.' );
				fetchLogs();
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to clear logs.' );
			} );
	};

	// Build dashboard options.
	const dashboardOptions = [
		{ label: 'All Dashboards', value: '' },
		...dashboards.map( ( d ) => ( {
			label: d.name,
			value: String( d.id ),
		} ) ),
	];

	// Build status filter options.
	const statusOptions = [
		{ label: 'All Statuses', value: '' },
		{ label: 'Success', value: 'success' },
		{ label: 'All Errors', value: 'error' },
		...errorTypes.map( ( t ) => ( {
			label: `${ t.error_code } (${ t.count })`,
			value: t.error_code,
		} ) ),
	];

	return (
		<div className="advdash-admin__log-section">
			<div className="advdash-admin__log-header">
				<Button variant="link" onClick={ onBack }>
					&larr; Back to Dashboards
				</Button>
				<h2>Webhook Log</h2>
			</div>

			{ error && (
				<Notice status="error" isDismissible onDismiss={ () => setError( null ) }>
					{ error }
				</Notice>
			) }
			{ notice && (
				<Notice status="success" isDismissible onDismiss={ () => setNotice( null ) }>
					{ notice }
				</Notice>
			) }

			{ /* Settings bar */ }
			<div className="advdash-admin__log-settings">
				{ settingsLoading ? (
					<Spinner />
				) : (
					<>
						<ToggleControl
							label="Webhook Logging"
							checked={ loggingEnabled }
							onChange={ handleToggleLogging }
							__nextHasNoMarginBottom
						/>
						<span className="advdash-admin__log-retention">
							Retention: { retentionDays } days
						</span>
						{ loggingEnabled && (
							<p style={ { margin: '4px 0 0', fontSize: '12px', color: '#756b00' } }>
								Webhook logs contain full request payloads including contact PII. Logs are automatically deleted after { retentionDays } days.
							</p>
						) }
					</>
				) }
			</div>

			{ /* Filters */ }
			<div className="advdash-admin__log-filters">
				<SelectControl
					value={ dashboardFilter }
					options={ dashboardOptions }
					onChange={ ( val ) => {
						setDashboardFilter( val );
						setPage( 1 );
					} }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					value={ statusFilter }
					options={ statusOptions }
					onChange={ ( val ) => {
						setStatusFilter( val );
						setPage( 1 );
					} }
					__nextHasNoMarginBottom
				/>
				<div className="advdash-admin__log-date-range">
					<input
						type="date"
						value={ dateFrom }
						onChange={ ( e ) => {
							setDateFrom( e.target.value );
							setPage( 1 );
						} }
						placeholder="From"
					/>
					<span className="advdash-admin__log-date-sep">to</span>
					<input
						type="date"
						value={ dateTo }
						onChange={ ( e ) => {
							setDateTo( e.target.value );
							setPage( 1 );
						} }
						placeholder="To"
					/>
				</div>
				<input
					type="text"
					className="advdash-admin__log-search"
					placeholder="Search..."
					value={ search }
					onChange={ ( e ) => setSearch( e.target.value ) }
				/>
				<Button
					variant="secondary"
					isDestructive
					onClick={ handleClearLogs }
					disabled={ total === 0 }
				>
					Clear Logs
				</Button>
			</div>

			{ /* Table */ }
			{ isLoading ? (
				<div className="advdash-admin__loading">
					<Spinner />
				</div>
			) : logs.length === 0 ? (
				<p>
					{ loggingEnabled
						? 'No webhook log entries found.'
						: 'Webhook logging is disabled. Enable it above to start recording.' }
				</p>
			) : (
				<>
					<table className="wp-list-table widefat fixed striped advdash-admin__log-table">
						<thead>
							<tr>
								<th className="advdash-admin__log-col--datetime">Date/Time</th>
								<th className="advdash-admin__log-col--dashboard">Dashboard</th>
								<th className="advdash-admin__log-col--status">Status</th>
								<th>Tab</th>
								<th>Action</th>
								<th>Contact ID</th>
								<th className="advdash-admin__log-col--error">Error</th>
								<th>IP Address</th>
							</tr>
						</thead>
						<tbody>
							{ logs.map( ( log ) => (
								<tr
									key={ log.id }
									className="advdash-admin__log-row"
									onClick={ () => setSelectedLogId( log.id ) }
								>
									<td>{ log.created_at }</td>
									<td>{ log.dashboard_name || '—' }</td>
									<td><StatusBadge code={ log.status_code } /></td>
									<td>{ log.parsed_tab || '—' }</td>
									<td>{ log.parsed_action || '—' }</td>
									<td>{ log.parsed_contact_id || '—' }</td>
									<td>
										{ log.error_code ? (
											<code>{ log.error_code }</code>
										) : (
											'—'
										) }
									</td>
									<td>{ log.ip_address || '—' }</td>
								</tr>
							) ) }
						</tbody>
					</table>

					{ /* Pagination */ }
					<div className="advdash-admin__log-pagination">
						<span>
							{ total } item{ total !== 1 ? 's' : '' } &mdash; Page { page } of{ ' ' }
							{ totalPages }
						</span>
						<div className="advdash-admin__log-pagination-buttons">
							<Button
								variant="secondary"
								disabled={ page <= 1 }
								onClick={ () => setPage( page - 1 ) }
							>
								&laquo; Previous
							</Button>
							<Button
								variant="secondary"
								disabled={ page >= totalPages }
								onClick={ () => setPage( page + 1 ) }
							>
								Next &raquo;
							</Button>
						</div>
					</div>
				</>
			) }

			{ /* Detail modal */ }
			{ selectedLogId && (
				<WebhookLogDetail
					logId={ selectedLogId }
					onClose={ () => setSelectedLogId( null ) }
				/>
			) }
		</div>
	);
}
