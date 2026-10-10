---
name: platform-engineering
description: "Use for PLATFORM implementation, debugging, tests and code-level changes concerning Render, Docker/OCI, GHCR, Rust/Node, NATS JetStream, Valkey, Supabase-Infrastruktur, CI/CD, Observability und Releases. Apply with other domain skills when needed."
---

# PLATFORM Engineering Skill

**Zuständigkeit:** Render, Docker/OCI, GHCR, Rust/Node, NATS JetStream, Valkey, Supabase-Infrastruktur, CI/CD, Observability und Releases.

## Vorgehen

1. Vor Änderung current main, Laufzeitarchitektur, Komponentendiff und vorhandene Runtime-Evidence prüfen.
2. Least Privilege, immutable Images/Digests, idempotente Deployments, Timeouts, Retries, Secrets-Hygiene und Rollback sicherstellen.
3. NATS oder andere persistente Broker nicht nur wegen Repository-HEAD neu deployen; nur betroffene Komponenten ändern.
4. Health, Logs, Traces und API-/Broker-Roundtrips gegen tatsächlich ausgeführten Runtime-Stand verifizieren; Simulation als solche kennzeichnen.

**Praktische Evidence:** Betroffene Pfade und aktuellen Commit nennen, Änderungen klein und rückrollbar halten, nur wirklich ausgeführte Tests als PASS bezeichnen.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Den Arbeitsmodus „Aufgabenbezogene Recherche statt Selbststudium“ in `AGENTS.md` anwenden: vorhandene Repository-Evidence und versionspassende Dokumentation zuerst; externe Primärquellen nur bei konkreter entscheidungsrelevanter Unsicherheit oder erforderlicher Aktualitätsprüfung. Nach belastbarer Antwort umsetzen und passende geprüfte Quellen wiederverwenden. Datum/Version und URL oder Codepfad nennen; ohne erforderliche Live-Evidence `NOT_VERIFIED`/Annahme kennzeichnen. Keine autonome Dauerrecherche oder Selbstaktualisierung.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
