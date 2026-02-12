# Advisor Dashboard WordPress Plugin — Implementation Plan

**Plugin Name:** `advisor-dashboard`
**Version:** 1.0.0
**Purpose:** Replace the Google Sheets–based advisor dashboard with a native WordPress solution. Each advisor gets a branded, login-gated dashboard page showing their workshop contacts organized into tabs that mirror the current spreadsheet. Data flows in via a single webhook per advisor fired from HighLevel workflows — the payload specifies which tab the contact belongs to and whether to add or remove them.

---

## 1. High-Level Architecture

```
HighLevel Workflow
    │
    ▼ (POST webhook — one URL per advisor dashboard)
    │  Payload includes: tab, _action (add/remove), contact fields
    │
WordPress REST API ──► Single Contacts Table ──► React Gutenberg Block
    │                    (tab column)                  │
    │  /wp-json/advisor-dashboard/v1/webhook/{key}     │  Renders tabbed data
    │                                                  │  filtered by logged-in
    │                                                  │  advisor + tab
    ▼
WP Admin Settings Page
  • Create/delete advisor dashboards
  • Link dashboard → WP User (advisor)
  • Generate/revoke the dashboard's webhook URL
```

### Key Principles
- **One plugin, self-contained.** No dependency on the existing workshop management plugin.
- **React frontend.** The Gutenberg block and admin page both use React (via `@wordpress/scripts`).
- **Single contacts table.** One table stores all contacts. A `tab` column determines which tab a contact belongs to. The webhook payload specifies the tab — no intermediate filtering or computed views.
- **One webhook per dashboard.** A single URL handles all tab operations. The payload's `tab` field routes the contact, and the `_action` field controls whether to add/update or remove.
- **Advisor-scoped data.** Every query is filtered by the advisor's `dashboard_id`. An advisor can never see another advisor's data.
- **Webhook-driven ingestion.** No polling, no manual imports. HighLevel fires webhooks; the plugin stores the data.

---

## 2. Data Model

### 2.1 Tab Definitions (from the spreadsheet)

The Google Sheet has four advisor-facing tabs. Each one maps to a `tab` value in the database:

| Tab Label | `tab` value | What it contains |
|---|---|---|
| **Current Registrations** | `current_registrations` | People registered for upcoming workshops |
| **Attended Workshop & Requested Report** | `attended_report` | People who attended this advisor's workshop and requested a FedImpact report |
| **Attended Other Members' Workshop** | `attended_other` | Fed employees who attended a different advisor's workshop but are assigned to this advisor |
| **Fed Employee Requested Advisor Report** | `fed_request` | Fed employees who directly requested a report from this advisor |

### 2.2 Database Tables

Three tables total. All use the WordPress `$wpdb->prefix`.

#### Table: `{prefix}advdash_dashboards`

The central registry of advisor dashboards.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT PK | |
| `wp_user_id` | BIGINT UNSIGNED NOT NULL | The WordPress user ID of the advisor. One dashboard per advisor. |
| `name` | VARCHAR(255) NOT NULL | Display name (e.g., "SFG Dashboard") |
| `member_workshop_code` | VARCHAR(100) | The advisor's member code (e.g., "SFG") |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE | |

Index: `UNIQUE(wp_user_id)`

#### Table: `{prefix}advdash_webhooks`

One webhook per dashboard. The `tab` is specified in the webhook payload, not in the webhook record.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT PK | |
| `dashboard_id` | BIGINT UNSIGNED NOT NULL FK | References `advdash_dashboards.id` |
| `webhook_key` | VARCHAR(64) NOT NULL UNIQUE | Random secret key used in the webhook URL |
| `is_active` | TINYINT(1) DEFAULT 1 | Enable/disable without deleting |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | |

Webhook URL pattern: `https://profeds.com/wp-json/advisor-dashboard/v1/webhook/{webhook_key}`

Indexes: `UNIQUE(webhook_key)`, `UNIQUE(dashboard_id)`

#### Table: `{prefix}advdash_contacts`

