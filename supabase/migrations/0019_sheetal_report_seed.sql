-- ============================================================================
-- Migration 0019: seed Sheetal Mercantile's published board report
--
-- Data seed, not schema. The artefact Sheetal_Board_MIS_Q1_FY2026-27.html
-- stored VERBATIM (dollar-quoted; audited figures, byte-for-byte contract)
-- into client_reports (migration 0018). Idempotent: skips if the report
-- already exists. Touches nothing belonging to any other organization.
-- ============================================================================

do $$
declare
  v_org uuid;
begin
  select id into v_org
  from public.organizations
  where name = 'Sheetal Mercantile (Private) Limited' and deleted_at is null;

  if v_org is null then
    raise notice '0019: Sheetal organization not found - seed skipped.';
    return;
  end if;

  if exists (select 1 from public.client_reports
             where organization_id = v_org
               and title = 'Board MIS Report - Q1 F.Y. 2026-27'
               and deleted_at is null) then
    raise notice '0019: Sheetal Q1 report already published - seed skipped.';
    return;
  end if;

  insert into public.client_reports (organization_id, title, period_label, html)
  values (
    v_org,
    'Board MIS Report - Q1 F.Y. 2026-27',
    '1 Apr - 30 Jun 2026',
    $report_html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sheetal Mercantile (P) Ltd — Board MIS Report, Q1 F.Y. 2026-27</title>
<style>
:root{--navy:#0F2A4A;--navy2:#17395F;--gold:#C9A227;--ink:#1B2733;--mut:#5B6B7B;
--line:#D8E0E8;--bg:#F4F7FA;--pos:#146C43;--neg:#B02A26;--band:#EAF0F7;}
*{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",Arial,Helvetica,sans-serif;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5}
header{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;padding:22px 30px 18px}
header h1{margin:0;font-size:22px;letter-spacing:.3px}
header .sub{font-size:13px;opacity:.9;margin-top:3px}
header .meta{font-size:11.5px;opacity:.72;margin-top:9px}
.goldline{height:3px;background:var(--gold)}
nav{display:flex;flex-wrap:wrap;background:#fff;border-bottom:1px solid var(--line)}
nav button{border:0;background:none;padding:12px 17px;font-size:13px;font-weight:600;color:var(--mut);cursor:pointer;border-bottom:3px solid transparent;font-family:inherit}
nav button:hover{color:var(--navy);background:#F7FAFD}
nav button.active{color:var(--navy);border-bottom-color:var(--gold)}
main{padding:22px 30px 60px;max-width:1300px;margin:0 auto}
.tab{display:none}.tab.active{display:block}
h2.sec{font-size:15px;color:var(--navy);margin:26px 0 4px;padding-bottom:6px;border-bottom:2px solid var(--line);font-weight:700}
h2.sec:first-of-type{margin-top:6px}
p.cap{font-size:11.5px;color:var(--mut);margin:0 0 9px;font-style:italic}
table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 1px 2px rgba(16,42,74,.07);margin-bottom:6px}
th,td{padding:7px 10px;text-align:right;border-bottom:1px solid var(--line);font-size:13px}
th:first-child,td:first-child{text-align:left}
thead.hdr th{background:var(--navy);color:#fff;font-weight:600;font-size:12px;border-bottom:0}
tr.colstrip th{background:var(--band);color:var(--navy);font-weight:700;font-size:11.5px}
tr.monthband td{background:var(--navy2);color:#fff;font-weight:700;font-size:12px;letter-spacing:.4px}
tr.tot td{background:#F0F4F9;font-weight:700;color:var(--navy);border-top:2px solid var(--navy)}
tr.sub td{color:var(--mut);font-size:12.5px}
tr.sub td:first-child{padding-left:26px}
tr.exp{cursor:pointer}tr.exp:hover td{background:#F7FAFD}
tr.child{display:none;background:#FBFCFE}
tr.child.show{display:table-row}
tr.child td{font-size:12.5px;color:var(--mut)}
tr.child td:first-child{padding-left:32px}
.caret{display:inline-block;width:12px;color:var(--gold);font-size:10px;transition:transform .15s}
tr.open .caret{transform:rotate(90deg)}
.pos{color:var(--pos)}.neg{color:var(--neg)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:10px 0 4px}
.kpi{background:#fff;border-left:4px solid var(--gold);padding:12px 14px;box-shadow:0 1px 2px rgba(16,42,74,.07)}
.kpi .lab{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px}
.kpi .val{font-size:21px;font-weight:700;color:var(--navy);margin:3px 0 1px;cursor:help}
.kpi .val small{font-size:12px;font-weight:600;color:var(--mut)}
.kpi .sub{font-size:11.5px;color:var(--mut)}
.obs{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:18px}
.obscard{background:#fff;border-top:3px solid var(--navy);padding:12px 14px;box-shadow:0 1px 2px rgba(16,42,74,.07)}
.obscard b{display:block;color:var(--navy);font-size:13px;margin-bottom:4px}
.obscard span{font-size:12.5px;color:var(--mut)}
.note{background:#FFF9E6;border-left:4px solid var(--gold);padding:10px 13px;font-size:12.5px;color:#5A4A18;margin:10px 0}
p.basis{font-size:11.5px;color:var(--mut);font-style:italic;margin:4px 0 0;cursor:help}
.split2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:900px){.split2{grid-template-columns:1fr}main{padding:16px 12px 50px}}
#tt{position:fixed;display:none;background:var(--navy);color:#fff;padding:8px 11px;border-radius:4px;
font-size:12px;max-width:320px;z-index:99;box-shadow:0 4px 14px rgba(0,0,0,.28);pointer-events:none;line-height:1.45}
</style></head><body>
<div id="tt"></div>
<header>
  <h1>Sheetal Mercantile (Private) Limited</h1>
  <div class="sub">Board MIS Report &nbsp;·&nbsp; Quarter 1, F.Y. 2026-27 (1 April – 30 June 2026)</div>
  <div class="meta">58/1, 2 &amp; 5, Site IV, Sahibabad Industrial Area, Ghaziabad (U.P.) &nbsp;·&nbsp; CIN U74899DL1992PTC048588<br>
  Prepared by CFOxpert Advisory &nbsp;·&nbsp; Trading-basis Gross Profit &nbsp;·&nbsp; Amounts in ₹ Crore unless stated</div>
</header>
<div class="goldline"></div>
<nav id="nav"></nav>
<main>

<section class="tab active" id="overview">
  <h2 class="sec">Board Snapshot — Q1 F.Y. 2026-27</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; quarter ended 30 June 2026, after the June entries and the depreciation charge</p>
  <div class="kpis" id="kpi-overview"></div>

  <h2 class="sec">Trading, Profit &amp; Loss — Summary</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; quarter actual, full-year projection and prior year on a consistent basis</p>
  <table id="tbl-summary"></table>
  <p class="basis" data-tip="All three columns carry a depreciation charge, so Net Profit is comparable across them. Tax is shown separately as it is not provided in the interim books.">Net Profit is stated before tax, consistent across all three columns.</p>

  <h2 class="sec">Month-wise Trend — F.Y. 2026-27</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; stated before depreciation, which is charged at the quarter level</p>
  <table id="tbl-month"></table>

  <h2 class="sec">Working Capital — Position vs 31 March 2026</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-wc"></table>
  <div class="obs" id="obs-overview"></div>
</section>

<section class="tab" id="revenue">
  <h2 class="sec">Revenue Analysis — Market &amp; Currency</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <div class="note">The company operates as a single entity, so revenue is analysed by the split that drives the business — <b>market (export vs domestic)</b> and <b>currency of realisation</b>. This is the basis on which foreign-exchange exposure and export-incentive entitlements arise.</div>
  <div class="kpis" id="kpi-revenue"></div>

  <h2 class="sec">Export vs Domestic — Quarter, Projection &amp; Prior Year</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-mktsplit"></table>

  <h2 class="sec">Revenue by Currency — Q1</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-revmix"></table>

  <h2 class="sec">Month-wise Export vs Domestic</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-revseg"></table>
  <div class="obs" id="obs-revenue"></div>
</section>

<section class="tab" id="pnl">
  <h2 class="sec">Trading, Profit &amp; Loss Account</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; Click ▸ to expand any line into its full schedule</p>
  <table id="tbl-pnl"></table>
  <p class="basis" data-tip="Gross Profit is struck on the trading basis: revenue less material consumed (opening stock plus purchases less closing stock) less direct expenses.">Trading basis: Gross Profit is revenue less material consumed less direct expenses.</p>

  <h2 class="sec">Adjustments Posted in the Quarter</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; bridge from the accounting system to the reported result</p>
  <table id="tbl-adj"></table>
  <div class="obs" id="obs-pnl"></div>
</section>

<section class="tab" id="bs">
  <h2 class="sec">Balance Sheet — as at 30 June 2026</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; Click ▸ to expand · comparative against 31 March 2026</p>
  <div class="split2">
    <div><table id="tbl-bs-liab"></table></div>
    <div><table id="tbl-bs-asset"></table></div>
  </div>
  <p class="basis" data-tip="The balance sheet drawn from the accounting system precedes the June entries and the depreciation charge; both have been carried into the 30 June column so that it agrees with the reported profit.">The 30 June column carries the June entries (as accrued expenses) and the depreciation charge, so it agrees with the reported profit.</p>

  <h2 class="sec">Movement — 31 March 2026 → 30 June 2026</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-bsmove"></table>
  <div class="note">Total borrowings are analysed facility-by-facility, with movement and cost, in the dedicated <b>Borrowings</b> tab.</div>
  <div class="obs" id="obs-bs"></div>
</section>

<section class="tab" id="loans">
  <h2 class="sec">Borrowings — Structure &amp; Cost</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; as at 30 June 2026</p>
  <div class="kpis" id="kpi-loans"></div>

  <h2 class="sec">Composition of Debt</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; ties to the Balance Sheet</p>
  <table id="tbl-loancomp"></table>

  <h2 class="sec">Facility-wise Position &amp; Movement</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; 1 April 2026 → 30 June 2026</p>
  <table id="tbl-loans"></table>
  <div class="obs" id="obs-loans"></div>
</section>

<section class="tab" id="inv">
  <h2 class="sec">Inventory — Category-wise</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-stock"></table>

  <h2 class="sec">Material Consumed</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; opening stock plus purchases less closing stock</p>
  <table id="tbl-consume"></table>
  <div class="note">Inventory is analysed by <b>category and value</b> — the basis on which this business is managed, and on which stock ties to the Balance Sheet and to Gross Profit.</div>
  <div class="obs" id="obs-inv"></div>
</section>

<section class="tab" id="proj">
  <h2 class="sec">Projected Trading, Profit &amp; Loss — Year to 31 March 2027</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; Click ▸ to expand · turnover and depreciation as estimated by the company</p>
  <table id="tbl-proj"></table>

  <h2 class="sec">Implied Position — Remaining Nine Months</h2>
  <p class="cap">(Rs. in Cr.) &nbsp;·&nbsp; the projection less the quarter already reported</p>
  <table id="tbl-roy"></table>

  <h2 class="sec">What Changes Against Last Year</h2>
  <p class="cap">(Rs. in Cr.)</p>
  <table id="tbl-bridge"></table>

  <h2 class="sec">Basis of Projection</h2>
  <table id="tbl-assump"></table>
  <div class="obs" id="obs-proj"></div>
</section>

</main>
<script>
const D = {"ratio_note":{"gpm_stated":26.32,"gpm_correct":25.86,"npm_stated":4.47,"npm_correct":4.39},"cols":["30 Jun 2026 (Q1 Actual)","Projected 31 Mar 2027","31 Mar 2026 (Actual)"],"head":{"sales":[57.66,175.0,171.9],"export":[54.91,161.42,158.56],"domestic":[2.75,13.58,13.35],"opening":[23.19,23.19,30.27],"purchases":[42.53,101.5,91.86],"closing":[29.15,24.0,23.19],"consumption":[36.58,100.69,98.94],"direct":[6.94,29.06,27.27],"gp":[14.14,45.25,45.7],"gpm_stated":[24.53,26.32,26.59],"oi":[1.37,5.34,5.26],"indirect":[10.1,42.9,39.77],"np":[5.42,7.69,11.19],"dep":[2.25,9.0,8.07],"gpm":[24.52,25.86,26.59],"npm":[9.4,4.39,6.51],"npm_stated":[9.4,4.47,6.51],"npbd":[7.67,16.69,19.26],"tax":[1.36,1.94,2.82],"pat":[4.06,5.75,8.37]},"months":{"Apr-26":{"rev":12.48,"gp":0.3,"oi":0.11,"ie":1.99,"np":-1.59,"gpm":2.4,"npm":-12.7},"May-26":{"rev":21.11,"gp":5.0,"oi":0.6,"ie":2.38,"np":3.22,"gpm":23.7,"npm":15.2},"Jun-26":{"rev":24.08,"gp":8.85,"oi":0.66,"ie":3.47,"np":6.04,"gpm":36.8,"npm":25.1},"Q1":{"rev":57.66,"gp":14.14,"oi":1.37,"ie":7.85,"np":7.67,"gpm":24.52,"npm":13.3}},"rev_mix":{"Export \u2014 USD":39.5,"Export \u2014 EUR":8.59,"Export \u2014 GBP":6.76,"Domestic \u2014 Local Sales":1.58,"Domestic \u2014 Central Sales":1.01,"Domestic \u2014 Scrap":0.14,"Export \u2014 SEZ":0.06,"Domestic \u2014 Bardana / Other":0.02},"rev_seg":{"Apr-26":[0.0,0.0,0.0],"May-26":[0.0,0.0,0.0],"Jun-26":[0.0,0.0,0.0],"Q1":[0.0,0.0,0.0]},"direct":[{"lab":"Art & Design A/c","q1":0.96,"proj":1.97,"py":1.93,"adj":0.0,"pct":1.12},{"lab":"Bonus A/c","q1":-0.0,"proj":0.31,"py":0.31,"adj":0.0},{"lab":"Commission  on  Export","q1":0.16,"proj":3.11,"py":3.06,"adj":0.0,"pct":1.93},{"lab":"Consumable Store","q1":0.27,"proj":1.17,"py":1.15,"adj":0.0,"pct":0.67},{"lab":"Design Development Charges","q1":0.0,"proj":0.22,"py":0.22,"adj":0.0},{"lab":"Electricity  & Power Expenses","q1":1.17,"proj":4.69,"py":3.66,"adj":0.43},{"lab":"Employer Contribution of P F A/c","q1":0.16,"proj":0.62,"py":0.64,"adj":0.0},{"lab":"Employers Contribution of Esic A/c","q1":0.03,"proj":0.13,"py":0.13,"adj":0.0},{"lab":"Freight & Cartage (Inward)","q1":0.03,"proj":0.26,"py":0.24,"adj":0.0,"pct":0.26},{"lab":"Fuel & Oil ,Gas  A/c","q1":0.83,"proj":2.34,"py":2.3,"adj":0.11,"pct":1.34},{"lab":"Gratuity A/c","q1":0.0,"proj":0.13,"py":0.13,"adj":0.0},{"lab":"Leave-Encashment","q1":0.0,"proj":0.15,"py":0.15,"adj":0.0},{"lab":"Repair & Maintance Rubber Roller A/c","q1":0.94,"proj":3.05,"py":2.99,"adj":0.0,"pct":1.74},{"lab":"Retro Discount on Export Sales","q1":0.03,"proj":1.44,"py":1.42,"adj":0.0,"pct":0.89},{"lab":"Loading and unloading Charges","q1":0.03,"proj":0.13,"py":0.0,"adj":0.0},{"lab":"Wages A/c","q1":2.33,"proj":9.34,"py":8.94,"adj":0.2}],"indirect":[{"lab":"Advertiesment & Publicity A/c","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Audit Fees","q1":0.0,"proj":0.03,"py":0.03,"adj":0.0},{"lab":"Bank Charges A/c","q1":0.06,"proj":0.23,"py":0.11,"adj":0.0},{"lab":"Bonus to Staff","q1":0.0,"proj":0.02,"py":0.02,"adj":0.0},{"lab":"Business Pramotion A/c","q1":0.29,"proj":2.5,"py":2.69,"adj":0.0},{"lab":"Cctv Camera  Fitting & Repair/Maintenence","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Conveyance Expenses","q1":0.0,"proj":0.01,"py":0.01,"adj":0.0},{"lab":"CSR Expenses","q1":0.03,"proj":0.14,"py":0.01,"adj":0.0},{"lab":"Depriciation A/c","q1":2.25,"proj":9.0,"py":8.07,"adj":0.0},{"lab":"Director Remuneration A/c","q1":1.5,"proj":6.0,"py":6.0,"adj":0.0},{"lab":"Discount on Sales - Exports","q1":0.01,"proj":0.34,"py":0.34,"adj":0.0,"pct":0.21},{"lab":"Diwali Expense/Pooja Festival","q1":0.0,"proj":0.03,"py":0.03,"adj":0.0},{"lab":"Donation A/c","q1":0.03,"proj":0.09,"py":0.09,"adj":0.0},{"lab":"Employer's Contribution to EPF (Staff)","q1":0.01,"proj":0.04,"py":0.05,"adj":0.0},{"lab":"Employer's Contribution to ESIC (Staff)","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Fees & Taxes","q1":0.0,"proj":0.02,"py":0.02,"adj":0.0},{"lab":"Freight & Cartage (Outward)","q1":2.54,"proj":10.3,"py":9.72,"adj":0.0,"pct":5.64},{"lab":"Gratuity to Staffs","q1":0.0,"proj":0.06,"py":0.06,"adj":0.0},{"lab":"Foreclosure  Interest on Vehicle Loan","q1":0.06,"proj":0.06,"py":0.0,"adj":0.0},{"lab":"Commission on Property Purchase","q1":0.11,"proj":0.11,"py":0.0,"adj":0.0},{"lab":"Housekeeping Charges A/c","q1":0.08,"proj":0.34,"py":0.32,"adj":0.0},{"lab":"Insurance Premium A/c","q1":0.01,"proj":0.2,"py":0.2,"adj":0.0},{"lab":"Interest on ODCC A/c","q1":0.48,"proj":1.91,"py":1.12,"adj":0.0},{"lab":"Interest on PCFC A/c","q1":0.23,"proj":0.5,"py":0.32,"adj":0.0},{"lab":"Interest on TDS Late Deposit","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Interest on Term Loan A/c","q1":0.11,"proj":0.45,"py":0.43,"adj":0.0},{"lab":"Interest on Un/Secured Loan","q1":0.14,"proj":0.55,"py":0.73,"adj":0.14},{"lab":"Interest on Vehicle Loan","q1":0.03,"proj":0.11,"py":0.26,"adj":0.0},{"lab":"Internet Lease Charges A/c","q1":0.0,"proj":0.0,"py":0.02,"adj":0.0},{"lab":"Interest on Fed Bank Term Loan Plot B-19, 0143","q1":0.2,"proj":1.18,"py":0.12,"adj":0.0},{"lab":"Keyman Tata Insurance","q1":0.0,"proj":0.1,"py":0.1,"adj":0.0},{"lab":"Lease Rent & Mantinance Exp A/c","q1":0.0,"proj":0.01,"py":0.0,"adj":0.0},{"lab":"Leave-Encashment to Staff","q1":0.0,"proj":0.01,"py":0.01,"adj":0.0},{"lab":"Loan  Processing Charges A/c","q1":0.07,"proj":0.07,"py":0.27,"adj":0.0},{"lab":"Membership & Subscription A/c","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Misc. Expenses","q1":0.0,"proj":0.01,"py":0.01,"adj":0.0},{"lab":"Office Maintance A/c","q1":0.06,"proj":0.22,"py":0.23,"adj":0.0},{"lab":"Performance Incentive","q1":0.44,"proj":1.29,"py":1.27,"adj":0.44},{"lab":"Postage & Telegrame","q1":0.03,"proj":0.11,"py":0.26,"adj":0.0},{"lab":"Printing & Stationery A/c","q1":0.01,"proj":0.02,"py":0.05,"adj":0.0},{"lab":"Professional & Legal Exp.","q1":0.06,"proj":2.22,"py":2.22,"adj":0.0},{"lab":"Property Tax","q1":0.08,"proj":0.08,"py":0.08,"adj":0.0},{"lab":"Rates & Taxes A/c","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Rent","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Repair & Maintance","q1":0.17,"proj":0.66,"py":0.66,"adj":0.0},{"lab":"Roc Fees A/c","q1":0.0,"proj":0.0,"py":0.0,"adj":0.0},{"lab":"Salary &  Allowance A/c","q1":0.29,"proj":1.17,"py":1.15,"adj":0.0},{"lab":"Security Charges A/c","q1":0.11,"proj":0.42,"py":0.51,"adj":0.0},{"lab":"Software renewal charges","q1":0.0,"proj":0.0,"py":0.01,"adj":0.0},{"lab":"Staff Welfare A/c","q1":0.16,"proj":0.62,"py":0.5,"adj":0.0},{"lab":"Technical Service","q1":0.0,"proj":0.09,"py":0.09,"adj":0.0},{"lab":"Telephone Exp A/c","q1":0.01,"proj":0.03,"py":0.03,"adj":0.0},{"lab":"Travelling Expenses A/c","q1":0.4,"proj":1.39,"py":1.39,"adj":0.0},{"lab":"Vehicle & Running Expense","q1":0.04,"proj":0.14,"py":0.14,"adj":0.0},{"lab":"GST Expenses A/c","q1":0.0,"proj":0.02,"py":0.02,"adj":0.0}],"oi":[{"lab":"Duty Draw Back A/c","q1":0.66,"proj":1.95,"py":1.92},{"lab":"Exchange Fluctuation A/c","q1":0.3,"proj":1.22,"py":1.37},{"lab":"Interest on Electricity Security A/c","q1":0.0,"proj":0.02,"py":0.02},{"lab":"Interest  on FDR","q1":0.0,"proj":0.02,"py":0.02},{"lab":"Profit and Loss on Sale of Fixed Assests","q1":0.0,"proj":0.0,"py":0.03},{"lab":"Sale RoDTEP Duty Credit Scrip","q1":0.21,"proj":1.73,"py":1.7},{"lab":"Shortage & Excess A/c","q1":0.0,"proj":0.0,"py":0.0},{"lab":"Subention on Freigt for Exports ICD/CFS","q1":0.0,"proj":0.2,"py":0.2},{"lab":"Sundry Debit/ Credit Balance W/off","q1":0.0,"proj":0.0,"py":0.0},{"lab":"UP Goverment  Export Incentive","q1":0.2,"proj":0.2,"py":0.0}],"adj":[{"lab":"Electricity  & Power Expenses","amt":0.43,"where":"Direct"},{"lab":"Fuel & Oil ,Gas  A/c","amt":0.11,"where":"Direct"},{"lab":"Wages A/c","amt":0.2,"where":"Direct"},{"lab":"Interest on Un/Secured Loan","amt":0.14,"where":"Indirect"},{"lab":"Performance Incentive","amt":0.44,"where":"Indirect"}],"adj_total":1.31,"adj_dir":0.74,"adj_ind":0.58,"stock":{"heads":["Raw Material","Packing Material","Finished Goods","Fuel & Oil","Biomass Briquette","WIP"],"30-Jun-26":[27.09,1.3,0.61,0.13,0.02,0.0],"31-Mar-26":[18.96,1.33,2.72,0.14,0.02,0.02],"proj_total":24.0,"totals":{"30-Jun-26":29.15,"31-Mar-26":23.19}},"bs":{"cols":["30 Jun 2026","31 Mar 2026"],"liab":{"Borrowings":[[101.35,77.6],{"Bank OD / Cash Credit":[32.77,21.5],"Secured Loans (term, PCFC & vehicle)":[61.69,49.18],"Unsecured Loans":[6.9,6.92]}],"Current Liabilities":[[19.29,8.16],{"Sundry Creditors":[18.04,8.46],"Provisions":[2.49,2.49],"Statutory dues (net receivable)":[-3.29,-3.86],"Salary & wages payable":[0.69,0.66],"Accrued expenses (June entries)":[1.31,0.0],"Other payables":[0.04,0.4]}],"Branch / Divisions (control)":[[53.19,53.19],null],"Reserves & Surplus (P&L A/c)":[[24.66,19.24],{"Opening Balance":[19.24,0.0],"Add: Profit for the period (before tax)":[5.42,19.24]}]},"asset":{"Fixed Assets":[[117.91,86.54],null],"Investments":[[0.38,0.38],{"FDR & accrued interest":[0.31,0.3],"Share Investment":[0.07,0.07]}],"Current Assets":[[80.21,71.27],{"Closing Stock":[29.15,23.19],"Sundry Debtors":[36.02,8.12],"Advances Recoverable":[4.73,36.69],"IGST Receivable (Exports)":[4.51,0.99],"Bank & Cash":[4.56,0.07],"Deposits":[0.72,0.72],"Loans & Advances":[0.31,0.27],"Duty drawback receivable":[0.21,0.09],"Goods in transit":[0.0,1.13]}]},"liab_total":[198.49,158.19],"asset_total":[198.5,158.19]},"bs_move":{"Fixed Assets":[86.54,117.91],"Closing Stock":[23.19,29.15],"Total Borrowings":[77.6,101.35],"Sundry Debtors":[8.12,36.02],"Current Liabilities":[8.16,19.29],"Reserves (P&L)":[19.24,24.66]},"wc":{"Sundry Debtors (receivables)":[8.12,36.02],"Inventory (closing stock)":[23.19,29.15],"Sundry Creditors (trade payables)":[8.46,18.04],"Cash & Bank balances":[0.07,4.56]},"borrow":{"od":[["Federal Bank ODCC",18.01,29.02],["Deutsche Bank OD",3.49,3.74]],"od_open":21.5,"od_total":32.77,"secured_open":49.18,"secured_total":61.69,"unsecured_open":6.92,"unsecured_total":6.9,"total":101.35,"total_open":77.6,"facilities":[["Term Loan \u2014 Plot B-19 (EUR)","Term",25.11,24.1],["Packing Credit (PCFC)","Working capital",6.5,17.14],["Machinery Term Loan \u2014 Moller (EUR)","Term",6.0,5.62],["Jan Samarth ECLGS 5.0 (INR)","Term",0.0,4.53],["Machinery Term Loan 135 (EUR)","Term",4.2,4.03],["Machinery Term Loan (EUR)","Term",3.35,2.94],["Vehicle Loans","Vehicle",2.61,2.55],["Term Loan \u2014 Plot 58/1 (EUR)","Term",1.42,0.78]],"fin_q1":1.37,"fin_proj":5.07},"tax_rate":0.25168,"books_np":8.98,"perf_rate":0.008};
const H = D.head, C = D.cols;
function f2(v){ if(v===null||v===undefined||v==='') return '';
  if(typeof v!=='number') return v;
  const s=Math.abs(v).toFixed(2); return v<0?'('+s+')':s; }
function cls(v){ return (typeof v==='number')?(v<0?'neg':(v>0?'pos':'')):''; }
function pct(a,b){ return b?(a/b*100):0; }
function mov(a,b){ return {d:+(b-a).toFixed(2), p:a?((b-a)/Math.abs(a)*100):0}; }
function kpi(list,id){ document.getElementById(id).innerHTML=list.map(c=>
 `<div class="kpi"><div class="lab">${c.lab}</div><div class="val" data-tip="${c.tip}">${typeof c.val==='number'?f2(c.val):c.val} <small>${c.unit||'Cr'}</small></div><div class="sub">${c.sub}</div></div>`).join(''); }
const K=['q1','proj','py'];

/* ---------- OVERVIEW ---------- */
(function(){
 kpi([
  {lab:'Revenue',val:H.sales[0],sub:'quarter turnover',tip:'Net sales for 1 Apr – 30 Jun 2026; about 95% export.'},
  {lab:'Gross Profit',val:H.gp[0],sub:H.gpm[0]+'% margin · trading basis',tip:'Revenue less material consumed less direct expenses.'},
  {lab:'Net Profit (before Tax)',val:H.np[0],sub:H.npm[0]+'% margin · after depreciation',tip:'After the June entries and a depreciation charge of ₹'+f2(H.dep[0])+' Cr.'},
  {lab:'Closing Stock',val:H.closing[0],sub:'inventory at 30 Jun 2026',tip:'Ties to the Balance Sheet and to the Gross Profit computation.'}
 ],'kpi-overview');

 const rows=[['Revenue','sales','tot'],['Gross Profit','gp',''],['Gross Margin %','gpm','pctrow'],
  ['Add: Other Income','oi',''],['Less: Indirect Expenses (excl. depreciation)','ie_x',''],
  ['Profit before Depreciation &amp; Tax','npbd','tot'],['Less: Depreciation','dep',''],
  ['Net Profit (before Tax)','np','tot'],['Net Margin %','npm','pctrow'],
  ['Less: Tax @ '+(D.tax_rate*100).toFixed(3)+'%','tax',''],['Profit After Tax','pat','tot']];
 let h=`<thead class="hdr"><tr><th>Particulars</th>${C.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
 rows.forEach(r=>{
  h+=`<tr class="${r[2]==='pctrow'?'sub':r[2]}"><td>${r[0]}</td>`+
   K.map((k,i)=>{
     let v = r[1]==='ie_x' ? +(H.indirect[i]-H.dep[i]).toFixed(2) : H[r[1]][i];
     return r[2]==='pctrow' ? `<td>${v}%</td>` : `<td class="${cls(v)}">${f2(v)}</td>`;
   }).join('')+'</tr>';});
 h+='</tbody>'; document.getElementById('tbl-summary').innerHTML=h;

 const M=D.months, order=['Apr-26','May-26','Jun-26','Q1'];
 let t=`<thead class="hdr"><tr><th>Month</th><th>Revenue</th><th>Gross Profit</th><th>GP %</th><th>Profit before Dep. &amp; Tax</th><th>%</th></tr></thead><tbody>`;
 order.forEach(m=>{const p=M[m],q=(m==='Q1');
  t+=`<tr class="${q?'tot':''}"><td>${q?'Q1 F.Y. 2026-27':m}</td><td>${f2(p.rev)}</td><td class="${cls(p.gp)}">${f2(p.gp)}</td><td>${p.gpm.toFixed(1)}%</td><td class="${cls(p.np)}">${f2(p.np)}</td><td class="${cls(p.np)}">${p.npm.toFixed(1)}%</td></tr>`;});
 t+='</tbody>'; document.getElementById('tbl-month').innerHTML=t;

 const TIP={'Sundry Debtors (receivables)':'Export receivables built up as quarter sales were billed but not yet collected.',
  'Inventory (closing stock)':'Raw-material stock built ahead of production.',
  'Sundry Creditors (trade payables)':'Trade credit rose with higher procurement.',
  'Cash & Bank balances':'Liquidity higher at quarter-end than the near-swept opening position.'};
 let w=`<thead class="hdr"><tr><th>Item</th><th>31 Mar 2026</th><th>30 Jun 2026</th><th>Change</th><th>%</th></tr></thead><tbody>`;
 let o0=0,o1=0;
 Object.entries(D.wc).forEach(([k,v])=>{const m=mov(v[0],v[1]);
  const sign=k.indexOf('Creditors')>-1?-1:1;
  if(k.indexOf('Cash')<0){o0+=sign*v[0];o1+=sign*v[1];}
  w+=`<tr><td data-tip="${TIP[k]||''}">${k}</td><td>${f2(v[0])}</td><td>${f2(v[1])}</td><td class="${cls(m.d)}">${f2(m.d)}</td><td class="${cls(m.d)}">${m.p.toFixed(1)}%</td></tr>`;});
 o0=+o0.toFixed(2);o1=+o1.toFixed(2);const mw=mov(o0,o1);
 w+=`<tr class="tot"><td data-tip="Debtors + Inventory − Creditors: the cash the trading cycle ties up.">Net Working Capital</td><td>${f2(o0)}</td><td>${f2(o1)}</td><td class="${cls(mw.d)}">${f2(mw.d)}</td><td class="${cls(mw.d)}">${mw.p.toFixed(1)}%</td></tr></tbody>`;
 document.getElementById('tbl-wc').innerHTML=w;

 const dr=D.wc['Sundry Debtors (receivables)'];
 document.getElementById('obs-overview').innerHTML=[
  ['Quarter closed at ₹'+f2(H.np[0])+' Cr profit before tax','Revenue of ₹'+f2(H.sales[0])+' Cr produced a trading margin of '+H.gpm[0]+'% and, after a depreciation charge of ₹'+f2(H.dep[0])+' Cr, a net profit of ₹'+f2(H.np[0])+' Cr — a '+H.npm[0]+'% net margin.'],
  ['Margin is below the prior year','The quarter\u2019s trading margin of '+H.gpm[0]+'% compares with '+H.gpm[2]+'% for F.Y. 2025-26. The full-year projection assumes recovery to '+H.gpm[1]+'%.'],
  ['Export concentration','About '+pct(H.export[0],H.sales[0]).toFixed(0)+'% of revenue is export, realised mainly in USD, EUR and GBP; export incentives and exchange movement contribute ₹'+f2(H.oi[0])+' Cr of other income.'],
  ['Growth tied up working capital','Net working capital rose from ₹'+f2(o0)+' Cr to ₹'+f2(o1)+' Cr, chiefly a ₹'+f2(+(dr[1]-dr[0]).toFixed(2))+' Cr increase in export receivables — the cash cost of scaling, funded by borrowings and trade credit.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- REVENUE ---------- */
(function(){
 const inc=D.oi.filter(x=>x.lab.indexOf('Exchange')<0).reduce((a,x)=>a+x.q1,0);
 kpi([
  {lab:'Export Revenue',val:H.export[0],sub:pct(H.export[0],H.sales[0]).toFixed(1)+'% of turnover',tip:'USD, EUR, GBP and SEZ sales combined.'},
  {lab:'Domestic Revenue',val:H.domestic[0],sub:pct(H.domestic[0],H.sales[0]).toFixed(1)+'% of turnover',tip:'Central, local, bardana and scrap sales.'},
  {lab:'Export Incentives',val:+inc.toFixed(2),sub:'drawback, RoDTEP & State incentive',tip:'Included within Other Income; excludes exchange fluctuation.'}
 ],'kpi-revenue');

 let s=`<thead class="hdr"><tr><th>Market</th>${C.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
 [['Export','export'],['Domestic','domestic']].forEach(r=>{
   s+=`<tr><td>${r[0]}</td>${K.map((k,i)=>`<td>${f2(H[r[1]][i])}</td>`).join('')}</tr>`;});
 s+=`<tr class="sub"><td>Export as % of turnover</td>${K.map((k,i)=>`<td>${pct(H.export[i],H.sales[i]).toFixed(1)}%</td>`).join('')}</tr>`;
 s+=`<tr class="tot"><td>Total Revenue</td>${K.map((k,i)=>`<td>${f2(H.sales[i])}</td>`).join('')}</tr></tbody>`;
 document.getElementById('tbl-mktsplit').innerHTML=s;

 let h=`<thead class="hdr"><tr><th>Revenue Stream</th><th>Q1 (₹ Cr)</th><th>% of Total</th></tr></thead><tbody>`;
 Object.entries(D.rev_mix).forEach(([k,v])=>{h+=`<tr><td>${k}</td><td>${f2(v)}</td><td>${pct(v,H.sales[0]).toFixed(1)}%</td></tr>`;});
 h+=`<tr class="tot"><td>Total Revenue</td><td>${f2(H.sales[0])}</td><td>100.0%</td></tr></tbody>`;
 document.getElementById('tbl-revmix').innerHTML=h;

 let t=`<thead class="hdr"><tr><th>Month</th><th>Total</th><th>Export</th><th>Domestic</th><th>Export %</th></tr></thead><tbody>`;
 Object.entries(D.rev_seg).forEach(([m,v])=>{const q=(m==='Q1');
  t+=`<tr class="${q?'tot':''}"><td>${q?'Q1 F.Y. 2026-27':m}</td><td>${f2(v[0])}</td><td>${f2(v[1])}</td><td>${f2(v[2])}</td><td>${pct(v[1],v[0]).toFixed(1)}%</td></tr>`;});
 t+='</tbody>'; document.getElementById('tbl-revseg').innerHTML=t;

 const usd=D.rev_mix['Export — USD']||0;
 document.getElementById('obs-revenue').innerHTML=[
  ['Structurally an export house','Export sales of ₹'+f2(H.export[0])+' Cr are '+pct(H.export[0],H.sales[0]).toFixed(0)+'% of turnover; domestic activity is limited to central sales, local supply and scrap.'],
  ['USD is the dominant exposure','US-dollar realisation of ₹'+f2(usd)+' Cr is about '+pct(usd,H.export[0]).toFixed(0)+'% of export turnover, making the USD rate the single largest revenue sensitivity.'],
  ['Incentives depend on scheme continuity','Duty drawback, RoDTEP and the State export incentive contribute ₹'+f2(+inc.toFixed(2))+' Cr in the quarter — earnings that rest on policy rather than trading margin.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- P&L (shared builder) ---------- */
function statement(el, showAdj){
 const A=showAdj;
 let h=`<thead class="hdr"><tr><th>Particulars</th>${A?'<th>Adjustment</th>':''}${C.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
 const cells=arr=>K.map((k,i)=>`<td class="${cls(arr[i])}">${f2(arr[i])}</td>`).join('');
 const blank=A?'<td></td>':'';
 h+=`<tr class="exp" data-k="rev"><td><span class="caret">▸</span> Revenue</td>${blank}${cells(H.sales)}</tr>`;
 [['Export','export'],['Domestic','domestic']].forEach(r=>{
  h+=`<tr class="child" data-p="rev"><td>${r[0]}</td>${blank}${cells(H[r[1]])}</tr>`;});
 h+=`<tr><td>Add: Closing Stock</td>${blank}${cells(H.closing)}</tr>`;
 h+=`<tr><td>Less: Opening Stock</td>${blank}${cells(H.opening)}</tr>`;
 h+=`<tr><td>Less: Purchases</td>${blank}${cells(H.purchases)}</tr>`;
 h+=`<tr class="sub"><td data-tip="Opening stock plus purchases less closing stock.">= Material Consumed</td>${blank}${cells(H.consumption)}</tr>`;
 h+=`<tr class="exp" data-k="de"><td><span class="caret">▸</span> Less: Direct Expenses</td>${blank}${cells(H.direct)}</tr>`;
 D.direct.forEach(x=>{
  h+=`<tr class="child" data-p="de"><td>${x.lab}</td>${A?`<td>${x.adj?f2(x.adj):''}</td>`:''}<td>${f2(x.q1)}</td><td>${f2(x.proj)}</td><td>${f2(x.py)}</td></tr>`;});
 h+=`<tr class="tot"><td>Gross Profit</td>${blank}${cells(H.gp)}</tr>`;
 h+=`<tr class="sub"><td>Gross Margin %</td>${blank}${K.map((k,i)=>`<td>${H.gpm[i]}%</td>`).join('')}</tr>`;
 h+=`<tr class="exp" data-k="oi"><td><span class="caret">▸</span> Add: Other Income</td>${blank}${cells(H.oi)}</tr>`;
 D.oi.forEach(x=>{
  h+=`<tr class="child" data-p="oi"><td>${x.lab}</td>${blank}<td>${f2(x.q1)}</td><td>${f2(x.proj)}</td><td>${f2(x.py)}</td></tr>`;});
 const iex=K.map((k,i)=>+(H.indirect[i]-H.dep[i]).toFixed(2));
 h+=`<tr class="exp" data-k="ie"><td><span class="caret">▸</span> Less: Indirect Expenses (excl. depreciation)</td>${blank}${cells(iex)}</tr>`;
 D.indirect.filter(x=>x.lab.indexOf('Depriciation')<0).forEach(x=>{
  h+=`<tr class="child" data-p="ie"><td>${x.lab}</td>${A?`<td>${x.adj?f2(x.adj):''}</td>`:''}<td>${f2(x.q1)}</td><td>${f2(x.proj)}</td><td>${f2(x.py)}</td></tr>`;});
 h+=`<tr class="tot"><td>Profit before Depreciation &amp; Tax</td>${blank}${cells(H.npbd)}</tr>`;
 h+=`<tr><td data-tip="Charge as estimated by the company.">Less: Depreciation</td>${blank}${cells(H.dep)}</tr>`;
 h+=`<tr class="tot"><td>Net Profit (before Tax)</td>${blank}${cells(H.np)}</tr>`;
 h+=`<tr class="sub"><td>Net Margin %</td>${blank}${K.map((k,i)=>`<td>${H.npm[i]}%</td>`).join('')}</tr>`;
 h+=`<tr><td data-tip="At the rate used in the company's own advance-tax computation. Not provided in the interim books.">Less: Tax @ ${(D.tax_rate*100).toFixed(3)}%</td>${blank}${cells(H.tax)}</tr>`;
 h+=`<tr class="tot"><td>Profit After Tax</td>${blank}${cells(H.pat)}</tr>`;
 h+='</tbody>'; document.getElementById(el).innerHTML=h;
}
statement('tbl-pnl',true);
statement('tbl-proj',false);

(function(){
 let b=`<thead class="hdr"><tr><th>Particulars</th><th>₹ Cr</th><th>Where charged</th></tr></thead><tbody>`;
 b+=`<tr><td>Profit before Depreciation &amp; Tax — as per the accounting system</td><td>${f2(D.books_np)}</td><td style="text-align:left;color:#5b6b7b;font-size:12px">Per Tally, 1 Apr – 30 Jun 2026</td></tr>`;
 b+=`<tr class="monthband"><td colspan="3">ENTRIES POSTED IN JUNE 2026</td></tr>`;
 b+=`<tr class="colstrip"><th>Particulars</th><th>₹ Cr</th><th style="text-align:left">Where charged</th></tr>`;
 D.adj.forEach(a=>{b+=`<tr><td>Less: ${a.lab}</td><td class="neg">${f2(-a.amt)}</td><td style="text-align:left;color:#5b6b7b;font-size:12px">${a.where} expenses</td></tr>`;});
 b+=`<tr class="tot"><td>Profit before Depreciation &amp; Tax — adjusted</td><td>${f2(H.npbd[0])}</td><td></td></tr>`;
 b+=`<tr><td>Less: Depreciation for the quarter</td><td class="neg">${f2(-H.dep[0])}</td><td style="text-align:left;color:#5b6b7b;font-size:12px">As estimated by the company</td></tr>`;
 b+=`<tr class="tot"><td>Net Profit (before Tax)</td><td>${f2(H.np[0])}</td><td></td></tr>`;
 b+=`<tr><td>Less: Tax @ ${(D.tax_rate*100).toFixed(3)}%</td><td class="neg">${f2(-H.tax[0])}</td><td style="text-align:left;color:#5b6b7b;font-size:12px">Rate per the company's advance-tax working</td></tr>`;
 b+=`<tr class="tot"><td>Profit After Tax</td><td>${f2(H.pat[0])}</td><td></td></tr></tbody>`;
 document.getElementById('tbl-adj').innerHTML=b;

 const fr=D.indirect.find(x=>x.lab.indexOf('Freight')===0)||{q1:0};
 const dr=D.indirect.find(x=>x.lab.indexOf('Director')===0)||{q1:0};
 document.getElementById('obs-pnl').innerHTML=[
  ['Trading margin of '+H.gpm[0]+'% for the quarter','Gross Profit of ₹'+f2(H.gp[0])+' Cr on ₹'+f2(H.sales[0])+' Cr revenue, against '+H.gpm[2]+'% in F.Y. 2025-26 — roughly two percentage points of margin compression.'],
  ['₹'+f2(D.adj_total)+' Cr of further cost recognised in June','Electricity, natural gas and contract wages in direct cost, with the export performance incentive and unsecured-loan interest in indirect cost.'],
  ['Freight and director remuneration lead indirect cost','Outward freight and export clearing (₹'+f2(fr.q1)+' Cr) with director remuneration (₹'+f2(dr.q1)+' Cr) are the two largest indirect lines.'],
  ['Depreciation is now charged','A quarter charge of ₹'+f2(H.dep[0])+' Cr is included, against ₹'+f2(H.dep[2])+' Cr for the whole of F.Y. 2025-26, so all three columns are comparable.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- BALANCE SHEET ---------- */
(function(){
 function side(obj,isLiab){
  const CC=D.bs.cols;
  let h=`<thead class="hdr"><tr><th>${isLiab?'Liabilities':'Assets'}</th><th>${CC[0]}</th><th>${CC[1]}</th><th>Change</th></tr></thead><tbody>`;
  Object.entries(obj).forEach(([k,v])=>{
   const kk=(isLiab?'l':'a')+k.replace(/[^a-z]/gi,'').toLowerCase();
   const d=+(v[0][0]-v[0][1]).toFixed(2);
   if(v[1]){
    h+=`<tr class="exp" data-k="${kk}"><td><span class="caret">▸</span> ${k}</td><td>${f2(v[0][0])}</td><td>${f2(v[0][1])}</td><td class="${cls(d)}">${f2(d)}</td></tr>`;
    const nod=k.indexOf('Reserves')>-1;
    Object.entries(v[1]).forEach(([ck,cv])=>{const cd=+(cv[0]-cv[1]).toFixed(2);
     h+=`<tr class="child" data-p="${kk}"><td>${ck}</td><td class="${cls(cv[0])}">${f2(cv[0])}</td><td class="${cls(cv[1])}">${f2(cv[1])}</td>${nod?'<td style="color:#93a5b5">—</td>':`<td class="${cls(cd)}">${f2(cd)}</td>`}</tr>`;});
   } else {
    h+=`<tr><td>${k}</td><td>${f2(v[0][0])}</td><td>${f2(v[0][1])}</td><td class="${cls(d)}">${f2(d)}</td></tr>`;
   }});
  const t=isLiab?D.bs.liab_total:D.bs.asset_total;
  h+=`<tr class="tot"><td>Total</td><td>${f2(t[0])}</td><td>${f2(t[1])}</td><td class="${cls(t[0]-t[1])}">${f2(+(t[0]-t[1]).toFixed(2))}</td></tr></tbody>`;
  return h;
 }
 document.getElementById('tbl-bs-liab').innerHTML=side(D.bs.liab,true);
 document.getElementById('tbl-bs-asset').innerHTML=side(D.bs.asset,false);

 let m=`<thead class="hdr"><tr><th>Head</th><th>31 Mar 2026</th><th>30 Jun 2026</th><th>Change</th><th>%</th></tr></thead><tbody>`;
 Object.entries(D.bs_move).forEach(([k,v])=>{const mv=mov(v[0],v[1]);
  m+=`<tr><td>${k}</td><td>${f2(v[0])}</td><td>${f2(v[1])}</td><td class="${cls(mv.d)}">${f2(mv.d)}</td><td class="${cls(mv.d)}">${mv.p.toFixed(1)}%</td></tr>`;});
 m+='</tbody>'; document.getElementById('tbl-bsmove').innerHTML=m;

 const fa=D.bs_move['Fixed Assets'],bw=D.bs_move['Total Borrowings'],dr=D.bs_move['Sundry Debtors'];
 document.getElementById('obs-bs').innerHTML=[
  ['Balance sheet grew ₹'+f2(+(D.bs.liab_total[0]-D.bs.liab_total[1]).toFixed(2))+' Cr','Total assets rose from ₹'+f2(D.bs.liab_total[1])+' Cr to ₹'+f2(D.bs.liab_total[0])+' Cr, driven by capital expenditure and a larger working-capital base.'],
  ['Capital investment of ₹'+f2(+(fa[1]-fa[0]).toFixed(2))+' Cr, net of depreciation','Fixed assets moved from ₹'+f2(fa[0])+' Cr to ₹'+f2(fa[1])+' Cr after charging ₹'+f2(H.dep[0])+' Cr of depreciation.'],
  ['Largely funded by fresh borrowing','Total borrowings rose ₹'+f2(+(bw[1]-bw[0]).toFixed(2))+' Cr (₹'+f2(bw[0])+' → ₹'+f2(bw[1])+' Cr).'],
  ['Working capital is receivable-heavy','Debtors of ₹'+f2(dr[1])+' Cr and stock of ₹'+f2(H.closing[0])+' Cr together stand at ₹'+f2(+(dr[1]+H.closing[0]).toFixed(2))+' Cr — typical for an export manufacturer carrying credit-period exposure.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- BORROWINGS ---------- */
(function(){
 const B=D.borrow, avg=(B.total_open+B.total)/2;
 const blended=+(B.fin_q1*4/avg*100).toFixed(1);
 const pcfc=B.facilities.find(f=>f[1]==='Working capital');
 const wcLines=+(B.od_total+(pcfc?pcfc[3]:0)).toFixed(2);
 kpi([
  {lab:'Total Borrowings',val:B.total,sub:'as at 30 Jun 2026',tip:'Bank OD '+f2(B.od_total)+' + Secured '+f2(B.secured_total)+' + Unsecured '+f2(B.unsecured_total)+' Cr.'},
  {lab:'Secured Debt',val:B.secured_total,sub:'term, packing credit & vehicle',tip:'Secured against plots, plant, vehicles and current assets.'},
  {lab:'Working-Capital Lines',val:wcLines,sub:'bank OD + packing credit',tip:'Revolving facilities against export receivables and inventory.'},
  {lab:'Blended Cost',val:blended,unit:'%',sub:'Q1 finance cost annualised',tip:'Q1 finance cost ₹'+f2(B.fin_q1)+' Cr annualised over average borrowings of ₹'+f2(+avg.toFixed(2))+' Cr. Indicative only.'}
 ],'kpi-loans');

 let cp=`<thead class="hdr"><tr><th>Category</th><th>₹ Cr</th><th>% of Debt</th><th>Nature</th></tr></thead><tbody>`;
 [['Bank OD / Cash Credit',B.od_total,'Revolving · secured against current assets'],
  ['Secured Loans (term, PCFC &amp; vehicle)',B.secured_total,'Secured against plots, plant, vehicles'],
  ['Unsecured Loans',B.unsecured_total,'Interest-bearing unsecured facilities']
 ].forEach(r=>{cp+=`<tr><td>${r[0]}</td><td>${f2(r[1])}</td><td>${pct(r[1],B.total).toFixed(1)}%</td><td style="text-align:left;color:#5b6b7b;font-size:12px">${r[2]}</td></tr>`;});
 cp+=`<tr class="tot"><td>Total Borrowings</td><td>${f2(B.total)}</td><td>100.0%</td><td></td></tr></tbody>`;
 document.getElementById('tbl-loancomp').innerHTML=cp;

 let l=`<thead class="hdr"><tr><th>Facility</th><th>Type</th><th>1 Apr 2026</th><th>30 Jun 2026</th><th>Movement</th></tr></thead><tbody>`;
 l+=`<tr class="monthband"><td colspan="5">BANK OVERDRAFT / CASH CREDIT</td></tr>`;
 l+=`<tr class="colstrip"><th>Facility</th><th>Type</th><th>1 Apr 2026</th><th>30 Jun 2026</th><th>Movement</th></tr>`;
 B.od.forEach(r=>{const d=+(r[2]-r[1]).toFixed(2);
  l+=`<tr><td>${r[0]}</td><td style="text-align:left;color:#5b6b7b">Working capital</td><td>${f2(r[1])}</td><td>${f2(r[2])}</td><td class="${cls(d)}">${f2(d)}</td></tr>`;});
 l+=`<tr class="tot"><td>Total Bank OD / CC</td><td></td><td>${f2(B.od_open)}</td><td>${f2(B.od_total)}</td><td class="${cls(B.od_total-B.od_open)}">${f2(+(B.od_total-B.od_open).toFixed(2))}</td></tr>`;
 l+=`<tr class="monthband"><td colspan="5">SECURED LOANS — TERM, PACKING CREDIT &amp; VEHICLE</td></tr>`;
 l+=`<tr class="colstrip"><th>Facility</th><th>Type</th><th>1 Apr 2026</th><th>30 Jun 2026</th><th>Movement</th></tr>`;
 B.facilities.forEach(f=>{const d=+(f[3]-f[2]).toFixed(2);
  l+=`<tr><td>${f[0]}</td><td style="text-align:left;color:#5b6b7b">${f[1]}</td><td>${f2(f[2])}</td><td>${f2(f[3])}</td><td class="${cls(d)}">${f2(d)}</td></tr>`;});
 l+=`<tr class="tot"><td>Total Secured Loans</td><td></td><td>${f2(B.secured_open)}</td><td>${f2(B.secured_total)}</td><td class="${cls(B.secured_total-B.secured_open)}">${f2(+(B.secured_total-B.secured_open).toFixed(2))}</td></tr>`;
 l+=`<tr class="monthband"><td colspan="5">UNSECURED LOANS</td></tr>`;
 l+=`<tr><td>Unsecured Loans</td><td style="text-align:left;color:#5b6b7b">Unsecured</td><td>${f2(B.unsecured_open)}</td><td>${f2(B.unsecured_total)}</td><td class="${cls(B.unsecured_total-B.unsecured_open)}">${f2(+(B.unsecured_total-B.unsecured_open).toFixed(2))}</td></tr>`;
 l+=`<tr class="tot"><td>TOTAL BORROWINGS</td><td></td><td>${f2(B.total_open)}</td><td>${f2(B.total)}</td><td class="${cls(B.total-B.total_open)}">${f2(+(B.total-B.total_open).toFixed(2))}</td></tr></tbody>`;
 document.getElementById('tbl-loans').innerHTML=l;

 const b19=B.facilities.find(f=>f[0].indexOf('B-19')>-1);
 document.getElementById('obs-loans').innerHTML=[
  ['Borrowings rose ₹'+f2(+(B.total-B.total_open).toFixed(2))+' Cr in the quarter','Total debt moved from ₹'+f2(B.total_open)+' Cr to ₹'+f2(B.total)+' Cr, funding both capital expenditure and the working-capital build.'],
  ['Packing credit drove the working-capital draw','PCFC rose from ₹'+f2(pcfc?pcfc[2]:0)+' Cr to ₹'+f2(pcfc?pcfc[3]:0)+' Cr, moving in step with export receivables.'],
  ['Term debt is amortising','The largest term facility (Plot B-19) reduced from ₹'+f2(b19?b19[2]:0)+' Cr to ₹'+f2(b19?b19[3]:0)+' Cr over the quarter.'],
  ['Finance cost is rising','Interest and charges are projected at ₹'+f2(B.fin_proj)+' Cr for the year, against ₹'+f2(B.fin_q1)+' Cr already incurred in the quarter.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- INVENTORY ---------- */
(function(){
 const S=D.stock;
 let h=`<thead class="hdr"><tr><th>Category</th><th>31 Mar 2026</th><th>30 Jun 2026</th><th>Change</th></tr></thead><tbody>`;
 S.heads.forEach((head_,i)=>{const a=S['31-Mar-26'][i],c=S['30-Jun-26'][i];
  h+=`<tr><td>${head_}</td><td>${f2(a)}</td><td>${f2(c)}</td><td class="${cls(c-a)}">${f2(+(c-a).toFixed(2))}</td></tr>`;});
 const d=+(S.totals['30-Jun-26']-S.totals['31-Mar-26']).toFixed(2);
 h+=`<tr class="tot"><td>Total Closing Stock</td><td>${f2(S.totals['31-Mar-26'])}</td><td>${f2(S.totals['30-Jun-26'])}</td><td class="${cls(d)}">${f2(d)}</td></tr>`;
 h+=`<tr class="sub"><td data-tip="Closing stock assumed in the full-year projection.">Projected at 31 Mar 2027</td><td></td><td>${f2(S.proj_total)}</td><td></td></tr></tbody>`;
 document.getElementById('tbl-stock').innerHTML=h;

 let c=`<thead class="hdr"><tr><th>Particulars</th>${C.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>`;
 [['Opening Stock','opening'],['Add: Purchases','purchases'],['Less: Closing Stock','closing']].forEach(r=>{
  c+=`<tr><td>${r[0]}</td>${K.map((k,i)=>`<td>${f2(H[r[1]][i])}</td>`).join('')}</tr>`;});
 c+=`<tr class="tot"><td>Material Consumed</td>${K.map((k,i)=>`<td>${f2(H.consumption[i])}</td>`).join('')}</tr>`;
 c+=`<tr class="sub"><td>As % of revenue</td>${K.map((k,i)=>`<td>${pct(H.consumption[i],H.sales[i]).toFixed(1)}%</td>`).join('')}</tr></tbody>`;
 document.getElementById('tbl-consume').innerHTML=c;

 const S1=D.stock, rm=S1.heads.indexOf('Raw Material'), fg=S1.heads.indexOf('Finished Goods');
 document.getElementById('obs-inv').innerHTML=[
  ['Inventory mix shifted toward raw material','Raw-material stock rose from ₹'+f2(S1['31-Mar-26'][rm])+' Cr to ₹'+f2(S1['30-Jun-26'][rm])+' Cr while finished goods fell from ₹'+f2(S1['31-Mar-26'][fg])+' Cr to ₹'+f2(S1['30-Jun-26'][fg])+' Cr — inputs built and finished output shipped.'],
  ['Total stock up ₹'+f2(d)+' Cr over the quarter','Closing stock of ₹'+f2(S1.totals['30-Jun-26'])+' Cr is almost entirely raw and packing material, reflecting procurement ahead of production.'],
  ['Material consumed of ₹'+f2(H.consumption[0])+' Cr','Equal to '+pct(H.consumption[0],H.sales[0]).toFixed(1)+'% of revenue and the single largest cost in the trading account. The projection assumes '+pct(H.consumption[1],H.sales[1]).toFixed(1)+'%.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- PROJECTION EXTRAS ---------- */
(function(){
 const roy={};
 ['sales','gp','oi','npbd','dep','np'].forEach(k=>roy[k]=+(H[k][1]-H[k][0]).toFixed(2));
 roy.ie=+((H.indirect[1]-H.dep[1])-(H.indirect[0]-H.dep[0])).toFixed(2);
 let ry=`<thead class="hdr"><tr><th>Particulars</th><th>Q1 (Actual)</th><th>Jul–Mar (implied)</th><th>Full year</th></tr></thead><tbody>`;
 [['Revenue','sales'],['Gross Profit','gp'],['Add: Other Income','oi'],
  ['Less: Indirect Expenses (excl. dep.)','ie'],['Profit before Depreciation &amp; Tax','npbd'],
  ['Less: Depreciation','dep'],['Net Profit (before Tax)','np']].forEach(r=>{
  const q=r[1]==='ie'?+(H.indirect[0]-H.dep[0]).toFixed(2):H[r[1]][0];
  const fy=r[1]==='ie'?+(H.indirect[1]-H.dep[1]).toFixed(2):H[r[1]][1];
  const t=r[0].indexOf('Profit')===0||r[0].indexOf('Net Profit')===0;
  ry+=`<tr class="${t?'tot':''}"><td>${r[0]}</td><td class="${cls(q)}">${f2(q)}</td><td class="${cls(roy[r[1]])}">${f2(roy[r[1]])}</td><td class="${cls(fy)}">${f2(fy)}</td></tr>`;});
 ry+=`<tr class="sub"><td data-tip="Average quarterly turnover implied for the remaining three quarters, against the quarter just reported.">Implied average quarterly turnover</td><td>${f2(H.sales[0])}</td><td>${f2(+(roy.sales/3).toFixed(2))}</td><td></td></tr></tbody>`;
 document.getElementById('tbl-roy').innerHTML=ry;

 const dGP=+(H.gp[1]-H.gp[2]).toFixed(2), dOI=+(H.oi[1]-H.oi[2]).toFixed(2);
 const dIE=+((H.indirect[2]-H.dep[2])-(H.indirect[1]-H.dep[1])).toFixed(2);
 const dDEP=+(H.dep[2]-H.dep[1]).toFixed(2);
 let br=`<thead class="hdr"><tr><th>Bridge: F.Y. 2025-26 → Projected F.Y. 2026-27</th><th>₹ Cr</th><th>Comment</th></tr></thead><tbody>`;
 br+=`<tr class="tot"><td>Net Profit (before Tax) — F.Y. 2025-26</td><td>${f2(H.np[2])}</td><td style="text-align:left;color:#5b6b7b;font-size:12px">After depreciation of ₹${f2(H.dep[2])} Cr</td></tr>`;
 [['Gross Profit',dGP,'Turnover up ₹'+f2(+(H.sales[1]-H.sales[2]).toFixed(2))+' Cr, margin '+H.gpm[1]+'% against '+H.gpm[2]+'%'],
  ['Other Income',dOI,'Export incentives broadly in line with turnover'],
  ['Indirect Expenses',dIE,'Higher finance cost and establishment charges'],
  ['Depreciation',dDEP,'Charge rises to ₹'+f2(H.dep[1])+' Cr on the larger asset base']
 ].forEach(r=>{br+=`<tr><td>${r[0]}</td><td class="${cls(r[1])}">${f2(r[1])}</td><td style="text-align:left;color:#5b6b7b;font-size:12px">${r[2]}</td></tr>`;});
 br+=`<tr class="tot"><td>Net Profit (before Tax) — Projected</td><td class="${cls(H.np[1])}">${f2(H.np[1])}</td><td></td></tr></tbody>`;
 document.getElementById('tbl-bridge').innerHTML=br;

 const pi=D.indirect.find(x=>x.lab==='Performance Incentive')||{proj:0,py:0};
 const asm=[
  ['Turnover','Estimated by the company','₹'+f2(H.sales[1])+' Cr','Export ₹'+f2(H.export[1])+' Cr and domestic ₹'+f2(H.domestic[1])+' Cr, against ₹'+f2(H.sales[2])+' Cr in F.Y. 2025-26 — growth of '+((H.sales[1]/H.sales[2]-1)*100).toFixed(1)+'%.'],
  ['Purchases &amp; closing stock','Estimated by the company','₹'+f2(H.purchases[1])+' Cr','With closing stock of ₹'+f2(H.closing[1])+' Cr, giving material consumption of ₹'+f2(H.consumption[1])+' Cr, or '+pct(H.consumption[1],H.sales[1]).toFixed(1)+'% of turnover.'],
  ['Gross Profit','Derived','₹'+f2(H.gp[1])+' Cr','A margin of '+H.gpm[1]+'%, assuming recovery from the '+H.gpm[0]+'% achieved in Q1 toward the '+H.gpm[2]+'% of last year.'],
  ['Performance Incentive','0.8% of export turnover','₹'+f2(pi.proj)+' Cr','The company\u2019s established rate; F.Y. 2025-26 charged ₹'+f2(pi.py)+' Cr, being exactly 0.8% of that year\u2019s export turnover.'],
  ['Other indirect costs','Line by line against the prior year','₹'+f2(+(H.indirect[1]-H.dep[1]).toFixed(2))+' Cr','Each line estimated individually; annual charges such as audit fees, gratuity and insurance are carried at their prior-year level.'],
  ['Depreciation','Estimated by the company','₹'+f2(H.dep[1])+' Cr','Against ₹'+f2(H.dep[2])+' Cr in F.Y. 2025-26, reflecting the larger asset base after the quarter\u2019s capital expenditure.'],
  ['Tax','Effective rate','₹'+f2(H.tax[1])+' Cr','At '+(D.tax_rate*100).toFixed(3)+'%, the rate used in the company\u2019s own advance-tax computation.']
 ];
 let a=`<thead class="hdr"><tr><th>Parameter</th><th>Basis</th><th>Value</th><th>Note</th></tr></thead><tbody>`;
 asm.forEach(r=>{a+=`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td style="text-align:left">${r[3]}</td></tr>`;});
 a+='</tbody>'; document.getElementById('tbl-assump').innerHTML=a;

 document.getElementById('obs-proj').innerHTML=[
  ['Projected profit before tax of ₹'+f2(H.np[1])+' Cr, against ₹'+f2(H.np[2])+' Cr last year','On turnover '+((H.sales[1]/H.sales[2]-1)*100).toFixed(1)+'% higher, the projection returns a materially thinner result. Margin compression, higher establishment and finance costs and a larger depreciation charge each contribute.'],
  ['The projection implies a much slower nine months','Q1 turnover of ₹'+f2(H.sales[0])+' Cr annualises to ₹'+f2(+(H.sales[0]*4).toFixed(2))+' Cr, yet the estimate is ₹'+f2(H.sales[1])+' Cr — leaving ₹'+f2(roy.sales)+' Cr for the remaining nine months, an average of ₹'+f2(+(roy.sales/3).toFixed(2))+' Cr a quarter.'],
  ['Margin recovery is the key assumption','The projection assumes the trading margin recovers from '+H.gpm[0]+'% in Q1 to '+H.gpm[1]+'% for the year. Each percentage point of margin is worth about ₹'+f2(+(H.sales[1]/100).toFixed(2))+' Cr of profit.'],
  ['Depreciation and finance cost absorb the growth','Together they rise about ₹'+f2(+((H.dep[1]-H.dep[2])+(D.borrow.fin_proj-3.37)).toFixed(2))+' Cr year on year — the carrying cost of the expanded asset base and the borrowing that funded it.']
 ].map(o=>`<div class="obscard"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('');
})();

/* ---------- INTERACTION ---------- */
document.querySelectorAll('tr.exp').forEach(tr=>{tr.onclick=()=>{
 const k=tr.getAttribute('data-k'); tr.classList.toggle('open');
 let p=tr.parentNode;
 p.querySelectorAll(`tr.child[data-p="${k}"]`).forEach(c=>c.classList.toggle('show'));
};});
(function(){
 const tt=document.getElementById('tt');
 document.querySelectorAll('[data-tip]').forEach(el=>{
  el.addEventListener('mouseenter',()=>{tt.textContent=el.getAttribute('data-tip');tt.style.display='block';});
  el.addEventListener('mousemove',e=>{let x=e.clientX+16,y=e.clientY+16;
   if(x+330>window.innerWidth)x=e.clientX-340;
   if(y+90>window.innerHeight)y=e.clientY-80;
   tt.style.left=x+'px';tt.style.top=y+'px';});
  el.addEventListener('mouseleave',()=>{tt.style.display='none';});
 });
})();
const TABS=[['overview','Overview'],['revenue','Revenue Analysis'],['pnl','Profit & Loss'],
 ['bs','Balance Sheet'],['loans','Borrowings'],['inv','Inventory'],['proj','Projections FY2026-27']];
const nav=document.getElementById('nav');
nav.innerHTML=TABS.map((t,i)=>`<button data-t="${t[0]}" class="${i===0?'active':''}">${t[1]}</button>`).join('');
nav.querySelectorAll('button').forEach(b=>{b.onclick=()=>{
 nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
 document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
 b.classList.add('active');
 document.getElementById(b.getAttribute('data-t')).classList.add('active');
 window.scrollTo(0,0);
};});
</script>
</body></html>
$report_html$
  );

  raise notice '0019: Sheetal Q1 FY2026-27 board report published.';
end;
$$;
