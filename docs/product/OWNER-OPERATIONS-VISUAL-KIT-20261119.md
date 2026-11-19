# CAPITAL-AI Owner Operations Visual Kit — 2026-11-19

## Autoritative Referenz und Grenzen
- Root-`AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`, `ACTIVE_CONSERVATIVE`.
- Visuelle Referenz: vom Owner freigegebene GOLD/VIOLET Mobile-Screenshot-Vorlage.
- Diese Datei ist **Dokumentation, keine neue Engineering-Richtlinie oder neue Freigabestufe**.
- Der neue Owner-Bereich erscheint unter `/profile/dashboard` nur für `account.iamRole=owner`; bestehende Route `/profile/render-dashboard` bleibt kompatibel.
- Autorisierung bleibt **serverseitig** unter `/api/profile/evidence-dashboard-readback` (Owner/IAM/verifizierte E-Mail, gleiche Sitzung, GET-only, no-store). Frontend-Tabs sind keine Autorisierung.
- Keine neuen zahlungspflichtigen Dienste, Secrets, OAuth-Scopes, Social Publisher, Google Cloud Änderungen oder produktive Datenbankmutationen.

## Visual-Fidelity / Interaktionsvertrag
- Die Seite verwendet die bestehende AccountPageShell. Das Zentrum übernimmt die GOLD-Kontur, Dark-Navy-Panel, Crown-Header und Owner-Badge aus der Vorlage.
- Vier KPI-Karten für GitHub, Render, GA4 und Evidence; VIOLET-PR-Zeitreihe; 3-teiliger Evidence-Donut; CI/Deployments/Events-Balken; sechs Agenten-Karten; Read-only-Footer.
- Roboter/Hologramm wird als **erstes eigenes SVG**, ohne fotografierte Personen oder fremde Markenbilder, im Frontend gerendert.
- Screenshots aus der Referenz enthalten ausdrücklich synthetische Zahlen. Die echten Komponenten zeigen **niemals** diese Zahlen als Live-Werte.
- GitHub-KPI = vollständig verifizierte offene PRs; Zeitreihe = **letztes Update aktuell offener PRs** über 7 UTC-Tage. Bei Paginierung oder ungültigen Daten: `NOT_PROVEN`.
- Render-KPI = Status des letzten bei Render gemeldeten Deployments. `live` ist **keine unabhängige OCI- oder HTTP-BuildIdentity**.
- GA4-KPI = `page_view`-Events aus der vorhandenen 7-Tage-Event-Allowlist, keine Nutzer, Käufe oder Umsätze.
- Evidence-Donut zählt nur `VERIFIED`, `BLOCKED`, `NOT_PROVEN` nach sechs definierten Kategorien. Prozentwerte sind der Anteil dieser Kategorien, keine Compliance-/Security-Score-Garantie.
- CI/Deployments/Events-Balken: jeweils unterschiedliche Quellenumfänge. Nicht als gemeinsamer Zeittrend, Erfolgsquote oder Kostenvergleich ausgeben.
- Agenten: PR-Zuordnung ist beobachtbar, **Runtime-Heartbeat ist für alle `NOT_PROVEN`**.
- Browser: 320, 390, 1440 CSS px; 200% Zoom; keyboard/touch min. 44 px bei interaktiven Controls; `prefers-reduced-motion`. Visuelle Live-Abnahme bleibt separat.

## Social Media Content Engine / wiederverwendbare Werkzeuge
- `src/platform/SocialMediaEngine/Editing/OwnerOperationsVisualKit.ts`: statisches Public-SVG-Template ohne Eigentümer-, Tenant-, Live- oder Zahlungsdaten.
- `scripts/growth/render-owner-operations-visual.mjs`: rein lokaler, manueller PNG-Draft mit vorhandenem `@resvg/resvg-wasm@2.6.2`, MPL-2.0; Font bereits unter SIL OFL vorhanden. Keine weitere Dependency, SaaS-Aktivierung oder automatisierte Veröffentlichung.
- Lokaler Export (nur nach `npm ci`): `npm run render:owner-operations-social-draft -- --output /tmp/owner-operations-draft.png`. Export schlägt fehl, falls die Zieldatei schon existiert. SHA-256 ist nur Asset-Identität, kein Rechte-Nachweis.
- `ContentStudioPanel` zeigt den Entwurf als verfügbare Designvorlage. Ein Social-Package/MediaKit-v5-Import erfordert getrennte Byte-, SHA-256-, Lizenz-, Quelle-, CADS-, Redaktion- und Kanal-Freigaben. `publicPublishAllowed=false` und keine Approval-/Delivery-Receipts.
- Reuse vorhandener Werkzeuge: GitHub-Connector für Git-/CI-Evidence; bestehender Read-only-Server-Adapter für GitHub/Render/GA4; vorhandener ReSVG-Renderer für statische Grafiken. Externe Plugin-Accounts, Secrets oder MCP-Verbindungen werden **nicht** in das Repository kopiert.

## Tests / Rücknahme
- `npm run test:owner-operations`
- `npm run test:social-core`
- `npm run lint`, `npm run build` und bestehende GitHub CI-Security/Domain Governance.
- Negativ: unvollständige PR-Paginierung, ungültige GA4-Events, fehlende Payment-Provenance, fehlende Agenten-Heartbeats, anonymer/rollenfremder Zugriff.
- Rollback: Squash-Commit zurücknehmen; keine Datenmigration, keine neue Runtime- oder Publisher-Konfiguration.

## Evidence Status bei PR-Erstellung
- Source-Frontend und Draft-Social-Template: `IMPLEMENTED` auf Feature-Branch.
- Vollständige CI, Render-Deployment, Owner-Sitzungsabnahme und pixelgenauer Screenshot-Vergleich: `NOT_PROVEN` bis tatsächliche Nachweise vorliegen.
