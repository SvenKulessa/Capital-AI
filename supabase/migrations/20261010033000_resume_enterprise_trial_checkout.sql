-- Read-only recovery of an attached, unused checkout; never resets eligibility.
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
  elsif _action='resume' then
    return (select jsonb_build_object('sessionId',session_id) from private.enterprise_learning_trials
      where user_id=_user_id and activated_at is null and session_id is not null);
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
