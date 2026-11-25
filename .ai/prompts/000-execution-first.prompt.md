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

## PROCESS_ACCELERATION@1 – gemeinsame Ausführungsparameter

`MODE=SHORTEST_PATH_EXECUTION_FIRST`
`EVIDENCE=RISK_BASED_MINIMUM`
`OWNER_INTERACTION=MINIMIZED`
`REUSE_EXISTING_AUTHORIZATION=TRUE`
`PARALLEL_EXECUTION=TRUE`
`ALTERNATIVE_EXECUTION_PATH=ENABLED`

Wende den entsprechenden Abschnitt der Root-`AGENTS.md` an: kürzester
sicherer vollständiger Wirkungspfad, vorhandene Evidence/Integrationen
wiederverwenden, unabhängige Arbeit parallelisieren und nach belegtem
Fehler geeignet ausweichen. Prozessoptimierung aktiv umsetzen.
Zusatznachweise nur bei konkretem Entscheidungsnutzen; verbindliche
CI, Rulesets und risikorelevante Verifikation nicht reduzieren.

Supabase-Mutationen konkret bündeln, nach gültiger Owner-Freigabe
durchführen und verifizieren; produktive Recovery-Voraussetzungen
beachten. GROWTH/MARKET priorisieren nach realer Nachfrage,
Wettbewerbsfähigkeit und Umsatzpotenzial. Geeignete Produkte bis zur
technischen Angebots- und automatisierten Vertriebsreife entwickeln
(SEO, eigene Lizenzentwürfe, Drittanbieterrechte, Checkout, Auslieferung,
Support, Refunds, consent-konforme Messung). Tatsächliche Aktivierung,
Lizenzfreigabe und Kosten bleiben an die Root-Regel gebunden.
Bestehende LangGraph-/RAG-/SEO-Pfade autonom und messbar verbessern;
keine konkurrierenden Systeme, keine erfundenen Daten und keine
zusätzliche Governance-Autorität.

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

### Sperrvererbung vermeiden: Fortsetzung versus neuer Auftrag

- **Fortsetzung desselben ausdrücklich eingeschränkten Auftrags** (z. B. „fahre fort“): konkretes Read-only-/No-Merge-/No-Deploy-Verbot gilt weiterhin, bis der Owner es ausdrücklich ändert oder der Auftrag endet.
- **Neuer, eigenständig formulierter Implementierungsauftrag:** keine alte No-Merge-/No-Deploy- oder Read-only-Floskel aus historischen Chat-Antworten, PR-Beschreibungen oder älteren Prompt-Vorschlägen übernehmen. Der aktuelle Auftrag und Root-`AGENTS.md` bestimmen den zulässigen Weg. Ein fehlendes Verbot ist keine zusätzliche Produktiv-/Kosten-/Provider-Autorisierung.
- **Kein pauschales Handoff:** Bei wirklich gesperrter Aktivierung genau den belegten Teil benennen und den anderen bereits autorisierten Code-, CI- und delegierten Merge-Scope eigenständig abschließen. Nicht wegen fehlender Post-Deployment-Evidence den vorab sicheren Code-Merge sperren, sofern Root-`AGENTS.md` den vollständig implementierten, wirksam deaktivierten Feature-Flag-Slice ausdrücklich erlaubt.
- **Nie übersteuern:** aus dem konkret fortgesetzten Auftrag stammende Einschränkungen, aktueller Human-Auftrag, höherrangige Regeln, tatsächliche GitHub-Rulesets, Kosten, Geheimnisse, Lizenz-/Providerrechte und kritische aktivierte Trust Boundaries bleiben unberührt.

Für einen eigenständigen neuen Umsetzungsauftrag ist als Standard die positive Handlungsanweisung „implementieren → testen → belegte Fehler beheben → delegiert mergen (nur nach Gates) → bestehenden Main-Deployment-Pfad beobachten“ zu verwenden, nicht ein ungefragtes „kein Merge/Deployment“.

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
