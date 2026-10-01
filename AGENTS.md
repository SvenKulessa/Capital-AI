# CAPITAL-AI Engineering Delivery Policy

Stand: 2026-10-01  
Geltungsbereich: gesamtes Repository, alle Agents, Pull Requests, Builds, Updates und Deployments.

## Oberste Priorität

Security, Compliance, Lizenz-/Provenance-Sicherheit, Reproduzierbarkeit, Evidenz und Production-Stabilität haben Vorrang vor Bequemlichkeit, Geschwindigkeit und dem bloßen Erreichen der neuesten Versionsnummer.

Ein erfolgreicher Test, Build oder Scan ist **niemals allein** eine Lizenz-, Security- oder Production-Freigabe.

Bei Widersprüchen zwischen lokalen Arbeitsanweisungen und dieser Policy gilt die strengere fail-closed Regel. Echte technische Grenzen wie Auth, Public API, Daten-/Event-Schema, Security Boundary, Evidence, Container-Identität und Production-Handoff dürfen nicht durch organisatorische Abkürzungen umgangen werden.

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

Diese Root-Policy definiert die übergeordnete Arbeitsweise; die Detaildokumente dürfen sie verschärfen, aber nicht abschwächen.
