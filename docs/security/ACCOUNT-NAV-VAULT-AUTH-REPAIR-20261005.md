# Account Navigation, Vault und Auth Runtime Repair — 2026-10-05

## Basis

- Repository: `SvenKulessa/Capital-AI`
- Base: `main@c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84`
- Branch: `capital-ai-trust/account-nav-vault-auth-fix-20261005`

## Reale Runtime-Evidence

Mobile Browser Evidence vom 2026-10-05:

- Google Login funktioniert.
- Session/Subscription wird im Menü korrekt als Enterprise/Owner projiziert.
- Badge-Texte werden angezeigt, Bilder fehlen.
- Key Vault speichert Kraken-Credentials nicht.
- Passkey Registration endet mit `passkey_registration_options_failed`.
- TOTP Enrollment zeigte `totp_enrollment_failed`.

Supabase Auth Logs 10:14 UTC:

- `POST /passkeys/registration/options -> 404`
- `error_code=passkey_disabled`
- Passkeys sind damit remote im Supabase Auth-Projekt deaktiviert.

Supabase Auth Logs 10:14 UTC:

- `POST /factors -> 422`
- `error_code=mfa_factor_name_conflict`
- Der Konflikt gehörte zu den vorhandenen TOTP-Faktoren. Der bereits autorisierte Reset hat den MFA-Faktorbestand anschließend auf 0 reduziert.

Supabase Edge Logs 10:11–10:14 UTC:

- `capital_ai_upsert_user_provider_secret -> 401`
- `capital_ai_list_user_provider_connections -> 401`
- Die serverseitige Supabase-Admin-Credential des Render-Webdienstes wurde beim RPC nicht akzeptiert.

## Implementierte Reparaturen

### Build / Branding

- `public/branding/badges` wird explizit in den Docker-Build übernommen.
- Regressionstest prüft die sechs Account-Badges und den Docker-COPY-Vertrag.

### Production UI

- Preview-Banner und Preview-Geräteumschaltung aus dem Production-Viewport entfernt.
- Lazy-Route-Fallback zeigt vor Ablauf von 10 Sekunden kein Branding-Bild.
- Erst nach 10 Sekunden wird ein klarer Ladefehler mit Branding und Reload-Aktion angezeigt.

### Auth Navigation

- Erfolgreiche Anmeldung führt zur Landingpage `/`.
- Google OAuth verwendet `next=/`.
- E-Mail Login, Registrierung, Passkey und TOTP folgen derselben Landingpage-Konvention.
- Passwort-Recovery ist über `/login?mode=forgot` kanonisch erreichbar.

### Account Navigation

Drei getrennte Seiten:

- `/profile`
- `/security`
- `/key-vault`

Header und Mobile Drawer bieten diese Punkte unter dem authentifizierten Benutzer an.
Logout ist dort ebenfalls verfügbar und ruft serverseitig `/api/auth/logout` auf.

### Key Vault

- Provider-Auswahl ist als dauerhafte UI-Grenze angelegt; aktuell ist nur Kraken technisch zugelassen.
- API Key ist als sichtbares Textfeld ausgeführt.
- Private API Secret bleibt standardmäßig maskiert und besitzt eine explizite Sichtbarkeitsoption.
- Erfolgreiche Verbindung erhält eine grüne visuelle VERIFIED/VERBUNDEN-Evidence.
- Vault-Fehler blockieren Profil und Sicherheit nicht mehr.
- Neue `sb_secret_`-Keys werden für PostgREST-RPCs mit `apikey` und `Authorization: Bearer` gesendet.
- Publishable Keys werden nicht als Admin-Credential akzeptiert.
- Ein gültiger Legacy-`service_role`-Key kann als Fallback verwendet werden.

## Noch nicht durch diesen PR lösbar

### Passkey Remote Config

Code und UI können `passkey_disabled` nicht lokal überstimmen.
Erforderlich ist in Supabase Auth:

`passkey_enabled=true`

plus der bereits dokumentierte RP-Vertrag:

- RP ID: `capital-ai.online`
- RP Origin: `https://capital-ai.online`
- RP Display Name: `CAPITAL-AI`

Dafür ist ein Supabase Management-API-Apply oder eine Dashboard-Konfigurationsmutation erforderlich.

### Mehrere Kraken Credentials

Das aktuelle Vault-Schema erzwingt:

`unique (user_id, provider)`

Mehrere benannte Kraken-Credentials pro Benutzer benötigen deshalb eine neue DB-/Vault-Schema-Version. Diese Migration wird nicht implizit in diesem Repair-PR ausgeführt.

## Production-Grenze

Ein erfolgreicher PR-Check ist keine Production-Freigabe. Nach Merge/Deploy sind reale Browser-Smokes für Login, Logout, Recovery, Badge-Assets, Passkey, TOTP und Key Vault erforderlich.