Single table for all contacts across all tabs and dashboards. The `tab` column determines which tab a contact appears on.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT PK | |
| `dashboard_id` | BIGINT UNSIGNED NOT NULL FK | Which advisor dashboard this belongs to |
| `tab` | VARCHAR(50) NOT NULL | Which tab: `current_registrations`, `attended_report`, `attended_other`, `fed_request` |
| `contact_id` | VARCHAR(100) | HighLevel contact ID |
| `first_name` | VARCHAR(255) | |
| `last_name` | VARCHAR(255) | |
| `spouse_name` | VARCHAR(255) | |
| `workshop_date` | DATE | Workshop date (registration or attended, depending on tab) |
| `food_option_fed` | VARCHAR(255) | Food preference for the federal employee |
| `side_option_fed` | VARCHAR(255) | Side option for the federal employee |
| `food_option_spouse` | VARCHAR(255) | Food preference for spouse |
| `side_option_spouse` | VARCHAR(255) | Side option for spouse |
| `rsvp_confirmed` | VARCHAR(100) | |
| `city` | VARCHAR(255) | |
| `state` | VARCHAR(255) | |
| `postal_code` | VARCHAR(20) | |
| `home_address` | VARCHAR(500) | |
| `other_address` | VARCHAR(500) | |
| `other_city` | VARCHAR(255) | |
| `other_state` | VARCHAR(255) | |
| `other_postal_code` | VARCHAR(20) | |
| `special_provisions` | VARCHAR(255) | e.g., "Law Enforcement Officer" |
| `retirement_system` | VARCHAR(255) | e.g., "FERS or FERS Transfer" |
| `registration_form_completed` | DATE | |
| `member_workshop_code` | VARCHAR(100) | e.g., "SFG" |
| `work_phone` | VARCHAR(50) | |
| `cell_phone` | VARCHAR(50) | |
| `old_phone` | VARCHAR(50) | |
| `work_email` | VARCHAR(255) | |
| `personal_email` | VARCHAR(255) | |
| `other_email` | VARCHAR(255) | |
| `best_email` | VARCHAR(255) | |
| `agency` | VARCHAR(255) | Federal agency |
| `time_frame_for_retirement` | VARCHAR(255) | |
| `comment_on_registration` | TEXT | |
| `training_action` | TEXT | "Something you will do as a result of training" |
| `tell_others` | TEXT | "Tell what you would tell them" |
| `additional_comments` | TEXT | "Additional Comments on Evaluation" |
| `rate_material` | VARCHAR(100) | |
| `rate_virtual_environment` | VARCHAR(100) | |
| `meet_for_report` | VARCHAR(10) | Y/N |
| `date_of_lead_request` | DATE | |
| `status` | VARCHAR(100) | e.g., "registered", "canceled/reschedule/no show/left early/said no" |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE | |

Indexes:
- `INDEX(dashboard_id, tab)` — the primary query pattern
- `UNIQUE(dashboard_id, tab, contact_id)` — upsert support; same contact can appear on multiple tabs

**Note on the wide column set:** Not every tab uses every column. The `current_registrations` tab won't use phone/email/agency fields; the `fed_request` tab won't use food option fields. That's fine — unused columns stay NULL. This is far simpler than maintaining multiple tables or a JSON blob, and it makes querying and sorting straightforward.

### 2.3 How Data Flows

**Adding a contact:**
```
HighLevel fires webhook with { "tab": "current_registrations", "_action": "add", "first_name": "Darwin", ... }
    │
    ▼
Plugin receives POST at /webhook/{key}
    │
    ├─ Looks up webhook_key → gets dashboard_id = 5
    │
    ├─ Reads "tab" from JSON payload → "current_registrations"
    ├─ Reads "_action" from JSON payload → "add" (default if omitted)
    │
    ├─ Maps incoming JSON fields to column names
    │
    └─ INSERT INTO advdash_contacts (dashboard_id, tab, first_name, ...)
       VALUES (5, 'current_registrations', 'Darwin', ...)
       ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), ...
```

**Removing a contact (e.g., cancellation):**
```
HighLevel fires webhook with { "tab": "current_registrations", "_action": "remove", "contact_id": "upbGZ25drzq5eK94rtD6" }
    │
    ▼
Plugin receives POST at /webhook/{key}
    │
    ├─ Looks up webhook_key → gets dashboard_id = 5
    │
    ├─ Reads "_action" → "remove"
    │
    └─ DELETE FROM advdash_contacts
       WHERE dashboard_id = 5
         AND tab = 'current_registrations'
         AND contact_id = 'upbGZ25drzq5eK94rtD6'
```

No filtering logic. No computed views. The webhook payload determines the tab and the action.

---

## 3. Plugin File Structure

