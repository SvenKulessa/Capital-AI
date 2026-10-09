-- Disposable PG only: mimics Vault function signatures, not production encryption.
create schema auth;
create schema private;
create schema vault;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table auth.users(id uuid primary key);
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
create table vault.secrets(id uuid primary key default gen_random_uuid(), secret text, name text, description text);
create view vault.decrypted_secrets as select id, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(new_secret text, new_name text, new_description text) returns uuid language plpgsql as $$
declare secret_id uuid;
begin insert into vault.secrets(secret,name,description) values(new_secret,new_name,new_description) returning id into secret_id; return secret_id; end; $$;
create function vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text) returns void language sql as $$
update vault.secrets set secret=new_secret, name=new_name, description=new_description where id=secret_id; $$;
revoke all on schema private, vault from public, anon, authenticated;
revoke all on all tables in schema vault from public, anon, authenticated;
revoke all on all functions in schema vault from public, anon, authenticated;
grant usage on schema public to service_role;
