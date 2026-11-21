# Zehn-PR-Effizienzmeilenstein – GitHub-Evidence-Zähler

Status: **READ_ONLY / NO_AUTOMATIC_PUBLISHING**. Autorität: Root `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@2`; die kanonische nicht autorisierende Projektion liegt unter `.agents/app.prompt.json` und ist in `.agents/skills/registry.json.promptContracts` verknüpft.

## Umsetzung

- `scripts/ten-pr-github-evidence.mjs`: begrenzter, ausschließlich lesender GitHub-REST-Adapter; Aufruf explizit mit `node scripts/ten-pr-github-evidence.mjs --live`. Optional wird `GITHUB_TOKEN` oder `GH_TOKEN` ausschließlich als Request-Header verwendet. Token, Request-Header und Providerfehlermeldungen werden nicht ausgegeben.
- `scripts/ten-pr-github-evidence.test.mjs`: isolierte deterministische GET-Mocks und Positiv-/Negativtests; über das vorhandene `test:domain-skills`-Skript und den vorhandenen Docker Security Gate eingebunden. Kein neuer Required Check, Scheduler oder Infrastrukturbedarf.
- Quellen pro Kandidat: GitHub Search (nur Discovery), GitHub PR-Detail, auf PR-HEAD-SHA gebundene Check-Runs, GitHub Compare für tatsächliche Main-Merge-SHA-Ancestry, vor und nach dem Readback bestätigter Main-SHA. Unvollständige Paginierung oder Main-Race führen zu `NOT_PROVEN`.
- Erforderliche auf HEAD gebundene Checks: `Docker Security Gate`, `Domain Governance` und `CodeQL`, alle `completed/success`; die beiden Required-Check-Run-IDs müssen aus echten GitHub-Actions-URLs kommen. Der Zähler erweitert damit **nicht** die tatsächlichen GitHub-Rulesets.

## Autorisierungszeit und konservativer Zeitfilter

Der Owner hat das Zehn-PR-Ziel am **20.11.2026** bestätigt; der exakte Zeitstempel ist in der kanonischen Quelle ausdrücklich `NOT_PROVEN`. Deshalb zählen ausschließlich Merges, deren `merged_at` nach **21.11.2026 00:00 Europe/Berlin** liegt (2026-11-20T23:00:00Z). Am Autorisierungstag gemergte PRs bleiben `NOT_PROVEN`, solange keine gesonderte, belastbare genaue Owner-Zeit vorliegt. PR #850 ist ausdrücklich ausgeschlossen; Drafts, nicht gemergte, synthetische und fehlende Evidence werden nicht gezählt. Pro PR gibt es höchstens eine eindeutige Zählung.

## Ergebnisvertrag

`CAPITAL_AI_TEN_PR_GITHUB_EVIDENCE@1` liefert Source-SHA, beobachteten Main-SHA, Anzahl vollständig verifizierter Merges, benötigten Zielwert 10, verbleibende Zahl, PR-/CI-/Commit-Links und fail-closed Gründe. `VERIFIED_THRESHOLD` bedeutet ausschließlich: der git-basierte Zähler erreicht mindestens 10 vollständig belegte Merges. Es ist **keine** Autorisierung für Homepage-Publishing, Produktion, Provideraktivierung, Kosten oder Datenschutzverarbeitung. Die später geplante 7-Farben-Effizienzgrafik bleibt ein separates, erst nach kompletter Evidence zulässiges Produkt-Feature.

## Verwendung und Grenzen

```sh
node --test scripts/ten-pr-github-evidence.test.mjs
node scripts/ten-pr-github-evidence.mjs --live
```

Das zweite Kommando kann ohne GitHub-Berechtigung oder bei API-Rate-Limits `NOT_PROVEN` mit Exit-Code 2 liefern. Es greift ausschließlich lesend auf öffentliche GitHub-Endpunkte zu; es erstellt **keine** Datenbanktabellen, Scheduler, GitHub-PRs oder Webseiteninhalte.

Verbundene GitHub-Connector-Evidence und Runtime-/Monetarisierungsnachweise sind getrennt zu behandeln. Fehlende oder ambige Zeit-/SHA-/Check-Nachweise niemals als erfolgreiche 10/10 darstellen.
