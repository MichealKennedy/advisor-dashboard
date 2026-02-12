import { useState } from '@wordpress/element';
import DashboardTabs from './components/DashboardTabs';
import { TAB_CONFIG } from '../../shared/utils';

export default function App() {
	const {
		dashboardId: initialDashboardId,
		dashboardName: initialDashboardName,
		isAdmin,
		allDashboards,
	} = window.advdashFrontend || {};

	const [ selectedDashboardId, setSelectedDashboardId ] = useState( initialDashboardId );
	const [ activeTab, setActiveTab ] = useState( TAB_CONFIG[ 0 ].key );

	const currentDashboard = isAdmin
		? allDashboards?.find( ( d ) => d.id === selectedDashboardId )
		: null;
	const dashboardName = currentDashboard
		? currentDashboard.name
		: ( initialDashboardName || 'Advisor Dashboard' );

	const handleDashboardChange = ( e ) => {
		const newId = parseInt( e.target.value, 10 );
		setSelectedDashboardId( newId );
		setActiveTab( TAB_CONFIG[ 0 ].key );
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
			</div>
			<DashboardTabs
				tabs={ TAB_CONFIG }
				activeTab={ activeTab }
				onTabChange={ setActiveTab }
				dashboardId={ isAdmin ? selectedDashboardId : null }
				isAdmin={ !! isAdmin }
			/>
		</div>
	);
}
