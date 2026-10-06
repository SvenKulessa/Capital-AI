# CAPITAL-AI Incident Response

Stand: 2026-10-07
Primary Domain: TRUST

## Zweck

Dieser Prozess beschreibt die minimale Incident-Response-Kette für Security-Ereignisse in CAPITAL-AI. Er ersetzt keine Root-Policy, keine Owner-Freigabe und keinen Production-Handoff.

## Severity

- **SEV-0** — aktive Kompromittierung von Secrets, Auth, privilegierter Infrastruktur oder Kundendaten; unmittelbare Eindämmung erforderlich.
- **SEV-1** — bestätigte ausnutzbare Schwachstelle mit hohem Impact oder produktiver Exposition.
- **SEV-2** — relevante Schwachstelle ohne bestätigte aktive Ausnutzung.
- **SEV-3** — Hardening-, Defense-in-Depth- oder nicht unmittelbar ausnutzbarer Befund.

## Ablauf

1. **Detect** — Finding an konkrete Version, SHA, Runtime, Identity oder Artifact Digest binden.
2. **Contain** — betroffene Capability bei realem Risiko fail-closed begrenzen; keine pauschalen Nebenmutationen.
3. **Preserve Evidence** — Logs, Digests, Scans und Runtime-Readbacks sichern; Secrets redigieren.
4. **Scope** — Trust Boundary, betroffene Daten, Nutzer, Provider, Deployments und Credentials bestimmen.
5. **Classify** — Severity, Exploitability und betroffene Security Controls bestimmen.
6. **Remediate** — kleinste sichere und reversible Korrektur implementieren.
7. **Verify** — Regression, Security Tests, Supply-Chain-/License-Gates und relevante Runtime-Readbacks erneut ausführen.
8. **Recover** — Capability nur nach positiver Revalidierung und den weiterhin erforderlichen Freigaben wieder aktivieren.
9. **Document** — Root Cause, Timeline, Evidence, Residual Risk und Rollback dokumentieren.
10. **Prevent Recurrence** — nur reproduzierbare Schutzinvarianten oder Tests ergänzen; keine autonome Mutation allein aus einem positiven Admission-Ergebnis ableiten.

## Credential Incidents

Bei möglicher Secret-Kompromittierung gilt:

- Secret nicht in Logs, PRs oder Evidence kopieren.
- betroffenen Scope und Berechtigungen zuerst bestimmen,
- Rotation nur gezielt und mit notwendiger Autorisierung durchführen,
- abhängige Dienste kontrolliert aktualisieren,
- alten Credential-Status und neuen Readback nachweisen,
- keine globale Rotation ohne Scope-Evidence.

## External Control Planes

Mutationen an Production, Auth, DNS, Billing, Branch Protection, Rulesets oder anderen Security Controls benötigen die jeweils geltende explizite Autorisierung und einen verifizierten Endzustand.

## Security Contacts

Primärer Meldeweg ist GitHub Private Vulnerability Reporting, **wenn** es im Repository aktiviert und im Security-Tab verfügbar ist.

Solange dieser Zustand nicht technisch verifiziert ist, darf Dokumentation keine Aktivierung behaupten. Öffentliche Issues, Discussions und PRs sind kein zulässiger Vulnerability-Disclosure-Kanal.

Konkrete zusätzliche Security-Kontaktadressen dürfen erst eingetragen werden, wenn sie als tatsächlich betriebene und überwachte Kanäle bestätigt sind.
