# accessibility-engineering — Responsibilities

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
Semantisches React, WCAG 2.2 AA, Fokusmanagement, Screenreader, Reduced Motion und zugängliche Charts; nur innerhalb vorhandener CAPITAL-AI-Domains.

## Scope
Semantisches React, WCAG 2.2 AA, Fokusmanagement, Screenreader, Reduced Motion und zugängliche Charts.

## Inputs
Betroffene React-Komponenten, Accessibility-Befunde, Browser- und AT-Matrix.

## Outputs
Getestete Komponenten und dokumentierte Keyboard-/Screenreader-Reproduktionen.

## Dependencies
- Source of Truth: `.agents/skills/registry.json#skillGovernance.accessibility-engineering`
- Autorität: `AGENTS.md`
- Zuständige Domain: `PRODUCT`; geteilte Nutzung ist keine zusätzliche Ownership

## Domain Ownership
- Domain Owner: PRODUCT
- Escalation Owner: CAPITAL-AI-PRODUCT
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- nachgewiesene A11y-Regressionen
- Anteil geprüfter kritischer UI-Flows

## Evidence Requirements
Quellen- und Versionstand, Testkommando mit Ergebnis/Commit-SHA, Gegenprobe, beobachtete Grenzfälle und mögliche Rücknahme. KPI-Werte ohne Messung sind `NOT_PROVEN`.

## Security Constraints
- Security Boundary: Kein PII in Testfixtures; zugängliche Formulare dürfen Auth-Sicherheit nicht aushebeln.
- Threat Assumptions: Unbedienbare Dialoge, Fokusverlust, kontrastarme Zustände, rein farbcodierte Finanzdaten.
- Failure Behaviour: `BLOCKED` bei unbewiesener sicherheitskritischer Voraussetzung; keine stillen Fallback-Rechte.
- Fail Closed Policy: Nur den nachweislich betroffenen Wirkpfad sperren; kein Credential/PII-Leak, keine implizite Lizenzfreigabe.

## Failure Conditions
Unbedienbare Dialoge, Fokusverlust, kontrastarme Zustände, rein farbcodierte Finanzdaten; keine ungeprüften Live-Daten, Auth- oder Tarif-Attests.

## Validation Rules
Axe/Lint als Ergänzung; manuelle Tab-Reihenfolge, Tastatur, Screenreader, Touch und Zoom. Dokumentations-/CI-Strukturprüfungen prüfen nur Struktur, nicht die externe Anwendung.

## Acceptance Criteria
Ownership mit Registry identisch; drei Skill-Dateien vorhanden; Test- und Quellenbelege unterscheidbar; Security-Grenzen und Exit-Criteria nachvollziehbar.

## Escalation Matrix
- Umsetzung: PRODUCT.
- Zugänge / Vertrag / Zahlung: CAPITAL-AI-PRODUCT, nur wenn persönlich erforderlich.
- Sicherheitsbezug: CAPITAL-AI-TRUST im selben Workflow, keine neue Freigabestufe.
