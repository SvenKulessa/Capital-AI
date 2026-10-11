---
name: ai-engineering
description: "LLM, RAG, Prompt Governance, Agent Safety und Modellrechte; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# ai-engineering — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** LLM, RAG, Prompt Governance, Agent Safety und Modellrechte.
**Priorität:** Hoch; **fachliche Schwerpunkte:** PRODUCT, TRUST, PLATFORM. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. Den Use Case, Datenklassen, Modell- und Tool-Trust-Boundaries bestimmen.
2. RAG-Quellen auf Herkunft, Tenant-Isolation, Prompt-Injection und Berechtigung prüfen; Modelltexte nie als Tool-Autorität ausführen.
3. Prompts, Tool-Schemas, Modelle, Retrieval-Indizes und Evaluationen mit versionsgebundener Evidence testen.
4. Harmloses, adversariales und negatives Evaluation-Set für Grounding, Halluzination, PII-Leaks, Tool-Missbrauch, Kosten und Latenz prüfen.
5. Provider-DPA, Modellgewicht-/Output-/Hosting-Lizenzen und Data-Retention separat von OSS-Rechten prüfen.

## Repository-Anker

- `server/prompt-injection-guard.mjs`
- `docs/security/ARCHITECTURE-A-GRAPHRAG-TOKENOMICS-TRUTH-WORK-PACKAGE-20261006.md`

## Erwartete Evidence und Grenzen

Prompt-/Modell-/Dataset-Version, adversariale Testergebnisse und Providerrecht; Inferenz-/Produktivnutzung ohne Runtime-Readback NOT_PROVEN.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
