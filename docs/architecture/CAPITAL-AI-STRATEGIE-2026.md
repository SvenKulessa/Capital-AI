# PR #844 — sichere PR-Korrelation

Status: ausschließlich lesende Architekturtools, keine Merge-Autorisierung oder neue Required Checks.

- GET-only Live-GitHub-Inventar mit vollständiger Pagination, Head/Base/Main-SHA-Kontrolle, Race-Prüfung und 5-Minuten-Freshness.
- Historische 2026-11-19-Fixture als NON_CURRENT markiert: 12 PRs/6 Kanten sind **kein** aktueller Bestandsnachweis.
- Evidenzgebundene Kandidatenkanten: gleiche Datei, Package/Lock, Contract/Runtime, Migration/Schema. Namensbasierte Zusammenhänge sind nur REVIEW_REQUIRED und **keine** nachgewiesenen semantischen Konflikte.
- Ein vorhandener Docker Security Gate führt Node-Positiv- und Negativtests aus. Kein weiterer Workflow, keine neue Permission, keine produktive API, SQL-Migration oder Zertifikatsausstellung.

## Aufruf
`node --test scripts/architecture/strategy-2026-pr-correlation.test.mjs`
`node scripts/architecture/strategy-2026-pr-correlation.mjs scripts/architecture/fixtures/open-prs-20261119.json`
`GH_TOKEN=<read-only-operator-token> node scripts/architecture/strategy-2026-pr-live.mjs`
Der Token wird ausschließlich über eine geschützte Umgebung eingelesen, nie ausgegeben. GitHub-API-Fehler, Teilinventar, veraltete SHAs oder Race führen zu Fail-Closed.

## Autorität
AGENTS.md / SOLO_MAINTAINER_FLOW@2 und GitHub Rulesets gelten unverändert. Dieses Tool vergibt keine Merge-Rechte und ersetzt weder Required Checks noch aktuelle Head-/Main-/Rechteprüfungen. Rollback: PR-Commit revertieren.
