-- ADR-0052 / R-004 — Transactional, idempotent PDF-credit ledger.
--
-- IMPORTANT DEPLOYMENT CONTRACT:
--   This migration must be applied in production BEFORE deploying application code that calls
--   public.consume_pdf_credit(...) or public.grant_pdf_credits(...).
--
-- Replaces the ephemeral, non-atomic uploads/pdf_credits.json file (server/db.ts) which is
-- reset on every Render redeploy and is not concurrency-safe. Ports the same additive
-- table + SECURITY DEFINER atomic-claim pattern already proven in production by
-- 20260808013000_stripe_event_inbox.sql (ADR-0045 / R-003).

begin;

create table if not exists public.pdf_credits (
  user_identifier text primary key,
  credits         integer not null default 3 check (credits >= 0),
  updated_at      timestamptz not null default now()
);

comment on table public.pdf_credits is
  'R-004 durable PDF export credit balance per user_identifier (Supabase user id or, for guest checkouts, email). Service-role only.';

create table if not exists public.pdf_credit_grants (
  grant_key       text primary key,
  user_identifier text not null,
  credits_granted integer not null check (credits_granted > 0),
  source          text not null,
  reference       text,
  granted_at      timestamptz not null default now()
);

comment on table public.pdf_credit_grants is
  'R-004 idempotency/audit ledger for PDF-credit grants. grant_key is the causing Stripe event.id, giving the grant path an independent duplicate guard beyond the stripe_event_inbox claim (see ADR-0045 non-goals).';

create index if not exists pdf_credit_grants_user_identifier_idx
  on public.pdf_credit_grants (user_identifier);

alter table public.pdf_credits enable row level security;
alter table public.pdf_credit_grants enable row level security;

revoke all on table public.pdf_credits from anon, authenticated;
revoke all on table public.pdf_credit_grants from anon, authenticated;
grant select, insert, update on table public.pdf_credits to service_role;
grant select, insert, update on table public.pdf_credit_grants to service_role;

drop policy if exists "service_role_full_access" on public.pdf_credits;
create policy "service_role_full_access" on public.pdf_credits
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_full_access" on public.pdf_credit_grants;
create policy "service_role_full_access" on public.pdf_credit_grants
  for all
  to service_role
  using (true)
  with check (true);

-- Atomically consumes one PDF-export credit. Lazily initializes a first-seen user at the
-- default balance of 3 (matching legacy getLocalPdfCredits' implicit default), then performs
-- the decrement as a single guarded UPDATE so the row lock closes the read-then-write race the
-- legacy file-based implementation had.
create or replace function public.consume_pdf_credit(p_user_identifier text)
returns table (
  success boolean,
  credits integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_credits integer;
begin
  if nullif(trim(p_user_identifier), '') is null then
    raise exception 'consume_pdf_credit requires a non-empty user_identifier';
  end if;

  insert into public.pdf_credits (user_identifier, credits)
  values (p_user_identifier, 3)
  on conflict (user_identifier) do nothing;

  update public.pdf_credits
     set credits = credits - 1,
         updated_at = now()
   where user_identifier = p_user_identifier
     and credits > 0
  returning credits into v_credits;

  if found then
    return query select true, v_credits;
    return;
  end if;

  select credits into v_credits
    from public.pdf_credits
   where user_identifier = p_user_identifier;

  return query select false, coalesce(v_credits, 0);
end;
$$;

revoke all on function public.consume_pdf_credit(text) from public, anon, authenticated;
grant execute on function public.consume_pdf_credit(text) to service_role;

-- Atomically grants PDF-export credits, guarded by grant_key (the causing Stripe event.id) so a
-- retried/reconciled webhook delivery cannot double-grant. A first-seen user is initialized at
-- the implicit default of 3 before the granted credits are added, matching legacy semantics
-- (getLocalPdfCredits() defaulting to 3, then the webhook adding 3 on top).
create or replace function public.grant_pdf_credits(
  p_grant_key text,
  p_user_identifier text,
  p_credits integer,
  p_source text,
  p_reference text default null
)
returns table (
  granted boolean,
  credits integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_credits integer;
  v_inserted integer;
begin
  if nullif(trim(p_grant_key), '') is null
     or nullif(trim(p_user_identifier), '') is null
     or nullif(trim(p_source), '') is null
     or p_credits is null or p_credits <= 0 then
    raise exception 'grant_pdf_credits requires a non-empty grant_key, user_identifier, source and positive credits';
  end if;

  insert into public.pdf_credit_grants (grant_key, user_identifier, credits_granted, source, reference)
  values (p_grant_key, p_user_identifier, p_credits, p_source, p_reference)
  on conflict (grant_key) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select credits into v_credits
      from public.pdf_credits
     where user_identifier = p_user_identifier;

    return query select false, coalesce(v_credits, 0);
    return;
  end if;

  insert into public.pdf_credits (user_identifier, credits)
  values (p_user_identifier, 3 + p_credits)
  on conflict (user_identifier) do update
     set credits = public.pdf_credits.credits + p_credits,
         updated_at = now()
  returning credits into v_credits;

  return query select true, v_credits;
end;
$$;

revoke all on function public.grant_pdf_credits(text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.grant_pdf_credits(text, text, integer, text, text) to service_role;

commit;
