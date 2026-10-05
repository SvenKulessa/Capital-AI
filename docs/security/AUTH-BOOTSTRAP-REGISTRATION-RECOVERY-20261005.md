# Auth-/Bootstrap-Runtime-Reparatur — 2026-10-05

## Baseline

- Repository: `SvenKulessa/Capital-AI`
- Basis: `main@9c5fc40318cf538308724c2efb18441185e8cbae`
- Branch: `capital-ai-trust/bootstrap-registration-recovery-mfa-buddy-20261005`

## Reale Runtime-Evidence

### Registrierung

Supabase Auth lieferte bei `POST /auth/v1/signup` HTTP 500 mit:

`null value in column "granted" of relation "user_consents" violates not-null constraint`

Der Fehler lag nicht an der Passwortlänge. Der Trigger `public.handle_new_user()` konnte bei fehlendem optionalem Marketing-Consent SQL-NULL in die NOT-NULL-Spalte `granted` schreiben.

### TOTP

Supabase Auth akzeptierte `POST /auth/v1/factors` mit HTTP 200 und erzeugte einen Faktor mit Status `unverified`.
Der sichtbare `totp_enrollment_failed` entstand nach der erfolgreichen Supabase-Enroll-Anfrage im CAPITAL-AI-Verarbeitungspfad.

### Passkey

Supabase Auth antwortet aktuell auf `/auth/v1/passkeys` mit `404 passkey_disabled`.
Passkey-E2E bleibt daher bis zur verifizierten Remote-Aktivierung blockiert.

### Password Recovery

`POST /auth/v1/recover` ist erfolgreich. Beim getesteten Fehlerfall wurde kein nachfolgender Supabase-`/verify`-Call beobachtet.
Der First-Party-Verify-Pfad akzeptierte Token-Hashes erst ab 20 Zeichen, während der zulässige Auth-Mail-Contract bereits kürzere Hashes vorsieht.

### Key Vault

Der Key-Vault-Code bleibt fail-closed. Die Web-Runtime erhält von Supabase HTTP 401 für die Admin-RPCs.
Ein neuer `sb_secret_...`-Key darf nicht erfunden oder aus Clientdaten abgeleitet werden. Die Runtime-Credential muss separat auf Render korrigiert beziehungsweise rotiert werden.

## Reparaturen

- Kein zeitgesteuerter Bootstrap-Fallback mehr.
- Landingpage/React startet unmittelbar.
- Fail-Closed-Bootstrap-Fenster wird nur bei realem Entry-Script-/Bootstrap-Fehler sichtbar.
- Registrierung verlangt Passwort und Passwortbestätigung.
- Registrierung validiert Terms + Privacy serverseitig; Marketing bleibt optional.
- Trigger-Fix verwendet `coalesce(..., 'false')` für optionale Boolean-Metadaten.
- Recovery-Token-Hash-Untergrenze auf den unterstützten Bereich korrigiert.
- Ungültige/abgelaufene Recovery-Links landen in einer kontrollierten UI statt einer rohen Fehlerantwort.
- TOTP-Enroll-Response erhält ein explizites, weiterhin begrenztes Response-Budget und Issuer `CAPITAL-AI`.
- Hero Buddy ist persistent ausblendbar und zwischen vier sicheren Positionen verschiebbar.
- Profil kann einen ausgeblendeten Hero Buddy wieder aktivieren.

## Noch nicht ausgeführt

- keine Production-DB-Migration angewendet
- kein Supabase Auth Management PATCH
- kein Render-Secret geändert
- kein Render-Deploy manuell ausgelöst
- kein Passkey-Production-Claim

Ein grüner PR ist keine Production-Freigabe. Die DB-Migration, Auth-Remote-Konfiguration und Render-Secret-Rotation bleiben separate, evidenzbasierte Mutationen.
