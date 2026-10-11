# seo-engineering — Responsibilities

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
Technical SEO, Indexierungsregeln, kanonische URLs, Schema.org, Content Cluster und Crawl-Messung; nur innerhalb vorhandener CAPITAL-AI-Domains.

## Scope
Technical SEO, Indexierungsregeln, kanonische URLs, Schema.org, Content Cluster und Crawl-Messung.

## Inputs
Routes, Sitemap, Robots, Canonicals, Search-Console-Evidence, Content-Quellen.

## Outputs
Validierbare Indexierungs- und strukturierte-Daten-Korrekturen mit Change-Evidence.

## Dependencies
- Source of Truth: `.agents/skills/registry.json#skillGovernance.seo-engineering`
- Autorität: `AGENTS.md`
- Zuständige Domain: `GROWTH`; geteilte Nutzung ist keine zusätzliche Ownership

## Domain Ownership
- Domain Owner: GROWTH
- Escalation Owner: CAPITAL-AI-GROWTH
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- gültige indexierbare kanonische Seiten
- organische Klicks nur bei verifizierter Datenquelle

## Evidence Requirements
Quellen- und Versionstand, Testkommando mit Ergebnis/Commit-SHA, Gegenprobe, beobachtete Grenzfälle und mögliche Rücknahme. KPI-Werte ohne Messung sind `NOT_PROVEN`.

## Security Constraints
- Security Boundary: Kein Tracking ohne Consent, keine unlizenzierte Inhaltsübernahme, keine erfundenen Such-KPIs.
- Threat Assumptions: Duplicate Content, Noindex-Regression, Crawling-Lecks zu privaten Seiten, falsche Claims.
- Failure Behaviour: `BLOCKED` bei unbewiesener sicherheitskritischer Voraussetzung; keine stillen Fallback-Rechte.
- Fail Closed Policy: Nur den nachweislich betroffenen Wirkpfad sperren; kein Credential/PII-Leak, keine implizite Lizenzfreigabe.

## Failure Conditions
Duplicate Content, Noindex-Regression, Crawling-Lecks zu privaten Seiten, falsche Claims; keine ungeprüften Live-Daten, Auth- oder Tarif-Attests.

## Validation Rules
Robots/Sitemap/Canonical-Konsistenz, strukturierte Daten, SSR/JS-Sichtbarkeit und Consent-Checks. Dokumentations-/CI-Strukturprüfungen prüfen nur Struktur, nicht die externe Anwendung.

## Acceptance Criteria
Ownership mit Registry identisch; drei Skill-Dateien vorhanden; Test- und Quellenbelege unterscheidbar; Security-Grenzen und Exit-Criteria nachvollziehbar.

## Escalation Matrix
- Umsetzung: GROWTH.
- Zugänge / Vertrag / Zahlung: CAPITAL-AI-GROWTH, nur wenn persönlich erforderlich.
- Sicherheitsbezug: CAPITAL-AI-TRUST im selben Workflow, keine neue Freigabestufe.
