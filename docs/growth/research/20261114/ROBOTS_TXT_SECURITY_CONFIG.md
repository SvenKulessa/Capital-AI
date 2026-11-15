# robots.txt – Sicherheitskonfiguration
**Status:** PROPOSED  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Ausgangslage

Aktuell existiert keine `public/robots.txt` im Repository. Eine explizite Konfiguration ist empfohlen, um die Indexierung öffentlicher Inhalte kontrolliert zu steuern und die Offenlegung nicht freigegebener Inhalte zu vermeiden.

## Empfohlene robots.txt (Vorschlag)

```txt
# CAPITAL-AI – robots.txt
# Status: PROPOSED
# Zweck: Kontrollierte Indexierung öffentlicher Inhalte. Drafts und nicht freigegebene Materialien bleiben ausgeschlossen.

User-agent: *
Allow: /

# Nicht indexieren: Drafts, interne Research-Entwürfe, nicht freigegebene Inhalte
Disallow: /docs/growth/research/
Disallow: /generated/
Disallow: /evidence/

# Explizit erlauben: öffentliche Branding- und Lerninhalte (nach Freigabe)
Allow: /public/branding/
Allow: /learning/

# Sitemap (nach Freigabe aktivieren)
# Sitemap: https://capital-ai.online/sitemap.xml
```

## Erklärung der Regeln

| Regel | Zweck | Risiko ohne Regel |
|-------|-------|-------------------|
| `Allow: /` | Standardmäßig öffentliche Inhalte zulassen | Zu restriktiv würde Sichtbarkeit einschränken |
| `Disallow: /docs/growth/research/` | Research-Drafts und LICENSE_REVIEW_REQUIRED-Inhalte ausschließen | Ungewollte Indexierung von Entwürfen |
| `Disallow: /generated/` | Generierte oder temporäre Dateien ausschließen | Leak von Zwischenständen |
| `Disallow: /evidence/` | Evidence-Dokumente nicht öffentlich indexieren | Sensible Nachweise könnten sichtbar werden |
| Sitemap-Kommentar | Aktivierung erst nach Freigabe | Vorzeitige Indexierung |

## Zusätzliche Empfehlungen

1. **noindex-Meta-Tags** für einzelne Draft-Seiten, auch wenn robots.txt greift (zusätzliche Absicherung).
2. **Canonical-Tags** nur auf freigegebene, öffentliche URLs setzen.
3. **Structured Data** darf keine internen oder nicht freigegebenen Ressourcen referenzieren.
4. **Periodische Prüfung:** robots.txt und Sitemap gegen tatsächlich indexierte Inhalte abgleichen (Google Search Console).
5. **Human-Gate:** Änderungen an robots.txt unterliegen dem Branding- und Content-Review.

## Integration in den Branding-Check

Der Branding-Check-Prozess (BRANDING_CHECK_PROCESS.md) wird um den Punkt erweitert:
- [ ] robots.txt enthält keine ungewollten Allows für Drafts oder LICENSE_REVIEW_REQUIRED-Inhalte
- [ ] Sitemap referenziert nur freigegebene Seiten

## Nächste Schritte

1. Vorschlag im Branch reviewen.
2. Nach Freigabe `public/robots.txt` anlegen.
3. Sitemap-Generierung mit Allowlist verknüpfen.
4. Ersten SEO-Security-Audit durchführen.

**Status bleibt PROPOSED.** Keine automatische Aktivierung. Keine Änderung an bestehenden Governance-Dateien.
