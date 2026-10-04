-- SEO-GM-ROADMAP-0002 / WP-S1
-- Align seo_rank_snapshots.source with API No-Demo-Data contract.
-- Harden RLS: no anon/authenticated policies (deny-by-default).
--
-- APPLY TO PRODUCTION ONLY AFTER EXPLICIT OWNER APPROVAL.
-- Safe on empty rank tables; if legacy 'estimated'/'manual' rows exist, migrate or delete first.

-- 1) Normalize any pre-align rows (no-op if table empty / already aligned)
update public.seo_rank_snapshots
set source = 'manual-import'
where source in ('manual', 'manual_import');

update public.seo_rank_snapshots
set source = 'search-console'
where source in ('search_console', 'search-console');

-- Reject residual non-canonical sources (fail migration if demo data present)
do $$
begin
  if exists (
    select 1 from public.seo_rank_snapshots
    where source not in ('search-console', 'manual-import')
  ) then
    raise exception 'seo_rank_snapshots contains non-canonical source values; purge estimated/demo rows before align';
  end if;
end $$;

-- 2) Replace CHECK constraint on source
alter table public.seo_rank_snapshots
  drop constraint if exists seo_rank_snapshots_source_check;

alter table public.seo_rank_snapshots
  add constraint seo_rank_snapshots_source_check
  check (source in ('search-console', 'manual-import'));

-- 3) RLS remains enabled (from 20260815010000); ensure no permissive public policies.
-- Explicit revoke of broad grants if any were added manually.
revoke all on table public.seo_keywords from anon, authenticated;
revoke all on table public.seo_rank_snapshots from anon, authenticated;
revoke all on table public.seo_content_inventory from anon, authenticated;

-- service_role bypasses RLS in Supabase; application must use privileged server client only.
alter table public.seo_keywords enable row level security;
alter table public.seo_rank_snapshots enable row level security;
alter table public.seo_content_inventory enable row level security;

comment on table public.seo_keywords is 'SEO-GM WP-S1: keyword register; server privileged writes only';
comment on table public.seo_rank_snapshots is 'SEO-GM WP-S1: ranks only search-console|manual-import; no estimated';
comment on table public.seo_content_inventory is 'SEO-GM WP-S1: public path inventory for SEO management';
