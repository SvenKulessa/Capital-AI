# CAPITAL-AI · Getrennte X-Publishing-App (Pay Per Use)

Status: **Code / Tests in PR**, **Produktivaktivierung nicht nachgewiesen**. Stand 17.11.2026.
Verbindliche Engineering-Policy: Root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`.

## Ziel und Trust Boundaries

- Die bestehende Website-Anmeldung via Supabase Auth wird **nicht** verändert.
- Die vorhandenen Render-Variablen `SOCIAL_X_OAUTH_CLIENT_ID`,
  `SOCIAL_X_OAUTH_CLIENT_SECRET`, `SOCIAL_X_TOKEN_ENCRYPTION_KEY` und das
  bestehende Social-Login unter dem Plattformschlüssel `x` bleiben unverändert.
- Die zusätzliche Publishing-App besitzt ausschließlich serverseitige Credentials
  mit separatem Verschlüsselungsschlüssel/AEAD-Domäne und persistiert nur
  `platform=x_publish`, nie `platform=x`.
- Start: `GET /api/social-media/x/publish/auth/start` (IAM Owner, verifizierte E-Mail,
  server-generierter PKCE S256, 10-Minuten-State).
- Exakt in **der neuen X-App** registrierter Callback:
  `https://capital-ai.online/api/social-media/x/publish/auth/callback`.
  Der bisherige Callback `https://capital-ai.online/api/social-media/auth/callback`
  bleibt ausschließlich für bestehende Verbindungen. Ein Cross-Callback oder
  Cross-Client-State ist nicht akzeptiert; der State wird atomar konsumiert.
- Publikations-Readback ohne X-Aufruf:
  `GET /api/social-media/x/publish/account/status`.
- X-Publisher (Milestone/Launch und Artikel) beziehen `x_credentials` nur aus
  `X_PUBLISH`, nicht aus einer bestehenden Login-Verbindung.
  `media.write`, `tweet.read`, `tweet.write`, `users.read` und
  `offline.access` werden beim neuen Grant geprüft und beim Refresh gehalten.
- Keine API-Kosten-/Zeitplan-/Auto-Recharge-Aktivierung. One-shot-Receipt
  bleibt unabhängig vom OAuth-Grant und verhindert zweiten Publikationsversuch.

## Deployment in Reihenfolge (Owner- und Change-Freigaben)

1. **Rückfallplan und Nachweise:** aktuell installierte Migrationen, X-OAuth-Owner-
   Bindung, vorhandene `x`-Reihe, Latest Main-/Render-SHA read-only erfassen.
   Secrets und Tokenwerte nicht ausgeben.
2. **SQL-Migration:** `supabase/migrations/20261117122000_x_publish_oauth_client_isolation.sql`
   im vorgesehenen kontrollierten Cutover anwenden und die beiden
   Plattform-Constraints sowie Security-Invoker-Refresh-RPCs prüfen.
   Keine Copy/Rotation der vorhandenen `x`-Tokens.
3. **Supabase-Edge-Deployment:** neue Version
   `supabase/functions/capital-social-x-vault/index.ts` mit
   `verify_jwt=true` installieren, HMAC-Arbeitslast-Signatur, Service-Role-RLS,
   Owner/IAM und negative Cross-Channel-Tests prüfen.
4. **Render `AICapital` → `Capital-AI` → Environment:** Drei **neue**
   serverseitige Secret-Werte eintragen (nicht als `VITE_*` im Browser):
   - `SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID`: OAuth-2.0-Client-ID der neuen
     Pay-Per-Use-Publishing-App aus X Developer Console.
   - `SOCIAL_X_PUBLISH_OAUTH_CLIENT_SECRET`: dazugehöriges vertrauliches
     OAuth-2.0-Client-Secret (nicht API Key, OAuth-1.0a-Secret oder Bearer-Token).
   - `SOCIAL_X_PUBLISH_TOKEN_ENCRYPTION_KEY`: unabhängig erzeugter
     32-Byte AES-256 Schlüssel, entweder 64 Hex-Zeichen oder kanonisches
     gepaddetes Base64 mit 44 Zeichen. **Nie mit dem Login-Schlüssel ersetzen.**
   - `SOCIAL_X_PUBLISH_OAUTH_ENABLED=true` erst nach SQL-/Edge-/CI-Readback setzen.
     Default bleibt `false` (Fail Closed).
   Bestehende Render-Credentials nicht überschreiben oder löschen.
5. **X Console (neue App):** `Web App / Automated App or Bot`, OAuth 2.0 mit
   PKCE, exakte Publishing-Callback-URL und benötigte User Scopes konfigurieren.
   Owner startet nach erfolgreichem Deployment einen neuen Consent. Die
   vorhandene Supabase-Auth-X-Provider-Konfiguration bleibt unverändert.
6. **Owner-Statusreadback:** `connected=true`,
   `handle=@CapitalAIOnline`, `mediaWriteApproved=true`,
   gültiger Ablauf und keinerlei Cross-Client-Persistenz. Fehlende
   Owner-Zustimmung blockiert das Publishing.
7. **Kosten:** X Pay-Per-Use-Projekt und verfügbare Credits prüfen.
   Owner-Budget für genau einen Launch-Post maximal 1,00 USD; Billing-Cycle-Cap
   1,00 USD und Auto-Recharge OFF wurden vom Owner angegeben. Weitere X-
   bezogene, kostenpflichtige Requests erst nach dem tatsächlichen Console-/Saldo-Readback.
8. **One-shot:** Freigabe- und Asset-Hash-Gates unverändert prüfen. Keine automatische
   Publikation oder Wiederholung bei UNKNOWN. Nach tatsächlicher Ausführung
   Provider-ID, Owner-Identität und Receipt verifizieren.

## Tests und Evidenz

- `node --test server/social-media/x-publish-isolation.test.mjs`
- `node --test server/social-media/x-oauth-start.test.mjs server/social-media/x-oauth-exchange.test.mjs server/social-media/oauth-callback.test.mjs`
- `node --test server/social-media/x-edge-client.test.mjs server/social-media/x-edge-vault.test.mjs server/social-media/owner-token-refresh.test.mjs`
- `node --test server/social-media/x-article-test.test.mjs server/social-media/x-milestone-post.test.mjs`
- Bestehendes `npm test`, **Docker Security Gate**, **Domain Governance**,
  Social Provider PostgreSQL Contract, einschlägige CodeQL/CI-Rulesets.
  Tatsächliche Exit-Codes und Workflow-Run-IDs gehören in den PR.

## Rollback und Sicherheit

`SOCIAL_X_PUBLISH_OAUTH_ENABLED=false` blockiert neuen Consent und den
isolierten X-Publisher. Nicht aus dem alten Login-Account veröffentlichen.
Bei einem fehlgeschlagenen Post den unveränderlichen Receipt lesen und keine
blinde Wiederholung auslösen. Die additive `x_publish`-Schema-Erweiterung
erlaubt die bisherige `x`-Verbindung weiterhin; vorhandene Tokens nie migrieren,
kopieren oder ungeprüft neu verschlüsseln. Für SQL- oder Edge-Rollbacks
erst Restzustände/Leases und die Datenhaltung prüfen. Secrets nur im
Provider-Vault/Render verwalten, niemals in GitHub, CI-Logs oder Chat.
