# Hreflang-Aktivierung nach CADS-Prüfung
**Status:** PROPOSED  
**Arbeitspaket:** CA-GROWTH-SEO-ARCHITECTURE  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 15.11.2026

## Voraussetzung: CADS-Prüfung

Vor der Aktivierung von hreflang muss eine CADS-Qualitätsprüfung der Sprachinhalte erfolgen.

### CADS-Kriterien (Mindestanforderungen)
- Inhaltliche Vollständigkeit der Übersetzungen
- Terminologische Konsistenz
- Keine irreführenden oder unvollständigen Aussagen
- Abgleich mit den deutschen Quelltexten
- Branding- und Lizenzkonformität

## Code-basierte Vorbereitung (bereits umgesetzt)

1. `injectHreflang` in `server/index.mjs` implementiert (fail-closed)
2. Policy-Umstellung auf `INDEX` vorbereitet
3. Sitemap-`xhtml:link`-Erweiterung spezifiziert
4. Validierungsprozess freigegeben

## Aktivierungsschritte nach bestandener CADS-Prüfung

1. CADS-Evidence dokumentieren
2. Policy-Commit (`NOINDEX` → `INDEX` für Sprachpfade)
3. `injectHreflang` in die HTML-Pipeline einbinden
4. Sitemap um `xhtml:link` erweitern
5. Deployment
6. Validierung mit Merkle/TechnicalSEO + Screaming Frog + GSC
7. Evidence im Arbeitspaket hinterlegen

## Aktueller Stand
- Code vorbereitet
- CADS-Prüfung: **OFFEN**
- Aktivierung: **nicht durchgeführt**

**Empfehlung:** Aktivierung erst nach dokumentierter CADS-Freigabe der Sprachinhalte.