```
advisor-dashboard/
├── advisor-dashboard.php              # Main plugin file, activation/deactivation hooks
├── includes/
│   ├── class-activator.php            # DB table creation (dbDelta), role/capability setup
│   ├── class-deactivator.php          # Cleanup on deactivation (optional)
│   ├── class-rest-api.php             # REST API route registration & handlers
│   ├── class-webhook-handler.php      # Webhook ingestion logic (validate, map, upsert)
│   └── class-dashboard-manager.php    # CRUD for dashboards and webhooks (admin operations)
├── admin/
│   ├── class-admin-page.php           # Registers WP admin menu page, enqueues React app
│   └── js/
│       └── (built React app for admin)
├── blocks/
│   └── advisor-dashboard/
│       ├── block.json                 # Gutenberg block metadata
│       ├── index.js                   # Block registration (edit + save)
│       ├── edit.js                    # Editor preview (placeholder in editor)
│       ├── render.php                 # Dynamic block server-side render (outputs React mount point)
│       └── view.js                    # Frontend React app (the actual tabbed dashboard)
├── src/
│   ├── admin/                         # React source for admin settings page
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── DashboardList.jsx      # List all dashboards, add/remove
│   │   │   ├── DashboardEditor.jsx    # Edit single dashboard settings
│   │   │   └── WebhookManager.jsx     # Generate/revoke the dashboard's webhook URL
│   │   └── index.js
│   ├── block/                         # React source for the frontend Gutenberg block
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── DashboardTabs.jsx      # Tab navigation
│   │   │   └── ContactTable.jsx       # Reusable sortable/filterable/paginated data table
│   │   └── index.js
│   └── shared/
│       ├── api.js                     # Fetch wrapper for WP REST API (wp.apiFetch)
│       └── utils.js                   # Date formatting, shared helpers
├── package.json
└── webpack.config.js (or wp-scripts)
```

### Build Tooling

Use `@wordpress/scripts` for the build pipeline. Two entry points:

1. **Admin app**: `src/admin/index.js` → `admin/js/advisor-dashboard-admin.js`
2. **Block frontend**: `src/block/index.js` → `blocks/advisor-dashboard/view.js`
3. **Block editor**: `blocks/advisor-dashboard/index.js` (standard Gutenberg block registration)

---

## 4. REST API Endpoints

**Namespace:** `advisor-dashboard/v1`

### 4.1 Admin Endpoints (require `manage_options` capability)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/dashboards` | List all advisor dashboards |
| `POST` | `/dashboards` | Create a new dashboard (body: `wp_user_id`, `name`, `member_workshop_code`) |
| `PUT` | `/dashboards/{id}` | Update dashboard settings |
| `DELETE` | `/dashboards/{id}` | Delete dashboard and all associated contacts + webhooks |
| `GET` | `/dashboards/{id}/webhook` | Get the webhook for this dashboard (URL, active status) |
| `POST` | `/dashboards/{id}/webhook` | Generate a webhook for this dashboard. Returns the full URL with generated key |
| `DELETE` | `/dashboards/{id}/webhook` | Revoke/delete the webhook |
| `PUT` | `/dashboards/{id}/webhook` | Toggle `is_active` |

### 4.2 Frontend Data Endpoints (require logged-in user, scoped to their dashboard)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/my-dashboard` | Get the current user's dashboard metadata (name, available tabs) |
| `GET` | `/my-dashboard/contacts?tab=current_registrations` | Get contacts for a specific tab |
| `GET` | `/my-dashboard/contacts?tab=attended_report` | Get contacts for Attended & Report tab |
| `GET` | `/my-dashboard/contacts?tab=attended_other` | Get contacts for Attended Other tab |
| `GET` | `/my-dashboard/contacts?tab=fed_request` | Get contacts for Fed Request tab |

**Single endpoint, filtered by tab.** This keeps the API simple. The `tab` parameter is required.

**Authorization logic for `/my-dashboard/*`:**
1. Get the current user's ID from `wp_get_current_user()`.
2. Look up `advdash_dashboards` where `wp_user_id = current_user_id`.
3. If no dashboard exists, return 403 with a message.
4. All queries filter by the matched `dashboard_id` — no way to access other dashboards.

**Pagination:** Support `?page=1&per_page=50` with standard WP REST pagination headers (`X-WP-Total`, `X-WP-TotalPages`).

**Sorting:** Support `?orderby=workshop_date&order=desc` (default: most recent first).

**Search:** Support `?search=smith` which does a `LIKE` search across `first_name` and `last_name`.

### 4.3 Webhook Ingestion Endpoint (public, authenticated by webhook key)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/webhook/{webhook_key}` | Receive data from HighLevel, add contact to the target tab |

