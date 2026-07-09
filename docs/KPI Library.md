# KPI Library.md

**Status: not yet built.** Per ADR-004, KPI definitions will be data (a `kpi_definitions` table), not code, once Milestone 7 lands. This document is the human-readable index of that table — the place to see the full KPI library at a glance without querying the database, and the place to propose additions before they become schema rows.

## Why this file exists even though the data lives in the database

Six months from now, someone will ask "do we already track Days Sales Outstanding?" The answer should be a search in this file, not a database query — and any new KPI should be proposed here first (with unit, category, and benchmark rationale) before being added as a row, so the addition gets the same scrutiny a schema change would get, without needing to be one.

## Known KPIs (from the FY26 board report reviewed during planning)

These were observed in the existing interactive board report used as a source-of-truth reference during planning. They are the starting library, not the final one.

| KPI | Category | Notes |
|---|---|---|
| Revenue Trend | Revenue | |
| Cash Cycle (Days) | Cash Flow | Shown as days, with trend direction |
| EBITDA Margin | Profitability | Shown as %, with trend direction |
| Working Capital | Cash Flow | |
| Health Score (overall) | Composite | Derived from the six Enterprise Value Drivers, not a raw financial KPI — computed by the Scoring Engine, not the KPI Engine |
| Key Financial Ratios (multiple) | Financial Strength | Compared against "ideal benchmarks" in the existing report — this comparison is what the future Benchmark Engine formalizes |

## Adding a new KPI (process, once Milestone 7 exists)

1. Propose it here: name, unit, category, why it matters, what a good/bad range looks like.
2. Get it reviewed the way any schema addition would be.
3. Add the row to `kpi_definitions`.
4. No code deploy required — this is the entire point of ADR-004.

## Categories (matching the six Enterprise Value Drivers where applicable)

KPIs should map to at least one of: Financial Strength, Operational Excellence, Strategic Growth, Governance & Leadership, Technology & Intelligence, Capital & Valuation — see `Product Vision.md`. A KPI that doesn't map to any driver is a signal to double check why it's being tracked.
