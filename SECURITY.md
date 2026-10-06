# Security Policy

Stand: 2026-10-07
Primary Domain: TRUST
Geltungsbereich: gesamtes Repository, produktive Webanwendung, Auth-, Daten-, Provider-, Agent-, CI/CD- und Supply-Chain-Grenzen.

## Supported Versions

Security-Fixes werden für den aktiv gepflegten Produktionsstand und den aktuellen `main`-Entwicklungszweig bereitgestellt.

| Version | Unterstützt |
| --- | --- |
| Aktueller `main` / produktiver Release | ✅ |
| Veraltete oder nicht mehr gepflegte Revisionen | ❌ |

## Reporting a Vulnerability

Sicherheitslücken dürfen **nicht** über öffentliche GitHub Issues, Discussions, Pull Requests oder andere öffentliche Kanäle gemeldet werden.

Bevorzugt ist GitHub Private Vulnerability Reporting über den Security-Bereich dieses Repositories, sofern die Funktion repositoryseitig aktiviert ist. Ist dort kein privater Meldeweg verfügbar, darf die Schwachstelle nicht öffentlich offengelegt werden; stattdessen ist ein privater Maintainer-Kanal zu verwenden.

Ein verwertbarer Report sollte, soweit möglich, enthalten:

- betroffene Komponente oder Dienst,
- betroffene Version, Commit oder Deployment,
- Beschreibung der Schwachstelle,
- reproduzierbare Schritte,
- erwartetes und beobachtetes Verhalten,
- Sicherheitsauswirkung,
- relevante Logs oder Evidence mit entfernten Secrets,
- bekannte Mitigation oder Remediation, falls vorhanden.

Passwörter, API Keys, Access Tokens, Private Keys, Kundendaten oder andere Secrets dürfen niemals in Reports, Logs, Screenshots, Commits oder Pull Requests aufgenommen werden.

## Fail-Closed Security Model

CAPITAL-AI folgt einem fail-closed Sicherheitsmodell.

Ein erfolgreicher Test, Build, Benchmark, Scan, Admission-Check oder CI-Workflow ist **niemals allein** eine Lizenz-, Security-, Merge-, Owner- oder Production-Freigabe.

Ein positives Security-, Compliance-, Lizenz- oder Admission-Ergebnis ist ausschließlich Evidence. Es erzeugt **keine automatische Mutationsautorität**.

Insbesondere darf ein positives Ergebnis **nicht automatisch** autorisieren oder auslösen:

- Codeänderungen,
- Commits,
- Branch-Erstellung,
- Pull Requests,
- Merges,
- Deployments,
- Secret- oder Credential-Rotation,
- Permission-/Role-/Ruleset-Änderungen,
- Auth-, DNS-, Billing- oder Branch-Protection-Änderungen,
- Infrastruktur-Mutationen,
- Provider- oder Dataset-Aktivierung,
- Production Enablement.

Explizit zugelassene, deterministische Low-Risk-Self-Healing-Pfade bleiben nur innerhalb ihrer separat versionierten Fingerprint-, Scope-, Revalidation- und Rollback-Gates zulässig. **Admission allein reicht dafür niemals aus.**

## Authentication and Authorization

Security Boundaries müssen mindestens folgende Prinzipien erzwingen:

- Least Privilege,
- explizite Autorisierung,
- user-bound access,
- serverseitige Permission-Validierung,
- Trennung öffentlicher und privater Provider-Operationen,
- keine clientseitige Trust-Entscheidung für privilegierte Aktionen,
- kein Privilege Escalation durch Fallback-Verhalten.

Ein erfolgreicher Login oder eine gültige Session impliziert keine Berechtigung für privilegierte Aktionen.

## Secrets and Credentials

Secrets dürfen niemals in das Repository committed werden.

Credentials müssen über freigegebene Secret-Management- oder Deployment-Mechanismen bereitgestellt werden und dürfen nicht erscheinen in:

- Source Code,
- Git-Historie,
- CI-Logs,
- Application Logs,
- Build-Artefakten,
- Screenshots,
- Test-Fixtures,
- Telemetrie,
- generierter Dokumentation.

