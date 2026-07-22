-- ============================================================================
-- Migration 0015: staff read access for the A4-c review surface
--
-- The analyst review queue spans ALL client organizations: an analyst must
-- see which org a job belongs to and pick (or create) a target KPI period
-- when publishing. organizations and kpi_periods were member-read-only —
-- these policies open SELECT to internal staff, following the Milestone 9
-- precedent (explicit staff read policies where analyst work requires
-- them; never a parallel permission system — is_internal_staff() is the
-- same single check CRM uses).
--
-- Writes are unchanged: kpi_periods/kpi_values inserts stay service-role
-- -only (the A4-c publish action, audit-logged with the real actor).
-- ============================================================================

create policy organizations_select_staff
  on public.organizations for select
  using (deleted_at is null and public.is_internal_staff());

create policy kpi_periods_select_staff
  on public.kpi_periods for select
  using (deleted_at is null and public.is_internal_staff());
