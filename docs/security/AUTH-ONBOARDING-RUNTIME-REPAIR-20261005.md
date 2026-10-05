# AUTH / Onboarding / Runtime Repair — 2026-10-05

## Baseline

- Repository: SvenKulessa/Capital-AI
- Base: main@9c5fc40318cf538308724c2efb18441185e8cbae
- Branch: capital-ai-trust/auth-onboarding-runtime-repair-20261005

## Runtime-Evidence

### Bootstrap

Die bisherige HTML-Fallback-Seite wurde zeitbasiert nach 10 Sekunden sichtbar, unabhängig davon, ob ein echter Bootstrap-Fehler vorlag. Das widersprach dem gewünschten fail-closed Verhalten.

Ziel:
- Landingpage startet direkt.
- Route-Suspense zeigt nur einen neutralen Ladezustand.
- Das gebrandete Bootstrap-Fehlerfenster wird nur nach einem echten Script-/Module-/Promise-Bootstrapfehler sichtbar.
- Ohne JavaScript bleibt eine noscript-Wiederherstellungsanzeige möglich.

### Registrierung

Production Auth-Log für den fehlgeschlagenen E-Mail-Signup zeigte HTTP 500 `unexpected_failure`.

Datenbankursache:
`public.handle_new_user()` schrieb bei fehlendem optionalem `marketing_consent` SQL NULL in `public.user_consents.granted NOT NULL`.

Die fehlgeschlagene Testregistrierung hinterließ keinen Benutzer in `auth.users`.

Branch-Fix:
- Passwort wird bei Registrierung zweimal eingegeben und serverseitig verglichen.
- mindestens 14 Zeichen
- AGB-Akzeptanz erforderlich
- Datenschutzhinweis-Bestätigung erforderlich
- Marketing-Einwilligung optional
- Consent-Metadaten werden an Supabase Signup übergeben
- Migration macht optionales Marketing-Consent null-sicher.

Die Migration ist im Repository vorbereitet, aber noch nicht gegen Production ausgeführt.

### Password Recovery

Der Repository-Contract verwendet für Recovery ausschließlich den first-party Token-Hash-Pfad:

`/api/auth/email/verify?token_hash=...&type=recovery`

Dieser verifiziert serverseitig gegen Supabase, schreibt HttpOnly-Secure-Cookies und leitet anschließend nach `/login?mode=reset`.

Im Production Auth-Log war nach einer erfolgreichen `/recover`-Anforderung kein nachfolgender `/verify`-Request sichtbar. Das spricht für Drift der aktuell aktiven Remote-Recovery-Mailvorlage bzw. des aktiven Auth-Mail-Contracts. Der Repository-Template-Contract bleibt korrekt; Remote-Template-Readback/Apply bleibt separat.

### Passkey

Vor der vom Owner vorgenommenen Aktivierung meldete Supabase `passkey_disabled`.

Eine zusätzliche Render-Runtime-Variable ist für Passkey nicht vorgesehen. Laufzeit-Passkey verwendet die bestehende Supabase URL/Publishable-Key/Session-Konfiguration. Die Passkey-/WebAuthn-Schalter, RP-ID und RP-Origin liegen in Supabase Auth.

Erforderliche Remote-Werte:
- passkey_enabled = true
- webauthn_rp_id = capital-ai.online
- webauthn_rp_origins = https://capital-ai.online
- webauthn_rp_display_name = CAPITAL-AI

### TOTP

Production Supabase akzeptierte `POST /factors` mit HTTP 200 und erzeugte einen `factor_in_progress`. Der Client sah trotzdem `totp_enrollment_failed`.

Branch-Fix:
- TOTP-Enrollment-Payload akzeptiert direkte und geschachtelte Antwortformen.
- Secret kann bei Bedarf aus der `otpauth://` URI abgeleitet werden.
- bereits als `data:` URL gelieferte QR-Codes werden nicht doppelt encoded.
- bestehende unverified Same-Name-Faktoren werden vor Re-Enrollment weiterhin fail-closed entfernt.

Aktuell existiert ein unverified TOTP-Faktor aus dem fehlgeschlagenen Versuch. Er wird nicht außerhalb des vom Benutzer ausgelösten Enrollment-Flows automatisch mutiert.

### Key Vault

Production-RPCs erreichen Supabase, werden aber mit HTTP 401 abgewiesen. Der Backend-Code akzeptiert nur:
- `sb_secret_...`, oder
- Legacy-JWT mit `role=service_role`.

Damit ist die aktuelle serverseitige Admin-Credential der Web-Runtime weiterhin ein Runtime-Konfigurationsproblem. Kein Secret wird im Repository oder in dieser Evidence gespeichert.

## UX

- Hero Buddy kann persistent links/rechts positioniert oder ausgeblendet werden.
- Ein Hero-Open-Event macht einen ausgeblendeten Buddy wieder sichtbar.
- Signup zeigt Passwortbestätigung und Consent-Felder.
- Fallback wird nicht mehr durch bloße Zeitüberschreitung sichtbar.

## Separate Handoffs

### PLATFORM
- Render Runtime-Credential für den Key Vault prüfen/korrigieren.
- Production-Deploy und Runtime-Digest separat korrelieren.

### GROWTH
Social-Content-Connectoren und Social Login nicht vermischen:
- X / LinkedIn / Twitch / Notion: OAuth-Identity und Publishing-Scopes separat modellieren.
- MetaMask: Web3-Wallet-Identity (SIWE/EIP-4361), kein Social-Publishing-Connector.
- ChatGPT/OpenAI: als API-/MCP-/App-Integration für Content-Workflows, nicht als Supabase Social-Login-Provider.

## Production Gates

Ein Merge ist keine Production-Freigabe. Offen bleiben:
- Migration Review + explizite Production-Anwendung
- Remote Auth-Template Readback/Apply
- Render Credential Fix
- Passkey Runtime Readback/E2E
- TOTP Enrollment/Verify E2E
- Registration/Confirmation/Recovery E2E
- Desktop/Mobile Browser Smoke
