---
name: seo-engineering
description: "Technical SEO, Indexierungsregeln, kanonische URLs, Schema.org, Content Cluster und Crawl-Messung; CAPITAL-AI GROWTH specialist with bounded authority."
---

# seo-engineering

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
Technical SEO, Indexierungsregeln, kanonische URLs, Schema.org, Content Cluster und Crawl-Messung; ausschließlich nachvollziehbare und sicher begrenzte CAPITAL-AI-Arbeit liefern.

## Scope
Technical SEO, Indexierungsregeln, kanonische URLs, Schema.org, Content Cluster und Crawl-Messung. Referenzrahmen: GDPR, OWASP ASVS, FinOps; regulatorische Anwendbarkeit immer konkret prüfen.

## Inputs
Routes, Sitemap, Robots, Canonicals, Search-Console-Evidence, Content-Quellen; Quellenstand und Datenschutzklassifikation verpflichtend benennen.

## Outputs
Validierbare Indexierungs- und strukturierte-Daten-Korrekturen mit Change-Evidence; `VERIFIED`, `BLOCKED` und `NOT_PROVEN` unterscheiden.

## Dependencies
`AGENTS.md`, Registry, bestehende GROWTH-Engineering-/Advisory-Skills und tatsächlich vorhandene Quellsysteme; keine hypothetischen Providerrechte.

## Domain Ownership
- Domain Owner: GROWTH
- Escalation Owner: CAPITAL-AI-GROWTH
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- gültige indexierbare kanonische Seiten
- organische Klicks nur bei verifizierter Datenquelle

## Evidence Requirements
Commit-SHA, Quellreferenzen und Daten-/Testzeitraum, Eingaben/Erwartungen, negative Tests, reproduzierbares Ergebnis und offene Restrisiken. Evidenz niemals behaupten, wenn nicht ausgeführt.

## Security Constraints
- Security Boundary: Kein Tracking ohne Consent, keine unlizenzierte Inhaltsübernahme, keine erfundenen Such-KPIs.
- Threat Assumptions: Duplicate Content, Noindex-Regression, Crawling-Lecks zu privaten Seiten, falsche Claims.
- Failure Behaviour: Diagnose als `BLOCKED` oder `NOT_PROVEN` ausgeben; keine stillen Defaults.
- Fail Closed Policy: Fehlende Auth-, Daten-, Lizenz- oder Sicherheitsnachweise sperren nur den betroffenen gefährdeten Wirkpfad, ohne andere Teams zu blockieren.

## Failure Conditions
Duplicate Content, Noindex-Regression, Crawling-Lecks zu privaten Seiten, falsche Claims; fehlende Datenherkunft oder fehlender Owner-/Provider-Nachweis führt zu `BLOCKED` im betroffenen Scope.

## Validation Rules
Robots/Sitemap/Canonical-Konsistenz, strukturierte Daten, SSR/JS-Sichtbarkeit und Consent-Checks. Fehlende automatisierte Ausführung nicht als PASS ausweisen.

## Acceptance Criteria
Dokumentierte In-/Outputs, mindestens ein positiver und negativer reproduzierbarer Nachweis je geändertem Wirkpfad, fachlicher Owner zugeordnet, Risiken benannt und keine regressiven Trust-Boundary-Verletzungen.

## Escalation Matrix
- Sachlicher Befund / Umsetzung: `GROWTH` (Domain Owner).
- Kritische Rechte-, Kosten-, Vertrags- oder Zugangsentscheidung: `CAPITAL-AI-GROWTH` bzw. Human Owner, nur bei tatsächlicher Notwendigkeit.
- Security-/Datenschutzgrenze: `CAPITAL-AI-TRUST` beratend; `AGENTS.md` bleibt einzige Richtlinie.
