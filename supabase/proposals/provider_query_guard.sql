-- Reviewed DDL proposal. Generate its migration with `supabase migration new
-- provider_query_guard` when the CLI is available; do not apply directly to production.
create schema if not exists private;
create table private.capital_ai_provider_query_state (
  scope_key text primary key check (length(scope_key) between 1 and 256),
  expires_at timestamptz not null,
  uses integer not null check (uses >= 0)
);
create index capital_ai_provider_query_state_expiry
  on private.capital_ai_provider_query_state (expires_at);
alter table private.capital_ai_provider_query_state enable row level security;
revoke all on private.capital_ai_provider_query_state from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.capital_ai_provider_query_state to service_role;
create policy provider_query_service_only on private.capital_ai_provider_query_state
  for all to service_role using (true) with check (true);

create function public.capital_ai_claim_provider_query(
  _user_id uuid, _request_id text, _expires_at_ms bigint,
  _rate_limit integer, _cost_scopes jsonb
) returns jsonb language plpgsql security invoker
set search_path = '' set lock_timeout = '1500ms'
as $$
declare
  _now timestamptz;
  _replay_key text := 'replay:' || _request_id;
  _rate_key text := 'rate:' || _user_id::text;
  _key text;
  _scope jsonb;
  _keys text[];
  _row private.capital_ai_provider_query_state%rowtype;
  _retry integer;
begin
  if _user_id is null or _request_id is null or
     _request_id !~ '^[A-Za-z0-9_.:-]{1,96}$' or
     _expires_at_ms is null or _rate_limit is null or _rate_limit not between 1 and 120 or
     _cost_scopes is null or jsonb_typeof(_cost_scopes) <> 'array' then
    raise exception 'INVALID_PROVIDER_STATE_REQUEST';
  end if;
  if jsonb_array_length(_cost_scopes) > 2 then raise exception 'INVALID_PROVIDER_STATE_REQUEST'; end if;
  _keys := array[_replay_key, _rate_key];
  for _scope in select value from jsonb_array_elements(_cost_scopes) loop
    if jsonb_typeof(_scope) <> 'object' or
       coalesce(_scope->>'key', '') !~ '^(user:[0-9a-f-]{36}|global):[a-z]{1,32}:[A-Za-z0-9_.:-]{1,80}$' or
       coalesce(_scope->>'intervalMs', '') !~ '^[0-9]{1,7}$' or
       (_scope->>'intervalMs')::integer not between 1 and 3600000 then
      raise exception 'INVALID_PROVIDER_STATE_REQUEST';
    end if;
    _key := 'cost:' || (_scope->>'key');
    if _key = any(_keys) then raise exception 'INVALID_PROVIDER_STATE_REQUEST'; end if;
    _keys := array_append(_keys, _key);
  end loop;

  -- Bounded retention; never removes a live proof/rate/cooldown marker.
  delete from private.capital_ai_provider_query_state where scope_key in (
    select scope_key from private.capital_ai_provider_query_state
    where expires_at < clock_timestamp() - interval '1 minute'
    order by expires_at for update skip locked limit 128
  );

  -- All participating scopes use the same lock order, including new rows.
  for _key in select unnest(_keys) order by 1 loop
    insert into private.capital_ai_provider_query_state values (_key, '-infinity', 0)
      on conflict (scope_key) do nothing;
    perform 1 from private.capital_ai_provider_query_state where scope_key = _key for update;
  end loop;
  _now := clock_timestamp();
  if _expires_at_ms <= floor(extract(epoch from _now) * 1000)::bigint or
     _expires_at_ms > floor(extract(epoch from _now) * 1000)::bigint + 30000 then
    return jsonb_build_object('allowed', false, 'code', 'INVALID_QUERY_PROOF');
  end if;
  select * into strict _row from private.capital_ai_provider_query_state where scope_key = _replay_key;
  if _row.uses > 0 and _row.expires_at >= _now then
    return jsonb_build_object('allowed', false, 'code', 'QUERY_REPLAY_REJECTED');
  end if;
  select * into strict _row from private.capital_ai_provider_query_state where scope_key = _rate_key;
  if _row.expires_at > _now and _row.uses >= _rate_limit then
    return jsonb_build_object('allowed', false, 'code', 'PROVIDER_QUERY_RATE_LIMITED',
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from (_row.expires_at - _now)))::integer));
  end if;
  for _scope in select value from jsonb_array_elements(_cost_scopes) loop
    select * into strict _row from private.capital_ai_provider_query_state
      where scope_key = 'cost:' || (_scope->>'key');
    if _row.uses > 0 and _row.expires_at > _now then
      _retry := greatest(coalesce(_retry, 0), ceil(extract(epoch from (_row.expires_at - _now)))::integer);
    end if;
  end loop;
  if _retry is not null then
    return jsonb_build_object('allowed', false, 'code', 'PROVIDER_QUERY_COST_THROTTLED',
      'retryAfterSeconds', greatest(1, _retry));
  end if;

  -- Only after every condition succeeds are all scopes claimed atomically.
  update private.capital_ai_provider_query_state
    set expires_at = to_timestamp(_expires_at_ms::double precision / 1000), uses = 1 where scope_key = _replay_key;
  update private.capital_ai_provider_query_state
    set uses = case when expires_at > _now then uses + 1 else 1 end,
        expires_at = case when expires_at > _now then expires_at else _now + interval '60 seconds' end
    where scope_key = _rate_key;
  for _scope in select value from jsonb_array_elements(_cost_scopes) loop
    update private.capital_ai_provider_query_state
      set uses = 1, expires_at = _now + (_scope->>'intervalMs')::integer * interval '1 millisecond'
      where scope_key = 'cost:' || (_scope->>'key');
  end loop;
  return jsonb_build_object('allowed', true);
end;
$$;
revoke all on function public.capital_ai_claim_provider_query(uuid, text, bigint, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.capital_ai_claim_provider_query(uuid, text, bigint, integer, jsonb)
  to service_role;