Credential-Nutzung muss auf die minimal erforderlichen Rechte begrenzt sein.

## Supply-Chain Security

Dependencies, Container, Binaries, Modelle, Datensätze und externe Tools sollen, soweit technisch möglich, verifizierbare Provenance besitzen.

Relevante Controls umfassen insbesondere:

- Dependency Locking und Version Pinning,
- Vulnerability Scanning,
- SBOM-Erzeugung,
- Lizenz- und Redistribution-Prüfung,
- Provenance- und Integritäts-Evidence,
- immutable Artifact References,
- minimale Container-Rechte,
- non-root Runtime,
- read-only Runtime-Kompatibilität,
- Entfernung unnötiger Capabilities und Dependencies.

Ein erfolgreicher Vulnerability- oder License-Scan ist für sich allein keine Production-Freigabe.

## Third-Party Services and Data Providers

Externe APIs, Datensätze, Modelle und Services bleiben für produktive Nutzung fail-closed, solange relevante technische, vertragliche, lizenzrechtliche und sicherheitsbezogene Anforderungen nicht verifiziert sind.

Wo erforderlich, werden getrennt bewertet:

- internal processing,
- customer-facing display,
- non-reconstructable derived outputs,
- raw/source-data redistribution,
- storage und replay,
- backup und restore,
- sublicensing / pass-through rights.

Technische Erreichbarkeit oder ein erfolgreicher Adapter-Test ist niemals Beleg für rechtliche oder vertragliche Nutzungsrechte.

## Automated Security Tooling

Automatisierte Security- und Governance-Tools dürfen Findings erkennen, korrelieren, klassifizieren, testen und Evidence erzeugen.

Ohne separat zugelassene Mutationskette gilt standardmäßig read-only.

Automatisierung darf Write Authority insbesondere nicht allein ableiten aus:

- erfolgreichem Test,
- erfolgreichem Scan,
- positiver Admission,
- Policy Match,
- Benchmark-Ergebnis,
- erfolgreicher Korrelation,
- geändertem Repository-HEAD.

Automatische Reparatur-Commits, Branches, Pull Requests, Merges, Deployments oder Permission-Änderungen benötigen die dafür ausdrücklich definierte Autorisierung und alle zugehörigen technischen Gates.

## Incident Handling

Wenn eine Schwachstelle Confidentiality, Integrity, Authentication, Authorization, Kundendaten, Secrets oder Infrastruktur beeinträchtigen kann:

1. betroffene Capability erforderlichenfalls fail-closed eindämmen,
2. relevante Evidence erhalten,
3. Secrets während der Untersuchung nicht exponieren,
4. betroffene Trust Boundary bestimmen,
5. betroffene Versionen und Deployments identifizieren,
6. Remediation implementieren,
7. Regression und Security Validation durchführen,
8. verbleibendes Risiko dokumentieren,
9. erst danach betroffene Funktionalität kontrolliert wieder freigeben.

Der ausführlichere Prozess steht in `docs/security/INCIDENT-RESPONSE.md`.

## Security Evidence

Security Claims sollen durch reproduzierbare Evidence gestützt werden.

Dazu gehören je nach Scope:

- automatisierte Tests,
- Security Scans,
- SBOMs,
- Dependency Inventories,
- Container-Konfiguration,
- Authorization Tests,
- Browser-/Runtime-Evidence,
- Provenance Records,
- Deployment-Konfiguration,
- Vulnerability Reports.

Evidence beschreibt beobachteten Zustand. Sie ersetzt keine Security-, Lizenz-, Owner-, Merge- oder Production-Freigabe.

## Policy Relationship

Diese Policy ergänzt und verschärft die Root-Policy `AGENTS.md@currentmain`, die Domain-/Release-Governance und die Security-Handoff-Verträge.

Bei Widersprüchen gilt die strengere fail-closed Regel.

Insbesondere bleiben folgende Contracts verbindlich:

- `AGENTS.md`
- `docs/governance/DOMAIN-RELEASE-GOVERNANCE.md`
- `docs/security/POST-MERGE-CORRELATION-SELF-HEALING.md`
- `CAPITAL-AI-TRUST/PROJECT.md`
