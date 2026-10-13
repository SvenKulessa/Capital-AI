# CAPITAL-AI X OAuth — Supabase Edge Vault

**Scope:** X-OAuth-State, einmalige State-Verwendung, verschlüsselte X-Kontoverknüpfung und lesender X-Kontostatus. Keine direkte Social-Veröffentlichung.

## Architektur und Trust Boundary

Der Render-Webservice prüft die bestätigte Supabase-Benutzersitzung und die IAM-Rolle `owner`. Er übergibt den nur serverseitig lesbaren Supabase-Access-JWT über TLS an die eigene Supabase Edge Function `capital-social-x-vault`. Zusätzlich signiert Render **jeden exakten Edge-Request (Zeitstempel, JWT, Body)** mit einem unabhängigen 256-Bit-HMAC-Workload-Schlüssel; Edge prüft die Signatur konstantzeitnah und verwirft Zeitstempel außerhalb eines 60-Sekunden-Fensters **vor** Supabase-Auth-/DB-Zugriff. Der JWT allein reicht für die privilegierten Edge-Operationen nicht aus. Diese validiert den JWT **erneut** über Supabase Auth und fragt `profiles.iam_role` mit der Benutzeridentität ab. Nur ein E-Mail-bestätigter IAM-Owner darf die Operationen `begin`, `consume`, `persist` und `status` ausführen.

Die Edge Function verwendet den von Supabase bereitgestellten Service-Role-Schlüssel ausschließlich **innerhalb von Supabase**. Die separate Workload-Signatur bindet privilegierte Anfragen an den autorisierten Render-Service; ein User-JWT allein kann keine X-Verbindung vortäuschen. Render verwendet für diesen X-Vault nur `SUPABASE_URL` und den öffentlichen `SUPABASE_PUBLISHABLE_KEY` beziehungsweise die zulässige Anon-Key-Alternative, niemals den Service-Role-Schlüssel. Die Funktion besitzt keine Browser-CORS-Freigabe, liefert keine Zugangstokens, einen öffentlichen Schreibendpunkt oder Provider-Publish-Route.

Der Browser bekommt ausschließlich einen Redirect zur offiziellen X-Autorisierung und später den leeren Callback. Auth-Code und Code-Verifier sind an eine zehn Minuten gültige, nutzer- und redirectgebundene State-Identität gebunden. Der State wird durch das vorhandene atomare SQL-RPC genau einmal verbraucht. Render tauscht danach den OAuth-Code gegen Access/Refresh-Tokens, prüft `GET /2/users/me` und verschlüsselt die Tokens mittels AES-256-GCM mit einem nur serverseitigen X-Verschlüsselungsschlüssel. Die Edge Function prüft den bereits verschlüsselten Datensatz und bestätigt das persistierte `user_id`/X-Konto, ohne Ciphertext zurückzugeben. Ein separater owner-only `status`-Endpunkt ruft die Datenbank ohne zusätzlichen X-API-Aufruf ab.

**Vertrauensgrenze:** Ein entwendeter Owner-JWT würde Zugriff auf Owner-Funktionen gestatten. Deswegen bleiben JWT, OAuth-State, PKCE und Ciphertext serverseitig; die Edge Function überprüft Nutzeridentität, E-Mail-Bestätigung und IAM nochmals. Die Identitätsbestätigung des tatsächlichen X-Profils erfolgt vor der Speicherung in Render durch X `/2/users/me`; Edge selbst validiert keine X-Signatur. Der X-Zugang ist ausschließlich für den persönlichen Owner vorgesehen.

## Release und Aktivierung

