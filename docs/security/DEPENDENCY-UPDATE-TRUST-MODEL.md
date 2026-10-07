> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**  
> Diese Datei bleibt nur als historische Dokumentation bzw. Evidence erhalten. Sie definiert keine zusätzlichen Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Die einzige autorisierende Repository-Richtlinie ist `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`.

# Dependency & Tool Update Trust Model

Stand: 2026-10-01  
Status: verbindlich unterhalb der Root-Policy `AGENTS.md`

## Zweck

CAPITAL-AI hält Tools, Runtimes, Libraries, Actions, Container-Bases und sonstige Abhängigkeiten möglichst auf dem neuesten stabilen und unterstützten Stand. Aktualität ist jedoch nur dann ein positiver Zustand, wenn Herkunft, Integrität, Security, Lizenz/Redistribution und Maintainer-/Community-Signale zusammen plausibel sind.

Dieses Dokument gilt für:

- npm-/Node-Abhängigkeiten,
- Python-/FastAPI-Abhängigkeiten,
- Docker Base Images,
- GitHub Actions,
- Render-/Runtime-Komponenten,
- NATS/Valkey und weitere Infrastrukturkomponenten,
- Security-/Compliance-Tools,
- Build-/Test-/Lint-/Scanning-Tools,
- eingebundene Binärartefakte und externe CLI-Tools.

## Prüfablauf pro Update

### 1. IDENTIFY

- Paket/Tool und exakten Namespace bestimmen.
- bisherige und neue Version erfassen.
- Update als Security, Patch, Minor, Major oder Bugfix klassifizieren.
- Runtime-/Build-/Produktionsrelevanz bestimmen.

### 2. ORIGIN

- Offizielles Maintainer-/Vendor-Repository identifizieren.
- Release/Tag/Changelog gegen die Registry-Version korrelieren.
- Publisher/Maintainer und auffällige Ownership-Wechsel prüfen.
- Lockfile-/Digest-/Integrity-/Signatur-/Provenance-Daten prüfen, soweit verfügbar.

### 3. SECURITY

- GitHub Advisory Database/Dependabot sowie passende OSV/CVE-Informationen prüfen.
- Projektinterne Vulnerability-, Secret- und Misconfiguration-Scans berücksichtigen.
- neue Install-/Postinstall-Skripte, Binärdateien, Netzwerkzugriffe und Berechtigungen diffen.
- bei Security-sensitive Komponenten zusätzliche unabhängige Evidenz heranziehen.

### 4. LICENSE

- Lizenzkennung und Lizenztext gegen die Vorgängerversion vergleichen.
- NOTICE-, Attribution-, Redistribution- und Source-Angebotspflichten bewerten.
- bei fehlender oder widersprüchlicher Lizenzinformation nicht freigeben.

### 5. COMMUNITY / MAINTAINER CORROBORATION

Die zuständige Projekt-Community beziehungsweise Maintainer-Kommunikation wird aktiv gegengeprüft. Geeignete Quellen sind insbesondere:

- offizielle Issues und Discussions,
- offizielle Security Advisories,
- Maintainer-Ankündigungen,
- Release-Diskussionen,
- etablierte Ecosystem-/Security-Kanäle.

Gesucht wird insbesondere nach Hinweisen auf:

- kompromittierte oder zurückgezogene Releases,
- Maintainer-/Account-Takeover,
- Namespace-/Ownership-Wechsel,
- Typosquatting oder Dependency-Confusion,
- unerwartete Telemetrie/Netzwerkzugriffe,
- schädliche oder neue Install-Skripte,
- bekannte Regressionen,
- Breaking Changes, die in Release Notes unvollständig dokumentiert sind.

Community-Aussagen werden nicht ungeprüft als Fakt übernommen. Sie dienen als Gegenprüfung und müssen mit offizieller oder technisch überprüfbarer Evidenz korreliert werden.

### 6. COMPATIBILITY

- Major-Upgrades immer gegen Migration Guide/Breaking Changes prüfen.
- betroffenen Anwendungscode und APIs durchsuchen.
- Runtime- und Typversionen aufeinander abstimmen.
- transitive Dependency-Änderungen und Lockfile-Diff prüfen.
- notwendige Daten-/Schema-/Config-Migrationen identifizieren.

### 7. VERIFY

Mindestens die für die betroffene Komponente relevanten Prüfungen:

- Lint/Typecheck,
- Unit-/Contract-/Integrationstests,
- Build,
- Security-/Secret-/Misconfiguration-Scan,
- Lizenz-/SBOM-Evidence,
- Container-/Runtime-Smoke-Test,
- Browser-/API-Security-Boundary,
- gegebenenfalls Provider-/Runtime-Readback.

Ein grüner Einzeltest ersetzt keine anderen erforderlichen Gates.

### 8. PROMOTE

- Merge nur über geschützten Main.
- Build-once / Promote-many.
- Kandidat über exakten OCI-Digest.
- Attestation/SBOM an denselben Digest binden.
- Production-Handoff bleibt fail-closed.
- Rollback auf bekannten attestierten Digest vorbereiten.

## Update-Klassen

### Security / Patch

Bevorzugt zeitnah auf die neueste sichere stabile Version aktualisieren. Kompatibilitäts- und Trust-Gates bleiben erhalten.

### Minor

Bevorzugt auf neuesten stabilen Minor-Stand aktualisieren, sofern keine relevanten Breaking Changes oder Lizenz-/Supply-Chain-Auffälligkeiten vorliegen.

### Major

Immer separat. Erfordert Migration-Review, Quellcode-Korrelation, Community-/Maintainer-Gegenprüfung, Lizenz-/Provenance-Prüfung, Tests und expliziten Rollback-Pfad.

### Bugfix ohne Versionssprung

Auch direkte Vendor-Patches, Backports, Forks oder lokal eingebundene Fixes durchlaufen denselben Origin-/Security-/License-/Community-Prozess. Ein lokaler Patch darf die Upstream-Herkunft nicht verschleiern.

## Fail-closed Kriterien

Status `BLOCKED`, wenn:

- Ursprung/Publisher nicht eindeutig ist,
- Release und Registry-Artefakt nicht korrelieren,
- Integrity-/Digest-/Provenance-Werte widersprüchlich sind,
- ernsthafte ungeklärte Kompromittierungsberichte vorliegen,
- Lizenz-/Redistribution-Lage unklar ist,
- neue install-time Ausführung oder Binärartefakte nicht plausibel erklärt sind,
- Major-Breaking-Changes nicht bewertet wurden,
- notwendige Evidenz nicht reproduzierbar ist.

## PR-Evidenzschema

Jeder Update-PR dokumentiert mindestens:

```text
Komponente:
Alt -> Neu:
Klasse:
Offizielle Quelle:
Registry/Artefakt:
Security Advisories:
Lizenz/Redistribution:
Maintainer/Community:
Breaking Changes:
Transitive/Lockfile-Diff:
Tests/Scans:
Restrisiko:
Rollback:
Status: VERIFIED | BLOCKED | ESCALATED
```

`VERIFIED` bedeutet ausschließlich, dass die Update-Evidenz positiv ist. Production-Freigabe entsteht erst durch den separaten Production-Handoff.
