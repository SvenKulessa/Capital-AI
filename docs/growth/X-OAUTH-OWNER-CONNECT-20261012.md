# CAPITAL-AI — Persönliches X-Profil anbinden (2026-10-12)

Status: **DEVELOPMENT / NICHT LIVE**. Keine API-Credits, Nutzerfreigaben, Tokens, Publishing-IDs oder vollständig grüne CI-Checks werden aus einem Source-Commit abgeleitet.

## Technischer Umfang

- X Developer-App: `Web App, Automated App or Bot`; OAuth 2.0 PKCE S256; Scopes `tweet.read tweet.write users.read offline.access`.
- In X registrierte Redirect-URI: `https://capital-ai.online/api/social-media/auth/callback` (ohne Query).
- Durch IAM als **Owner** autorisierter, E-Mail-bestätigter CAPITAL-AI-Nutzer startet einen Zustands- und PKCE-gebundenen Authorization-Code-Flow über `/api/social-media/x/auth/start`.
- Callback bindet X auch ohne `channel=X`-Parameter anhand des serverseitig gespeicherten, atomar konsumierten OAuth-State; keine Tokens werden an den Browser ausgegeben.
- Token-Austausch nutzt X `POST /2/oauth2/token` mit vertraulichem OAuth-Client; Identitätsreadback erfolgt mit `GET /2/users/me` und wird **möglicherweise abgerechnet**.
- Nur erfolgreich auf Serverebene geprüftes X-Profil wird mit AES-256-GCM-verschlüsselten Access- und Refresh-Tokens an die authentifizierte Supabase-User-ID in `social_media_accounts` gebunden. Supabase-Readback muss die komplette Account-Identität und die verschlüsselten Werte bestätigen.
- Nach der Verknüpfung liefert die nur für den verifizierten Owner zugängliche Route `/api/social-media/x/account/status` per eingeschränktem Supabase-Readback ausschließlich Account-ID, Handle, Scopes, Verbindungsstatus und Ablaufzeit; **keine Token-Felder** und **keine zusätzliche X-API-Abfrage**.
- Kein direkter Post, kein Publish-Trigger, kein automatischer Token-Refresh, kein allgemeiner Self-Service-Social-OAuth. Vorhandene X-Publishing-Gates bleiben **AUS**.

## Secrets und Freigaben (Render-Webservice CAPITAL-AI)

**Geheim und nur in Render Environment**, nicht in GitHub, Screenshots, Browser-Code oder Chat:

- `SOCIAL_X_OAUTH_CLIENT_ID`: aus der X Developer Console.
- `SOCIAL_X_OAUTH_CLIENT_SECRET`: aus der X Developer Console.
- `SOCIAL_X_TOKEN_ENCRYPTION_KEY`: unabhängiger, zufälliger 32-Byte-Schlüssel. Akzeptiert werden **64 Hexadezimalzeichen** (z. B. `openssl rand -hex 32`) oder **kanonisches, gepaddetes Base64 mit exakt 44 Zeichen** (Render `generateValue: true` erzeugt einen 256-Bit-Wert in Base64). Nur exakt 32 Byte dekodierte Schlüssellänge ist gültig; ungültige Formate bleiben fail-closed. Bestehenden Schlüssel nicht neu generieren oder rotieren: Eine Rotation benötigt ein koordiniertes Re-Encryption-Verfahren.
- `PUBLIC_APP_ORIGIN=https://capital-ai.online`, gültige Supabase-Service-Role-Credentials und produktive Social-OAuth-Migration.

Zur erstmaligen Aktivierung **erst nach bestandenen Checks und Live-Datenbank-/Auth-Readbacks**:
`SOCIAL_X_OAUTH_CONNECT_ENABLED=true` und `SOCIAL_OAUTH_CALLBACK_ENABLED=true`.

