# CAPITAL-AI Engineering Delivery Policy

Stand: 2026-10-01  
Geltungsbereich: gesamtes Repository, alle Agents, Pull Requests, Builds, Updates und Deployments.

## Oberste Priorität

Security, Compliance, Lizenz-/Provenance-Sicherheit, Reproduzierbarkeit, Evidenz und Production-Stabilität haben Vorrang vor Bequemlichkeit, Geschwindigkeit und dem bloßen Erreichen der neuesten Versionsnummer.

Ein erfolgreicher Test, Build oder Scan ist **niemals allein** eine Lizenz-, Security- oder Production-Freigabe.

Bei Widersprüchen zwischen lokalen Arbeitsanweisungen und dieser Policy gilt die strengere fail-closed Regel. Echte technische Grenzen wie Auth, Public API, Daten-/Event-Schema, Security Boundary, Evidence, Container-Identität und Production-Handoff dürfen nicht durch organisatorische Abkürzungen umgangen werden.

## Domain-Einstiegspunkt

Für **jede** Domain und jede neue Arbeitssitzung ist der erste verbindliche Kontext `AGENTS.md@currentmain`.

- Vor Planung, Änderung, Review oder Merge ist `AGENTS.md` vom **aktuellen `main`** zu lesen; eine ältere Branch-Kopie ist nicht als kanonische Policy ausreichend.
- PRODUCT, MARKET, PLATFORM, TRUST und GROWTH übernehmen diese Root-Policy vollständig als übergeordneten Contract.
- Domain-spezifische Dokumente und `AGENTS.md`-Dateien dürfen die Root-Policy konkretisieren oder verschärfen, aber nicht abschwächen.
- Weicht ein Feature-Branch vom aktuellen `main` ab, ist vor einer zustandsverändernden Aktion erneut gegen `AGENTS.md@currentmain` und den aktuellen Main-SHA zu korrelieren.
- PRs sollen im Evidence-/Review-Text bestätigen, dass der aktuelle Root-Contract berücksichtigt wurde.

## Standardmodell für Änderungen und Updates

1. **CURRENT MAIN zuerst** — vor jeder Änderung gegen den aktuellen `main`-SHA korrelieren.
2. **Frischer Branch** — Änderungen beginnen auf einem aktuellen `capital-ai-<domain>/<purpose>-YYYYMMDD` Branch.
3. **Klassifizieren** — Security, Patch, Minor oder Major sowie betroffene Domain und Runtime bestimmen.
4. **Patch/Minor** — dürfen bei niedrigem Risiko als Routine-Updates gebündelt werden, bleiben aber test-, lizenz- und evidenzpflichtig.
5. **Major** — immer als eigene Migration behandeln: Release Notes/Migrationshinweise, API-/Typ-/Runtime-Kompatibilität, Quellcode-Suche nach Breaking Changes, Lizenz/Provenance, Lockfile-Diff und Rollback prüfen.
6. **Security-Updates** — nicht durch Komfortregeln unterdrücken. Kritische Fixes dürfen schneller bearbeitet werden, aber Production-Gates bleiben unverändert.
7. **Konflikte** — keine pauschale `ours/theirs`-Auflösung für Lockfiles, Vendor-Patches oder Security-Evidence. Von aktuellem `main` rekonstruieren und bereits neuere sichere Änderungen bewahren.
8. **Neueste stabile Version** — bevorzugen, wenn unterstützt und kompatibel. "Latest" ersetzt keine Migrationsprüfung.
9. **Self-Healing** — wiederkehrende sichere Reparaturmuster erst nach mindestens drei positiven Validierungszyklen als automatische Invariante fest verankern.

## Update-Trust-Contract

Für **jedes** Update, Upgrade, Patch und jeden dependency-bezogenen Bugfix gilt zusätzlich eine verpflichtende Herkunfts- und Community-Gegenprüfung.

### Zielzustand: latest stable, aber verifiziert

- Verwendet wird grundsätzlich die **neueste stabile, unterstützte Version**, sobald sie für CAPITAL-AI kompatibel ist und die nachfolgenden Trust-Gates erfüllt.
- Pre-Releases, Nightlies, RCs und experimentelle Builds werden nicht als Routine-Update übernommen.
- Ein neuer Versionsstand wird nicht allein deshalb akzeptiert, weil Registry, Dependabot oder ein Versionsscanner ihn als "latest" meldet.

### Verbindliche Quellenhierarchie

Mindestens folgende Evidenzklassen sind zu prüfen und im PR nachvollziehbar zu dokumentieren:

