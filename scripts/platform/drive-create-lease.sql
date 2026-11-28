-- Explicitly staged SQL. NOT an auto-applied Supabase migration.
-- Apply only after scoped authorization and verified production recovery.
begin;
create schema capital_ai_drive_lock;
revoke all on schema capital_ai_drive_lock from public, anon, authenticated;
grant usage on schema capital_ai_drive_lock to service_role;
create table capital_ai_drive_lock.exclusive_create (
  singleton boolean primary key default true check (singleton),
  owner_token uuid not null,
  acquired_at timestamptz not null default pg_catalog.clock_timestamp(),
  write_started_at timestamptz,
  target_folder_id text,
  target_filename text,
  target_sha256 text,
  check ((write_started_at is null and target_folder_id is null and target_filename is null and target_sha256 is null)
      or (write_started_at is not null and target_folder_id is not null and target_filename is not null and target_sha256 is not null
        and target_folder_id ~ '^[A-Za-z0-9_-]{10,120});
alter table capital_ai_drive_lock.exclusive_create enable row level security;
revoke all on capital_ai_drive_lock.exclusive_create from public, anon, authenticated, service_role;
grant select, insert, update, delete on capital_ai_drive_lock.exclusive_create to service_role;

create function public.capital_ai_drive_lock_acquire(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into capital_ai_drive_lock.exclusive_create(singleton,owner_token)
    values(true,_owner) on conflict (singleton) do nothing returning singleton
  ) select exists(select 1 from claimed);
$$;
create function public.capital_ai_drive_lock_mark_write(_owner uuid,_folder_id text,_filename text,_sha256 text)
returns boolean language sql security invoker set search_path = '' as $$
  with marked as (
    update capital_ai_drive_lock.exclusive_create
    set write_started_at=pg_catalog.clock_timestamp(),
        target_folder_id=_folder_id,target_filename=_filename,target_sha256=_sha256
    where singleton and owner_token=_owner and write_started_at is null
    returning singleton
  ) select exists(select 1 from marked);
$$;
create function public.capital_ai_drive_lock_release(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with released as (
    delete from capital_ai_drive_lock.exclusive_create
    where singleton and owner_token=_owner returning singleton
  ) select exists(select 1 from released);
$$;
revoke all on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid) to service_role;
commit;

        and length(target_filename) <= 240 and target_filename ~ '^[A-Za-z0-9][A-Za-z0-9_.-]*);
alter table capital_ai_drive_lock.exclusive_create enable row level security;
revoke all on capital_ai_drive_lock.exclusive_create from public, anon, authenticated, service_role;
grant select, insert, update, delete on capital_ai_drive_lock.exclusive_create to service_role;

create function public.capital_ai_drive_lock_acquire(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into capital_ai_drive_lock.exclusive_create(singleton,owner_token)
    values(true,_owner) on conflict (singleton) do nothing returning singleton
  ) select exists(select 1 from claimed);
$$;
create function public.capital_ai_drive_lock_mark_write(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with marked as (
    update capital_ai_drive_lock.exclusive_create
    set write_started_at=pg_catalog.clock_timestamp()
    where singleton and owner_token=_owner and write_started_at is null
    returning singleton
  ) select exists(select 1 from marked);
$$;
create function public.capital_ai_drive_lock_release(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with released as (
    delete from capital_ai_drive_lock.exclusive_create
    where singleton and owner_token=_owner returning singleton
  ) select exists(select 1 from released);
$$;
revoke all on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid) to service_role;
commit;

        and target_sha256 ~ '^[a-f0-9]{64});
alter table capital_ai_drive_lock.exclusive_create enable row level security;
revoke all on capital_ai_drive_lock.exclusive_create from public, anon, authenticated, service_role;
grant select, insert, update, delete on capital_ai_drive_lock.exclusive_create to service_role;

create function public.capital_ai_drive_lock_acquire(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into capital_ai_drive_lock.exclusive_create(singleton,owner_token)
    values(true,_owner) on conflict (singleton) do nothing returning singleton
  ) select exists(select 1 from claimed);
$$;
create function public.capital_ai_drive_lock_mark_write(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with marked as (
    update capital_ai_drive_lock.exclusive_create
    set write_started_at=pg_catalog.clock_timestamp()
    where singleton and owner_token=_owner and write_started_at is null
    returning singleton
  ) select exists(select 1 from marked);
$$;
create function public.capital_ai_drive_lock_release(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with released as (
    delete from capital_ai_drive_lock.exclusive_create
    where singleton and owner_token=_owner returning singleton
  ) select exists(select 1 from released);
$$;
revoke all on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid) to service_role;
commit;
))
);
alter table capital_ai_drive_lock.exclusive_create enable row level security;
revoke all on capital_ai_drive_lock.exclusive_create from public, anon, authenticated, service_role;
grant select, insert, update, delete on capital_ai_drive_lock.exclusive_create to service_role;

create function public.capital_ai_drive_lock_acquire(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into capital_ai_drive_lock.exclusive_create(singleton,owner_token)
    values(true,_owner) on conflict (singleton) do nothing returning singleton
  ) select exists(select 1 from claimed);
$$;
create function public.capital_ai_drive_lock_mark_write(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with marked as (
    update capital_ai_drive_lock.exclusive_create
    set write_started_at=pg_catalog.clock_timestamp()
    where singleton and owner_token=_owner and write_started_at is null
    returning singleton
  ) select exists(select 1 from marked);
$$;
create function public.capital_ai_drive_lock_release(_owner uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with released as (
    delete from capital_ai_drive_lock.exclusive_create
    where singleton and owner_token=_owner returning singleton
  ) select exists(select 1 from released);
$$;
revoke all on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capital_ai_drive_lock_acquire(uuid),
  public.capital_ai_drive_lock_mark_write(uuid,text,text,text),public.capital_ai_drive_lock_release(uuid) to service_role;
commit;
