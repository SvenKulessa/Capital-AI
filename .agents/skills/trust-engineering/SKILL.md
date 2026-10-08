---
name: trust-engineering
description: "Use for TRUST implementation, debugging, tests and code-level changes concerning AppSec, Threat Modeling, Auth-Grenzen, Datenschutz, Compliance, Supply Chain, SBOM, QA, Risiko- und Evidence-Bewertung. Apply with other domain skills when needed."
---

# TRUST Engineering Skill

**Zuständigkeit:** AppSec, Threat Modeling, Auth-Grenzen, Datenschutz, Compliance, Supply Chain, SBOM, QA, Risiko- und Evidence-Bewertung.

## Vorgehen

1. Bedrohungsmodell und reale Trust Boundary für die konkrete Änderung aufschreiben; Risk/Impact priorisieren.
2. AuthN/AuthZ, Session, Vault, Encryption, Input-/Output-Validierung, Tenant-Isolation und Secrets systematisch testen.
3. Abhängigkeiten, Provenance, CVE-Reachability, SBOM und Provider-/OSS-Lizenzbedingungen anhand tatsächlich eingesetzter Artefakte bewerten.
4. Test-, Security-, Lizenz-, Rechte- und Production-Status getrennt als VERIFIED, BLOCKED oder NOT_PROVEN berichten; keinen Blanket-PASS aus grünen Checks ableiten.

**Praktische Evidence:** Betroffene Pfade und aktuellen Commit nennen, Änderungen klein und rückrollbar halten, nur wirklich ausgeführte Tests als PASS bezeichnen.

## Gemeinsamer Arbeitsmodus

- **Autorität:** `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige repositoryweite Engineering-/Governance-Richtlinie. Dieser Skill ist eine Arbeitsanleitung und erzeugt keine neue Approval-, Admission-, Review- oder Deployment-Pflicht.
- **Routing:** Ein Chat darf alle Domains ohne organisatorische Übergabe bearbeiten. Die Primary Domain gibt nur Branch-/PR-Schwerpunkt vor; weitere betroffene Domain-Skills situativ laden.
- **Quellen / Stand der Technik:** Bei versions-, sicherheits-, rechts-, lizenz- oder marktabhängigen Entscheidungen zunächst aktuelle offizielle Primärquellen und den konkreten Repository-/Runtime-Stand prüfen. Datum/Version und URL oder Codepfad nennen. Ohne Live-Zugriff `NOT_VERIFIED`/Annahme kennzeichnen; keine kontinuierliche Selbstaktualisierung oder Recherche behaupten.
- **Berechtigungen:** Skill-Text gibt keine zusätzlichen Tools, Credentials oder Write-Berechtigungen frei; vorhandene Tool-Scopes, Human-Owner-Merge und Production-Regeln bleiben gültig.
- **Antwort:** Entscheidung, Empfehlung, Alternativen, Trade-offs, Risiken, Evidenz und offen gebliebene Punkte prägnant darstellen; bei kritischen Mutationen vorab Owner-Optionen erfragen. In Status-/Abschlussantworten die zwei vorgeschriebenen Code-Snippets aus `AGENTS.md` verwenden.
