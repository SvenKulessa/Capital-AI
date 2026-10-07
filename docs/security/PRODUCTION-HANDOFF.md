# Production-Handoff Gate

Stand: 2026-10-07
Contract: `SOLO_MAINTAINER_FLOW@1`

## Zweck

Der Production-Handoff ist ein **technischer Verifikationsvertrag**. Er ist keine organisatorische Übergabe, keine separate Human-Abnahme und keine zusätzliche Admission für normale Deployments.

## Normaler Production-Pfad

1. Änderungen werden auf einem Feature-Branch entwickelt.
2. Ein Pull Request kann jederzeit erstellt oder aktualisiert werden.
3. Die autoritativen Required Checks laufen auf dem aktuellen PR-Head.
4. Der Human Repository Owner merged den PR nach `main` oder erteilt im Chat ausdrücklich die Merge-Freigabe für den konkreten PR.
5. Nur der resultierende `main`-Commit darf Production auslösen.
6. Render deployt den produktiven Webservice aus `main` erst nach erfolgreichen CI-Checks (`autoDeployTrigger: checksPass`).
7. Nach dem Deployment werden Health und Source-/Deployment-Identität gegen den `main`-Commit verifiziert.

## Technische Pflicht-Gates

Für den normalen Git-backed Webservice-Pfad müssen mindestens korrelierbar sein:

- `MAIN_IDENTITY`: deployter Commit entspricht einem Commit auf `main`.
- `REQUIRED_CHECKS`: die für den `main`-Commit vorgesehenen CI-/Security-/Governance-Checks sind erfolgreich.
- `RUNTIME_HEALTH`: `/healthz` ist erfolgreich und meldet den erwarteten Runtime-Zustand.
- `SOURCE_IDENTITY`: die Runtime-Identität entspricht dem deployten Source-SHA.
- `SCOPE_RIGHTS`: zusätzliche Lizenz-/Provider-/Redistribution-Rechte sind nur dann Pflicht-Gate, wenn die konkrete Änderung diesen Scope berührt.

Fehlende, laufende, unbekannte oder negative Pflicht-Gates führen fail-closed zu keinem Deployment bzw. zu Recovery/Rollback.

## Merge-Grenze

Deployment Authority und Merge Authority sind strikt getrennt.

- CI-/Security-/Governance-PASS erzeugt keine Merge Authority.
- `deployEligible:true` erzeugt keine Merge Authority.
- Merge erfolgt regulär ausschließlich durch den Human Repository Owner.
- Ein Agent darf nur nach ausdrücklicher Chat-Freigabe für den konkret bezeichneten PR mergen.

## Admission-Grenze

Normale Bugfixes, Produktänderungen, Refactorings, Dokumentation, Tests, bestehende Dependency-Updates und der normale `main`-Deployment-Pfad benötigen keine separate Admission.

Admission bleibt neuen privilegierten Capabilities oder externen Rechte-/Trust-Grenzen vorbehalten, etwa:

- neue produktive Provider-/Datennutzungsrechte,
- neue Raw-/Redistribution-/Sublicensing-Rechte,
- neue privilegierte Control-Plane-Schreibrechte,
- neue Auth-/Secret-Trust-Boundaries,
- neue autonome Self-Healing-Mutationsfähigkeit,
- neue kostenpflichtige oder anderweitig privilegierte Infrastruktur-Capabilities.

## Legacy Image-Promotion

Die vorhandene GHCR-Candidate-/Digest-Evidence kann weiterhin für image-backed Releases, forensische Nachweise oder spätere Promotion-Flows verwendet werden. Sie ist **nicht** mehr Voraussetzung für jede normale Git-backed Web-App-Änderung.

## NATS

Ein neuer Repository-HEAD allein ist kein NATS-Redeploy-Signal. NATS wird nur bei NATS-spezifischen Änderungen oder expliziten Runtime-/Security-Maßnahmen neu deployed.
