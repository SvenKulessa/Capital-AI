# Hreflang – Detaillierte Spezifikation
**Status:** AUSGEARBEITET / AKTIVIERUNG GEPRÜFT  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## 1. Ziel

Hreflang soll Suchmaschinen die korrekten Sprach- und Regionsversionen signalisieren, sobald vollständige, freigegebene Übersetzungen vorliegen. Bis dahin bleibt die Ausgabe unterdrückt.

## 2. Technische Spezifikation

### Ausgabeformat
```html
<link rel="alternate" hreflang="de" href="https://capital-ai.online/de" />
<link rel="alternate" hreflang="en" href="https://capital-ai.online/en" />
<link rel="alternate" hreflang="x-default" href="https://capital-ai.online/" />
```

### Regeln
- Absolute HTTPS-URLs
- Reciprocal (jede Version verweist auf alle anderen inkl. sich selbst)
- `x-default` zeigt auf die Standardversion (`/`)
- Nur auf Seiten mit Klassifizierung `INDEX`
- Keine Ausgabe auf `NOINDEX`-, `PRIVATE`- oder `BLOCKED`-Routen
- Konsistenz mit Canonical und Sitemap

### Geplante Sprachcodes
| Code | Sprache | Pfad |
|------|---------|------|
| de | Deutsch | /de |
| en | Englisch | /en |
| it | Italienisch | /it |
| fr | Französisch | /fr |
| pt | Portugiesisch | /pt |
| es | Spanisch | /es |
| x-default | Fallback | / |

## 3. Aktivierungsvoraussetzungen (Prüfung)

| Voraussetzung | Aktueller Stand | Ergebnis |
|---------------|-----------------|----------|
| Vollständige Übersetzungen | Sprachversionen als Vorschau / unvollständig | NICHT ERFÜLLT |
| TRUST- und Content-Abnahme | Ausstehend | NICHT ERFÜLLT |
| Sprachversionen auf INDEX | Aktuell NOINDEX | NICHT ERFÜLLT |
| Canonical konsistent | Dynamisch vorhanden | TEILWEISE |
| Sitemap-Integration | Dynamisch, nur INDEX | BEREIT |
| Branding-/Lizenz-Check | Prozess vorhanden | BEREIT |
| Validierungsprozess | Freigegeben | BEREIT |

## 4. Aktivierungsentscheidung

**Aktivierung derzeit nicht freigegeben.**

Begründung: Die sprachlichen Inhalte sind noch nicht vollständig und nicht abgenommen. Eine vorzeitige hreflang-Ausgabe würde Suchmaschinen auf unvollständige Seiten verweisen und widerspricht dem fail-closed Prinzip.

## 5. Nächste Schritte zur Aktivierung

1. Vollständige Übersetzungen der relevanten Seiten erstellen und reviewen.
2. TRUST- und Content-Abnahme durchführen.
3. Klassifizierung der Sprachpfade von `NOINDEX` auf `INDEX` ändern.
4. Hreflang-Ausgabe in `server/index.mjs` aktivieren.
5. Validierungsprozess (interner Crawl + externer Validator + GSC) durchführen.
6. Evidence dokumentieren.

## 6. Bezug zu bestehenden Policies

- Ergänzt die SEO-Indexing-Policy
- Unterliegt dem Branding-Check und der Content-License-Policy
- Validierungsprozess ist bereits freigegeben (`HREFLANG_VALIDATION_PROCESS.md`)

**Abschluss:** Spezifikation ist ausgearbeitet. Aktivierung bleibt gesperrt, bis die inhaltlichen und TRUST-Voraussetzungen erfüllt sind.
