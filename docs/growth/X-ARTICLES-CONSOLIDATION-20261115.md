# X Articles / Grok-Branch-Konsolidierung – 2026-11-15

Status: DRAFT_ONLY / NOT_PROVEN für produktive X-Nutzung.

Baseline: main f92df36aad5e578599285cecc3cdcb84e7f995dc.

## Übernommen
- PR #741 / feature/x-review-gate-chunked-media: X Articles Draft Client, Templates, Chunked Video und image upload, offline review CLI.
- feature/x-articles-api-draft-client: ursprünglicher erster Educational Draft wird über `evidence-first-scoring` Template und kompatiblen CLI-Einstieg wiederverwendet; kein zweiter API-Schreibpfad.
- feature/x-articles-media-content-engine: vorhandene X-Entwurfstemplates/Media-Clients werden verwendet, jedoch **kein** pauschales `xArticlesDraftsEnabled: true` in `contentEngine.ts`: Rechte/Provider-Freigabe sind nicht nachgewiesen, bestehender Publisher bleibt `INTEGRATION_PENDING` und `publicPublishAllowed: false`.

## Negativgrenzen
- Externe X-Draft-/Media-/Refresh-Writes ohne `X_DRAFT_API_ENABLED=true` sind gesperrt; CI und Automations setzen diesen Wert **nicht**.
- `createPostWithMedia()` und `publishArticle()` bleiben auch bei gesetztem Flag fail-closed, kein Public Posting.
- Kein Token-Refresh oder Provider-Secrets in GitHub-Workflow; keine Token-Ausgaben in Logs; keine `|| true` bei Fehlern.
- Das neue Workflow-Programm testet ausschließlich lokal mit inertem Testtoken.
- Eine gesonderte Provider-/Kosten-/Lizenz- und redaktionelle Freigabe wäre für spätere X-Nutzung erforderlich.

## Wiederherstellung
Rollback per git revert der Konsolidierung und Abschaltung eines gegebenenfalls später separat gesetzten `X_DRAFT_API_ENABLED`. Keine produktive Datenmigration und keine Aktivierung in diesem PR.

## Prüfungen
`node --experimental-strip-types --test scripts/growth/x-articles-consolidation.test.mjs`.
Domain Governance, Docker Security Gate, CodeQL und alle weiteren anwendbaren CI-Checks am neuen PR-Head prüfen.
