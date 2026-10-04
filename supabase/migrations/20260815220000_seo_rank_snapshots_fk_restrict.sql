-- SEO-GM-ROADMAP-0002 / WP-S1 follow-up — protect rank history from cascading deletes.
-- Work claim: SEO-WP-S1-FOLLOWUP-HARDENING-2026-08-15
--
-- 20260815010000 declared seo_rank_snapshots.keyword_id with ON DELETE CASCADE.
-- 20260815210000 then withheld DELETE and TRUNCATE on seo_rank_snapshots from service_role,
-- so that captured rank evidence cannot be discarded by the application.
--
-- That grant only limits *direct* deletion. Postgres does not require DELETE privilege on the
-- referencing table to execute a cascade, so removing a row from seo_keywords still erased all
-- of its snapshots and silently defeated the withheld privilege.
--
-- ON DELETE RESTRICT closes the path: a keyword that still has rank snapshots cannot be deleted
-- at all. Purging the snapshots first becomes an explicit step that has to pass the privilege
-- check on seo_rank_snapshots in its own right. Routine retirement of a keyword does not need
-- DELETE anyway — seo_keywords.active exists for exactly that and leaves the history intact.
--
-- The constraint is recreated under its original name so the schema stays diff-clean against
-- 20260815010000. No data is touched (all three SEO tables are empty), no grant is changed, and
-- RLS remains enabled and policy-free on every SEO table.

begin;

alter table public.seo_rank_snapshots
  drop constraint if exists seo_rank_snapshots_keyword_id_fkey;

alter table public.seo_rank_snapshots
  add constraint seo_rank_snapshots_keyword_id_fkey
  foreign key (keyword_id) references public.seo_keywords (id) on delete restrict;

commit;
