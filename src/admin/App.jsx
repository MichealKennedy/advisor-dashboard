import { useState } from '@wordpress/element';
import { Button, Modal } from '@wordpress/components';
import DashboardList from './components/DashboardList';
import DashboardEditor from './components/DashboardEditor';
import TestContactSender from './components/TestContactSender';
import WebhookLogViewer from './components/WebhookLogViewer';
import SharedWebhookManager from './components/SharedWebhookManager';
import CreateDashboardDialog from './components/CreateDashboardDialog';
import FailureAlertSettings from './components/FailureAlertSettings';

function HelpDialog( { onClose } ) {
	return (
		<Modal title="How to Use Advisor Dashboards" onRequestClose={ onClose } size="medium">
			<div className="advdash-admin__help">
				<h3>Getting Started</h3>
				<ol>
					<li><strong>Generate the shared webhook</strong> &mdash; On the main page, click "Generate Shared Webhook URL" and copy the URL.</li>
					<li><strong>Create a dashboard</strong> &mdash; Click "Add New Dashboard", give it a name, select the advisor's WordPress user account, and enter their unique member workshop code (e.g., "SFG").</li>
					<li><strong>Set up HighLevel workflows</strong> &mdash; In your HighLevel workflow, add a Webhook action that POSTs to the shared URL. Include <code>advisor_code</code> and <code>action</code> as Custom Data (see below).</li>
					<li><strong>Add the block to a page</strong> &mdash; In the WordPress block editor, add the "Advisor Dashboard" block to any page. When an advisor visits that page while logged in, they'll see their tabbed dashboard.</li>
				</ol>

				<h3>Shared Webhook</h3>
				<p>
					A single webhook URL is shared by all advisors. Each HighLevel workflow payload must include
					an <code>advisor_code</code> field set to the advisor's <strong>Member Workshop Code</strong> to route
					contacts to the correct dashboard. The <code>action</code> field determines the contact's status and which tab they appear on.
				</p>

				<h3>HighLevel Webhook Setup</h3>

				<table className="widefat striped" style={ { marginBottom: '16px' } }>
					<thead>
						<tr>
							<th>Scenario</th>
							<th><code>action</code> value</th>
							<th>Dashboard Tab</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Contact registers for a workshop</td>
							<td><code>register</code></td>
							<td>Current Registrations</td>
						</tr>
						<tr>
							<td>Contact cancels registration</td>
							<td><code>cancel</code></td>
							<td>(hidden from all tabs)</td>
						</tr>
						<tr>
							<td>Attended workshop &amp; requested report</td>
							<td><code>attended</code></td>
							<td>Attended Workshop &amp; Requested Report</td>
						</tr>
						<tr>
							<td>Attended another member's workshop</td>
							<td><code>attended_other</code></td>
							<td>Attended Other Members' Workshop</td>
						</tr>
						<tr>
							<td>Fed employee requested advisor report</td>
							<td><code>fed_request</code></td>
							<td>Fed Employee Requested Advisor Report</td>
						</tr>
					</tbody>
				</table>

				<h3>How It Works</h3>
				<p>
					Each contact exists as <strong>one row</strong> per advisor dashboard. When you send
					a new action for the same <code>contact_id</code>, the contact's status is updated and they
					automatically move to the corresponding tab. All existing data (notes, advisor status, contact
					fields) is preserved across status changes.
				</p>

				<h3>HighLevel Custom Data Fields</h3>
				<p>Add these as key-value pairs in the webhook action's <strong>Custom Data</strong> section:</p>
				<ul>
					<li><code>advisor_code</code> &mdash; <strong>Required.</strong> The advisor's Member Workshop Code (e.g., "SFG"). Routes the contact to the correct dashboard.</li>
					<li><code>action</code> &mdash; <strong>Required.</strong> One of: <code>register</code>, <code>cancel</code>, <code>attended</code>, <code>attended_other</code>, <code>fed_request</code>.</li>
				</ul>
				<p>
					<strong>Standard contact fields</strong> (<code>contact_id</code>, <code>first_name</code>, <code>last_name</code>, <code>city</code>, <code>state</code>, phone, email, etc.)
					are included automatically by HighLevel &mdash; no setup needed.
					Custom fields (e.g., <code>workshop_date</code>, food options, <code>retirement_system</code>) should be added as Custom Data if the workflow uses them.
				</p>

				<h3>Managing the Webhook</h3>
				<ul>
					<li><strong>Regenerate</strong> &mdash; Creates a new URL (the old one stops working immediately).</li>
					<li><strong>Delete</strong> &mdash; Removes the webhook entirely.</li>
				</ul>
			</div>
		</Modal>
	);
}

export default function App() {
	const [ view, setView ] = useState( 'list' );
	const [ selectedId, setSelectedId ] = useState( null );
	const [ showHelp, setShowHelp ] = useState( false );
	const [ showWebhook, setShowWebhook ] = useState( false );
	const [ showCreate, setShowCreate ] = useState( false );
	const [ showTest, setShowTest ] = useState( false );
	const [ showAlerts, setShowAlerts ] = useState( false );
	const [ listKey, setListKey ] = useState( 0 );

	const handleEdit = ( id ) => {
		setSelectedId( id );
		setView( 'editor' );
	};

	const handleCreate = () => {
		setShowCreate( true );
	};

	const handleCreated = () => {
		setShowCreate( false );
		setListKey( ( k ) => k + 1 );
	};

	const handleBack = () => {
		setView( 'list' );
	};

	return (
		<div className="advdash-admin">
			<div className="advdash-admin__title-bar">
				<h1>Advisor Dashboards</h1>
				<div className="advdash-admin__title-actions">
					<Button variant="secondary" onClick={ () => setShowWebhook( true ) }>
						Manage Webhook
					</Button>
					<Button variant="secondary" onClick={ () => setView( 'logs' ) }>
						Webhook Log
					</Button>
					<Button variant="secondary" onClick={ () => setShowTest( true ) }>
						Test
					</Button>
					<Button variant="secondary" onClick={ () => setShowAlerts( true ) }>
						Alerts
					</Button>
					<Button variant="secondary" onClick={ () => setShowHelp( true ) }>
						Help
					</Button>
				</div>
			</div>
			{ showHelp && <HelpDialog onClose={ () => setShowHelp( false ) } /> }
			{ showWebhook && (
				<Modal title="Shared Webhook" onRequestClose={ () => setShowWebhook( false ) } size="medium">
					<SharedWebhookManager />
				</Modal>
			) }
			{ showCreate && (
				<Modal title="Create New Dashboard" onRequestClose={ () => setShowCreate( false ) } size="medium">
					<CreateDashboardDialog
						onCreated={ handleCreated }
						onCancel={ () => setShowCreate( false ) }
					/>
				</Modal>
			) }
			{ showTest && (
				<Modal title="Test Dashboard" onRequestClose={ () => setShowTest( false ) } size="medium">
					<TestContactSender />
				</Modal>
			) }
			{ showAlerts && (
				<Modal title="Failure Alert Settings" onRequestClose={ () => setShowAlerts( false ) } size="medium">
					<FailureAlertSettings />
				</Modal>
			) }
			{ view === 'list' && (
				<DashboardList key={ listKey } onEdit={ handleEdit } onCreate={ handleCreate } />
			) }
			{ view === 'editor' && (
				<DashboardEditor id={ selectedId } onBack={ handleBack } />
			) }
			{ view === 'logs' && (
				<WebhookLogViewer onBack={ handleBack } />
			) }
		</div>
	);
}
