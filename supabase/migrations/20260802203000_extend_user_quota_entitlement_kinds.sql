-- ADR-0034 — central subscription entitlements.
-- Repository migration only. Apply through the controlled production Supabase handoff
-- before enabling the Warren-Buffett quota endpoint in production.

alter table public.user_quota
  drop constraint if exists user_quota_quota_kind_check;

alter table public.user_quota
  add constraint user_quota_quota_kind_check
  check (quota_kind in (
    'screening',
    'monte_carlo',
    'full_ai_analysis',
    'buffett_value_check'
  ));

alter table public.user_quota
  add column if not exists subject_key text;

-- Atomic quota consumption. The caller is the backend service-role path; no browser
-- access is granted. SECURITY INVOKER deliberately preserves the table's RLS/grants.
-- p_subject_key makes the limited Buffett entitlement idempotent for the same asset:
-- reopening the already-authorized symbol within the 3-day window does not consume a
-- second quota unit, while switching to a different symbol remains blocked at limit=1.
create or replace function public.consume_user_quota(
  p_email text,
  p_quota_kind text,
  p_limit integer,
  p_window_seconds integer,
  p_subject_key text default null
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  window_start timestamptz,
  next_eligible_at timestamptz,
  subject_key text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_row public.user_quota%rowtype;
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_subject text := nullif(pg_catalog.upper(pg_catalog.btrim(coalesce(p_subject_key, ''))), '');
begin
  if p_limit <= 0 or p_window_seconds <= 0 or v_email = '' then
    raise exception 'Invalid quota configuration';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_email || ':' || p_quota_kind)
  );

  select *
    into v_row
    from public.user_quota
   where email = v_email
     and quota_kind = p_quota_kind
   for update;

  if not found or v_row.window_start + pg_catalog.make_interval(secs => p_window_seconds) <= v_now then
    insert into public.user_quota (email, quota_kind, window_start, count, subject_key)
    values (v_email, p_quota_kind, v_now, 1, v_subject)
    on conflict (email, quota_kind)
    do update set window_start = excluded.window_start, count = 1, subject_key = excluded.subject_key
    returning * into v_row;

    return query
      select true, 1, greatest(p_limit - 1, 0), v_row.window_start,
             v_row.window_start + pg_catalog.make_interval(secs => p_window_seconds),
             v_row.subject_key;
    return;
  end if;

  if v_subject is not null and v_row.subject_key = v_subject then
    return query
      select true, v_row.count, greatest(p_limit - v_row.count, 0), v_row.window_start,
             v_row.window_start + pg_catalog.make_interval(secs => p_window_seconds),
             v_row.subject_key;
    return;
  end if;

  if v_row.count >= p_limit then
    return query
      select false, v_row.count, 0, v_row.window_start,
             v_row.window_start + pg_catalog.make_interval(secs => p_window_seconds),
             v_row.subject_key;
    return;
  end if;

  update public.user_quota
     set count = count + 1,
         subject_key = coalesce(v_subject, subject_key)
   where email = v_row.email
     and quota_kind = v_row.quota_kind
   returning * into v_row;

  return query
    select true, v_row.count, greatest(p_limit - v_row.count, 0), v_row.window_start,
           v_row.window_start + pg_catalog.make_interval(secs => p_window_seconds),
           v_row.subject_key;
end;
$$;
