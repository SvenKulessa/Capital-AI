# Supabase Free-Tier Hardening — Production Evidence

Stand: 2026-10-06  
Projekt: Capital-AI  
Plan: Free

## Ergebnis

Eine zweite Supabase-Free-Datenbank löst das Problem `Leaked Password Protection` nicht. Dieses Auth-Control ist planabhängig und wird durch eine neue Free-Instanz nicht freigeschaltet.

Daher wurde keine zweite Datenbank als vermeintlicher Sicherheits-Workaround angelegt.

## Umgesetzte Defense-in-Depth Controls

- explizite restrictive DENY-Policies für service-only Public-Tabellen
- RLS auf allen vorhandenen `private.*` Tabellen
- `anon` und `authenticated`: kein SELECT/INSERT/UPDATE/DELETE auf `private.*`
- `anon` und `authenticated`: kein USAGE auf `private` oder `vault`
- `anon` und `authenticated`: kein SELECT auf `vault.secrets` oder `vault.decrypted_secrets`
- Vault-Zugriff nur für privilegierten Backend-Pfad
- pgAudit 17.1 als objektbezogene Audit-Evidence
- pgAudit nach Installation aus `public` nach `extensions` verschoben
- interne pgAudit SECURITY DEFINER Hooks für `anon`/`authenticated` gesperrt
- keine Parameterwerte in pgAudit geloggt

## Advisor Readback

Nach der Härtung verbleibt genau ein Security-Warning:
- `auth_leaked_password_protection`

Die vorherigen RLS- und pgAudit-Warnings sind geschlossen.

## Vault Evidence

- `supabase_vault` installiert
- `vault.secrets`: kein Zugriff für `anon` / `authenticated`
- `vault.decrypted_secrets`: kein Zugriff für `anon` / `authenticated`
- `service_role`: privilegierter Backend-Read
- Website zeigt keinen Secretwert und keinen Ciphertext an
- UI zeigt ausschließlich Credential-Fingerprint + Verifikations-/Verschlüsselungsstatus

## Upgrade Gate

Ein Supabase-Plan-Upgrade ist eine Billing-/Control-Plane-Mutation. Der aktuell verfügbare Supabase-Connector erlaubt Plan-Readback, aber keine sichere Subscription-Upgrade-Aktion. Deshalb wurde kein kostenpflichtiger Plan ohne providerseitige Upgrade-Action erfunden oder simuliert.

Nach Upgrade:
1. Leaked Password Protection aktivieren.
2. Auth-Konfiguration readbacken.
3. Registrierung + Recovery + TOTP Browser-E2E wiederholen.
4. Security Advisor erneut ausführen.
5. Vault/RLS/pgAudit unverändert als Defense-in-Depth beibehalten.
