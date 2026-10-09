-- Dedicated disposable PostgreSQL fixture. NEVER run against a shared database.
create schema auth;
create table auth.users (id uuid primary key);
create function auth.role() returns text language sql stable
as $$ select current_user::text $$;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public, auth to service_role, authenticated, anon;

-- Apply the actual existing social media migrations before provider-store.
-- Subsequent testing grants simulate existing Supabase Data-API service-role grants.