**No WordPress authentication required** — the `webhook_key` itself is the auth token.

---

## 5. Webhook Ingestion Logic

### 5.1 Flow

```
POST /wp-json/advisor-dashboard/v1/webhook/{webhook_key}
    │
    ├─ 1. Look up webhook_key in advdash_webhooks
    │     → 404 if not found, 403 if inactive
    │
    ├─ 2. Get dashboard_id from webhook record
    │
    ├─ 3. Parse JSON body from HighLevel
    │     → Extract required "tab" field (must be one of the 4 valid tab values)
    │     → Extract optional "_action" field (defaults to "add")
    │     → 400 if "tab" is missing or invalid
    │
    ├─ 4a. If _action = "add" (default):
    │     → Map HighLevel field names to DB column names
    │     → INSERT into advdash_contacts with dashboard_id and tab
    │     → ON DUPLICATE KEY UPDATE (keyed on dashboard_id + tab + contact_id)
    │     → Only update fields present in the payload (don't null out missing fields)
    │
    ├─ 4b. If _action = "remove":
    │     → Requires "contact_id" in payload (400 if missing)
    │     → DELETE FROM advdash_contacts WHERE dashboard_id + tab + contact_id match
    │     → 404 if no matching contact found
    │
    └─ 5. Return 200 with { success: true, action: "add"|"remove", contact_id: "..." }
```

### 5.2 Reserved Payload Fields

Two fields in the payload are handled specially and are NOT stored in the contacts table:

| Field | Required | Default | Purpose |
|---|---|---|---|
| `tab` | **Yes** | — | Which tab to add/remove the contact from. Must be one of: `current_registrations`, `attended_report`, `attended_other`, `fed_request` |
| `_action` | No | `"add"` | What to do: `"add"` inserts or updates, `"remove"` deletes the contact from that tab |

All other fields in the payload are mapped to contact columns per the field mapping below.

### 5.3 Field Mapping

The webhook handler accepts a flat JSON object and maps keys to column names. Support both snake_case and camelCase variants since HighLevel payloads can use either:

```php
$field_map = [
    // HighLevel field name        => DB column name
    'contact_id'                   => 'contact_id',
    'contactId'                    => 'contact_id',
    'first_name'                   => 'first_name',
    'firstName'                    => 'first_name',
    'last_name'                    => 'last_name',
    'lastName'                     => 'last_name',
    'spouse_name'                  => 'spouse_name',
    'spouseName'                   => 'spouse_name',
    'workshop_date'                => 'workshop_date',
    'workshopDate'                 => 'workshop_date',
    'food_option_fed'              => 'food_option_fed',
    'side_option_fed'              => 'side_option_fed',
    'food_option_spouse'           => 'food_option_spouse',
    'side_option_spouse'           => 'side_option_spouse',
    'rsvp_confirmed'               => 'rsvp_confirmed',
    'city'                         => 'city',
    'state'                        => 'state',
    'postal_code'                  => 'postal_code',
    'postalCode'                   => 'postal_code',
    'home_address'                 => 'home_address',
    'homeAddress'                  => 'home_address',
    'other_address'                => 'other_address',
    'other_city'                   => 'other_city',
    'other_state'                  => 'other_state',
    'other_postal_code'            => 'other_postal_code',
    'special_provisions'           => 'special_provisions',
    'retirement_system'            => 'retirement_system',
    'registration_form_completed'  => 'registration_form_completed',
    'member_workshop_code'         => 'member_workshop_code',
    'work_phone'                   => 'work_phone',
    'cell_phone'                   => 'cell_phone',
    'cellPhone'                    => 'cell_phone',
    'old_phone'                    => 'old_phone',
    'work_email'                   => 'work_email',
    'workEmail'                    => 'work_email',
    'personal_email'               => 'personal_email',
    'personalEmail'                => 'personal_email',
    'other_email'                  => 'other_email',
    'best_email'                   => 'best_email',
    'agency'                       => 'agency',
    'time_frame_for_retirement'    => 'time_frame_for_retirement',
    'comment_on_registration'      => 'comment_on_registration',
    'training_action'              => 'training_action',
    'tell_others'                  => 'tell_others',
    'additional_comments'          => 'additional_comments',
    'rate_material'                => 'rate_material',
    'rate_virtual_environment'     => 'rate_virtual_environment',
    'meet_for_report'              => 'meet_for_report',
    'date_of_lead_request'         => 'date_of_lead_request',
    'status'                       => 'status',
];
```

