-- SEO-GM-ROADMAP-0002 / WP-S1 — service_role table privileges for the SEO engine.
--
-- Context: 20260815010000 created the three SEO tables and 20260815200000 revoked all
-- anon/authenticated privileges. Neither granted DML to service_role, and this project
-- does not carry Supabase's default service_role grants (see 20260804200909 / ADR-0043),
-- so the tables were reachable by `postgres` only. RLS is not the limiting factor here:
-- table privileges are checked before RLS, so enabling RLS does not substitute for a grant.
--
-- Least privilege per table (M5 pattern, cf. 20260811230743):
--   * revoke all first, so the resulting privilege set is deterministic rather than a
--     residue of Supabase default privileges (REFERENCES / TRIGGER / TRUNCATE);
--   * seo_rank_snapshots is rank evidence and gets no DELETE. TRUNCATE is withheld as well,
--     since it would otherwise make the withheld DELETE meaningless.
--
-- No anon/authenticated privilege is added. No RLS policy is created; the tables stay
-- deny-by-default for every client-facing role.

begin;

-- Keyword register: full DML (rows are editable operational configuration).
revoke all on table public.seo_keywords from service_role;
grant select, insert, update, delete on table public.seo_keywords to service_role;

-- Content inventory: full DML (paths are added, retired and re-reviewed over time).
revoke all on table public.seo_content_inventory from service_role;
grant select, insert, update, delete on table public.seo_content_inventory to service_role;

-- Rank snapshots: no DELETE, no TRUNCATE. UPDATE is retained for backfilling `url` /
-- correcting a captured `position` on an existing snapshot row.
--
-- Caveat: ON DELETE CASCADE from seo_keywords still removes a keyword's snapshots when the
-- keyword itself is deleted. Postgres does not require DELETE privilege on the referencing
-- table for that cascade, so this grant limits direct deletion only. Retaining rank history
-- across keyword removal requires ON DELETE RESTRICT or soft deletes, which is a schema
-- decision outside this migration.
revoke all on table public.seo_rank_snapshots from service_role;
grant select, insert, update on table public.seo_rank_snapshots to service_role;

commit;