1. Auf `main` und Render: funktionierender `PUBLIC_APP_ORIGIN=https://capital-ai.online`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SOCIAL_X_OAUTH_CLIENT_ID`, `SOCIAL_X_OAUTH_CLIENT_SECRET`, `SOCIAL_X_TOKEN_ENCRYPTION_KEY`, `SOCIAL_X_OAUTH_CONNECT_ENABLED=true`, `SOCIAL_OAUTH_CALLBACK_ENABLED=true`.
   Für den Edge-Modus zusätzlich **`SOCIAL_X_EDGE_WORKLOAD_SECRET` in Render UND in Supabase Edge Function Secrets** mit *demselben* zufälligen 32-Byte-Schlüssel als **64 Hex-Zeichen** oder **kanonisch gepaddetes Base64 (44 Zeichen)** setzen. Entweder lokal mit `openssl rand -hex 32` generieren oder den neuen Key von Render generieren lassen und dort über die geschützte Oberfläche kopieren. Den **identischen** Wert direkt in das Supabase-Dashboard unter Edge Functions → Secrets setzen; niemals in Chat, Repository, Build-/CI-Logs oder Browser kopieren. Das ist ein eigener, eng begrenzter HMAC-Workload-Schlüssel, **kein Supabase-Service-Role-Key**. Bei fehlendem oder ungleichem Wert verweigert Edge jeden Zugriff (503). Den Schlüssel nicht durch einfaches Regenerieren einseitig rotieren.
2. Erst nachdem die produktiven Edge Secrets für den signierten Workload-Kanal gesetzt sind: Supabase `capital-social-x-vault` aus `supabase/functions/capital-social-x-vault/index.ts` **mit `verify_jwt=true` deployen**. Supabase stellt `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` für Edge Functions zur Verfügung. Keiner dieser Schlüssel wird in Browsercode übernommen.
3. In Render nur `SOCIAL_X_EDGE_STORE_ENABLED=true` aktivieren, *nachdem* Edge auf der korrekten produktiven Projekt-ID bereit und der neue Render-Code LIVE ist. Die Edge-Rolle, Owner-Sitzung und HMAC-Workload-Signatur müssen wirklich funktionieren. Bei Edge-Fehlern fail-closed; **nicht** automatisch auf den alten Service-Key-Pfad ausweichen.
4. Owner meldet sich mit E-Mail-bestätigtem IAM-Owner-Konto auf CAPITAL-AI an und öffnet **im selben Browser** `https://capital-ai.online/api/social-media/x/auth/start`. Er autorisiert in der offiziellen X-OAuth-Ansicht die erwarteten Scopes `tweet.read tweet.write users.read offline.access`.
5. Anschluss anhand `/api/social-media/x/account/status` und eines read-only SQL-Readbacks von `social_media_accounts` prüfen (nur Status, Handle, Scope, Zeitpunkt; keine verschlüsselten Tokenwerte ausgeben). Bei Fehlern 503 keine Veröffentlichung, neue Auth nur nach Ursachenbehebung.

## Tests und Governance

- `node --test server/social-media/x-edge-client.test.mjs server/social-media/x-edge-vault.test.mjs` testet synthetisch JWT-, Owner- und Workload-HMAC-Grenzen, abgelaufene Signaturen, manipulierte Bodies sowie State-Transport.
- `npm run test:x-oauth`, `npm run test:social-provider`, Docker Security Gate, Domain Governance, CodeQL und alle anwendbaren Checks am aktuellen PR-Head prüfen.
- Keine Produktion aktivieren, solange Tests oder CI ausstehend sind. Live-Readback und Konto-Verknüpfung getrennt nachweisen.

## Bestandsschutz und Kosten

`SUPABASE_SECRET_KEY` bleibt für **andere bestehende Render-Komponenten** wie Checkout, Account- und Nutzer-Vault relevant. Er darf **nicht global aus Render entfernt** werden, bevor sämtliche fremden Serverzugriffe migriert und getestet wurden. Der X-Edge-Pfad benötigt ihn nicht. Rücknahme: `SOCIAL_X_EDGE_STORE_ENABLED=false` deaktiviert nur den Edge-Zweig; aus Security-Gründen vorhandenen Admin-Key nicht als unkontrollierten automatischen Fallback verwenden. Token-Verschlüsselungsschlüssel niemals unkoordiniert ersetzen.

Supabase Edge-Aufrufe verursachen möglicherweise abrechenbare Invocations, CPU/Netzwerk und Speichernutzung; aktueller Tarif und Grenzwerte `NOT_PROVEN`. Der X-Nutzer-Readback kann kostenpflichtig sein; keine X-Schreiboperation ohne eigene Publish-Freigabe. `SOCIAL_PROVIDER_PUBLISH_ENABLED`, `SOCIAL_X_PUBLISH_ENABLED` und `SOCIAL_X_PAID_WRITE_APPROVED` bleiben unabhängig davon aus.

Quellen: https://supabase.com/docs/guides/functions/auth , https://supabase.com/docs/guides/functions/secrets , https://docs.x.com/x-api/users/get-my-user .


 
## Owner-only Diagnose bei `social_x_oauth_unavailable`

