---
name: analytics-intelligence
description: "Produkt- und Business-KPIs, Analytics, Experimentierung und Attribution; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# analytics-intelligence — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** Produkt- und Business-KPIs, Analytics, Experimentierung und Attribution.
**Priorität:** Mittel; **fachliche Schwerpunkte:** GROWTH, PRODUCT, PLATFORM. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. North-Star, Event, Metrikformel, Nenner, Zeitraum und Datenquelle vor jeder Auswertung definieren.
2. GSC-Klicks, GA4-Sitzungen, Leads, Checkout-Starts, Käufe und Zahlung nicht ohne Identitäts-/Join-Belege vermischen.
3. Consent, Tenant-Scope, Sampling, Report-Delay, Pseudonymisierung und Provider-Quotas beachten.
4. Experiment/Kontrolle, Kohorten, Signifikanzgrenzen, Datenqualität und Interpretationsunsicherheit festhalten.
5. Fehlende Daten strikt als NOT_PROVEN oder unbekannt kennzeichnen, nicht als gemessene Null.

## Repository-Anker

- `server/google-analytics-readback.mjs`
- `src/utils/consentedAnalytics.ts`
- `docs/growth/LEARNING-FIRST-SEO-20261011.md`

## Erwartete Evidence und Grenzen

Query-/API-Provenance, Zeitfenster, Consent, Eventdefinition, Vergleichsgruppe und Readback; keine erfundenen KPI-Werte.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
