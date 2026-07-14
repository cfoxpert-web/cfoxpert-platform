-- ============================================================================
-- Migration 0012: package tiers + RPIL benchmark classification
-- Amendment A6 (single combined package + entitlements + pricing page).
--
-- Adds the four real package tiers from the CFOXPERT package sheet
-- (CFOXPERT_ver_2.docx — Essential ₹5–25Cr / Growth ₹25–50Cr /
-- Strategic ₹50–100Cr / Enterprise ₹100Cr+) to the plan_tier enum.
--
-- NO ORGANIZATION IS MOVED ONTO A TIER HERE. Per ADR-009, the legacy
-- values ('internal'/'trial'/'standard'/'premium') mean "the single
-- combined package" — application code (lib/entitlements.ts, the ONLY
-- interpreter of tiers and the entitlements jsonb) grants everything for
-- them. Assigning a real tier later is a data change, no migration.
--
-- Postgres 16 allows ALTER TYPE ... ADD VALUE inside a transaction as
-- long as the new value is not USED in the same transaction — nothing
-- below assigns these values, so the workflow's single-transaction run
-- is safe.
-- ============================================================================

alter type public.plan_tier add value if not exists 'essential';
alter type public.plan_tier add value if not exists 'growth';
alter type public.plan_tier add value if not exists 'strategic';
alter type public.plan_tier add value if not exists 'enterprise';

comment on column public.organizations.plan_tier is
  'Package tier. essential/growth/strategic/enterprise are the real tiers '
  '(CFOXPERT_ver_2.docx, Amendment A6); legacy values internal/trial/'
  'standard/premium mean the single combined package (ADR-009). '
  'Interpreted ONLY by lib/entitlements.ts.';

comment on column public.organizations.entitlements is
  'Per-key boolean overrides beyond the tier default, e.g. '
  '{"report.inventory": true}. Keys defined in lib/entitlements.ts; '
  'interpret in application code, never in SQL.';

-- RPIL benchmark classification (ADR-008 columns, empty until now).
-- Facts from the June-2026 board report: flexible-packaging manufacturer,
-- FY2025-26 revenue ₹178.12Cr → ₹100Cr+ band. The industry value also
-- drives the manufacturing add-on (report.inventory) in lib/entitlements.ts.
-- Only fills NULLs — never clobbers a classification entered since.
update public.organizations
set industry     = coalesce(industry, 'Manufacturing'),
    sector       = coalesce(sector, 'Flexible Packaging'),
    revenue_band = coalesce(revenue_band, '₹100Cr+')
where name = 'Reliable Packaging Industries Ltd'
  and deleted_at is null;
