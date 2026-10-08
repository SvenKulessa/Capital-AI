---
name: product-engineering
description: "Use for PRODUCT implementation, debugging, tests and code-level changes concerning Frontend, React/TypeScript, UX, Accessibility, Navigation, Nutzerkonten, Client-Auth und sichere Produktflows. Apply with other domain skills when needed."
---

# PRODUCT Engineering Skill

**Zuständigkeit:** Frontend, React/TypeScript, UX, Accessibility, Navigation, Nutzerkonten, Client-Auth und sichere Produktflows.

## Vorgehen

1. Vom realen UI-/API-Contract und betroffenen Komponenten ausgehen; bestehende Patterns in `src/` und `server/` wiederverwenden.
2. React/TypeScript barrierearm, responsive und testbar implementieren; Lade-, Fehler-, Auth- und Empty-States ausdrücklich behandeln.
3. Client- und Server-Auth trennen; keine Secrets, Token oder Vault-Inhalte im Browser exponieren.
4. Passende Unit-, Contract-, Navigation-, Auth- und Browser-Smoke-Tests ausführen und Resultate am exakten Commit binden.

**Praktische Evidence:** Betroffene Pfade und aktuellen Commit nennen, Änderungen klein und rückrollbar halten, nur wirklich ausgeführte Tests als PASS bezeichnen.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Bei versions-, sicherheits-, rechts-, lizenz- oder marktabhängigen Entscheidungen zunächst aktuelle offizielle Primärquellen und den konkreten Repository-/Runtime-Stand prüfen. Datum/Version und URL oder Codepfad nennen. Ohne Live-Zugriff `NOT_VERIFIED`/Annahme kennzeichnen; keine kontinuierliche Selbstaktualisierung oder Recherche behaupten.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