1. **Offizielle Herkunft** — Maintainer-/Vendor-Repository, offizieller Release/Tag/Changelog und gegebenenfalls offizielle Security Advisories.
2. **Registry-/Artefakt-Evidenz** — erwarteter Paketname/Namespace, Publisher/Maintainer, Version, Lockfile, Registry-URL, Integritäts-Hash sowie verfügbare Provenance/Signaturen/Attestations.
3. **Security-Intelligence** — GitHub Advisory Database/Dependabot, OSV/CVE und die im Projekt vorgesehenen Vulnerability-/Secret-/Misconfiguration-Scanner.
4. **Lizenz/Redistribution** — SPDX-/Lizenzmetadaten, Lizenztext, NOTICE-/Attributionspflichten und Änderungen gegenüber der bisher verwendeten Version.
5. **Maintainer-/Community-Gegenprüfung** — offizielle Issues, Discussions, Security-Kanäle oder die etablierte Community des jeweiligen Projekts auf Hinweise zu kompromittierten Releases, Account-/Maintainer-Takeover, Typosquatting, zurückgezogenen Releases, schädlichen Install-Skripten, unerwarteten Ownership-Wechseln oder regressiven Breaking Changes prüfen.

Community-Signale sind zusätzliche Evidenz und ersetzen niemals die offizielle Herkunftsprüfung. Umgekehrt reicht ein formal korrekt veröffentlichtes Paket nicht aus, wenn seriöse Maintainer-/Community- oder Security-Hinweise auf eine mögliche Kompromittierung bestehen.

### Fail-closed Regeln

Ein Update bleibt **BLOCKED**, wenn mindestens einer der folgenden Punkte ungeklärt ist:

- Herkunft, Publisher oder Namespace ist nicht eindeutig verifizierbar.
- Version/Tag, Registry-Artefakt oder Integritäts-/Provenance-Evidence widersprechen sich.
- Es bestehen glaubhafte ungeklärte Hinweise auf Supply-Chain-Kompromittierung, Maintainer-Takeover oder Typosquatting.
- Lizenz oder Redistribution-Rechte sind unklar oder haben sich inkompatibel geändert.
- Install-/Postinstall-Skripte, neue Binärartefakte oder neue Netzwerkzugriffe erscheinen ohne nachvollziehbaren Grund.
- Ein Major-Upgrade wurde nicht gegen dokumentierte Breaking Changes und betroffenen Anwendungscode geprüft.

### Mindest-Evidenz je Update

Jeder Update-PR soll mindestens festhalten:

- bisherige und neue Version,
- Update-Klasse: Security/Patch/Minor/Major/Bugfix,
- offizielle Release-/Changelog-Quelle,
- Security-/Advisory-Ergebnis,
- Lizenz-/Provenance-Ergebnis,
- Maintainer-/Community-Gegenprüfung mit Datum,
- relevante Breaking Changes beziehungsweise "keine gefunden",
- Lockfile-/Transitive-Dependency-Diff,
- ausgeführte Tests/Scans,
- verbleibende Risiken und Rollback-Pfad.

Für Security-sensitive Komponenten, Major-Upgrades, Auth, Runtime, CI/CD, Container, Broker und Deployment-Infrastruktur sind mindestens **zwei voneinander unabhängige Evidenzklassen zusätzlich zur Registry** erforderlich.

## Remote AI Cloud Browser Changes

Jede **zustandsverändernde** Aktion an externen Systemen, die durch eine AI-gestützte Cloud-Browser-Sitzung im Namen des Owners ausgeführt wird, muss verpflichtend als **"Remote AI basierte Cloud Browser Sitzung — durch den Owner freigegeben"** dokumentiert werden.

Dabei gelten mindestens folgende Regeln:

- Ausführungsmodus und Owner-Freigabe müssen explizit benannt werden.
- Die Evidence muss Zielsystem, Scope, Zweck, konkrete Änderungen, Ergebnis, providerseitigen Readback und Rollback-Möglichkeit enthalten.
- Es darf nicht der Eindruck entstehen, der Owner habe eine konkrete UI-Aktion persönlich ausgeführt, wenn diese tatsächlich durch die AI-gestützte Remote-Sitzung erfolgte.
- Secrets, Tokens, Session-Cookies, Recovery Codes und andere Zugangsdaten dürfen nicht in Evidence oder Screenshots gespeichert werden.
- Kritische Änderungen an Auth, Billing, DNS/Domain, Production, Branch Protection oder Security Controls benötigen zusätzlich einen verifizierten Endzustand.
- Die Session-Dokumentation ersetzt keine Required Checks, Security-/Lizenz-Gates oder Production-Handoff-Freigaben.

Verbindliche Detailregel:
- `docs/security/REMOTE-AI-CLOUD-BROWSER-SESSIONS.md`

## Docker Build- und Runtime-Modell

