---
name: incident-response
description: "Security Incidents, Triage, Forensik, Containment und Disaster Recovery; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# incident-response — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** Security Incidents, Triage, Forensik, Containment und Disaster Recovery.
**Priorität:** Hoch; **fachliche Schwerpunkte:** TRUST, PLATFORM. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. Vorfall, Zeitpunkt, Impact, Systeme, betroffene Identitäten und initiale Hypothese trennen.
2. Logs und Artefakte ohne Secrets/PII sichern; Auth, Vault, Service-Role, CI und Runtime-Trust-Boundaries untersuchen.
3. Least-privilege Containment, Rollback und Secret-Rotation mit Datenverlust-/Verfügbarkeitsrisiko abwägen.
4. Restore und Recovery an tatsächlich betroffenen Systemen reproduzieren und mit Runtime-SHA verknüpfen.
5. Meldepflichten nur bei konkretem Rechtsregime und tatsächlichen Umständen beurteilen; Postmortem ohne zusätzliche generelle Gates.

## Repository-Anker

- `docs/architecture/INFRASTRUCTURE-BACKUP-RECOVERY.md`
- `docs/security/SECRET-IP-DATA-PROTECTION-BASELINE.md`
- `docs/platform/TRUST-RUNTIME-REVIEW-20261007.md`

## Erwartete Evidence und Grenzen

Incident-ID, Zeitleiste, Logs/Hashes, wiederhergestellte Funktionen und Rotationsergebnis; ungeprüfte Recovery NOT_PROVEN.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