### 5.4 Upsert & Remove Behavior

**Add (upsert):** The unique key is `(dashboard_id, tab, contact_id)`. This means:

- The **same person** can appear on **multiple tabs** (e.g., they registered AND later attended and requested a report). Each tab entry is independent.
- If HighLevel fires the same webhook again for an existing contact+tab combination, it **updates** the record instead of creating a duplicate.
- Only fields present in the incoming JSON are updated — missing fields are left unchanged.

**Remove:** Deletes the row matching `(dashboard_id, tab, contact_id)`. This is the mechanism for handling cancellations — when someone cancels a workshop registration, HighLevel fires the webhook with `"_action": "remove"` and `"tab": "current_registrations"`, and they disappear from that tab. If the same person also appears on another tab, those entries are unaffected.

### 5.5 Webhook Security

- The `webhook_key` is a 64-character random hex string generated via `bin2hex(random_bytes(32))`.
- Rate limit: consider a simple transient-based limiter (e.g., 60 requests/minute per key).
- Log failed attempts (invalid keys) for debugging.
- Validate that the request body is valid JSON and contains at minimum a `contact_id` or `first_name` + `last_name`.

---

## 6. Admin Settings Page

### 6.1 Menu Location

Register under the WordPress admin menu as a top-level item:
- **Menu title:** "Advisor Dashboards"
- **Icon:** `dashicons-businessman`
- **Capability:** `manage_options`

### 6.2 Admin React App — Screens

**Screen 1: Dashboard List**
- Table showing all advisor dashboards: Name | Advisor (WP user) | Workshop Code | # Contacts | Created | Actions
- "Add New Dashboard" button
- Actions: Edit, Delete (with confirmation)

**Screen 2: Add/Edit Dashboard**
- Form fields:
  - Dashboard Name (text)
  - Advisor (dropdown of WP users — filter by appropriate roles)
  - Member Workshop Code (text — the code like "SFG" that identifies this advisor)
- Save / Cancel buttons

**Screen 3: Webhook Manager** (section within the dashboard edit view)
- Shows the dashboard's webhook URL (if generated)
- If no webhook exists: "Generate Webhook URL" button
- If webhook exists: displays the full URL with a "Copy to Clipboard" button, active/inactive toggle, and "Regenerate" / "Delete" buttons
- Clear labeling: "Use this single URL in all your HighLevel workflows. The `tab` and `_action` fields in the payload determine where contacts are added or removed."

### 6.3 Admin API Interactions

The admin React app uses `wp.apiFetch` with the nonce automatically provided by `wp_localize_script`. All calls go to the `/advisor-dashboard/v1/` namespace.

---

## 7. Gutenberg Block: Advisor Dashboard

### 7.1 Block Registration

```json
// block.json
{
  "apiVersion": 3,
  "name": "advisor-dashboard/dashboard",
  "title": "Advisor Dashboard",
  "category": "widgets",
  "description": "Displays the advisor's workshop dashboard with tabbed data views.",
  "supports": {
    "html": false,
    "multiple": false
  },
  "attributes": {},
  "render": "file:./render.php",
  "viewScript": "file:./view.js",
  "editorScript": "file:./index.js"
}
```

**No block attributes needed.** The block is a simple container — all data is determined at runtime by who is logged in.

### 7.2 Server-Side Render (`render.php`)

```php
<?php
// Check if user is logged in
if ( ! is_user_logged_in() ) {
    echo '<div class="advdash-login-required">';
    echo '<p>Please log in to view your dashboard.</p>';
    echo wp_login_url( get_permalink() );
    echo '</div>';
    return;
}

// Check if user has a dashboard
$user_id = get_current_user_id();
// Query advdash_dashboards WHERE wp_user_id = $user_id
$dashboard = $wpdb->get_row( $wpdb->prepare(
    "SELECT * FROM {$wpdb->prefix}advdash_dashboards WHERE wp_user_id = %d",
    $user_id
));

if ( ! $dashboard ) {
    echo '<div class="advdash-no-dashboard">';
    echo '<p>No dashboard is configured for your account.</p>';
    echo '</div>';
    return;
}

// Render the React mount point
echo '<div id="advisor-dashboard-app"'
   . ' data-dashboard-id="' . esc_attr( $dashboard->id ) . '"'
   . ' data-dashboard-name="' . esc_attr( $dashboard->name ) . '"'
   . '></div>';
```

