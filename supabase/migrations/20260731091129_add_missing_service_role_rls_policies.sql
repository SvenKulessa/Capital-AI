-- Schliesst RLS-Enabled-No-Policy Befunde (Supabase Security Advisor).
-- Alle fuenf Tabellen sind server-only (IAM-Audit, Step-Up, Break-Glass,
-- Nutzungs-Log, Basis-User-Tabelle) und werden ausschliesslich ueber den
-- Service-Role-Key gelesen/geschrieben - dasselbe Muster wie die bereits
-- bestehende Policy auf public.user_quota. Ohne Policy blockiert RLS
-- aktuell JEDEN Zugriff inkl. Service-Role fuer PostgREST-Aufrufe ueber
-- den JWT-Pfad; die explizite Policy macht das Verhalten eindeutig statt
-- implizit und behebt den Advisor-Befund, ohne den Zugriffsschutz zu
-- lockern.

drop policy if exists "service_role_full_access" on public.audit_logs_iam;
create policy "service_role_full_access" on public.audit_logs_iam
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.iam_access_log;
create policy "service_role_full_access" on public.iam_access_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.step_up_tokens;
create policy "service_role_full_access" on public.step_up_tokens
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.break_glass_codes;
create policy "service_role_full_access" on public.break_glass_codes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.usage_log;
create policy "service_role_full_access" on public.usage_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- public.users ist die Legacy-Basistabelle (parallel zu profiles/auth.users).
-- Gleiches Muster: server-only Zugriff ueber Service-Role.
drop policy if exists "service_role_full_access" on public.users;
create policy "service_role_full_access" on public.users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
