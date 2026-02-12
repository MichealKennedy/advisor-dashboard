import { useState } from '@wordpress/element';
import DashboardTabs from './components/DashboardTabs';
import { TAB_CONFIG } from '../../shared/utils';

export default function App() {
	const dashboardName = window.advdashFrontend?.dashboardName || 'Advisor Dashboard';
	const [ activeTab, setActiveTab ] = useState( TAB_CONFIG[ 0 ].key );

	return (
		<div className="advdash">
			<div className="advdash__header">
				<h2 className="advdash__title">{ dashboardName }</h2>
			</div>
			<DashboardTabs
				tabs={ TAB_CONFIG }
				activeTab={ activeTab }
				onTabChange={ setActiveTab }
			/>
		</div>
	);
}
