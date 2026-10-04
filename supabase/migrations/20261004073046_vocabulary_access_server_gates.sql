-- CAPITAL-AI Vocabulary server-side access control.
-- Server-only state for one-time quiz consumption and paid Quant/Pro entitlement.

create table if not exists private.vocabulary_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  quiz_consumed_at timestamptz,
  entitled_at timestamptz,
  entitlement_source text,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  updated_at timestamptz not null default now(),
  check (
    (entitled_at is null and entitlement_source is null and stripe_checkout_session_id is null)
    or
    (entitled_at is not null and entitlement_source = 'stripe_checkout' and stripe_checkout_session_id is not null)
  )
);

revoke all on private.vocabulary_access from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.vocabulary_access to service_role;

create or replace function public.capital_ai_get_vocabulary_access(_user_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog
stable
as $$
  select jsonb_build_object(
    'quizUsed', coalesce(v.quiz_consumed_at is not null, false),
    'quizConsumedAt', v.quiz_consumed_at,
    'quantProEntitled', coalesce(v.entitled_at is not null, false),
    'entitledAt', v.entitled_at,
    'entitlementSource', v.entitlement_source
  )
  from (select _user_id as user_id) u
  left join private.vocabulary_access v on v.user_id = u.user_id
$$;

create or replace function public.capital_ai_consume_vocabulary_quiz(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  _consumed_at timestamptz;
  _existing_at timestamptz;
begin
  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'INVALID_USER';
  end if;

  insert into private.vocabulary_access (user_id)
  values (_user_id)
  on conflict (user_id) do nothing;

  update private.vocabulary_access
     set quiz_consumed_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   where user_id = _user_id
     and quiz_consumed_at is null
  returning quiz_consumed_at into _consumed_at;

  if _consumed_at is not null then
    return jsonb_build_object(
      'consumed', true,
      'quizUsed', true,
      'quizConsumedAt', _consumed_at
    );
  end if;

  select quiz_consumed_at into _existing_at
    from private.vocabulary_access
   where user_id = _user_id;

  return jsonb_build_object(
    'consumed', false,
    'quizUsed', _existing_at is not null,
    'quizConsumedAt', _existing_at
  );
end;
$$;

create or replace function public.capital_ai_grant_vocabulary_entitlement(
  _user_id uuid,
  _stripe_checkout_session_id text,
  _stripe_customer_id text default null,
  _stripe_payment_intent_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  _entitled_at timestamptz;
begin
  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'INVALID_USER';
  end if;
  if _stripe_checkout_session_id is null
     or _stripe_checkout_session_id !~ '^cs_[A-Za-z0-9_]+$'
     or length(_stripe_checkout_session_id) > 255 then
    raise exception 'INVALID_CHECKOUT_SESSION';
  end if;

  insert into private.vocabulary_access (
    user_id,
    entitled_at,
    entitlement_source,
    stripe_checkout_session_id,
    stripe_customer_id,
    stripe_payment_intent_id,
    updated_at
  ) values (
    _user_id,
    pg_catalog.now(),
    'stripe_checkout',
    _stripe_checkout_session_id,
    nullif(_stripe_customer_id, ''),
    nullif(_stripe_payment_intent_id, ''),
    pg_catalog.now()
  )
  on conflict (user_id) do update
     set entitled_at = coalesce(private.vocabulary_access.entitled_at, excluded.entitled_at),
         entitlement_source = 'stripe_checkout',
         stripe_checkout_session_id = coalesce(private.vocabulary_access.stripe_checkout_session_id, excluded.stripe_checkout_session_id),
         stripe_customer_id = coalesce(private.vocabulary_access.stripe_customer_id, excluded.stripe_customer_id),
         stripe_payment_intent_id = coalesce(private.vocabulary_access.stripe_payment_intent_id, excluded.stripe_payment_intent_id),
         updated_at = pg_catalog.now()
  returning entitled_at into _entitled_at;

  return jsonb_build_object(
    'quantProEntitled', true,
    'entitledAt', _entitled_at,
    'entitlementSource', 'stripe_checkout'
  );
end;
$$;

revoke all on function public.capital_ai_get_vocabulary_access(uuid)
  from public, anon, authenticated;
revoke all on function public.capital_ai_consume_vocabulary_quiz(uuid)
  from public, anon, authenticated;
revoke all on function public.capital_ai_grant_vocabulary_entitlement(uuid,text,text,text)
  from public, anon, authenticated;

grant execute on function public.capital_ai_get_vocabulary_access(uuid)
  to service_role;
grant execute on function public.capital_ai_consume_vocabulary_quiz(uuid)
  to service_role;
grant execute on function public.capital_ai_grant_vocabulary_entitlement(uuid,text,text,text)
  to service_role;