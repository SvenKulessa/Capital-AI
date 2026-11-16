# CAPITAL-AI: Execution-first-Promptvorlage

Dies ist eine nicht autorisierende Aufgabenbeschreibung.
Die einzig verbindliche Repository-Governance ist die geprüfte
Root-`AGENTS.md` (`SOLO_MAINTAINER_FLOW@2`).

Bei ausdrücklich beauftragter Implementierung gilt
`AUTONOMOUS_EXECUTION_FIRST`: Istzustand und tatsächliche Evidence
prüfen, Ursachen reproduzieren, Code/Tests im autorisierten Scope
korrigieren, bestehende CI erneut ausführen, den bestehenden PR mit
Diff/SHAs/Run-IDs fertigstellen, bei nachgewiesener Delegation mergen
und den bestehenden Main-Deployment-Pfad mit Live-Abnahme fortsetzen.
Nicht für jeden Schritt weitere Chat-Aufträge verlangen.

Historische Anweisungen wie „noch keinen Code erzeugen“ betreffen
die Reihenfolge im Auftrag, nicht eine neue Zustimmung.
Status- und read-only-Aufträge bleiben lesend. Explizite
No-Merge-/No-Deploy-Vorgaben, Required Checks, Rulesets,
Kosten, Lizenz-/Providerrechte, Datenschutz, Secrets und
produktive Datenbankgrenzen bleiben verbindlich.
Keine neuen Freigabestufen, keine Selbstautorisierung.
`VERIFIED` nur mit nachweisbarer Wirkung; sonst
`BLOCKED` bzw. `NOT_PROVEN`.

## Kopierbare Folgeschritte: Lösung und Umsetzung vor Bericht

Für Implementierungs- und Reparaturaufträge als Standard **ausführbare
End-to-End-Folgeprompts** formulieren: konkreten Befund eingrenzen,
Ursache reproduzieren, kleinsten sicheren Fix implementieren,
Pass-/Negativtests und bestehende CI auswerten, technische Blocker
selbstständig beheben, Evidence sichern und nach erfüllter
`AGENTS.md`-Delegation mergen. Anschließend den bestehenden
Main-Deployment-Pfad beobachten und Live-Wirkung getrennt verifizieren.
Bereits beauftragte Arbeit zuerst im selben Auftrag abschließen;
Folgeprompts nur für tatsächlich offene zusätzliche Arbeit nutzen.

Keine unbegründeten negativen Standardsätze an einen Folgeprompt
anhängen, insbesondere nicht pauschal „keine Mutationen, Änderungen,
Merges oder Deployments“. Entsprechende Verbote aus dem *konkret
fortgesetzten* Auftrag und tatsächlich geltende Provider-, Secret-,
Rechte-, Kosten-, Lizenz-, Sicherheits- und Production-Grenzen müssen
weiterhin ausdrücklich beachtet werden. Reine Prüf-/Statusaufträge
werden nicht stillschweigend zu Implementierungsaufträgen.
Unabhängige autorisierte Teilaufgaben bei echten Blockern fortführen.

Bevorzugter kopierbarer Folgeprompt für eine autorisierte Reparatur:

```text
Arbeite in SvenKulessa/Capital-AI nach Root-AGENTS.md und
SOLO_MAINTAINER_FLOW@2 / AUTONOMOUS_EXECUTION_FIRST.
Korreliere den betroffenen Scope mit aktuellem main und vorhandener
Evidence, reproduziere die Ursache und behebe sie im bestehenden
Scope-Branch. Führe passende Positiv-/Negativtests sowie die
bestehenden CI-Checks aus, korrigiere nachgewiesene Fehler eigenständig
und dokumentiere SHAs, Run-IDs, Risiken und Rollback im bestehenden PR.
Wenn sämtliche tatsächlich verbindlichen Mergebedingungen erfüllt
sind, schließe den PR nach delegierter Merge-Regel ab und prüfe den
bestehenden Main-Deployment-Pfad samt Live-Wirkung. Bei realen
Freigabe- oder Sicherheitsblockern die konkrete gesperrte Aktion
abgrenzen und andere autorisierte Arbeiten fortsetzen.
```
