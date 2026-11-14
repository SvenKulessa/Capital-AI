# robots.txt – Integrationsplan
**Status:** PROPOSED  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Entscheidung:** Dynamische Auslieferung beibehalten  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Entscheidung

Die bestehende dynamische Auslieferung von `/robots.txt` über `server/index.mjs` wird beibehalten. Eine statische `public/robots.txt` wird nicht eingeführt.

Die vorgeschlagenen Disallow-Regeln werden **nach expliziter Freigabe** in die Server-Logik oder in eine generierte robots.txt integriert.

## Aktueller Stand (VERIFIED)

- Dynamische Auslieferung in `server/index.mjs` vorhanden.
- Detaillierte Route-Policy in `shared/seo-indexing-policy.mjs` (INDEX / NOINDEX / PRIVATE / BLOCKED).
- Tests und Readbacks prüfen `/robots.txt`.
- Fail-closed Verhalten für unbekannte Routen.

## Vorgeschlagene Disallow-Regeln (nach Freigabe)

```txt
Disallow: /docs/growth/research/
Disallow: /generated/
Disallow: /evidence/
```

Diese Regeln ergänzen die bestehende Policy und schützen Research-Drafts sowie Evidence-Pfade vor ungewollter Indexierung.

## Integrationsoptionen

### Option A: Server-Logik erweitern (empfohlen)
In der robots.txt-Generierung in `server/index.mjs` die Disallow-Regeln hinzufügen, sobald die Freigabe vorliegt. Vorteile:
- Bleibt dynamisch und konsistent mit der Route-Policy.
- Keine zusätzliche statische Datei.
- Einfach testbar.

### Option B: Generierte robots.txt
Ein Build- oder Runtime-Schritt generiert die Datei auf Basis der Policy + expliziter Disallow-Liste. Vorteile bei komplexeren Regeln, erfordert jedoch zusätzliche Evidence.

## Voraussetzungen für die Umsetzung

1. Explizite Maintainer-Freigabe (Human-Gate).
2. Abgleich mit bestehender `seo-indexing-policy.mjs`.
3. Aktualisierung der zugehörigen Tests (`seo-production-readback.mjs`, `seo-indexing-policy.test.mjs` etc.).
4. Dokumentation im Branding-Check und in der SEO-Security-Checkliste.

## Nächste Schritte

- [ ] Freigabe der Disallow-Regeln einholen.
- [ ] Gewählte Integrationsoption umsetzen.
- [ ] Tests erweitern und Readback durchführen.
- [ ] Status von PROPOSED auf implementiert setzen (nach Evidence).

**Status bleibt PROPOSED**, bis die Freigabe vorliegt. Keine Änderung an der laufenden Server-Logik in diesem Schritt.
