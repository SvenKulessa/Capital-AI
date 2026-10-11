# seo-engineering — Interfaces

> Keine API- oder Berechtigungserweiterung; gilt ergänzend zum bestehenden `SKILL.md` und `AGENTS.md`.

## Inputs
- Routes, Sitemap, Robots, Canonicals, Search-Console-Evidence, Content-Quellen
- Repository-Commit und präziser Scope; tenant- und lizenzrelevante Daten nur minimal.

## Outputs
- Validierbare Indexierungs- und strukturierte-Daten-Korrekturen mit Change-Evidence
- Verifizierter Status, Quelle, Validierungsweg und Restrisiken; keine erfundene Runtime-Evidence.

## Dependencies
- Registry-Eintrag: `skillGovernance.seo-engineering`
- Domain Owner: GROWTH; cross-domain Konsultation ohne Transfer der Verantwortung.
- External Interfaces: ausschließlich real vorhandene und explizit berechtigte Provider/Tools.

## Security Boundary
Kein Tracking ohne Consent, keine unlizenzierte Inhaltsübernahme, keine erfundenen Such-KPIs.

## Threat Assumptions
Duplicate Content, Noindex-Regression, Crawling-Lecks zu privaten Seiten, falsche Claims.

## Failure Behaviour
Bei fehlender Evidence `NOT_PROVEN`; bei Verletzung einer Trust Boundary `BLOCKED` (fail-closed). Kein automatischer Provider-/Kostenwechsel.

## Validation Contract
Robots/Sitemap/Canonical-Konsistenz, strukturierte Daten, SSR/JS-Sichtbarkeit und Consent-Checks; Evidenz und exakten Commit speichern. Keine zusätzlichen Required Checks.

## Domain Ownership
- Domain Owner: GROWTH
- Escalation Owner: CAPITAL-AI-GROWTH
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2
