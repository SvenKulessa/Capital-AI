-- CAI-X-GROWTH@1: isolated PostgreSQL contract candidate, not a production migration.
-- Run only in the existing disposable Social Provider PostgreSQL Contract fixture.
-- All amounts are conservative integer micro-EUR. Reservations are never automatically
-- refunded, reset, or released, including after success, timeout, or a lost response.
begin;
create table public.capital_x_growth_budget (
  external_account_id text primary key check (external_account_id ~ '^[0-9]{1,25}$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  pilot_started_at timestamptz not null,
  quote_observed_at timestamptz not null,
  balance_observed_at timestamptz not null,
  quote_sha256 text not null check (quote_sha256 ~ '^[a-f0-9]{64}$'),
  balance_sha256 text not null check (balance_sha256 ~ '^[a-f0-9]{64}$'),
  approved boolean not null default false,
  auto_recharge_disabled boolean not null default false,
  baseline_spent_micro_eur bigint not null check (baseline_spent_micro_eur between 0 and 20000000),
  credit_ceiling_micro_eur bigint not null check (credit_ceiling_micro_eur between 0 and 20000000),
  workload_upper_micro_eur bigint not null check (workload_upper_micro_eur between 1 and 20000000),
  reserved_micro_eur bigint not null default 0 check (reserved_micro_eur between 0 and 20000000),
  unique (external_account_id,user_id),
  check (baseline_spent_micro_eur + reserved_micro_eur <= 20000000),
  check (reserved_micro_eur <= credit_ceiling_micro_eur)
);
create table public.capital_x_growth_reservations (
  external_account_id text not null,
  user_id uuid not null,
  content_key text not null check (content_key ~ '^[a-f0-9]{64}$'),
  reserved_micro_eur bigint not null check (reserved_micro_eur between 1 and 20000000),
  created_at timestamptz not null default clock_timestamp(),
  primary key (external_account_id,content_key),
  foreign key (external_account_id,user_id) references public.capital_x_growth_budget(external_account_id,user_id) on delete restrict
);
alter table public.capital_x_growth_budget enable row level security;
alter table public.capital_x_growth_reservations enable row level security;
revoke all on public.capital_x_growth_budget,public.capital_x_growth_reservations from public,anon,authenticated,service_role;
grant select,update(reserved_micro_eur) on public.capital_x_growth_budget to service_role;
grant select,insert on public.capital_x_growth_reservations to service_role;
-- No DELETE or UPDATE grant on claims; no owner browser policies.
-- Quote is provisioned separately by trusted operator; caller cannot select amount,
-- time, currency, reset window, approval, account ceiling or cost evidence.
create function public.capital_x_growth_reserve(p_user_id uuid,p_account_id text,p_content_key text)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  b public.capital_x_growth_budget%rowtype;
  current_time_utc timestamptz;
begin
  if p_user_id is null or p_account_id is null or p_account_id !~ '^[0-9]{1,25}$'
     or p_content_key is null or p_content_key !~ '^[a-f0-9]{64}$' then
    raise exception 'X_BUDGET_INPUT_INVALID';
  end if;
  -- Account-scoped lock serializes different contents, owners and workers.
  select * into b from public.capital_x_growth_budget
   where external_account_id = p_account_id and user_id = p_user_id for update;
  if not found then raise exception 'X_BUDGET_NOT_CONFIGURED'; end if;
  current_time_utc := clock_timestamp();
  if exists (select 1 from public.capital_x_growth_reservations
      where external_account_id=p_account_id and content_key=p_content_key) then
    return jsonb_build_object('claimed',false,'accountId',p_account_id,'contentKey',p_content_key);
  end if;
  if not b.approved or not b.auto_recharge_disabled
     or current_time_utc < b.pilot_started_at or current_time_utc >= b.pilot_started_at + interval '720 hours'
     or current_time_utc < b.quote_observed_at or current_time_utc - b.quote_observed_at > interval '24 hours'
     or current_time_utc < b.balance_observed_at or current_time_utc - b.balance_observed_at > interval '1 hour' then
    raise exception 'X_BUDGET_EVIDENCE_REQUIRED';
  end if;
  if b.baseline_spent_micro_eur + b.reserved_micro_eur + b.workload_upper_micro_eur > 20000000
     or b.reserved_micro_eur + b.workload_upper_micro_eur > b.credit_ceiling_micro_eur then
    raise exception 'X_BUDGET_EXHAUSTED';
  end if;
  insert into public.capital_x_growth_reservations(external_account_id,user_id,content_key,reserved_micro_eur)
    values(p_account_id,p_user_id,p_content_key,b.workload_upper_micro_eur);
  update public.capital_x_growth_budget set reserved_micro_eur=reserved_micro_eur+b.workload_upper_micro_eur
    where external_account_id=p_account_id and user_id=p_user_id;
  return jsonb_build_object('claimed',true,'accountId',p_account_id,'contentKey',p_content_key,
    'reservedMicroEur',b.workload_upper_micro_eur);
end;
$$;
revoke all on function public.capital_x_growth_reserve(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.capital_x_growth_reserve(uuid,text,text) to service_role;
commit;
