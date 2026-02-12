=== Advisor Dashboard ===
Contributors: profeds
Tags: dashboard, advisor, webhook, contacts, highLevel
Requires at least: 6.4
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Workshop advisor dashboard with webhook-driven contact management from HighLevel.

== Description ==

Advisor Dashboard replaces the Google Sheets-based advisor dashboard with a native WordPress solution. Each advisor gets a branded, login-gated dashboard page showing their workshop contacts organized into tabs.

**Features:**

* Webhook-driven data ingestion from HighLevel CRM workflows
* Four tabbed views: Current Registrations, Attended Workshop & Requested Report, Attended Other Members' Workshop, Fed Employee Requested Advisor Report
* Sortable, searchable, paginated contact tables
* CSV export for each tab
* Admin settings page to manage advisor dashboards and webhook URLs
* Advisor-scoped data — each advisor only sees their own contacts
* Gutenberg block for easy page placement

**How It Works:**

1. An admin creates a dashboard for each advisor and generates a webhook URL
2. HighLevel workflows POST contact data to the webhook URL
3. The advisor logs into WordPress and views their dashboard page
4. Contacts are organized into tabs based on the webhook payload

== Installation ==

1. Upload the `advisor-dashboard` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to 'Advisor Dashboards' in the admin menu to create dashboards
4. Generate webhook URLs and configure them in your HighLevel workflows
5. Add the 'Advisor Dashboard' block to a page using the block editor

== Frequently Asked Questions ==

= How do I set up the webhook in HighLevel? =

Each advisor dashboard has a single webhook URL. Configure your HighLevel workflows to POST JSON to this URL. Include a `tab` field to specify which tab the contact belongs to, and optionally an `_action` field set to `remove` to delete a contact.

= Can an advisor see other advisors' data? =

No. All data queries are scoped to the logged-in advisor's dashboard. There is no way for one advisor to access another's contacts.

= What happens if I deactivate the plugin? =

Your data is preserved. Deactivating the plugin does not delete any database tables or contact records. Data is only removed if you fully uninstall (delete) the plugin.

== Changelog ==

= 1.0.0 =
* Initial release
* Webhook ingestion with add/remove actions
* Four-tab contact dashboard
* Admin dashboard and webhook management
* Sortable, searchable, paginated contact tables
* CSV export
* Gutenberg block
