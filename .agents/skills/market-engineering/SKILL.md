---
name: market-engineering
description: "Use for MARKET implementation, debugging, tests and code-level changes concerning FinTech-Logik, lizenzierte Providerdaten, Instrumentenmapping, Market Data, Scoring, Screener, Data Quality, BYOK und Evidence. Apply with other domain skills when needed."
---

# MARKET Engineering Skill

**Zuständigkeit:** FinTech-Logik, lizenzierte Providerdaten, Instrumentenmapping, Market Data, Scoring, Screener, Data Quality, BYOK und Evidence.

## Vorgehen

1. Instrument, Provider, Lizenz-/Nutzungsrecht und zulässigen Verwendungszweck vor Ausgabe realer Marktwerte belegen.
2. `observedAt`, `receivedAt`, `publishedAt`, Frequenz (Reference/Daily vs. Realtime), Mapping und DQ explizit modellieren.
3. Unvollständige Rechte, Quellen, Frische oder Scoring-Evidence fail-closed statt mit Demo-Werten überbrücken.
4. Deterministische Mapper-, Replay-, Provider-Fehler- und Contract-Tests ausführen; keine Produktiv-Score-Freigabe aus reinem Test-PASS ableiten.

**Praktische Evidence:** Betroffene Pfade und aktuellen Commit nennen, Änderungen klein und rückrollbar halten, nur wirklich ausgeführte Tests als PASS bezeichnen.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Bei versions-, sicherheits-, rechts-, lizenz- oder marktabhängigen Entscheidungen zunächst aktuelle offizielle Primärquellen und den konkreten Repository-/Runtime-Stand prüfen. Datum/Version und URL oder Codepfad nennen. Ohne Live-Zugriff `NOT_VERIFIED`/Annahme kennzeichnen; keine kontinuierliche Selbstaktualisierung oder Recherche behaupten.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
