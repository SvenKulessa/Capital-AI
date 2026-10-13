-- Server-only persistence. No browser access, no SECURITY DEFINER privileges.
create table public.capital_ai_simulator_saved_scenarios (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8192),
  created_at timestamptz not null default now()
);
create index on public.capital_ai_simulator_saved_scenarios(user_id, created_at);
alter table public.capital_ai_simulator_saved_scenarios enable row level security;
revoke all on public.capital_ai_simulator_saved_scenarios from public, anon, authenticated;
grant select, insert, delete on public.capital_ai_simulator_saved_scenarios to service_role;

create function public.capital_ai_simulator_scenarios(_user_id uuid, _action text, _id uuid default null, _payload jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb; affected integer;
begin
  if _user_id is null then raise exception 'identity_required'; end if;
  if _action = 'list' then
    select jsonb_build_object('scenarios', coalesce(jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'scenario',payload) order by created_at,id),'[]'::jsonb),'limit',10)
    into result from public.capital_ai_simulator_saved_scenarios where user_id = _user_id;
    return result;
  elsif _action = 'create' then
    -- Serialize concurrent writes for this user across all server instances.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user_id::text, 71013));
    if (select count(*) from public.capital_ai_simulator_saved_scenarios where user_id = _user_id) >= 10 then
      return jsonb_build_object('error','limit_reached');
    end if;
    insert into public.capital_ai_simulator_saved_scenarios(id,user_id,payload) values (_id,_user_id,_payload);
    return jsonb_build_object('id',_id,'scenario',_payload);
  elsif _action = 'delete' then
    delete from public.capital_ai_simulator_saved_scenarios where user_id = _user_id and id = _id;
    get diagnostics affected = row_count;
    return jsonb_build_object('deleted',affected = 1);
  end if;
  raise exception 'invalid_action';
end;
$$;
revoke all on function public.capital_ai_simulator_scenarios(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.capital_ai_simulator_scenarios(uuid,text,uuid,jsonb) to service_role;
