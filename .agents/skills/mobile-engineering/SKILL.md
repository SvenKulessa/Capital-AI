---
name: mobile-engineering
description: "Android App, Mobile OIDC, App Signing und sicherer Release-Prozess; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# mobile-engineering — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** Android App, Mobile OIDC, App Signing und sicherer Release-Prozess.
**Priorität:** Mittel; **fachliche Schwerpunkte:** PRODUCT, PLATFORM. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. Private Android-App, Webprodukt und mögliche öffentliche Distribution bewusst voneinander abgrenzen.
2. Lifecycle, Berechtigungen, Storage, min/target SDK, Network Security, Deep Links und Updates testen.
3. OIDC/PKCE, Redirect-URI, Token-Schutz, Tenant-Isolation, Logout und Offline-Fehlerzustände prüfen.
4. Release-Digest, Signierung, SBOM und reproduzierbaren Build sichern, ohne Signing Keys in CI-Evidence offenzulegen.
5. Getestete Geräte, API Levels, A11y, Upgrade/Recovery dokumentieren; kein Store-/Production-PASS aus lokalem Build.

## Repository-Anker

- `mobile/android-private/README.md`
- `mobile/android-private/app/build.gradle`
- `.github/workflows/android-private-bundle.yml`

## Erwartete Evidence und Grenzen

Commit, Gradle-/SDK-Stand, Artifact-Digest, getestete Android-Geräte und Sicherheits-/Upgrade-Tests; Distribution NOT_PROVEN.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
