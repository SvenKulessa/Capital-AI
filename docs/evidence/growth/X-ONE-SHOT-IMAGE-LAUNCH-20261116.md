# GROWTH · X One-shot Medienlaunch – technische Evidence
Datum: 2026-11-16. Basis: main `136bfec79d0beedeee71ab25e01c304a2bc7b453`.
Policy: Root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`.
Scope: Ausschließlich Owner-only-X-Milestone-Pfad und dessen X-Publisher; kein autonomes Publishing.

## Änderungen
- Neue isolierte X-Launch-Route `/api/social-media/x/milestone/launch` mit Status/Publish und eigener Content-ID.
- `LAUNCH_CONTENT_KEY` ist an den exakten Posttext und die finale Infografik-SHA gebunden.
- Bildprüfung per Dateiread mit fester Pfadvorgabe, PNG-Signatur, Maximalgröße und SHA-256.
- `x_credentials` gibt nur `mediaWriteApproved: boolean` an den signierten Owner-Workload zurück.
- Vor dem ersten X-Request: Owner-Auth, Origin, X-Budgetflags, Media-Schalter, exakte Datei, media.write, Kontobindung und atomarer `milestone_claim`.
- X v2 Bild-Upload per `/2/media/upload`, danach genau ein `POST /2/tweets` mit `media.media_ids`.
- Bei Timeout, unbekannter Antwort oder ungültiger ID: kein automatischer Retry und kein weiterer Post; X-Readback verlangt Autor, vollständigen Text und genau ein angehängtes Medium.
- Originale Text-Meilenstein-Route bleibt unangetastet; kein zweiter Publisher oder Scheduler.
- Tests: `server/social-media/provider-publish.test.mjs`, `x-milestone-post.test.mjs`, `x-edge-vault.test.mjs`.

## Source-/Bildprovenienz
- Chat-generiertes, redaktionell ausgewähltes PNG: `CAPITAL-AI-Universe-X-Launch-Final-20261115.png`.
- Originalbytes (lokal in dieser Chat-Sitzung geprüft): SHA-256 `08886b933be8a162de0fe678c13fd2e610348ba827aaec25179b623e969809f1`; 1672 × 941 Pixel; 2.078.333 Bytes.
- Erwarteter Repository-Pfad: `public/branding/social/CAPITAL-AI-Universe-X-Launch-Final-20261115.png`.
- **BLOCKED:** Die PNG-Originalbytes konnten in dieser GitHub-Connector-Sitzung nicht als Binärdatei in das Repository übertragen werden (GitHub Contents-API-Tool bietet nur Text). Der Pfad hat aktuell 404. Kein Asset, keine X-Media-Ausspielung. KEINE Umbenennung, Rekodierung oder alternative Grafik akzeptieren, solange der Hash unverändert ist.
- Das Dockerfile enthält bereits `COPY public/branding/social ./public/branding/social`; kein zusätzlicher Container-Layer erforderlich. Vor produktiver Freigabe unveränderte Originaldatei in genau diesem Pfad bereitstellen.

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
