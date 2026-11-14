# Sitemap-Struktur – Optimierung
**Status:** PROPOSED  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Ausgangslage

Aktuell existiert keine `public/sitemap.xml`. Bestehende SEO-Skripte und Readbacks (z. B. `scripts/seo-production-readback.mjs`, `shared/seo-indexing-policy.mjs`) deuten auf eine kontrollierte Indexierung hin. Eine optimierte Sitemap sollte nur freigegebene, öffentliche Inhalte enthalten.

## Optimierte Sitemap-Struktur (Vorschlag)

### 1. Haupt-Sitemap (sitemap.xml)
Nur freigegebene, indexierbare Seiten. Keine Drafts, keine Research-Entwürfe, keine LICENSE_REVIEW_REQUIRED-Inhalte.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://capital-ai.online/</loc>
    <lastmod>2026-11-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://capital-ai.online/learning</loc>
    <lastmod>2026-11-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Weitere freigegebene Seiten nach Freigabe -->
</urlset>
```

### 2. Sitemap-Index (bei wachsender Anzahl)
Bei mehr als 50.000 URLs oder thematischer Trennung:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://capital-ai.online/sitemap-main.xml</loc>
    <lastmod>2026-11-14</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://capital-ai.online/sitemap-learning.xml</loc>
    <lastmod>2026-11-14</lastmod>
  </sitemap>
</sitemapindex>
```

### 3. Thematische Aufteilung (empfohlen)

| Sitemap | Inhalt | Priorität | Änderungsfrequenz |
|---------|--------|-----------|---------------------|
| sitemap-main.xml | Startseite, Kernseiten, Branding | 1.0 – 0.9 | weekly |
| sitemap-learning.xml | Freigegebene Learning-Module und Chart-Lernatlas | 0.8 | weekly |
| sitemap-docs.xml | Öffentliche Dokumentation (nur freigegeben) | 0.6 | monthly |

## Sicherheits- und Governance-Regeln

1. **Allowlist-Prinzip**  
   Nur Seiten, die den Branding-Check und die Lizenzprüfung bestanden haben, werden aufgenommen.

2. **Ausschlüsse**  
   - `/docs/growth/research/`  
   - `/generated/`  
   - `/evidence/`  
   - Alle Seiten mit Status `PROPOSED`, `LICENSE_REVIEW_REQUIRED` oder `BRANDING_CHECK_PENDING`

3. **lastmod**  
   Nur bei tatsächlichen inhaltlichen Änderungen aktualisieren. Keine künstliche Aktualisierung.

4. **priority und changefreq**  
   Realistisch halten. Keine übertriebenen Werte für Drafts oder sekundäre Seiten.

5. **robots.txt-Verknüpfung**  
   Sitemap nur in robots.txt eintragen, wenn die enthaltenen URLs freigegeben sind.

6. **Human-Gate**  
   Jede Änderung an der Sitemap unterliegt dem Branding-Check und dem SOLO_MAINTAINER_FLOW@2.

## Integration in bestehende Policies

- Ergänzt ROBOTS_TXT_SECURITY_CONFIG.md  
- Wird im Branding-Check-Prozess geprüft  
- Unterliegt der Content-Engine-Image-License-Policy (keine nicht freigegebenen Medien referenzieren)

## Nächste Schritte

1. Vorschlag reviewen.  
2. Nach Freigabe `public/sitemap.xml` (oder Index) anlegen.  
3. Generierung mit Allowlist verknüpfen (bestehende SEO-Skripte prüfen).  
4. Ersten Readback gegen Google Search Console durchführen.

**Status bleibt PROPOSED.** Keine automatische Aktivierung.
