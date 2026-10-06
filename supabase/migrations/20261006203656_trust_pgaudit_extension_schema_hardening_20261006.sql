-- Self-healing follow-up to the production hardening migration.
-- Supabase initially installed pgAudit into public; move the relocatable extension out of the exposed schema
-- and explicitly deny execution of its internal SECURITY DEFINER hooks to application roles.

create schema if not exists extensions;
alter extension pgaudit set schema extensions;

revoke execute on function extensions.pgaudit_ddl_command_end() from public, anon, authenticated;
revoke execute on function extensions.pgaudit_sql_drop() from public, anon, authenticated;
grant execute on function extensions.pgaudit_ddl_command_end() to postgres;
grant execute on function extensions.pgaudit_sql_drop() to postgres;

revoke usage on schema extensions from anon, authenticated;
