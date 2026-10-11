---
name: data-engineering
description: "ETL/ELT, NATS/Kafka Governance, DQ, Event-Replay und Lineage; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# data-engineering — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** ETL/ELT, NATS/Kafka Governance, DQ, Event-Replay und Lineage.
**Priorität:** Hoch; **fachliche Schwerpunkte:** MARKET, PLATFORM. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. Source, Rohdaten, Normalisierung, Feature und veröffentlichte Ausgabe mit Zeitstempeln und Datenrechten abgrenzen.
2. Vorhandene NATS JetStream-/Valkey-Grenzen prüfen; Kafka nur bei belegtem Bedarf und Kosten-/Ops-Vergleich in Betracht ziehen.
3. Schema-Version, Ordering, Idempotenz, Retry, DLQ/Poison Events, Backpressure, Replay und Tenant-Isolation nachweisen.
4. Coverage, Frische, Nullwerte, Identitätsmapping und Ausreißer mit Quelle und Transformationsversion messen.
5. Keine nicht lizenzierte Datenredistribution oder stille Ersetzung fehlender Daten durch synthetische Live-Werte.

## Repository-Anker

- `server/market-spot-ingestion.mjs`
- `server/infrastructure.mjs`
- `deploy/VALKEY-PUBSUB-NATS-HANDOFF.md`

## Erwartete Evidence und Grenzen

Dataset-/Schema-SHA, Replay-Tests, Broker-Readback und Verträge; Live-DQ ohne Messdaten NOT_PROVEN.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
