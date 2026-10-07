> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**  
> Diese Datei bleibt nur als historische Dokumentation bzw. Evidence erhalten. Sie definiert keine zusätzlichen Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Die einzige autorisierende Repository-Richtlinie ist `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`.

# Main Production Protection

Stand: 30.09.2026.

Der Docker-Sicherheitsworkflow ist seit PR #43 auf Pull Requests, Merge Queue und Push nach `main` aktiv. Am 30.09.2026 wurde Ruleset `24259174` aktiv mit dem unten beschriebenen Vertrag zurückgelesen; direkte Main-Umgehung ist durch diesen Vertrag gesperrt.

## Kanonischer Vertrag

`deploy/main-production-ruleset.json` definiert den einzigen vorgesehenen Main-Schutz:

- Ziel: Default Branch und `refs/heads/main`
- Enforcement: active
- Delete blockiert
- Non-fast-forward / Force Push blockiert
- Pull Request erforderlich
- Required Status Checks strikt
- Required Check: `Docker Security Gate`
- kein Bypass Actor

Der Vertrag verlangt bewusst **0 externe Approvals**, weil das Repository aktuell owner-operated ist. Der Pull-Request-Zwang verhindert dennoch direkte Main-Pushes; Review-Threads müssen aufgelöst werden.

## Abgeschlossener Bootstrap und laufende Verifikation

Der manuelle Lauf `36742990882` hat den Bootstrap erfolgreich abgeschlossen. Der Workflow `bootstrap-main-protection.yml` wird nach dem Provider-Readback entfernt; damit besitzt kein verbleibender Workflow Zugriff auf `CAPITAL_AI_GITHUB_ADMIN_TOKEN`. Das Secret selbst wird hier nicht gelöscht oder gelesen.

`scripts/verify-main-ruleset.mjs` und seine Regressionstests bleiben erhalten. Das Production-Handoff liest den tatsächlichen Providerzustand bei jeder Abnahme erneut. Die JSON-Vertragsdatei bleibt als Wiederherstellungsreferenz bestehen; ein erneuter Administrationsworkflow muss bei Bedarf separat überprüft werden.
