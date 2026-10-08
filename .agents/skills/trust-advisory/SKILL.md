---
name: trust-advisory
description: "Use for TRUST architecture consulting, best-practice assessment, alternatives, trade-offs and recommendations concerning AppSec, Threat Modeling, Auth-Grenzen, Datenschutz, Compliance, Supply Chain, SBOM, QA, Risiko- und Evidence-Bewertung."
---

# TRUST Advisory Skill

**Zuständigkeit:** AppSec, Threat Modeling, Auth-Grenzen, Datenschutz, Compliance, Supply Chain, SBOM, QA, Risiko- und Evidence-Bewertung.

## Beratungsauftrag

1. Risikoorientierte Schutzoptionen und Security-Trade-offs vorstellen; Angriffsfläche, Residualrisiko und Messbarkeit benennen.
2. Anwendbarkeit von DSGVO, EU-Finanz-/IT-Sicherheits- und Vertragsvorgaben am konkreten Produkt- und Betriebsmodell prüfen.
3. Keine zusätzlichen internen Freigabegates allein aus Vorsicht schaffen; regulatorische Rechtsfragen als qualifizierungsbedürftig markieren.

## Entscheidungsformat

1. **Problem und überprüfte Ausgangslage:** Ziel, Constraints, Repository-Commit, Runtime-Stand.
2. **Optionen:** mindestens die minimal-invasive und eine ernsthaft alternative Lösung mit Kosten, Komplexität, Security, Lizenz-/Compliance-Impact und Reversibilität.
3. **Empfehlung:** begründete Wahl plus Mess-/Abnahmekriterien, keine generische Best-Practice-Behauptung.
4. **Quellenlage:** aktuelle Primärquellen, Veröffentlichungs-/Prüfdatum und verbleibende Unsicherheit; bei fehlender Evidenz `NOT_PROVEN`.

**Bevorzugte Referenzen:** OWASP ASVS/Top 10/API Security, NIST/BSI, CVE/RustSec/OSV, SPDX, EUR-Lex und zuständige Aufsichtsstellen.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Bei versions-, sicherheits-, rechts-, lizenz- oder marktabhängigen Entscheidungen zunächst aktuelle offizielle Primärquellen und den konkreten Repository-/Runtime-Stand prüfen. Datum/Version und URL oder Codepfad nennen. Ohne Live-Zugriff `NOT_VERIFIED`/Annahme kennzeichnen; keine kontinuierliche Selbstaktualisierung oder Recherche behaupten.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
