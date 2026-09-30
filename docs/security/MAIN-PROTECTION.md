# Main Production Protection

Stand: 30.09.2026.

Der Docker-Sicherheitsworkflow ist seit PR #43 auf Pull Requests, Merge Queue und Push nach `main` aktiv. Providerseitig bleibt direkte Main-Umgehung jedoch möglich, solange GitHub selbst kein aktives Ruleset erzwingt.

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

## Bootstrap

Workflow: `Bootstrap Main Protection`

Sicherheitsvoraussetzungen:

1. `expected_main_sha` muss exakt CURRENT_MAIN sein.
2. Auf genau diesem SHA muss bereits ein erfolgreicher `Docker Security Gate` Check existieren.
3. `confirmation` muss exakt `APPLY_MAIN_PROTECTION` sein.
4. `mode=apply` benötigt das Repository Secret `CAPITAL_AI_GITHUB_ADMIN_TOKEN`.
5. Das Secret soll ein **Fine-grained PAT nur für SvenKulessa/Capital-AI** mit minimal nötigem Repository-Recht **Administration: Read and write** sein. Keine Contents-, Packages- oder Organization-Schreibrechte hinzufügen, sofern GitHub sie für diese Mutation nicht verlangt.

Der Workflow erstellt oder aktualisiert den benannten Ruleset idempotent und liest ihn danach erneut über die Provider-API. `scripts/verify-main-ruleset.mjs` verwirft Bypass-Akteure, fehlenden PR-Zwang, fehlenden Force-Push-/Delete-Schutz oder einen nicht-strikten/missing `Docker Security Gate`.

## Aktuelle Grenze

Die verbundene ChatGPT-GitHub-App hat keine Repository-Administration-Mutation. Deshalb kann der Provider-Ruleset nicht direkt aus diesem Chat gesetzt werden. Das Workflow-Secret ist die eng begrenzte Authority für genau diesen Bootstrap.

Nach erfolgreichem Apply muss `GET /repos/SvenKulessa/Capital-AI/rulesets` mindestens `main-production-protection` als `active` zeigen. Erst dann darf das Production-Handoff-Gate `MAIN_PROTECTION` als PASS werten.
