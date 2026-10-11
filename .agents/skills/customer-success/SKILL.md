---
name: customer-success
description: "User Feedback, Aktivierung, Churn, Retention und Support-Erfolg; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# customer-success — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** User Feedback, Aktivierung, Churn, Retention und Support-Erfolg.
**Priorität:** Mittel; **fachliche Schwerpunkte:** PRODUCT, GROWTH. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. Onboarding, First Value, Upgrade, Hilfefall und Kündigung als überprüfbare Journeys erfassen.
2. Aktivierung, Time-to-Value, Retention und Churn mit Kohorten, Nenner und Zeitfenster eindeutig definieren.
3. Feedback nur zweckgebunden, datensparsam, consent- und tenantkonform auswerten.
4. Abbrüche, Fehlermeldungen, Barrierefreiheit und Self-Service-Support nach Kundenimpact priorisieren.
5. Upsell-/Conversion-Vorschläge mit messbaren Hypothesen statt unbelegten Erfolgsaussagen verbinden.

## Repository-Anker

- `docs/product/COMMERCE-AND-LOG-USAGE-20261010.md`
- `src/platform/analytics/useRouteAnalytics.ts`
- `src/utils/consentedAnalytics.ts`

## Erwartete Evidence und Grenzen

Kohorten-/Eventdefinition und Consent-Evidence; Churn-/Conversion-Werte ohne Daten NOT_PROVEN.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