Bestehende Veröffentlichungssperren bleiben unabhängig davon erhalten:
`SOCIAL_PROVIDER_PUBLISH_ENABLED=false`, `SOCIAL_X_PUBLISH_ENABLED=false` und `SOCIAL_X_PAID_WRITE_APPROVED=false`, sofern nicht gesondert autorisiert und abgenommen.

## Owner-Only-Konfigurationsdiagnose ohne Secrets

Bei `{"error":"social_x_oauth_not_configured"}` wird die Anfrage **vor Authentifizierung und vor dem Edge-Call** abgelehnt. Die konfigurierte X-Supabase-Login-Provider-Option ist nicht die X-Content-Engine-OAuth-App.

Der bestätigte CAPITAL-AI-Owner öffnet **im gleichen angemeldeten Browser**:
`https://capital-ai.online/api/social-media/x/account/diagnostics`

Die `GET`-Route ist ausschließlich für E-Mail-bestätigte IAM-Owner sichtbar; ansonsten antwortet sie mit `404 not_found`. Sie liefert `ready`, `mode` und **nur boolesche** Checks (`oauthConnectEnabled`, `oauthCallbackEnabled`, `appOrigin`, `xClientId`, `xClientSecret`, `tokenEncryptionKey`, `supabaseUrl`, `supabaseCredential`, `edgeWorkloadKey`). Es gibt **keine Werte, Längen, Key-Fragmente, JWTs, Header, Provider-API-Anfragen, Datenbankzugriffe oder öffentliche Konfigurationsdetails** zurück. Cache ist deaktiviert. Nur mit `ready: true` ist der nächste X-OAuth-Start zu versuchen; die tatsächliche Edge-Workload-Signatur/Owner-Sitzung wird erst im folgenden Flow getestet.

Ein fehlgeschlagener Check darf ausschließlich an der betroffenen Render-Variablen behoben werden. Den X-Token-Verschlüsselungsschlüssel und den separaten Edge-Workload-Key nicht versehentlich verwechseln oder routinemäßig rotieren. Wird `tokenEncryptionKey: false` angezeigt, ist ausschließlich ein syntaktisch gültiger, zufälliger 32-Byte-Key in kanonischem Hex oder gepaddetem Base64 anzustreben; vor einer Änderung vorhandene verschlüsselte Tokens und Recovery-Plan prüfen. Keine Schlüssel in GitHub, Chat, Bilder oder Logausgaben kopieren.

## Abnahme

1. `node --test server/social-media/x-oauth-start.test.mjs server/social-media/x-oauth-exchange.test.mjs server/social-media/oauth-callback.test.mjs server/social-media/x-account-status.test.mjs` lokal.
2. PR: Docker Security Gate, Domain Governance und alle anwendbaren Pipeline-Checks am aktuellen Head.
3. Owner meldet sich am CAPITAL-AI-Portal mit bestätigtem Owner-Konto an und öffnet `/api/social-media/x/auth/start` (nur nach Release und Freigabeschaltern).
4. Nach interaktiver X-OAuth-Zustimmung X-Account-Eintrag **read-only** prüfen: owner-gebunden, Status `connected`, X-ID/Handle, Scopes, Ciphertext und Ablaufzeit (keine Secrets auslesen).
5. Erst später über die getrennte Social-Publishing-Pipeline mit nachweisbarer Asset-Freigabe, begrenztem API-Budget, X Post-ID und eigenständigem Provider-Readback veröffentlichen.

Provider-Dokumentation: https://docs.x.com/x-api/users/get-my-user ; https://docs.x.com/x-api/getting-started/pricing

**Datenschutz:** Vor der Live-Aktivierung der OAuth-Verknüpfung die Informationen zu X/Supabase-Datenempfängern, Profilinformationen, tokenisierter Verknüpfung, gespeicherten verschlüsselten Tokens, Widerruf und Speicherfristen mit der öffentlichen Datenschutzerklärung abstimmen. Keine Speicherung von Tokens im Klartext, keine automatische öffentliche Aktivierung.
