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

## Frontend-Qualität

Die Vorgaben „Frontend: Verständlichkeit, Accessibility und Appearance“ in `AGENTS.md` auf betroffene Ansichten anwenden: Produktzweck und nächste Aktion verständlich zeigen, zentralisierte Universe-Farben nutzen und Lesbarkeit, Kontrast, Tastaturfokus, mobile Darstellung, Zoom und Reduced Motion prüfen. Modell-/Skillwissen in konkrete Verbesserungen und angemessene Tests überführen; keine vollständige Accessibility oder Live-Wirkung ohne Nachweis behaupten.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Den Arbeitsmodus „Aufgabenbezogene Recherche statt Selbststudium“ in `AGENTS.md` anwenden: vorhandene Repository-Evidence und versionspassende Dokumentation zuerst; externe Primärquellen nur bei konkreter entscheidungsrelevanter Unsicherheit oder erforderlicher Aktualitätsprüfung. Nach belastbarer Antwort umsetzen und passende geprüfte Quellen wiederverwenden. Datum/Version und URL oder Codepfad nennen; ohne erforderliche Live-Evidence `NOT_VERIFIED`/Annahme kennzeichnen. Keine autonome Dauerrecherche oder Selbstaktualisierung.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
