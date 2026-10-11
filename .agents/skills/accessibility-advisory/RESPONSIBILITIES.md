# accessibility-advisory — Responsibilities

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
WCAG 2.2 AA, inklusive Customer Journeys, Assistive Technology und Priorisierung von Accessibility-Schulden; nur innerhalb vorhandener CAPITAL-AI-Domains.

## Scope
WCAG 2.2 AA, inklusive Customer Journeys, Assistive Technology und Priorisierung von Accessibility-Schulden.

## Inputs
Nutzerreise, Designs, Viewports, Zielgruppen, WCAG-2.2-Kriterien und bekannte Findings.

## Outputs
Priorisierte barrierefreie UX-Alternativen mit Kriterien, Restrisiken und Entscheidungsevidence.

## Dependencies
- Source of Truth: `.agents/skills/registry.json#skillGovernance.accessibility-advisory`
- Autorität: `AGENTS.md`
- Zuständige Domain: `PRODUCT`; geteilte Nutzung ist keine zusätzliche Ownership

## Domain Ownership
- Domain Owner: PRODUCT
- Escalation Owner: CAPITAL-AI-PRODUCT
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- kritische WCAG-Findings pro Journey
- Anteil nachvollziehbar priorisierter A11y-Befunde

## Evidence Requirements
Quellen- und Versionstand, Testkommando mit Ergebnis/Commit-SHA, Gegenprobe, beobachtete Grenzfälle und mögliche Rücknahme. KPI-Werte ohne Messung sind `NOT_PROVEN`.

## Security Constraints
- Security Boundary: Keine Personendaten aus Accessibility-Tests ohne Einwilligung; kein WCAG-Zertifikat aus automatischen Scans.
- Threat Assumptions: Screenreader- oder Keyboard-Blocker, unzureichender Kontrast, erfundene Konformität.
- Failure Behaviour: `BLOCKED` bei unbewiesener sicherheitskritischer Voraussetzung; keine stillen Fallback-Rechte.
- Fail Closed Policy: Nur den nachweislich betroffenen Wirkpfad sperren; kein Credential/PII-Leak, keine implizite Lizenzfreigabe.

## Failure Conditions
Screenreader- oder Keyboard-Blocker, unzureichender Kontrast, erfundene Konformität; keine ungeprüften Live-Daten, Auth- oder Tarif-Attests.

## Validation Rules
Keyboard, Focus-Not-Obscured, Reflow, 200%-Zoom, Farbunabhängigkeit; manuelle Review-Evidence. Dokumentations-/CI-Strukturprüfungen prüfen nur Struktur, nicht die externe Anwendung.

## Acceptance Criteria
Ownership mit Registry identisch; drei Skill-Dateien vorhanden; Test- und Quellenbelege unterscheidbar; Security-Grenzen und Exit-Criteria nachvollziehbar.

## Escalation Matrix
- Umsetzung: PRODUCT.
- Zugänge / Vertrag / Zahlung: CAPITAL-AI-PRODUCT, nur wenn persönlich erforderlich.
- Sicherheitsbezug: CAPITAL-AI-TRUST im selben Workflow, keine neue Freigabestufe.
