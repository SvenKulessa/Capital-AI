# Account, Auth und Key-Vault Runtime-Follow-up — 2026-10-05

## Ausgangslage

Basis: `main@c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84`

Branch: `capital-ai-trust/account-security-vault-20261005`

Die mobile Production-Evidence zeigt funktionierende Google-Anmeldung sowie korrekte Projektion von Benutzer, Enterprise-Abo und IAM-Owner-Status. Gleichzeitig waren Badge-Assets, Vault-Persistenz, Passkey-Enrollment und ein wiederholtes TOTP-Enrollment fehlerhaft.

## Verifizierte Root Causes

### Badge-Assets

Die SVG-Badges liegen in `public/branding/badges/`, wurden im Docker-Build jedoch nicht in den Vite-Public-Baum kopiert. Der Runtime-Build enthielt damit die referenzierten URLs nicht.

Fix: `Dockerfile` kopiert den Badge-Ordner explizit in die Build-Stufe.

### Passkeys

Supabase Auth Logs zeigen für die produktive Instanz wiederholt:

- `GET /auth/v1/passkeys` → HTTP 404
- `POST /auth/v1/passkeys/registration/options` → HTTP 404
- Provider-Code: `passkey_disabled`

Damit ist der Browser-/WebAuthn-Code nicht die aktuelle Root Cause. Die produktive Supabase-Passkey-/RP-Konfiguration ist noch nicht aktiviert.

Der UI-Button bleibt deshalb fail-closed deaktiviert und erklärt den Remote-Blocker, statt einen funktionsfähigen Passkey vorzutäuschen.

### TOTP

Der erste produktive Enrollment-Aufruf erreichte Supabase erfolgreich und legte einen TOTP-Faktor im Status `unverified` an. Weitere Versuche scheiterten danach mit `mfa_factor_name_conflict`.

Reparatur:
- pending TOTP-Faktoren werden im Security-UI sichtbar und entfernbar,
- vor erneutem Enrollment wird ausschließlich ein gleichnamiger unverifizierter Faktor bereinigt,
- verifizierte Faktoren werden nicht automatisch gelöscht,
- der in der Runtime entstandene unverifizierte Faktor wurde kontrolliert entfernt,
- Post-Readback: keine TOTP-Faktoren vorhanden.

### Key Vault

Die produktive Web-Runtime erreicht die vorhandenen Supabase-RPCs, aber die RPC-Aufrufe werden mit HTTP 401 abgewiesen:

- `capital_ai_list_user_provider_connections`
- `capital_ai_upsert_user_provider_secret`

Die RPCs und Tabellen existieren; die Root Cause liegt an der serverseitigen Admin-Credential der Web-Runtime, nicht am Browserformular.

Der Adapter akzeptiert jetzt nur:
- `sb_secret_...` oder
- einen Legacy-JWT mit `role=service_role`.

Ein Publishable Key im Secret-Slot wird vor Netzwerk-I/O abgelehnt. Ein upstream HTTP 401 wird als `provider_vault_admin_credential_rejected` projiziert, ohne Credential-Werte auszugeben.

## UX-/Routing-Reparaturen

- Web-Login, Google, E-Mail, Passkey und erfolgreiche TOTP-Verifikation führen statisch auf die Landingpage `/`.
- Caller-kontrollierte `next`-Ziele werden im Web-Login nicht übernommen.
- Konto wird in drei getrennte Seiten aufgeteilt:
  - `/profile`
  - `/profile/security`
  - `/profile/key-vault`
- Header und Mobile Drawer bieten Profil, Sicherheit, Key Vault und Logout.
- Security-Seite bietet Password-Recovery für E-Mail/Passwort-Konten.
- API-Key-Eingabe ist sichtbar; nur das Private Secret ist maskiert und besitzt einen Sichtbarkeitsschalter.
- Key Vault besitzt eine dauerhafte Provider-Auswahl. Aktuell ist ausschließlich der tatsächlich serverseitig implementierte Kraken-Adapter aktiv.
- Ein erfolgreich verifizierter Provider erhält einen klaren grünen Connection-State mit Fingerprint und Zeitstempel.
- Die öffentliche gelbe Preview-Leiste und die Preview-Viewport-Steuerung wurden entfernt.
- Der HTML-Bootstrap-Fallback ist zunächst unsichtbar und erscheint nur nach 10 Sekunden ohne erfolgreichen React-Seitenaufbau.

## Bewusst nicht vorgenommen

### Multi-Key-Schema

Das aktuelle Vault-Schema hat `unique(user_id, provider)` und damit einen aktiven Credential-Slot je Provider. Mehrere parallele Kraken-Credentials würden eine persistente Schema-/RPC-/Route-Änderung benötigen. Diese Architekturänderung wird nicht stillschweigend eingeführt.

### Supabase Passkey Production Config

Kein Management-API-Token ist über die verfügbaren Tools zugänglich. Es wurde deshalb keine nicht-verifizierbare Auth-Konfigurationsmutation behauptet oder durchgeführt.

### Render Secret

Die aktuelle Admin-Credential wird durch Supabase live mit 401 abgewiesen. Eine Secret-Rotation bzw. ein Runtime-Env-Update ist ein separater privilegierter Schritt und benötigt einen bestätigten Render-Workspace sowie eine gültige neue Supabase Secret-Key-Credential.

## Production Gates

Ein Merge allein reicht nicht. Nach Auslieferung müssen mindestens Browser-Evidence für Login/Logout, Account-Routing, Badge-Assets, Password Recovery, TOTP Enrollment und Vault-Readback korreliert werden. Passkey-E2E ist erst nach erfolgreichem Supabase-Config-Readback zulässig.
