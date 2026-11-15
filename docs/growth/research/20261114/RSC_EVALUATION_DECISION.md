# React Server Components – Evaluierungsentscheidung
**Status:** ENTSCHIEDEN  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Entscheidung

React Server Components (RSC) oder vergleichbare Ansätze (z. B. fortgeschrittenes SSR, Islands-Architekturen mit Framework-Wechsel) werden **nur bei nachgewiesenem Engpass** und als **eigenes Arbeitspaket** evaluiert.

## Begründung

- Der aktuelle SEO-Snapshot-Ansatz deckt die indexierbaren öffentlichen Routen ab.
- Es liegt kein nachgewiesener Performance-, SEO- oder Hydration-Engpass vor, der eine RSC-Migration rechtfertigt.
- Eine Einführung wäre ein signifikanter Architekturwechsel mit Auswirkungen auf Routing, Data-Fetching, Deployment und Governance.
- Bestehende interaktive Bereiche (Simulator, Screener, Control Center) bleiben voraussichtlich Client-seitig.

## Voraussetzungen für eine spätere Evaluierung

1. Nachweisbarer Engpass (Performance, SEO-Sichtbarkeit oder Hydration-Probleme auf öffentlichen Seiten).
2. Eigenes risikobasiertes Arbeitspaket unter SOLO_MAINTAINER_FLOW@2.
3. Klare Abgrenzung, welche Routen betroffen wären.
4. Evidence- und Rollback-Plan.

## Aktueller Fokus

- Stabilisierung des bestehenden Snapshots (`REACT_HYDRATION_SEO_SPEC.md`).
- SEO-Security-Maßnahmen (robots.txt, Sitemap, Canonical, Branding-Check).
- Keine ungeplante Migration.

**Status:** Entscheidung dokumentiert. RSC-Evaluierung bleibt **NOT_PROVEN** / zurückgestellt.
