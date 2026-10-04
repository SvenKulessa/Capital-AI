-- CAPITAL-AI account identity and fintech profile convergence.
-- Created with `supabase migration new profile_identity_settings`.

begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists phone_number text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists favorite_cryptocurrencies text[] not null default '{}',
  add column if not exists favorite_stocks text[] not null default '{}',
  add column if not exists portfolio_assets text[] not null default '{}',
  add column if not exists investment_horizon text not null default 'Langfristig',
  add column if not exists experience_level text not null default 'Einsteiger',
  add column if not exists preferred_currency text not null default 'EUR';

update public.profiles
set username = 'user_' || substring(replace(id::text, '-', ''), 1, 12)
where username is null
   or username !~ '^[a-z0-9][a-z0-9._-]{2,31}$';

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format_check') then
    alter table public.profiles add constraint profiles_username_format_check
      check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_phone_e164_check') then
    alter table public.profiles add constraint profiles_phone_e164_check
      check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_favorite_crypto_limit_check') then
    alter table public.profiles add constraint profiles_favorite_crypto_limit_check
      check (cardinality(favorite_cryptocurrencies) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_favorite_stocks_limit_check') then
    alter table public.profiles add constraint profiles_favorite_stocks_limit_check
      check (cardinality(favorite_stocks) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_portfolio_assets_limit_check') then
    alter table public.profiles add constraint profiles_portfolio_assets_limit_check
      check (cardinality(portfolio_assets) <= 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_investment_horizon_check') then
    alter table public.profiles add constraint profiles_investment_horizon_check
      check (investment_horizon in ('Kurzfristig', 'Mittelfristig', 'Langfristig'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_experience_level_check') then
    alter table public.profiles add constraint profiles_experience_level_check
      check (experience_level in ('Einsteiger', 'Fortgeschritten', 'Erfahren', 'Professionell'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_preferred_currency_check') then
    alter table public.profiles add constraint profiles_preferred_currency_check
      check (preferred_currency in ('EUR', 'USD', 'CHF', 'GBP'));
  end if;
end
$$;

create or replace function public.sync_profile_identity_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_username text;
  fallback_username text;
  requested_phone text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  fallback_username := 'user_' || substring(replace(new.id::text, '-', ''), 1, 12);
  requested_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), '');

  if requested_username !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then
    requested_username := fallback_username;
  end if;
  if requested_phone is not null and requested_phone !~ '^\+[1-9][0-9]{7,14}$' then
    requested_phone := null;
  end if;

  begin
    insert into public.profiles (id, username, phone_number, phone_verified)
    values (new.id, requested_username, requested_phone, false)
    on conflict (id) do update
      set username = coalesce(public.profiles.username, excluded.username),
          phone_number = coalesce(public.profiles.phone_number, excluded.phone_number),
          updated_at = now();
  exception when unique_violation then
    insert into public.profiles (id, username, phone_number, phone_verified)
    values (new.id, fallback_username, requested_phone, false)
    on conflict (id) do update
      set username = coalesce(public.profiles.username, excluded.username),
          phone_number = coalesce(public.profiles.phone_number, excluded.phone_number),
          updated_at = now();
  end;

  return new;
end
$$;

revoke all on function public.sync_profile_identity_from_auth_user() from public;
grant execute on function public.sync_profile_identity_from_auth_user() to service_role;

drop trigger if exists z_sync_profile_identity_from_auth_user on auth.users;
create trigger z_sync_profile_identity_from_auth_user
  after insert on auth.users
  for each row execute procedure public.sync_profile_identity_from_auth_user();

comment on column public.profiles.phone_number is
  'Unverified profile datum until phone_verified is true and Supabase Auth confirms the phone.';

commit;
