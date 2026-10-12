# CAPITAL-AI X OAuth — Supabase Edge Vault

**Scope:** X-OAuth-State, einmalige State-Verwendung, verschlüsselte X-Kontoverknüpfung und lesender X-Kontostatus. Keine direkte Social-Veröffentlichung.

## Architektur und Trust Boundary

Der Render-Webservice prüft die bestätigte Supabase-Benutzersitzung und die IAM-Rolle `owner`. Er übergibt den nur serverseitig lesbaren Supabase-Access-JWT über TLS an die eigene Supabase Edge Function `capital-social-x-vault`. Diese validiert den JWT **erneut** über Supabase Auth und fragt `profiles.iam_role` mit der Benutzeridentität ab. Nur ein E-Mail-bestätigter IAM-Owner darf die Operationen `begin`, `consume`, `persist` und `status` ausführen.

Die Edge Function verwendet den von Supabase bereitgestellten Service-Role-Schlüssel ausschließlich **innerhalb von Supabase**. Render verwendet für diesen X-Vault nur `SUPABASE_URL` und den öffentlichen `SUPABASE_PUBLISHABLE_KEY` beziehungsweise die zulässige Anon-Key-Alternative, niemals den Service-Role-Schlüssel. Die Funktion besitzt keine Browser-CORS-Freigabe, liefert keine Zugangstokens, einen öffentlichen Schreibendpunkt oder Provider-Publish-Route.

Der Browser bekommt ausschließlich einen Redirect zur offiziellen X-Autorisierung und später den leeren Callback. Auth-Code und Code-Verifier sind an eine zehn Minuten gültige, nutzer- und redirectgebundene State-Identität gebunden. Der State wird durch das vorhandene atomare SQL-RPC genau einmal verbraucht. Render tauscht danach den OAuth-Code gegen Access/Refresh-Tokens, prüft `GET /2/users/me` und verschlüsselt die Tokens mittels AES-256-GCM mit einem nur serverseitigen X-Verschlüsselungsschlüssel. Die Edge Function prüft den bereits verschlüsselten Datensatz und bestätigt das persistierte `user_id`/X-Konto, ohne Ciphertext zurückzugeben. Ein separater owner-only `status`-Endpunkt ruft die Datenbank ohne zusätzlichen X-API-Aufruf ab.

**Vertrauensgrenze:** Ein entwendeter Owner-JWT würde Zugriff auf Owner-Funktionen gestatten. Deswegen bleiben JWT, OAuth-State, PKCE und Ciphertext serverseitig; die Edge Function überprüft Nutzeridentität, E-Mail-Bestätigung und IAM nochmals. Die Identitätsbestätigung des tatsächlichen X-Profils erfolgt vor der Speicherung in Render durch X `/2/users/me`; Edge selbst validiert keine X-Signatur. Der X-Zugang ist ausschließlich für den persönlichen Owner vorgesehen.

## Release und Aktivierung

1. Auf `main` und Render: funktionierender `PUBLIC_APP_ORIGIN=https://capital-ai.online`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SOCIAL_X_OAUTH_CLIENT_ID`, `SOCIAL_X_OAUTH_CLIENT_SECRET`, `SOCIAL_X_TOKEN_ENCRYPTION_KEY`, `SOCIAL_X_OAUTH_CONNECT_ENABLED=true`, `SOCIAL_OAUTH_CALLBACK_ENABLED=true`.
2. Supabase `capital-social-x-vault` aus `supabase/functions/capital-social-x-vault/index.ts` **mit `verify_jwt=true` deployen**. Supabase stellt `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` für Edge Functions zur Verfügung. Keiner dieser Schlüssel wird in Browsercode übernommen.
3. In Render nur `SOCIAL_X_EDGE_STORE_ENABLED=true` aktivieren, *nachdem* Edge auf der korrekten produktiven Projekt-ID bereit und der neue Render-Code LIVE ist. Die Edge-Rolle und Owner-Sitzung müssen wirklich funktionieren. Bei Edge-Fehlern fail-closed; **nicht** automatisch auf den alten Service-Key-Pfad ausweichen.
4. Owner meldet sich mit E-Mail-bestätigtem IAM-Owner-Konto auf CAPITAL-AI an und öffnet **im selben Browser** `https://capital-ai.online/api/social-media/x/auth/start`. Er autorisiert in der offiziellen X-OAuth-Ansicht die erwarteten Scopes `tweet.read tweet.write users.read offline.access`.
5. Anschluss anhand `/api/social-media/x/account/status` und eines read-only SQL-Readbacks von `social_media_accounts` prüfen (nur Status, Handle, Scope, Zeitpunkt; keine verschlüsselten Tokenwerte ausgeben). Bei Fehlern 503 keine Veröffentlichung, neue Auth nur nach Ursachenbehebung.

## Tests und Governance

- `node --test server/social-media/x-edge-client.test.mjs server/social-media/x-edge-vault.test.mjs` testet synthetisch JWT- und Owner-Grenzen sowie State-Transport.
- `npm run test:x-oauth`, `npm run test:social-provider`, Docker Security Gate, Domain Governance, CodeQL und alle anwendbaren Checks am aktuellen PR-Head prüfen.
- Keine Produktion aktivieren, solange Tests oder CI ausstehend sind. Live-Readback und Konto-Verknüpfung getrennt nachweisen.

## Bestandsschutz und Kosten

`SUPABASE_SECRET_KEY` bleibt für **andere bestehende Render-Komponenten** wie Checkout, Account- und Nutzer-Vault relevant. Er darf **nicht global aus Render entfernt** werden, bevor sämtliche fremden Serverzugriffe migriert und getestet wurden. Der X-Edge-Pfad benötigt ihn nicht. Rücknahme: `SOCIAL_X_EDGE_STORE_ENABLED=false` deaktiviert nur den Edge-Zweig; aus Security-Gründen vorhandenen Admin-Key nicht als unkontrollierten automatischen Fallback verwenden. Token-Verschlüsselungsschlüssel niemals unkoordiniert ersetzen.

Supabase Edge-Aufrufe verursachen möglicherweise abrechenbare Invocations, CPU/Netzwerk und Speichernutzung; aktueller Tarif und Grenzwerte `NOT_PROVEN`. Der X-Nutzer-Readback kann kostenpflichtig sein; keine X-Schreiboperation ohne eigene Publish-Freigabe. `SOCIAL_PROVIDER_PUBLISH_ENABLED`, `SOCIAL_X_PUBLISH_ENABLED` und `SOCIAL_X_PAID_WRITE_APPROVED` bleiben unabhängig davon aus.

Quellen: https://supabase.com/docs/guides/functions/auth , https://supabase.com/docs/guides/functions/secrets , https://docs.x.com/x-api/users/get-my-user .
