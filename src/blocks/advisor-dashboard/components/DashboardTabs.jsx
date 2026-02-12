import ContactTable from './ContactTable';

export default function DashboardTabs( { tabs, activeTab, onTabChange } ) {
	const currentTab = tabs.find( ( t ) => t.key === activeTab );

	return (
		<div className="advdash__tabs">
			<nav className="advdash__tab-bar" role="tablist">
				{ tabs.map( ( tab ) => (
					<button
						key={ tab.key }
						role="tab"
						aria-selected={ tab.key === activeTab }
						className={ `advdash__tab-button ${
							tab.key === activeTab
								? 'advdash__tab-button--active'
								: ''
						}` }
						onClick={ () => onTabChange( tab.key ) }
					>
						{ tab.label }
					</button>
				) ) }
			</nav>
			<div className="advdash__tab-panel" role="tabpanel">
				{ currentTab && (
					<ContactTable
						key={ currentTab.key }
						tab={ currentTab.key }
						columns={ currentTab.columns }
						defaultSort={ currentTab.defaultSort }
						dateFilterField={ currentTab.dateFilterField }
					/>
				) }
			</div>
		</div>
	);
}
