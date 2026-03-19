import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import DashboardTabs from './components/DashboardTabs';
import { TAB_CONFIG, ALL_VALID_TABS, ANALYTICS_TAB_KEY } from '../../shared/utils';

function getTabFromHash() {
	const hash = window.location.hash.slice( 1 );
	return ALL_VALID_TABS.includes( hash ) ? hash : TAB_CONFIG[ 0 ].key;
}

export default function App() {
	const {
		dashboardId: initialDashboardId,
		dashboardName: initialDashboardName,
		isAdmin,
		allDashboards,
		userDashboards,
		customTabLabels,
		analyticsEnabled: initialAnalyticsEnabled,
		tabVisibility: initialTabVisibility,
	} = window.advdashFrontend || {};

	// wp_localize_script converts top-level scalars to strings, but nested array ids
	// are proper JSON integers. Parse to int so the find() comparisons work correctly.
	const [ selectedDashboardId, setSelectedDashboardId ] = useState( parseInt( initialDashboardId, 10 ) );
	const [ activeTab, setActiveTab ] = useState( getTabFromHash );

	const hasMultipleDashboards = ! isAdmin && userDashboards && userDashboards.length > 1;

	// Derive analytics_enabled for the currently selected dashboard so it
	// updates correctly when an admin or multi-dashboard user switches dashboards.
	const currentAnalyticsEnabled = useMemo( () => {
		if ( isAdmin && allDashboards ) {
			const d = allDashboards.find( ( ad ) => ad.id === selectedDashboardId );
			return d ? !! d.analytics_enabled : true;
		}
		if ( hasMultipleDashboards && userDashboards ) {
			const d = userDashboards.find( ( ud ) => ud.id === selectedDashboardId );
			return d ? !! d.analytics_enabled : true;
		}
		// Single dashboard non-admin: use value localized at page render.
		// Note: wp_localize_script converts PHP false to '' (empty string),
		// so we use !! to coerce '' → false and '1' → true correctly.
		return !! initialAnalyticsEnabled;
	}, [ isAdmin, allDashboards, hasMultipleDashboards, userDashboards, selectedDashboardId, initialAnalyticsEnabled ] );

	// Derive tab_visibility for the currently selected dashboard.
	const currentTabVisibility = useMemo( () => {
		if ( isAdmin && allDashboards ) {
			const d = allDashboards.find( ( ad ) => ad.id === selectedDashboardId );
			return ( d && d.tab_visibility ) ? d.tab_visibility : {};
		}
		if ( hasMultipleDashboards && userDashboards ) {
			const d = userDashboards.find( ( ud ) => ud.id === selectedDashboardId );
			return ( d && d.tab_visibility ) ? d.tab_visibility : {};
		}
		return initialTabVisibility || {};
	}, [ isAdmin, allDashboards, hasMultipleDashboards, userDashboards, selectedDashboardId, initialTabVisibility ] );

	const tabs = useMemo( () => {
		const labeledTabs = ( ! customTabLabels || Object.keys( customTabLabels ).length === 0 )
			? TAB_CONFIG
			: TAB_CONFIG.map( ( tab ) => {
				const customLabel = customTabLabels[ tab.key ];
				if ( customLabel && customLabel.trim() ) {
					return { ...tab, label: customLabel };
				}
				return tab;
			} );
		// Hide tabs that have been explicitly set to false in tab_visibility.
		const configTabs = labeledTabs.filter(
			( tab ) => currentTabVisibility[ tab.key ] !== false
		);
		if ( ! currentAnalyticsEnabled ) {
			return configTabs;
		}
		return [ ...configTabs, { key: ANALYTICS_TAB_KEY, label: 'Analytics' } ];
	}, [ customTabLabels, currentAnalyticsEnabled, currentTabVisibility ] );

	const currentDashboard = isAdmin
		? allDashboards?.find( ( d ) => d.id === selectedDashboardId )
		: null;
	const userCurrentDashboard = hasMultipleDashboards
		? userDashboards.find( ( d ) => d.id === selectedDashboardId )
		: null;
	const dashboardName = currentDashboard
		? currentDashboard.name
		: ( userCurrentDashboard ? userCurrentDashboard.name : ( initialDashboardName || 'Advisor Dashboard' ) );

	const handleTabChange = useCallback( ( tabKey ) => {
		setActiveTab( tabKey );
		window.history.replaceState( null, '', '#' + tabKey );
	}, [] );

	useEffect( () => {
		const onHashChange = () => {
			setActiveTab( getTabFromHash() );
		};
		window.addEventListener( 'hashchange', onHashChange );
		return () => window.removeEventListener( 'hashchange', onHashChange );
	}, [] );

	// If the active tab is no longer in the visible tab list (e.g. after switching
	// to a dashboard that has it hidden), fall back to the first visible tab.
	useEffect( () => {
		const tabKeys = tabs.map( ( t ) => t.key );
		if ( activeTab && ! tabKeys.includes( activeTab ) && tabs.length > 0 ) {
			handleTabChange( tabs[ 0 ].key );
		}
	}, [ activeTab, tabs, handleTabChange ] );

	const handleDashboardChange = ( e ) => {
		const newId = parseInt( e.target.value, 10 );
		setSelectedDashboardId( newId );
		handleTabChange( TAB_CONFIG[ 0 ].key );
	};

	return (
		<div className="advdash">
			<div className="advdash__header">
				<h2 className="advdash__title">{ dashboardName }</h2>
				{ isAdmin && allDashboards && allDashboards.length > 0 && (
					<div className="advdash__admin-selector">
						<label htmlFor="advdash-dashboard-select">Viewing dashboard: </label>
						<select
							id="advdash-dashboard-select"
							className="advdash__dashboard-select"
							value={ selectedDashboardId }
							onChange={ handleDashboardChange }
						>
							{ allDashboards.map( ( d ) => (
								<option key={ d.id } value={ d.id }>
									{ d.name } ({ d.user })
								</option>
							) ) }
						</select>
					</div>
				) }
				{ hasMultipleDashboards && (
					<div className="advdash__dashboard-selector">
						<label htmlFor="advdash-user-dashboard-select">Your dashboards: </label>
						<select
							id="advdash-user-dashboard-select"
							className="advdash__dashboard-select"
							value={ selectedDashboardId }
							onChange={ handleDashboardChange }
						>
							{ userDashboards.map( ( d ) => (
								<option key={ d.id } value={ d.id }>
									{ d.name }
								</option>
							) ) }
						</select>
					</div>
				) }
			</div>
			<DashboardTabs
				tabs={ tabs }
				activeTab={ activeTab }
				onTabChange={ handleTabChange }
				dashboardId={ isAdmin || hasMultipleDashboards ? selectedDashboardId : null }
				isAdmin={ !! isAdmin }
			/>
		</div>
	);
}