### 7.3 Frontend React App (view.js)

Mounts into `#advisor-dashboard-app` and renders the tabbed dashboard.

**Component Tree:**

```
<App>
  ├── <DashboardHeader />          # Shows dashboard name, advisor greeting
  └── <DashboardTabs>
        ├── Tab: "Current Registrations"
        ├── Tab: "Attended Workshop & Requested Report"
        ├── Tab: "Attended Other Members' Workshop"
        └── Tab: "Fed Employee Requested Advisor Report"
              └── <ContactTable />   # Same component for all tabs, configured with different columns
```

### 7.4 Tab Configuration

Each tab uses the **same `ContactTable` component** but passes different column configurations and API parameters. Define the tabs as a config array:

```javascript
const TAB_CONFIG = [
  {
    key: 'current_registrations',
    label: 'Current Registrations',
    columns: [
      { key: 'workshop_date', label: 'Workshop Date', type: 'date' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'spouse_name', label: 'Spouse Name' },
      { key: 'food_option_fed', label: 'Food Option (Fed)' },
      { key: 'food_option_spouse', label: 'Food Option (Spouse)' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'special_provisions', label: 'Special Provisions' },
      { key: 'retirement_system', label: 'Retirement System' },
      { key: 'registration_form_completed', label: 'Form Completed', type: 'date' },
      { key: 'member_workshop_code', label: 'Workshop Code' },
    ],
    defaultSort: { key: 'workshop_date', direction: 'desc' },
  },
  {
    key: 'attended_report',
    label: 'Attended Workshop & Requested Report',
    columns: [
      { key: 'workshop_date', label: 'Workshop Date', type: 'date' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'spouse_name', label: 'Spouse Name' },
      { key: 'cell_phone', label: 'Cell Phone' },
      { key: 'work_email', label: 'Work Email' },
      { key: 'personal_email', label: 'Personal Email' },
      { key: 'best_email', label: 'Best Email' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'agency', label: 'Agency' },
      { key: 'retirement_system', label: 'Retirement System' },
      { key: 'time_frame_for_retirement', label: 'Retirement Timeframe' },
      { key: 'meet_for_report', label: 'Meet for Report' },
      { key: 'rate_material', label: 'Rate Material' },
      { key: 'additional_comments', label: 'Comments' },
    ],
    defaultSort: { key: 'workshop_date', direction: 'desc' },
  },
  {
    key: 'attended_other',
    label: "Attended Other Members' Workshop",
    columns: [
      { key: 'workshop_date', label: 'Workshop Date', type: 'date' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'spouse_name', label: 'Spouse Name' },
      { key: 'cell_phone', label: 'Cell Phone' },
      { key: 'work_email', label: 'Work Email' },
      { key: 'personal_email', label: 'Personal Email' },
      { key: 'best_email', label: 'Best Email' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'agency', label: 'Agency' },
      { key: 'retirement_system', label: 'Retirement System' },
      { key: 'time_frame_for_retirement', label: 'Retirement Timeframe' },
      { key: 'meet_for_report', label: 'Meet for Report' },
      { key: 'rate_material', label: 'Rate Material' },
      { key: 'additional_comments', label: 'Comments' },
    ],
    defaultSort: { key: 'workshop_date', direction: 'desc' },
  },
  {
    key: 'fed_request',
    label: 'Fed Employee Requested Advisor Report',
    columns: [
      { key: 'date_of_lead_request', label: 'Lead Request Date', type: 'date' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'spouse_name', label: 'Spouse Name' },
      { key: 'cell_phone', label: 'Cell Phone' },
      { key: 'work_email', label: 'Work Email' },
      { key: 'personal_email', label: 'Personal Email' },
      { key: 'best_email', label: 'Best Email' },
      { key: 'home_address', label: 'Home Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'postal_code', label: 'Zip' },
      { key: 'agency', label: 'Agency' },
      { key: 'retirement_system', label: 'Retirement System' },
      { key: 'special_provisions', label: 'Special Provisions' },
      { key: 'time_frame_for_retirement', label: 'Retirement Timeframe' },
      { key: 'meet_for_report', label: 'Meet for Report' },
    ],
    defaultSort: { key: 'date_of_lead_request', direction: 'desc' },
  },
];
```

### 7.5 ContactTable Component

A single reusable React table component used by all four tabs. Receives `columns` and `tab` as props.