Erreicht der OAuth-Start nach erfolgreicher lokaler Konfigurations- und IAM-Owner-Prüfung keinen X-Redirect, meldet `/api/social-media/x/auth/start` für **dieses bestätigte Owner-Konto** ein zusätzliches `diagnostic`-Feld. Es stammt ausschließlich aus einer festgelegten Zuordnung von bekannten internen Fehlercodes; rohe Exception-Meldungen, JWTs, API-Schlüssel, OAuth-State, PKCE-Verifier, Request-URLs und Provider-Payloads werden nie ausgegeben.

- `edge_workload_key_invalid`: Der Render-seitige `SOCIAL_X_EDGE_WORKLOAD_SECRET` fehlt oder erfüllt nicht exakt die 32-Byte-Hex-/kanonische Base64-Anforderung. Den Wert ausschließlich in Render bzw. Supabase Edge Secrets prüfen und niemals im Chat veröffentlichen.
- `edge_owner_session_token_unavailable`: Kein geeignetes Supabase-Access-JWT für die eingeloggte Owner-Sitzung; erneut im CAPITAL-AI-Portal anmelden, anschließend Auth-IAM intern prüfen.
- `edge_request_rejected`: Ein Request wurde vom Edge-Gateway, von JWT/HMAC-/Owner-Prüfung oder von der Supabase-Datenbank abgewiesen. Mit Supabase Edge Request-/Function-Logs korrelieren; weder Schlüssel austauschen noch Sicherheitsprüfungen deaktivieren.
- `edge_network_unavailable`, `edge_response_invalid`, `edge_state_not_confirmed`: Netzwerk, Antwort oder persistierter State konnte nicht bestätigt werden.
- `internal_unclassified`: Nicht freigegebene Fehlermeldung; keine Details an Browser ausgeben. Die tatsächliche Ursache muss serverseitig isoliert untersucht werden.

`diagnostic` wird erst **nach** bestätigter IAM-Owner-Rolle und verifizierter E-Mail im X-Startpfad erzeugt. Nicht-Owner sehen die unveränderte 403-Antwort, fehlende Sitzungen 401. Vor erfolgreichem 303-Redirect wurde **kein** X-API-Veröffentlichungsaufruf ausgelöst. Der Diagnostic-Response ist `no-store`, `no-referrer` und `noindex`.

Diese Diagnose wird mit `node --test server/social-media/x-oauth-start.test.mjs` und den normalen Security-Gates regressionsgeprüft. Der tatsächliche Produktionsfehler bleibt bis zum Owner-Readback `NOT_PROVEN`.

## Callback-Abschluss und sichere Operator-Diagnose (13.10.2026)

Nach erfolgreichem X-Token-Exchange, Identitäts- und verschlüsseltem Persistenz-Readback
antwortet `/api/social-media/auth/callback` mit HTTP 303 auf
`/api/social-media/x/account/status`. Der read-only Status ist weiterhin nur
für die bestätigte IAM-Owner-Sitzung zugänglich. Ein erfolgreicher Redirect
bewirkt **keine** Social-Media-Veröffentlichung.

Bei einem bestätigten IAM-Owner, aber einem fehlgeschlagenen Callback, antwortet
der Server mit `social_oauth_callback_unavailable` und einer festen
`diagnostic`-Kategorie. Derzeit unterscheidbar sind:
`edge_request_rejected`, `edge_network_unavailable`,
`edge_owner_session_token_unavailable`, `edge_state_not_confirmed`,
`oauth_state_not_confirmed`, `oauth_pkce_invalid`,
`provider_token_exchange_rejected`, `provider_scopes_missing`,
`provider_identity_readback_rejected`, `vault_persistence_not_confirmed`
und `internal_unclassified`. Nicht-Owner erhalten weder die Diagnose noch
einen Zugriff auf OAuth-State oder Tokenwerte. Die Antwort enthält niemals
den eingehenden OAuth-Code, JWTs, Providerfehler, Secrets oder Ciphertext.

Ein einmalig konsumierter State lässt sich nach einem späteren Provider- oder
Persistenzfehler **nicht** erneut verwenden. Gegebenenfalls ist nach gezielter
Behebung ein neuer Owner-OAuth-Start erforderlich. Ein vorhandener
`connected`-Datensatz mit gültigen Scopes belegt eine frühere erfolgreiche
Verbindung, nicht zwingend das Verhalten jedes späteren OAuth-Versuchs.

Tests: `node --test server/social-media/oauth-callback.test.mjs`;
CI: normale PR-Security- und Domain-Governance-Checks.


## Owner Token-Lifecycle (Refresh, Rotation, Reconnect)

