import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import DashboardTabs from './components/DashboardTabs';
import { TAB_CONFIG, VALID_TABS } from '../../shared/utils';

function getTabFromHash() {
	const hash = window.location.hash.slice( 1 );
	return VALID_TABS.includes( hash ) ? hash : TAB_CONFIG[ 0 ].key;
}

export default function App() {
	const {
		dashboardId: initialDashboardId,
		dashboardName: initialDashboardName,
		isAdmin,
		allDashboards,
		userDashboards,
		customTabLabels,
	} = window.advdashFrontend || {};

	const tabs = useMemo( () => {
		if ( ! customTabLabels || Object.keys( customTabLabels ).length === 0 ) {
			return TAB_CONFIG;
		}
		return TAB_CONFIG.map( ( tab ) => {
			const customLabel = customTabLabels[ tab.key ];
			if ( customLabel && customLabel.trim() ) {
				return { ...tab, label: customLabel };
			}
			return tab;
		} );
	}, [ customTabLabels ] );

	const [ selectedDashboardId, setSelectedDashboardId ] = useState( initialDashboardId );
	const [ activeTab, setActiveTab ] = useState( getTabFromHash );

	const hasMultipleDashboards = ! isAdmin && userDashboards && userDashboards.length > 1;

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