**Features:**
- **Column configuration:** Driven entirely by the `columns` prop from the tab config above. Only displays columns relevant to that tab.
- **Sorting:** Click column headers to sort ascending/descending. Default sort per tab config.
- **Search:** Text input above the table that filters across `first_name` and `last_name`.
- **Pagination:** Server-side pagination (50 per page). Pass `page` and `per_page` params to the API.
- **Responsive:** Horizontal scroll on mobile.
- **CSV Export:** A "Download CSV" button that exports the current tab's data.
- **Empty state:** Friendly message like "No current registrations" when the tab has no data.
- **Loading state:** Skeleton or spinner while data is fetching.

**Recommended library:** `@tanstack/react-table` (TanStack Table v8) for headless table logic — handles sorting, filtering, and pagination while giving full UI control.

**Data fetching pattern:**
```javascript
// Each tab fetches from the same endpoint, just with a different tab param
const fetchContacts = async (tab, page = 1, perPage = 50, orderby, order, search) => {
  return await apiFetch({
    path: `/advisor-dashboard/v1/my-dashboard/contacts?tab=${tab}&page=${page}&per_page=${perPage}&orderby=${orderby}&order=${order}&search=${search}`,
  });
};
```

---

## 8. Frontend Styling

- Use WordPress's built-in styles as a baseline. Should look at home on the Profeds.com theme.
- BEM-style class names with `.advdash-` prefix to avoid conflicts.
- Tab bar: horizontal tab navigation, active tab visually distinct.
- Table: clean, striped rows, hover highlighting. Professional — this is an advisor tool.
- All CSS in a single `style.css` that ships with the block.
- Use CSS custom properties for colors so the theme can influence them.

---

## 9. Activation & Deactivation

### On Activation (`class-activator.php`)
1. Create all three database tables using `dbDelta()`.
2. Flush rewrite rules.

### On Deactivation
1. Do NOT drop tables — data should persist.

### On Uninstall (`uninstall.php`)
1. Drop all three tables.
2. Remove any options stored in `wp_options`.

---

## 10. Security Considerations

| Concern | Mitigation |
|---|---|
| Advisor sees another advisor's data | All frontend queries resolve `dashboard_id` server-side from the authenticated user's `wp_user_id`. Never accept `dashboard_id` from the client. |
| Webhook spoofing | 64-char random key is unguessable. Optionally add IP allowlisting for HighLevel's IPs. |
| SQL injection | Use `$wpdb->prepare()` for all queries. Never interpolate user input. |
| XSS | All output escaped with `esc_html()`, `esc_attr()`. React handles this by default. |
| CSRF on admin | WordPress nonces via `wp_rest` nonce for all admin REST calls. |
| Unauthorized admin access | All admin endpoints check `manage_options` capability. |
| Brute-force webhook keys | Rate limit webhook endpoint. Log repeated 404s. |

---

## 11. HighLevel Integration Notes

### Configuring HighLevel Workflows

Each advisor dashboard has a **single webhook URL**. All HighLevel workflows for that advisor POST to the same URL — the `tab` and `_action` fields in the payload control what happens.

- **Method:** POST
- **URL:** The webhook URL from the plugin (e.g., `https://profeds.com/wp-json/advisor-dashboard/v1/webhook/a1b2c3d4...`)
- **Content-Type:** `application/json`
- **Body:** A JSON object with `tab` (required), `_action` (optional, defaults to `"add"`), and the contact's fields

### Example Payloads

**Add a registration:**
```json
{
  "tab": "current_registrations",
  "contact_id": "upbGZ25drzq5eK94rtD6",
  "first_name": "Darwin",
  "last_name": "ONeal",
  "spouse_name": "",
  "workshop_date": "2026-04-21",
  "food_option_fed": "No Preferences",
  "city": "Springfield",
  "state": "Illinois",
  "special_provisions": "None",
  "retirement_system": "FERS or FERS Transfer",
  "registration_form_completed": "2026-01-13",
  "member_workshop_code": "SFG",
  "status": "registered"
}
```

**Remove a registration (cancellation):**
```json
{
  "tab": "current_registrations",
  "_action": "remove",
  "contact_id": "upbGZ25drzq5eK94rtD6"
}
```

