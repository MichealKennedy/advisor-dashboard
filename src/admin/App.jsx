import { useState } from '@wordpress/element';
import { Button, Modal } from '@wordpress/components';
import DashboardList from './components/DashboardList';
import DashboardEditor from './components/DashboardEditor';
import TestContactSender from './components/TestContactSender';
import WebhookLogViewer from './components/WebhookLogViewer';
import SharedWebhookManager from './components/SharedWebhookManager';

function HelpDialog( { onClose } ) {
	return (
		<Modal title="How to Use Advisor Dashboards" onRequestClose={ onClose } size="medium">
			<div className="advdash-admin__help">
				<h3>Getting Started</h3>
				<ol>
					<li><strong>Generate the shared webhook</strong> &mdash; On the main page, click "Generate Shared Webhook URL" and copy the URL.</li>
					<li><strong>Create a dashboard</strong> &mdash; Click "Add New Dashboard", give it a name, select the advisor's WordPress user account, and enter their unique member workshop code (e.g., "SFG").</li>
					<li><strong>Set up HighLevel workflows</strong> &mdash; In your HighLevel workflow, add a Webhook action that POSTs to the shared URL. Include <code>advisor_code</code>, <code>tab</code>, and contact fields as Custom Data (see below).</li>
					<li><strong>Add the block to a page</strong> &mdash; In the WordPress block editor, add the "Advisor Dashboard" block to any page. When an advisor visits that page while logged in, they'll see their tabbed dashboard.</li>
				</ol>

				<h3>Shared Webhook</h3>
				<p>
					A single webhook URL is shared by all advisors. Each HighLevel workflow payload must include
					an <code>advisor_code</code> field set to the advisor's <strong>Member Workshop Code</strong> to route
					contacts to the correct dashboard. The <code>tab</code> field determines which tab the contact appears on.
				</p>

				<h3>HighLevel Webhook Setup</h3>

				<table className="widefat striped" style={ { marginBottom: '16px' } }>
					<thead>
						<tr>
							<th>Scenario</th>
							<th><code>tab</code> value</th>
							<th><code>_action</code> value</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Contact registers for a workshop</td>
							<td><code>current_registrations</code></td>
							<td>(omit &mdash; defaults to "add")</td>
						</tr>
						<tr>
							<td>Contact cancels registration</td>
							<td><code>current_registrations</code></td>
							<td><code>remove</code></td>
						</tr>
						<tr>
							<td>Attended workshop &amp; requested report</td>
							<td><code>attended_report</code></td>
							<td>(omit)</td>
						</tr>
						<tr>
							<td>Attended another member's workshop</td>
							<td><code>attended_other</code></td>
							<td>(omit)</td>
						</tr>
						<tr>
							<td>Fed employee requested advisor report</td>
							<td><code>fed_request</code></td>
							<td>(omit)</td>
						</tr>
					</tbody>
				</table>

				<h3>HighLevel Custom Data Fields</h3>
				<p>Add these as key-value pairs in the webhook action's <strong>Custom Data</strong> section:</p>
				<ul>
					<li><code>advisor_code</code> &mdash; <strong>Required.</strong> The advisor's Member Workshop Code (e.g., "SFG"). Routes the contact to the correct dashboard.</li>
					<li><code>tab</code> &mdash; <strong>Required.</strong> One of the tab values above.</li>
					<li><code>_action</code> &mdash; Optional. Set to <code>remove</code> only for cancellation workflows. Omit it for add/update.</li>
					<li><code>contact_id</code> &mdash; The HighLevel contact ID. Required for remove actions, strongly recommended for adds (enables upsert).</li>
					<li><code>first_name</code>, <code>last_name</code>, <code>city</code>, <code>state</code>, etc. &mdash; Any contact fields you want to store. Use the HighLevel merge field tags to populate them.</li>
				</ul>

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

	const handleEdit = ( id ) => {
		setSelectedId( id );
		setView( 'editor' );
	};

	const handleCreate = () => {
		setSelectedId( null );
		setView( 'editor' );
	};

	const handleBack = () => {
		setView( 'list' );
	};

	return (
		<div className="advdash-admin">
			<div className="advdash-admin__title-bar">
				<h1>Advisor Dashboards</h1>
				<div className="advdash-admin__title-actions">
					<Button variant="secondary" onClick={ () => setView( 'logs' ) }>
						Webhook Log
					</Button>
					<Button variant="secondary" onClick={ () => setView( 'test' ) }>
						Test Dashboard
					</Button>
					<Button variant="secondary" onClick={ () => setShowHelp( true ) }>
						Help
					</Button>
				</div>
			</div>
			{ showHelp && <HelpDialog onClose={ () => setShowHelp( false ) } /> }
			{ view === 'list' && (
				<>
					<SharedWebhookManager />
					<DashboardList onEdit={ handleEdit } onCreate={ handleCreate } />
				</>
			) }
			{ view === 'editor' && (
				<DashboardEditor id={ selectedId } onBack={ handleBack } />
			) }
			{ view === 'test' && (
				<TestContactSender onBack={ handleBack } />
			) }
			{ view === 'logs' && (
				<WebhookLogViewer onBack={ handleBack } />
			) }
		</div>
	);
}