- Build-once / Promote-many: exakt das geprüfte Image wird veröffentlicht und weitergereicht; kein Rebuild zwischen Prüfung und Promotion.
- Multi-Stage Builds verwenden und Build-Werkzeuge aus dem Runtime-Image fernhalten.
- Vertrauenswürdige, möglichst kleine Base Images verwenden.
- Base Images mit konkreter Version **und Digest** pinnen; keine mutable `latest`-Referenz für freigaberelevante Builds.
- Dependencies aus Lockfiles deterministisch installieren; Install-Skripte nur wenn explizit erforderlich und geprüft.
- Runtime als non-root betreiben.
- Runtime nach Möglichkeit read-only, `cap-drop ALL` und `no-new-privileges`.
- Paketmanager, Compiler, Debugger und nicht benötigte Utilities aus dem Runtime-Image entfernen.
- Secrets niemals in Image-Layern, Dockerfile-`ARG`, statischen Assets oder Repository-Evidence hinterlegen. Build-Secrets nur über dafür vorgesehene Secret-Mounts; Production-Secrets ausschließlich zur Laufzeit.
- `.dockerignore` und minimalen Build-Kontext verwenden.
- Netzwerkzugriff in deterministischen Test-/Build-Schritten einschränken, wenn externe Zugriffe nicht erforderlich sind.
- Healthchecks müssen bounded sein und dürfen keine Secrets offenlegen.
- Persistente Daten gehören nicht in den austauschbaren App-Container.

## CI/CD- und Supply-Chain-Modell

- Drittanbieter-GitHub-Actions auf vollständige Commit-SHAs pinnen.
- Workflow-Permissions nach Least Privilege; Checkout-Credentials nicht unnötig persistieren.
- Source-, Build- und Runtime-Identität über Git SHA, OCI Digest und Provider-Deployment korrelieren.
- Vor Promotion: relevante Tests, Lint, Security-/Secret-/Misconfiguration-Scans, Lizenzprüfung und SBOM.
- Attestations und SBOM müssen an den **exakten Registry-Digest** gebunden sein.
- Security-Ausnahmen sind eng begrenzt, begründet, versioniert und mit Ablauf-/Review-Logik zu führen.
- Ein fehlender oder widersprüchlicher Nachweis führt zu BLOCKED/ESCALATED, nicht zu stillschweigender Freigabe.

## Production Deployment

1. Merge nur über geschützten `main` mit erforderlichen Checks.
2. Candidate aus dem bereits geprüften Image erzeugen.
3. GHCR ausschließlich über unveränderlichen Digest als Deployment-Identität verwenden.
4. Render-Image-Quelle gegen den attestierten GHCR-Digest zurücklesen.
5. Runtime-Digest und eingebetteten Source-SHA über Health/Evidence verifizieren.
6. Lizenz-/Redistribution-Gate, Main-Schutz, Image-Quelle, Runtime-Digest und Runtime-Identity müssen gemeinsam positiv sein.
7. Erst danach Production-Handoff beziehungsweise Domain-Umschaltung.
8. Rollback erfolgt auf einen zuvor attestierten bekannten Digest; kein spontaner Rebuild.
9. Auto-Deploy darf diese Handoff-Grenze nicht umgehen.

## Web-/API-Architektur

- Öffentliche Routing-, Auth-, Rate-Limit- und Security-Grenzen müssen explizit und testbar sein.
- Express darf als öffentliches Node.js-Gateway/Router eingesetzt werden.
- FastAPI wird für Python-/Analyse-/Scoring-Services standardmäßig intern angebunden; eine direkte öffentliche Exposition erfordert eine eigene Security- und Auth-Freigabe.
- Service-zu-Service-Kommunikation folgt Least Privilege, klaren Schemas, Timeouts, Größenlimits und fail-closed Fehlerbehandlung.
- Eingaben werden an der Trust Boundary validiert; interne Typannahmen ersetzen keine Runtime-Validierung.

## Evidenz und Release-Freigabe

Für eine Production-Freigabe müssen mindestens korrelierbar sein:

- Produkt-/Schema-Version, soweit relevant
- Source Git SHA
- OCI Image Digest
- SBOM
- Build-/Provenance-Attestation
- Lizenz-/Redistribution-Evidence
- Required Checks / Main Protection
- Provider-Deployment-Identität
- Runtime-Identität und Health

Die kanonischen Detailregeln bleiben in:
- `docs/governance/DOMAIN-RELEASE-GOVERNANCE.md`
- `docs/security/PRODUCTION-HANDOFF.md`
- `docs/security/DEPENDENCY-UPDATE-TRUST-MODEL.md`

Diese Root-Policy definiert die übergeordnete Arbeitsweise; die Detaildokumente dürfen sie verschärfen, aber nicht abschwächen.
