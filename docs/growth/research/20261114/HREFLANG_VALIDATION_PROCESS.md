# Hreflang-Validierungsprozess
**Status:** FREIGEGEBEN (Prozess)  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Freigegebener Prozess

Nach Aktivierung von hreflang (erst nach vollständigen Übersetzungen und TRUST-Abnahme) gilt folgender Validierungsablauf:

1. **Interner Crawl**  
   Screaming Frog oder bestehender SEO-Readback (`seo-production-readback.mjs` und verwandte Skripte).  
   Prüfung auf Reciprocal-Tags, Selbstreferenz, absolute URLs und Konsistenz mit Canonical.

2. **Externer Validator**  
   Merkle hreflang Tags Testing Tool oder TechnicalSEO.com hreflang Validator.  
   Unabhängige Bestätigung der Syntax und Reciprocal-Logik.

3. **Abgleich in Google Search Console**  
   Internationale Targeting-Berichte und Indexierungsstatus der Sprachversionen prüfen.

4. **Dokumentation**  
   Ergebnisse und Evidence im Arbeitspaket CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY festhalten.

## Voraussetzungen für die Aktivierung

- Vollständige, qualitativ geprüfte Übersetzungen.  
- TRUST- und Content-Abnahme.  
- Sprachversionen auf `INDEX` gesetzt.  
- Canonical und Sitemap konsistent.  
- Branding- und Lizenz-Check bestanden.

## Aktueller Stand

Hreflang wird derzeit **nicht** ausgegeben (Sprachversionen sind `NOINDEX`).  
Der Validierungsprozess ist freigegeben und wird angewendet, sobald die Aktivierung erfolgt.

**Status der hreflang-Implementierung:** NOT_PROVEN / PROPOSED  
**Status des Validierungsprozesses:** FREIGEGEBEN