**Implementierung auf dem GROWTH-Branch, bis Merge + Edge-/DB-/Render-Readback: NOT_PROVEN.**
Der bisherige Vault-Bridge-Vertrag wurde um einen vom verifizierten Owner
ausgelösten Refresh erweitert. Zugriff ausschließlich als \`POST\` unter
\`/api/social-media/x/account/refresh\` oder
\`/api/social-media/youtube/account/refresh\`. Eine eingeloggte, bestätigte
IAM-Owner-Sitzung, exakter Same-Origin-POST, aktiver Edge-Store, gültige
Provider-Konfiguration, signierter Render→Supabase-Workload und die
Supabase-JWT-Prüfung sind zwingend. Der Browser sieht nur
\`{ channel, status, refreshed, expiresAt }\`, niemals Tokens,
Vault-Ciphertext, Provider-Payloads oder Lease-IDs.

Ablauf:
1. Der Edge Vault erwirbt per service_role-only \`SECURITY INVOKER\` RPC
   \`capital_social_claim_token_refresh\` eine einmalige 2-Minuten-Lease je
   \`user_id + platform\`, nur 10 Minuten vor Ablauf. Die RPC arbeitet als
   atomarer \`UPDATE ... RETURNING\` und verweigert weitere parallele Claims.
2. Nach signierter Owner-/Workload-Prüfung wird **nur an den Render-Server**
   der verschlüsselte Refresh-Token übertragen; Render entschlüsselt ihn mit
   dem bestehenden kanal- und Owner-gebundenen AES-256-GCM-AAD. Kein
   Supabase-Admin-Key verlässt die Edge Function.
3. X nutzt \`grant_type=refresh_token\` mit Basic-Client-Authentifizierung
   und **muss** einen neuen Refresh-Token liefern. YouTube nutzt Google OAuth
   und bewahrt das bisherige Refresh-Token, wenn Google keines rotiert.
   Vor Persistenz muss ein providerseitiger Account-Readback die gespeicherte
   X-User-ID bzw. YouTube-Channel-ID bestätigen; Scopes dürfen nicht schrumpfen.
4. \`capital_social_finish_token_refresh\` rotiert beide verschlüsselten
   Tokenwerte **atomar** nur bei passendem Lease-ID, noch gültiger Lease und
   identischem bisherigen Ciphertext (CAS). Der ursprüngliche OAuth-Connect
   setzt Lease/Retry/Reconnect zurück, um stale Refresh zu verhindern.
5. \`invalid_grant\`, andere unklare Providerantworten, Token-/Identitätsfehler
   und ambige Transport-/Persistenzfälle verhindern blindes Retry.
   \`reconnect_required\` wird gespeichert; ein neu autorisiertes OAuth-Connect
   ist danach der sichere Rückweg. Bei explizitem HTTP 429 gilt eine
   15-Minuten-Cooldown-Sperre; erneuter Owner-Aufruf danach ist möglich.
   Es gibt **keinen** automatischen Scheduler und keinen Provider-Publish.

Die Implementierung verursacht ggf. Provider-API-Read-Kosten, zusätzliche
Supabase Edge Invocations und Datenbank-RPCs. Aktuelle X-Tarife, Google-Quotas,
Supabase-Kontingente und Kostenobergrenzen **NOT_PROVEN**. Keine
kostenpflichtige Providerfreigabe oder neue Server-Ressource impliziert.
Insbesondere X-/YouTube-Readback wird nicht ungefragt produktiv ausgelöst.

Technische Prüfung:
\`\`\`bash
npm run test:x-oauth
npm run test:social-provider
bash scripts/social-provider-db-smoke.sh  # ausschließlich Disposable CI mit erlaubten Variablen
\`\`\`

Migration: \`20261013033000_capital_social_owner_token_refresh.sql\`.
Voraussetzungen in der Rollout-Reihenfolge: Docker Security Gate und Domain
Governance PASS → Migration auf korrektem Supabase Projekt → Edge Function
\`capital-social-x-vault\` mit \`verify_jwt=true\` bereitstellen → Render-Main
Deployment mit dem Merge-Commit → Owner-Readback ohne Secrets. Die Abfolge
wird gesondert nachgewiesen; bevor Migration/Edge bereit sind, bleibt der
Refresh-Endpunkt **fail-closed**. Rücknahme: Endpoint deaktivieren/revertieren,
Edge auf letzte geprüfte Version zurücksetzen; additive Lease-Felder bei
vorhandenen Token-Daten niemals ungeprüft löschen.

Externe technische Referenz:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://docs.x.com/
- https://supabase.com/docs/guides/functions/auth
