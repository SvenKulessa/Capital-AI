-- F-05 (Sicherheitsreport 2026-08-26): Neun Tabellen hatten RLS aktiviert, aber keine einzige
-- Policy. Das Verhalten war bereits fail-closed (RLS ohne Policy verweigert jeden Zugriff fuer
-- Rollen ohne BYPASSRLS), aber die Absicht war nirgends festgeschrieben: ein leeres Policy-Set
-- sieht identisch aus, ob es beabsichtigt oder vergessen wurde.
--
-- Diese Migration aendert das Laufzeitverhalten NICHT. Sie macht den Sollzustand aus den
-- Migrationen belegbar und raeumt den Supabase-Advisor-Lint rls_enabled_no_policy aus.
--
-- Verifiziert vor Anwendung: alle neun Tabellen werden ausschliesslich ueber getServerSupabase()
-- (service_role) angesprochen; kein anon-/authenticated-Client greift direkt zu.
-- Der SEO-Store dokumentiert das explizit als ADR-0043 ("no anon/publishable fallback").

do $$
declare
  t text;
begin
  foreach t in array array[
    'agent_audit_events',
    'ai_governance_evaluations',
    'm10_approval_evidence',
    'm10_authorization_challenges',
    'm10_ci_consumptions',
    'm10_shadow_evaluations',
    'seo_content_inventory',
    'seo_keywords',
    'seo_rank_snapshots'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_service_role_only', t);
    execute format(
      'create policy %I on public.%I as permissive for all to anon, authenticated using (false) with check (false)',
      t || '_service_role_only', t
    );
    execute format(
      'comment on policy %I on public.%I is %L',
      t || '_service_role_only', t,
      'F-05: Zugriff ausschliesslich ueber service_role (BYPASSRLS). anon und authenticated werden explizit verweigert. Aendert das bisherige Verhalten nicht, macht es nur nachweisbar.'
    );
  end loop;
end $$;