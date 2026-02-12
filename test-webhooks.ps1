$webhookUrl = "http://fedpunch.local/wp-json/advisor-dashboard/v1/webhook/61ff5cf27e7fd373fd3382ae4d695ea8bf23b587d5d805f279891ff8347a1259"

$contacts = @(
    # --- current_registrations (5) ---
    @{ tab="current_registrations"; contact_id="reg-001"; first_name="John"; last_name="Doe"; city="Washington"; state="DC"; agency="Department of Defense"; work_email="john.doe@dod.gov"; cell_phone="202-555-0101"; workshop_date="2026-03-15"; spouse_name="Jane Doe"; retirement_system="FERS"; time_frame_for_retirement="3-5 years" }
    @{ tab="current_registrations"; contact_id="reg-002"; first_name="Sarah"; last_name="Johnson"; city="Arlington"; state="VA"; agency="Department of State"; work_email="sarah.johnson@state.gov"; cell_phone="703-555-0102"; workshop_date="2026-03-15"; retirement_system="FERS"; time_frame_for_retirement="1-2 years" }
    @{ tab="current_registrations"; contact_id="reg-003"; first_name="Michael"; last_name="Williams"; city="Bethesda"; state="MD"; agency="NIH"; work_email="michael.williams@nih.gov"; cell_phone="301-555-0103"; workshop_date="2026-03-15"; spouse_name="Lisa Williams"; retirement_system="CSRS"; time_frame_for_retirement="Less than 1 year" }
    @{ tab="current_registrations"; contact_id="reg-004"; first_name="Emily"; last_name="Brown"; city="Alexandria"; state="VA"; agency="Department of Treasury"; work_email="emily.brown@treasury.gov"; cell_phone="571-555-0104"; workshop_date="2026-03-22"; retirement_system="FERS"; time_frame_for_retirement="5-10 years" }
    @{ tab="current_registrations"; contact_id="reg-005"; first_name="Robert"; last_name="Davis"; city="Reston"; state="VA"; agency="USGS"; work_email="robert.davis@usgs.gov"; cell_phone="703-555-0105"; workshop_date="2026-03-22"; spouse_name="Karen Davis"; retirement_system="FERS"; time_frame_for_retirement="3-5 years" }

    # --- attended_report (5) ---
    @{ tab="attended_report"; contact_id="att-001"; first_name="Patricia"; last_name="Miller"; city="Silver Spring"; state="MD"; agency="FDA"; work_email="patricia.miller@fda.gov"; cell_phone="240-555-0201"; workshop_date="2026-02-01"; meet_for_report="Yes"; training_action="Schedule appointment"; rate_material="Excellent" }
    @{ tab="attended_report"; contact_id="att-002"; first_name="James"; last_name="Wilson"; city="Falls Church"; state="VA"; agency="Department of Veterans Affairs"; work_email="james.wilson@va.gov"; cell_phone="703-555-0202"; workshop_date="2026-02-01"; meet_for_report="Yes"; training_action="Review benefits"; rate_material="Very Good" }
    @{ tab="attended_report"; contact_id="att-003"; first_name="Jennifer"; last_name="Taylor"; city="Rockville"; state="MD"; agency="NIST"; work_email="jennifer.taylor@nist.gov"; cell_phone="301-555-0203"; workshop_date="2026-01-18"; meet_for_report="Yes"; training_action="Schedule appointment"; rate_material="Excellent"; additional_comments="Very informative session" }
    @{ tab="attended_report"; contact_id="att-004"; first_name="David"; last_name="Anderson"; city="Fairfax"; state="VA"; agency="Department of Justice"; work_email="david.anderson@doj.gov"; cell_phone="571-555-0204"; workshop_date="2026-01-18"; meet_for_report="Yes"; training_action="Get spouse involved"; rate_material="Good" }
    @{ tab="attended_report"; contact_id="att-005"; first_name="Linda"; last_name="Thomas"; city="Laurel"; state="MD"; agency="NSA"; work_email="linda.thomas@nsa.gov"; cell_phone="443-555-0205"; workshop_date="2026-02-08"; meet_for_report="Yes"; training_action="Schedule appointment"; rate_material="Excellent"; tell_others="Yes" }

    # --- attended_other (5) ---
    @{ tab="attended_other"; contact_id="oth-001"; first_name="Richard"; last_name="Jackson"; city="Annapolis"; state="MD"; agency="Department of Navy"; work_email="richard.jackson@navy.mil"; cell_phone="410-555-0301"; workshop_date="2026-01-25"; member_workshop_code="ABC" }
    @{ tab="attended_other"; contact_id="oth-002"; first_name="Barbara"; last_name="White"; city="Columbia"; state="MD"; agency="SSA"; work_email="barbara.white@ssa.gov"; cell_phone="410-555-0302"; workshop_date="2026-01-25"; member_workshop_code="XYZ" }
    @{ tab="attended_other"; contact_id="oth-003"; first_name="Charles"; last_name="Harris"; city="McLean"; state="VA"; agency="CIA"; work_email="charles.harris@cia.gov"; cell_phone="703-555-0303"; workshop_date="2026-02-08"; member_workshop_code="ABC" }
    @{ tab="attended_other"; contact_id="oth-004"; first_name="Susan"; last_name="Martin"; city="Gaithersburg"; state="MD"; agency="NOAA"; work_email="susan.martin@noaa.gov"; cell_phone="301-555-0304"; workshop_date="2026-02-08"; member_workshop_code="DEF" }
    @{ tab="attended_other"; contact_id="oth-005"; first_name="Joseph"; last_name="Garcia"; city="Tysons"; state="VA"; agency="DHS"; work_email="joseph.garcia@dhs.gov"; cell_phone="571-555-0305"; workshop_date="2026-01-11"; member_workshop_code="XYZ" }

    # --- fed_request (5) ---
    @{ tab="fed_request"; contact_id="fed-001"; first_name="Margaret"; last_name="Robinson"; city="Baltimore"; state="MD"; agency="CMS"; work_email="margaret.robinson@cms.gov"; cell_phone="410-555-0401"; date_of_lead_request="2026-02-10"; retirement_system="FERS"; time_frame_for_retirement="1-2 years" }
    @{ tab="fed_request"; contact_id="fed-002"; first_name="Thomas"; last_name="Clark"; city="Herndon"; state="VA"; agency="USPS"; work_email="thomas.clark@usps.gov"; cell_phone="703-555-0402"; date_of_lead_request="2026-02-09"; retirement_system="FERS"; time_frame_for_retirement="Less than 1 year" }
    @{ tab="fed_request"; contact_id="fed-003"; first_name="Dorothy"; last_name="Lewis"; city="Bowie"; state="MD"; agency="IRS"; work_email="dorothy.lewis@irs.gov"; cell_phone="301-555-0403"; date_of_lead_request="2026-02-08"; retirement_system="CSRS"; time_frame_for_retirement="3-5 years" }
    @{ tab="fed_request"; contact_id="fed-004"; first_name="Daniel"; last_name="Lee"; city="Springfield"; state="VA"; agency="Department of Army"; work_email="daniel.lee@army.mil"; cell_phone="571-555-0404"; date_of_lead_request="2026-02-07"; retirement_system="FERS"; time_frame_for_retirement="5-10 years" }
    @{ tab="fed_request"; contact_id="fed-005"; first_name="Nancy"; last_name="Walker"; city="Germantown"; state="MD"; agency="DOE"; work_email="nancy.walker@doe.gov"; cell_phone="240-555-0405"; date_of_lead_request="2026-02-06"; retirement_system="FERS"; time_frame_for_retirement="1-2 years" }
)

$count = 0
foreach ($contact in $contacts) {
    $count++
    $json = $contact | ConvertTo-Json -Compress
    Write-Host "[$count/20] Sending $($contact.tab) - $($contact.first_name) $($contact.last_name)..."

    try {
        $response = Invoke-RestMethod -Method POST -Uri $webhookUrl -ContentType "application/json" -Body $json
        Write-Host "  OK: $($response.action) - $($response.contact_id)" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }

    Start-Sleep -Milliseconds 200
}

Write-Host "`nDone! Sent $count test contacts." -ForegroundColor Cyan