**Add a fed employee report request:**
```json
{
  "tab": "fed_request",
  "contact_id": "rRLyNk2rj4OP9gnzgsfS",
  "first_name": "Joie",
  "last_name": "Lyerla",
  "cell_phone": "(618) 719-5930",
  "work_email": "joie.lyerla@usace.army.mil",
  "personal_email": "cjlyerla11@gmail.com",
  "home_address": "147 Independence Dr.",
  "city": "Bethalto",
  "state": "IL",
  "postal_code": "62010",
  "agency": "U.S. Army Corps of Engineers",
  "date_of_lead_request": "2026-01-22",
  "meet_for_report": "Y"
}
```

### Which HighLevel workflow fires what

All workflows use the **same webhook URL** for a given advisor. The `tab` and `_action` fields differ:

| When this happens in HighLevel... | `tab` value | `_action` |
|---|---|---|
| Contact registers for a workshop | `current_registrations` | `add` (or omit) |
| Contact cancels their registration | `current_registrations` | `remove` |
| Contact attends and requests a FedImpact report | `attended_report` | `add` (or omit) |
| Contact attended another advisor's workshop, assigned to this one | `attended_other` | `add` (or omit) |
| Fed employee directly requests a report from this advisor | `fed_request` | `add` (or omit) |
| Any contact needs to be removed from any tab | (the relevant tab) | `remove` |

---

## 12. Implementation Order

### Phase 1: Foundation
1. Plugin scaffold with activation/deactivation hooks
2. Database table creation via `dbDelta()` (3 tables)
3. REST API registration (all endpoints, stub handlers)
4. Webhook ingestion endpoint with field mapping and upsert logic

### Phase 2: Admin UI
5. Admin menu page registration
6. Admin React app — Dashboard CRUD (list, create, edit, delete)
7. Admin React app — Webhook management (generate/revoke URL, copy to clipboard, toggle active)

### Phase 3: Frontend Block
8. Gutenberg block registration with `block.json`
9. Server-side render with login/dashboard checks
10. Frontend React app — tab navigation using TAB_CONFIG
11. `ContactTable` component with sorting, search, pagination
12. Wire all tabs to the `/my-dashboard/contacts?tab=` endpoint
13. CSV export functionality

### Phase 4: Polish & Testing
14. Responsive design / mobile layout
15. Error handling and edge cases (no data, API errors, expired sessions)
16. Webhook payload validation and error logging
17. Performance testing with realistic data volumes (500+ contacts per advisor)

---

## 13. Testing Checklist

- [ ] Advisor with no dashboard sees "No dashboard configured" message
- [ ] Logged-out user sees login prompt
- [ ] Admin can create, edit, delete dashboards
- [ ] Admin can generate a webhook URL for a dashboard and copy it
- [ ] Admin can toggle webhook active/inactive
- [ ] Admin can regenerate or delete a webhook
- [ ] Webhook POST with valid key and `_action: "add"` inserts contact into the correct tab
- [ ] Webhook POST with `_action` omitted defaults to "add"
- [ ] Webhook POST with `_action: "remove"` deletes the contact from the specified tab
- [ ] Webhook POST with `_action: "remove"` for a non-existent contact returns 404
- [ ] Webhook POST without `tab` field returns 400
- [ ] Webhook POST with invalid `tab` value returns 400
- [ ] Webhook POST with invalid key returns 404
- [ ] Webhook POST with inactive key returns 403
- [ ] Duplicate `contact_id` on same tab upserts (updates, doesn't duplicate)
- [ ] Same `contact_id` on different tabs creates separate entries (correct behavior)
- [ ] Each tab shows only contacts for that tab
- [ ] Advisor A cannot see Advisor B's data under any circumstance
- [ ] Table sorting works on all columns
- [ ] Search filters by name correctly
- [ ] Pagination works with 100+ records
- [ ] CSV export downloads the correct data for the active tab
- [ ] Plugin activation creates tables without errors
- [ ] Plugin deactivation doesn't drop data
- [ ] Plugin works on PHP 8.0+ and WordPress 6.4+

---

## 14. Future Considerations (Out of Scope for v1)

- **Real-time updates:** WebSocket or SSE push when new contacts come in (currently requires page refresh).
- **Inline editing:** Let advisors update contact info or notes directly from the dashboard.
- **Email notifications:** Notify the advisor when a new contact is added.
- **Analytics/Charts:** Registration trends over time, attendance rates.
- **Field mapping UI:** Admin-configurable field mapping instead of hardcoded arrays.
- **Bulk import:** CSV upload to backfill historical data from the existing Google Sheet.
- **Audit log:** Track all webhook-received data for debugging.
- **Move contacts between tabs:** Admin action to reclassify a contact (e.g., from registered → attended).
