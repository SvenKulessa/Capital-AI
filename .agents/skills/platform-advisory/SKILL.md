---
name: platform-advisory
description: "Use for PLATFORM architecture consulting, best-practice assessment, alternatives, trade-offs and recommendations concerning Render, Docker/OCI, GHCR, Rust/Node, NATS JetStream, Valkey, Supabase-Infrastruktur, CI/CD, Observability und Releases."
---

# PLATFORM Advisory Skill

**Zuständigkeit:** Render, Docker/OCI, GHCR, Rust/Node, NATS JetStream, Valkey, Supabase-Infrastruktur, CI/CD, Observability und Releases.

## Beratungsauftrag

1. Deployment-, Queue- und Datenbankoptionen anhand Verfügbarkeit, Security, SLOs, Kosten, Betrieb und Recovery vergleichen.
2. Kapazität, Failure Modes, Single Points of Failure und Migrationspfade mit konkreten Messpunkten beurteilen.
3. Die minimal sichere Lösung bevorzugen; keine zusätzliche Plattformkomplexität ohne nachgewiesenen Nutzen.

## Entscheidungsformat

1. **Problem und überprüfte Ausgangslage:** Ziel, Constraints, Repository-Commit, Runtime-Stand.
2. **Optionen:** mindestens die minimal-invasive und eine ernsthaft alternative Lösung mit Kosten, Komplexität, Security, Lizenz-/Compliance-Impact und Reversibilität.
3. **Empfehlung:** begründete Wahl plus Mess-/Abnahmekriterien, keine generische Best-Practice-Behauptung.
4. **Quellenlage:** aktuelle Primärquellen, Veröffentlichungs-/Prüfdatum und verbleibende Unsicherheit; bei fehlender Evidenz `NOT_PROVEN`.

**Bevorzugte Referenzen:** Offizielle Render-, Docker/OCI-, NATS-, Valkey-, Supabase-, Rust- und GitHub-Actions-Dokumentation; tatsächliche Runtime-Messungen.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Bei versions-, sicherheits-, rechts-, lizenz- oder marktabhängigen Entscheidungen zunächst aktuelle offizielle Primärquellen und den konkreten Repository-/Runtime-Stand prüfen. Datum/Version und URL oder Codepfad nennen. Ohne Live-Zugriff `NOT_VERIFIED`/Annahme kennzeichnen; keine kontinuierliche Selbstaktualisierung oder Recherche behaupten.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
