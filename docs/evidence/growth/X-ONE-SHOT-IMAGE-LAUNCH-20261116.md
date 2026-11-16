# GROWTH · X One-shot Medienlaunch – technische Evidence
Datum: 2026-11-16. Basis: main `136bfec79d0beedeee71ab25e01c304a2bc7b453`.
Policy: Root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`.
Scope: Ausschließlich Owner-only-X-Milestone-Pfad und dessen X-Publisher; kein autonomes Publishing.

## Änderungen
- Neue isolierte X-Launch-Route `/api/social-media/x/milestone/launch` mit Status/Publish und eigener Content-ID.
- `LAUNCH_CONTENT_KEY` ist an den exakten Posttext und die finale Infografik-SHA gebunden.
- Bildprüfung per Dateiread mit fester Pfadvorgabe, PNG-Signatur, Maximalgröße und SHA-256.
- `x_credentials` gibt nur `mediaWriteApproved: boolean` an den signierten Owner-Workload zurück.
- OAuth Scope-Korrektur (nachfolgend entkoppelt): `media.write` wird ausschließlich bei `SOCIAL_X_MEDIA_OAUTH_CONSENT_ENABLED=true` im Owner-only-PKCE-Start angefordert. Der Exchange verlangt den tatsächlichen Grant und persistiert ihn ohne Secret-Offenlegung. Die signierte Vault-Grenze erlaubt nur Basisscopes oder Basisscopes + `media.write`. Consent aktiviert weder die produktiven Medien-Pilot-Flags noch kostenpflichtige X-Aufrufe. Keine OAuth-Verbindung wurde ausgeführt.
- Vor dem ersten X-Request: Owner-Auth, Origin, X-Budgetflags, Media-Schalter, exakte Datei, media.write, Kontobindung und atomarer `milestone_claim`.
- X v2 Bild-Upload per `/2/media/upload`, danach genau ein `POST /2/tweets` mit `media.media_ids`.
- Bei Timeout, unbekannter Antwort oder ungültiger ID: kein automatischer Retry und kein weiterer Post; X-Readback verlangt Autor, nichtleeren Text und genau ein angehängtes Medium (X kann URLs beim Provider-Readback normalisieren).
- Originale Text-Meilenstein-Route bleibt unangetastet; kein zweiter Publisher oder Scheduler.
- Tests: `server/social-media/provider-publish.test.mjs`, `x-milestone-post.test.mjs`, `x-edge-vault.test.mjs`.

## Source-/Bildprovenienz
- Chat-generiertes, redaktionell ausgewähltes PNG: `CAPITAL-AI-Universe-X-Launch-Final-20261115.png`.
- Originalbytes (lokal in dieser Chat-Sitzung geprüft): SHA-256 `08886b933be8a162de0fe678c13fd2e610348ba827aaec25179b623e969809f1`; 1672 × 941 Pixel; 2.078.333 Bytes.
- Erwarteter Repository-Pfad: `public/branding/social/CAPITAL-AI-Universe-X-Launch-Final-20261115.png`.
- **VERIFIED (Git-Binärprovenienz):** Das unveränderte PNG wurde aus dem autorisierten CAPITAL-AI-Drive-Austausch in einen Git-Blob übertragen und auf diesem Branch committed. Blob-SHA-1 `89214d293afb3f3412174e04a5c42b34e357e741` entspricht der unabhängig lokal berechneten Git-Blob-ID der 2.078.333 Originalbytes. Git-Commit `448738c592485c0f22ab308e6d6ea88f40406f52`; `fetch_file` bestätigte denselben Blob-SHA und den erwarteten Dateipfad.
- Das Dockerfile enthält bereits `COPY public/branding/social ./public/branding/social`; kein zusätzlicher Container-Layer erforderlich. Asset-Pfad und Byteidentität sind jetzt belegt; produktive X-Freigaben bleiben unabhängig BLOCKED.

## Separater Runtime- und Owner-Readback (read-only)
- Prod-Supabase-Projekt: `Capital-AI`; Query ausschließlich aggregierte Boolesche Statuswerte, keine Identifikatoren, Tokens, Secrets oder Kontodaten.
- `@CapitalAIOnline` verbunden: **VERIFIED** (DB-Status = true).
- `tweet.write` gespeichert: **VERIFIED** (true).
- `media.write` gespeichert: **BLOCKED** (false).
- Token aktuell und nicht re-connect-pflichtig: **BLOCKED** (false).
- X-Milestone Receipts: **VERIFIED** 0; X-Article Receipts: **VERIFIED** 0. Ein Nullbestand ist KEIN Veröffentlichungsnachweis.
- Produktive Render-Flags: **NOT_PROVEN**, nicht durch Metadaten bestätigt.
- X Developer Console: Guthaben, Ausgabenlimit, Auto-Recharge, aktuelle API-Preise und eventuelle Medienkosten: **NOT_PROVEN**. Keine Kostenfreigabe.
- **Es erfolgten keine X-API-Aufrufe, OAuth-Verbindungen, Secret-Readbacks, Datenbankmutationen oder Deployments.**

## Freigabe / technische Rücknahme
- Implementierungsbranch ist kein Publish-/Deployment-Approval. Default-Fail-Closed: `SOCIAL_X_MILESTONE_MEDIA_ENABLED`, `SOCIAL_X_MEDIA_UPLOAD_ENABLED`, `SOCIAL_X_PAID_MEDIA_APPROVED` müssen explizit true sein; bestehende `SOCIAL_X_PAID_WRITE_APPROVED` / `SOCIAL_X_PAID_READ_APPROVED` bleiben ebenfalls erforderlich.
- Vor kostenpflichtigem X-Call: persistentes Asset nachweisen; Owner-OAuth mit media.write reautorisieren; read-only positive Account-/Tokenprüfung; X-Konsole inklusive Cost-Cap und Autopay explizit durch Owner prüfen; bestehende CI grüner Head; Owner-Session und Content-Freigabe.
- No-Merge/No-Publish bei offenem Sicherheits- oder Lizenzbefund. Falls ein Provider-Ergebnis unklar wird: nur One-shot-Receipt/status prüfen; **kein Retry**.
- Rollback: regulärer Revert des Feature-Commits nach Checks; keine DB-/Secrets-Mutation.

## PR #759 CI-Evidence · 16.11.2026
- Prüfbaseline PR-Head vor Asset-Commit: `be5b0a238fdd17a566b58103268436448481e97b`.
- Domain Governance Run [43775147545](https://github.com/SvenKulessa/Capital-AI/actions/runs/43775147545): **success**.
- Social Provider PostgreSQL Contract Run [43775147570](https://github.com/SvenKulessa/Capital-AI/actions/runs/43775147570): **success**.
- Docker Security Gate Run [43775147613](https://github.com/SvenKulessa/Capital-AI/actions/runs/43775147613): **success**.
- Nach der ursprünglichen CI-Abnahme ist ein binärer Asset-Commit hinzugekommen; die CI am aktuellen vollständigen Head ist getrennt auszuwerten. Tests des geänderten Wirkungspfads werden nicht durch einen früheren grünen Commit ersetzt.
- Aktueller Asset-Commit vor dieser Dokumentationsaktualisierung: `448738c592485c0f22ab308e6d6ea88f40406f52`; die anschließende Evidence-Aktualisierung bewirkt einen weiteren Head und neue CI.

## Nachtrag: OAuth-Scope-Regression vom 16.11.2026
- Reproduzierter Codebefund im ursprünglichen PR-Slice: `x-oauth-start` forderte `media.write` nicht an; `x-oauth-exchange` verwarf zusätzliche Provider-Scopes; die Vault-Persistenz lehnte zusätzliche Scopes ab. Der Medien-Pilot wäre trotz späterer Owner-Reautorisierung nicht nutzbar gewesen.
- Reversibler Fix am **bestehenden PR-Branch**: opt-in Scope nur mit `SOCIAL_X_MILESTONE_MEDIA_ENABLED`, `SOCIAL_X_MEDIA_UPLOAD_ENABLED`, `SOCIAL_X_PAID_MEDIA_APPROVED` = true; ohne diese Flags bleibt der bisherige OAuth-Vertrag unverändert.
- Negative Tests: fehlender Grant blockiert vor Profile-/DB-Aufruf; Extra-/Doppelscopes blockiert; Nicht-Owner kann keinen OAuth-State erstellen.
- Owner-Reconnect, Token-Refresh und tatsächliche Providerberechtigung bleiben **BLOCKED/NOT_PROVEN** bis separater autorisierter produktiver Freigabe. Keine produktiven OAuth-/DB-/X-Mutationen.

## Refresh-Regression: optionales X-Media-Grant
- Erweiterter Negativbefund: Der vorhandene X-Token-Refresh validierte ursprünglich nur die vier Basisscopes. Dadurch hätte ein Provider-Downgrade von `media.write` unbemerkt hinter einem gespeicherten `mediaWriteApproved=true` verbleiben können.
- Fix: Signed-Edge-`refresh_claim` übermittelt den optional tatsächlich gespeicherten Grant; die Owner-Refresh-Logik verlangt bei Medienberechtigung den vollständigen Provider-Grant. Fehlende Scope-Rückgabe oder Downgrade blockiert die Rotation, verlangt Reconnect und verhindert den kostenpflichtigen X-Account-Readback nach der Scopeprüfung.
- Synthetische Positiv-/Negativtests in `owner-token-refresh.test.mjs` und `x-edge-vault.test.mjs`. Kein echter Provider-Aufruf, keine Token-Ausgabe und keine Provider-/Datenbankmutation.

## Nachtrag: unabhängiger media.write-Consent · 16.11.2026
- **P0-Reproduktion:** Start und Exchange banden die optionale Scope-Anforderung bislang an `SOCIAL_X_MILESTONE_MEDIA_ENABLED`, `SOCIAL_X_MEDIA_UPLOAD_ENABLED` und `SOCIAL_X_PAID_MEDIA_APPROVED`. Das verlangte produktive Medien- und Kostenflags bereits vor einem späteren Owner-Reconnect. Der frühere Nachtrag oben dokumentiert diesen historischen Stand.
- **Fix (Code-only, fail-closed):** `SOCIAL_X_MEDIA_OAUTH_CONSENT_ENABLED` ist ein neuer, ausschließlich serverseitiger Opt-in-Schalter. Nur der exakte Wert `true` fordert/validiert/persistiert `media.write` zusätzlich zu `tweet.read tweet.write users.read offline.access`. Fehlend, `false` oder andere Werte behalten die vier Basisscopes. Ein fehlender Providergrant stoppt vor Profil-Readback und Account-Persistenz; ohne Consent wird ein zusätzlich zurückgemeldeter Media-Grant nicht gespeichert.
- **Keine Koppelung:** Alle bestehenden Publish-Gates (Owner-Auth/Origin, `SOCIAL_X_MILESTONE_MEDIA_ENABLED`, `SOCIAL_X_MEDIA_UPLOAD_ENABLED`, `SOCIAL_X_PAID_MEDIA_APPROVED`, `SOCIAL_X_PAID_WRITE_APPROVED`, `SOCIAL_X_PAID_READ_APPROVED`, SHA, atomarer Claim und Receipt) bleiben unverändert. Allein der Consent-Schalter startet keinen OAuth-Flow, erzeugt keinen X-Providerrequest und erlaubt keine kostenpflichtige Veröffentlichung.
- **Negativ-/Positivabdeckung:** OAuth-Start prüft fehlenden/ungültigen Consent, alte Produktivflags ohne Consent, Consent ohne Produktivflags und verweigert Nicht-Owner/-E-Mail sowie deaktivierte OAuth-Verbindung. Exchange prüft alle Varianten und blockiert fehlenden `media.write`-/Basisscope vor weiteren Provider-/DB-Schritten. Milestone-Test prüft die Produktiv-Gates ausdrücklich bei eingeschaltetem Consent-Schalter.
- **Aktivierungsgrenze:** Owner-Entscheidung über späteres Consent-Opt-in und etwaige X-Provider-OAuth-Autorisierung bleibt separat. Keine tatsächliche Tokenrotation, keine Render-Flag-Änderung, keine Veröffentlichung oder Deployment. Rollback durch Revert dieser PR-Fix-Commits.
- **CI:** Maßgeblich sind ausschließlich Checks am neuesten PR-Head nach dem letzten Evidence-Commit; ältere grüne CI ersetzt sie nicht.
