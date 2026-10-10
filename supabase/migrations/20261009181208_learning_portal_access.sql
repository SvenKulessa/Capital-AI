-- Additive Learning Portal change. Existing paid Vocabulary receipts remain valid.
-- All writes use the authenticated BFF user ID, never a client supplied user ID.
create table if not exists private.enterprise_learning_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reserved_at timestamptz not null default now(), session_id text unique,
  activated_at timestamptz, ends_at timestamptz
);
revoke all on private.enterprise_learning_trials from public,anon,authenticated;
grant select,insert,update,delete on private.enterprise_learning_trials to service_role;
alter table private.enterprise_learning_trials enable row level security;

create or replace function public.capital_ai_get_vocabulary_access(_user_id uuid)
returns jsonb language sql security definer set search_path = pg_catalog stable as $$
  with rights as (
    select exists(select 1 from public.profiles p where p.id = _user_id and p.iam_role = 'owner') as owner,
      exists(select 1 from private.vocabulary_access a where a.user_id = _user_id and a.entitled_at is not null) as learning,
      exists(select 1 from private.enterprise_learning_trials t where t.user_id=_user_id and t.activated_at is not null and t.ends_at>now()) as trial,
      exists(select 1 from public.subscriptions s where s.user_id = _user_id
        and s.tier in ('Starter','Pro','Enterprise') and s.status in ('active','trialing')
        and s.current_period_end > now()) as starter,
      exists(select 1 from public.subscriptions s where s.user_id = _user_id
        and s.tier in ('Pro','Enterprise') and s.status in ('active','trialing')
        and s.current_period_end > now()) as pro
  )
  select jsonb_build_object(
    'quizUsed', coalesce((v.quiz_consumed_at at time zone 'Europe/Berlin')::date = (now() at time zone 'Europe/Berlin')::date,false),
    'quizConsumedAt',v.quiz_consumed_at,'quantProEntitled',r.owner or r.learning or r.trial,
    'learningEntitled',r.owner or r.learning or r.trial,'owner',r.owner,
    'atlasEntitled',r.owner or r.trial or (r.learning and r.starter),'chartQuizEntitled',r.owner or r.trial or (r.learning and r.pro),
    'trialActive',r.trial,'entitledAt',v.entitled_at,'entitlementSource',v.entitlement_source
  ) from rights r left join private.vocabulary_access v on v.user_id = _user_id
$$;

create or replace function public.capital_ai_consume_vocabulary_quiz(_user_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare _consumed_at timestamptz;
begin
  if _user_id is null or not exists(select 1 from auth.users where id=_user_id) then raise exception 'INVALID_USER'; end if;
  insert into private.vocabulary_access(user_id) values(_user_id) on conflict(user_id) do nothing;
  -- The conditional update serializes concurrent requests; reset follows Berlin's calendar day, including DST.
  update private.vocabulary_access set quiz_consumed_at=now(),updated_at=now()
    where user_id=_user_id and (quiz_consumed_at is null or
      (quiz_consumed_at at time zone 'Europe/Berlin')::date < (now() at time zone 'Europe/Berlin')::date)
    returning quiz_consumed_at into _consumed_at;
  return jsonb_build_object('consumed',_consumed_at is not null,'quizUsed',true,'quizConsumedAt',_consumed_at);
end $$;

create or replace function public.capital_ai_get_quant_pro_vocabulary(_user_id uuid)
returns jsonb language sql security definer set search_path = pg_catalog stable as $$
  select coalesce(jsonb_agg(t.payload order by t.id),'[]'::jsonb) from (
    select c.id,c.payload from private.vocabulary_quant_pro_content c order by c.id
    limit case when coalesce((public.capital_ai_get_vocabulary_access(_user_id)->>'quantProEntitled')::boolean,false)
      then null else 7 end
  ) t
$$;

create table if not exists private.learning_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id text not null check(term_id ~ '^[a-z0-9-]{1,120}$'),
  created_at timestamptz not null default now(), primary key(user_id,term_id)
);
revoke all on private.learning_favorites from public,anon,authenticated;
grant select,insert,delete on private.learning_favorites to service_role;
create or replace function public.capital_ai_learning_favorites(_user_id uuid,_term_id text default null,_action text default 'GET')
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
begin
  if _user_id is null or not exists(select 1 from auth.users where id=_user_id) then raise exception 'INVALID_USER'; end if;
  if _action='POST' then
    -- Serialize per-account updates to keep the cap correct under concurrent requests.
    perform 1 from auth.users where id=_user_id for update;
    if (select count(*) from private.learning_favorites where user_id=_user_id)>=500 then raise exception 'FAVORITES_LIMIT'; end if;
    insert into private.learning_favorites(user_id,term_id) values(_user_id,_term_id) on conflict do nothing;
  elsif _action='DELETE' then delete from private.learning_favorites where user_id=_user_id and term_id=_term_id;
  elsif _action<>'GET' then raise exception 'INVALID_ACTION'; end if;
  return (select coalesce(jsonb_agg(term_id order by created_at),'[]'::jsonb) from private.learning_favorites where user_id=_user_id);
end $$;
revoke all on function public.capital_ai_learning_favorites(uuid,text,text) from public,anon,authenticated;
grant execute on function public.capital_ai_learning_favorites(uuid,text,text) to service_role;
-- Reassert service-only RPC grants after function replacement.
revoke all on function public.capital_ai_get_vocabulary_access(uuid),public.capital_ai_consume_vocabulary_quiz(uuid),public.capital_ai_get_quant_pro_vocabulary(uuid) from public,anon,authenticated;
grant execute on function public.capital_ai_get_vocabulary_access(uuid),public.capital_ai_consume_vocabulary_quiz(uuid),public.capital_ai_get_quant_pro_vocabulary(uuid) to service_role;

create or replace function public.capital_ai_enterprise_trial(_user_id uuid,_action text,_session_id text default null,_ends_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare _inserted uuid;
begin
  if _user_id is null or not exists(select 1 from auth.users where id=_user_id) then raise exception 'INVALID_USER'; end if;
  if _action='reserve' then
    -- This campaign is once per account, independent of concurrent checkout requests.
    if exists(select 1 from public.subscriptions where user_id=_user_id and status in ('active','trialing') and tier<>'Free') then
      return jsonb_build_object('reserved',false);
    end if;
    insert into private.enterprise_learning_trials(user_id) values(_user_id) on conflict do nothing returning user_id into _inserted;
    return jsonb_build_object('reserved',_inserted is not null);
  elsif _action='attach' then
    if _session_id !~ '^cs_[A-Za-z0-9_]{1,250}$' then raise exception 'INVALID_SESSION'; end if;
    update private.enterprise_learning_trials set session_id=_session_id where user_id=_user_id and activated_at is null and session_id is null;
    return jsonb_build_object('attached',found);
  elsif _action='release' then
    delete from private.enterprise_learning_trials where user_id=_user_id and activated_at is null and session_id is null;
  elsif _action='activate' then
    if _ends_at is null or _ends_at<=now() or _ends_at>now()+interval '3 days' then raise exception 'INVALID_TRIAL_END'; end if;
    update private.enterprise_learning_trials set activated_at=coalesce(activated_at,now()),ends_at=coalesce(ends_at,_ends_at)
      where user_id=_user_id and session_id=_session_id;
    return jsonb_build_object('activated',found);
  else raise exception 'INVALID_ACTION'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.capital_ai_enterprise_trial(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.capital_ai_enterprise_trial(uuid,text,text,timestamptz) to service_role;
alter table private.learning_favorites enable row level security;
