-- Applied to production Supabase first; committed immediately afterwards to restore migration convergence.
-- Free-tier hardening: explicit deny RLS, Vault ACLs and object-scoped pgAudit evidence.
-- No auth data or provider secret values are mutated by this migration.

create extension if not exists pgaudit;

do $$
declare
  t text;
begin
  foreach t in array array[
    'adr0104_owner_sessions',
    'legal_policy_evidence',
    'owner_authorization_challenges',
    'owner_authorization_consumptions',
    'owner_authorization_evidence',
    'owner_device_credentials'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_service_only_deny', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      t || '_service_only_deny', t
    );
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
  end loop;

  foreach t in array array[
    'capital_ai_audit_events',
    'external_component_inventory',
    'external_component_inventory_events',
    'user_provider_connections',
    'vocabulary_access',
    'vocabulary_quant_pro_content'
  ]
  loop
    execute format('alter table private.%I enable row level security', t);
    execute format('drop policy if exists %I on private.%I', t || '_service_only_deny', t);
    execute format(
      'create policy %I on private.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      t || '_service_only_deny', t
    );
    execute format('revoke all on table private.%I from public, anon, authenticated', t);
  end loop;
end $$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

revoke all on table vault.secrets from public, anon, authenticated;
revoke all on table vault.decrypted_secrets from public, anon, authenticated;
revoke usage on schema vault from public, anon, authenticated;
grant usage on schema vault to service_role;
grant select on table vault.secrets to service_role;
grant select on table vault.decrypted_secrets to service_role;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'capital_ai_security_auditor') then
    create role capital_ai_security_auditor nologin noinherit;
  end if;
end $$;

grant usage on schema private, vault, public to capital_ai_security_auditor;
grant select, insert, update, delete on private.user_provider_connections to capital_ai_security_auditor;
grant select on vault.secrets, vault.decrypted_secrets to capital_ai_security_auditor;
grant select, insert, update, delete on public.subscriptions to capital_ai_security_auditor;
grant select, insert, update, delete on public.owner_device_credentials to capital_ai_security_auditor;
grant select, insert, update, delete on public.owner_authorization_challenges to capital_ai_security_auditor;
grant select, insert, update, delete on public.owner_authorization_consumptions to capital_ai_security_auditor;
grant select, insert, update, delete on public.owner_authorization_evidence to capital_ai_security_auditor;
grant select, insert, update, delete on public.adr0104_owner_sessions to capital_ai_security_auditor;

alter role postgres set pgaudit.role to 'capital_ai_security_auditor';
