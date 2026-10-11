-- Private dashboard notes and internal product memberships. Browser roles have no access.
create table if not exists private.dashboard_notes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 notes text not null default '' check (char_length(notes)<=10000),
 updated_at timestamptz not null default now()
);
alter table private.dashboard_notes enable row level security;
revoke all on private.dashboard_notes from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.dashboard_notes to service_role;
create table if not exists private.account_product_memberships (
 user_id uuid not null references auth.users(id) on delete cascade,
 stripe_product_id text not null,
 membership text not null,
 created_at timestamptz not null default now(),
 primary key (user_id,stripe_product_id)
);
alter table private.account_product_memberships enable row level security;
revoke all on private.account_product_memberships from public,anon,authenticated;
grant select,insert,update,delete on private.account_product_memberships to service_role;
create or replace function public.capital_ai_private_notes(_user_id uuid,_notes text default null,_action text default 'GET') returns text
language plpgsql security invoker set search_path='' as $$
begin
 if _user_id is null or _action not in ('GET','PUT') then raise exception 'invalid_request'; end if;
 if _action='PUT' then
  if _notes is null or char_length(_notes)>10000 then raise exception 'invalid_notes'; end if;
  insert into private.dashboard_notes(user_id,notes) values(_user_id,_notes)
  on conflict(user_id) do update set notes=excluded.notes,updated_at=now();
 end if;
 return coalesce((select notes from private.dashboard_notes where user_id=_user_id),'');
end $$;
revoke all on function public.capital_ai_private_notes(uuid,text,text) from public,anon,authenticated;
grant execute on function public.capital_ai_private_notes(uuid,text,text) to service_role;
