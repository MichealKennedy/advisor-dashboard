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

1. An admin creates a dashboard for each advisor and generates a webhook URL and key
2. In HighLevel, configure a Custom Webhook action with the URL and the key sent as an `X-Webhook-Key` header
3. HighLevel workflows POST contact data to the webhook with the `advisor_code` and `action` fields
4. The advisor logs into WordPress and views their dashboard page

== Installation ==

1. Upload the `advisor-dashboard` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to 'Advisor Dashboards' in the admin menu to create dashboards
4. Generate a webhook URL and key, then configure a HighLevel Custom Webhook action with the URL and the key as an `X-Webhook-Key` header
5. Add the 'Advisor Dashboard' block to a page using the block editor

== Frequently Asked Questions ==

= How do I set up the webhook in HighLevel? =

Generate a shared webhook URL and key from the Advisor Dashboards admin page. In your HighLevel workflow, add a Custom Webhook action with the URL and send the key as an `X-Webhook-Key` header (use the API Key auth option or a custom header). Each payload must include an `advisor_code` field matching the advisor's Member Workshop Code, and an `action` field (`register`, `cancel`, `attended`, `attended_other`, or `fed_request`).

= Can an advisor see other advisors' data? =

No. All data queries are scoped to the logged-in advisor's dashboard. There is no way for one advisor to access another's contacts.

= What happens if I deactivate the plugin? =

Your data is preserved. Deactivating the plugin does not delete any database tables or contact records. Data is only removed if you fully uninstall (delete) the plugin.

== Changelog ==

= 1.0.1 =
* Security: Move webhook key from URL path to X-Webhook-Key header
* Security: Return generic error messages to webhook callers
* Security: Add proxy-aware IP detection for rate limiting behind CDNs
* Fix: Align plugin version header with ADVDASH_VERSION constant
* Fix: Clean up user meta on plugin uninstall

= 1.0.0 =
* Initial release
* Webhook ingestion with add/remove actions
* Four-tab contact dashboard
* Admin dashboard and webhook management
* Sortable, searchable, paginated contact tables
* CSV export
* Gutenberg block
