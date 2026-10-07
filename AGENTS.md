# CAPITAL-AI Solo Maintainer Policy

Stand: 2026-10-07
Contract: `SOLO_MAINTAINER_FLOW@1`
Geltungsbereich: gesamtes Repository.

## Einzige autorisierende Richtlinie

Diese Datei ist die **einzige repositoryweite autorisierende Engineering-/Governance-Richtlinie**.

Ältere oder zusätzliche Richtlinien-, Governance-, Handoff-, Admission-, Self-Healing-, Benchmark- oder Domain-Dokumente sind nur historische Dokumentation oder Evidence und dürfen **keine zusätzlichen Freigaben, Handoffs, Admissions, Pflichtreviews oder Korrelationsschleifen erzwingen**.

Bei einem Widerspruch gilt ausschließlich diese Datei. Zusätzliche Regeln dürfen erst wieder eingeführt werden, wenn ein konkretes Problem oder Risiko nachgewiesen wurde und der Human Repository Owner die minimale zusätzliche Regel ausdrücklich freigibt.

## Entwicklungsfluss

1. Auf einem Feature-Branch entwickeln.
2. Pull Request jederzeit erstellen oder aktualisieren.
3. GitHub Required Checks laufen automatisch.
4. Fehlende oder fehlgeschlagene Required Checks blockieren den Merge, aber nicht Entwicklung oder PR-Erstellung.
5. Merge regulär ausschließlich durch den Human Repository Owner.
6. Ein Agent darf nur nach ausdrücklicher Chat-Freigabe für den konkret bezeichneten PR mergen.
7. Nur ein Merge nach `main` darf den normalen Production-Pfad auslösen.
8. Production darf automatisch deployen, wenn die für `main` definierten technischen Checks erfolgreich sind.

## Required Checks

Der Required-Check-Satz bleibt bewusst klein.

Aktuell autoritativ:
- `Docker Security Gate`
- `Domain Governance`

Weitere Required Checks werden nur bei einem real nachgewiesenen, nicht bereits abgedeckten Risiko eingeführt.

Ein erfolgreicher Check ist Evidence für seinen technischen Scope. Er erzeugt keine Merge Authority und keine pauschalen Lizenz-/Providerrechte.

## Branch Early Feedback

Der Branch-Workflow dient ausschließlich schnellem Feedback:
- Workflow-Policy prüfen
- `git diff --check`
- keine Dependency-Installation
- kein `preflight:full`
- kein PR-/Merge-/Deployment-Gate

## Security, Lizenz und Provider-Rechte

Security-, Lizenz- und Rechteprüfungen bleiben dort fail-closed, wo die konkrete Änderung diese Grenze tatsächlich berührt.

Eine separate Admission ist nur erforderlich für **neue privilegierte Capabilities oder externe Rechte-/Trust-Grenzen**, insbesondere:
- neue produktive Daten-/API-/AI-Providerrechte,
- Raw-/Redistribution-/Sublicensing-/Pass-through-Rechte,
- neue schreibende externe Control-Plane-Capabilities,
- neue Auth-/Secret-/Credential-Trust-Boundaries,
- neue autonome Mutationsfähigkeit,
- neue kostenpflichtige oder anderweitig privilegierte Infrastruktur.

Normale Bugfixes, UI-/Produktänderungen, Refactorings, Dokumentation, Tests, bestehende Dependency-Updates, Scoring-Entwicklung, Analysewerkzeuge und gewöhnliche Deployments benötigen keine separate Admission.

## Production

- Production ausschließlich aus `main`.
- Render-Webservice: `branch: main`.
- Zielzustand: Deployment nach erfolgreichen Checks (`autoDeployTrigger: checksPass`).
- Runtime-Health und Source-Identität müssen nach dem Deploy prüfbar bleiben.
- Ein Repository-HEAD allein löst keinen NATS-Redeploy aus.
- NATS wird nur bei NATS-spezifischen Änderungen oder einer ausdrücklich erforderlichen Runtime-/Security-Maßnahme neu deployed.

## Keine automatische Rekorrelationsschleife

Ein Merge nach `main` startet **keine automatische Post-Merge-Korrelation offener PRs** und keine automatischen Repair-, Branch-, Commit- oder PR-Aktionen.

Offene PRs werden nur dann gegen den neuen Main korreliert, wenn:
- eine konkrete Dateikollision vorliegt,
- GitHub einen Merge-Konflikt meldet,
- ein Required Check nach dem Merge fehlschlägt,
- oder der Owner ausdrücklich eine Rekorrelation verlangt.

## Reviews und Wartung

Es gibt keinen periodischen verpflichtenden Governance-Review als Entwicklungs- oder Release-Gate.

Security-/Dependency-/Runtime-Monitoring darf weiterlaufen und Findings melden. Ein Finding erzeugt erst dann eine neue Regel, wenn das konkrete Risiko bewertet und eine minimale Gegenmaßnahme beschlossen wurde.

## Domains

PRODUCT, MARKET, PLATFORM, TRUST und GROWTH sind Fachperspektiven, keine organisatorischen Grenzen. Ein einzelner Chat/Agent darf domainübergreifend arbeiten.

## Status in ChatGPT

Status-, Review-, Implementierungs- und Abschlussmeldungen enden mit zwei getrennten Code-Snippets:

```text
✅ ERLEDIGT
- nur tatsächlich abgeschlossene Punkte
```

```text
🔧 OFFEN / NÄCHSTE SCHRITTE
- nur offene oder nächste Punkte
```
