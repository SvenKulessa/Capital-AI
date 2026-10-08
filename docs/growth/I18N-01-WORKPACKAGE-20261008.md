# GROWTH / PRODUCT — Internationalisierung: Arbeitspaket I18N-01

Stand: 2026-10-08  
Baseline: `main@223b7e190de97f0402d16e10b3cf97b61664c938`  
Branch: `capital-ai-growth/landing-i18n-six-languages-20261008`  
Status: `PARTIAL_IMPL / VALIDATION_PENDING / NOT_DEPLOYED`

## Zielbild

Deutsch bleibt die Originalfassung. Englisch, Italienisch, Französisch, Portugiesisch und Spanisch werden angeboten. Die Sprachauswahl steht im Header links neben Login/Profile (mobil und Desktop). Manuelle Wahl überschreibt Geo- und Browser-Vorgaben.

## Modulares technisches Design

```text
[Hosting/CDN CF-IPCountry (optional)]
  -> shared/locale-policy.mjs
       manual language cookie > country locale > Accept-Language > en
       unknown/unmapped countries -> en (even if browser says de)
  -> server HTML lang + Content-Language, no-store
  -> LocaleProvider (React, persistent localStorage + SameSite=Lax cookie)
  -> LanguageSwitcher (Header directly before Login / Profile)
  -> localized Hero, Pillars, Footer and introductory Content Engine copy
```

**Keine externe GeoIP-Anfrage.** Headerwerte werden nur für Darstellungsentscheidungen eingesetzt; weder Zugriffssteuerung noch Lizenz-, Zahlungs- oder Rechtsentscheidungen dürfen darauf basieren. `CF-IPCountry` muss am realen Domain-/CDN-Pfad verfügbar sein. Reiner Render-Traffic muss keinen solchen Header enthalten. Der Browser-Fallback ist explizit eine Annäherung, keine Landesdetektion. Bei mehrsprachigen Ländern (z. B. CH, BE) ist Englisch zunächst der neutrale Fallback; eine feinere Regel bedarf einer Produktentscheidung.

Die **deutsche SEO-Authority bleibt erhalten**: `shared/seo-content-manifest.mjs`, Canonicals, OG und JSON-LD werden nicht pauschal übersetzt. `hreflang` wird erst mit echten, crawlerfähig übersetzten URL-Versionen veröffentlicht. Keine erfundenen Claim-/Lizenzzustände.

## Aktueller Übersetzungsumfang

Umgesetzt: Hero, vier Pillars, Footer-Labels, Content-Engine-Headline/Intro, Login-Label, einige Accessibility-Texte sowie Sprachumschalter.

Noch **nicht** vollständig lokalisiert: Main Navigation, tiefere Landing-Sektionen (Markets/Screener/Module/Content Engine), Login/Account, FAQ, Learning, Legal, Produkt-/Preis-/Dokumentationsrouten und dynamische Formfehler. Eine teilweise übersetzte UI darf nicht als vollständige lokalisierte Website kommuniziert werden.

## Nächste Slices

1. **PRODUCT:** vollständiger textlicher i18n-Inventur-Crawl aller öffentlich sichtbaren React-Routen; starke Typisierung und fehlende-Key-Tests.
2. **GROWTH:** Übersetzungen aller öffentlichen Content-Engine-, Marketing- und SEO-Landing-Sektionen mit überprüften Claims/Terminologien.
3. **TRUST:** Fachprüfung von Impressum, Datenschutz, AGB, Risiko-/Datenprovider-Hinweisen; deutsche rechtsverbindliche Quelle bleibt maßgeblich, bis eine Freigabe vorliegt.
4. **PRODUCT:** Checkout/Login, Validierungsfehler, E-Mails, Dialoge, A11y-Navigation und responsive Browser-QA (320px, 768px, Desktop).
5. **GROWTH / SEO:** lokalisierte URL-Struktur, kanonische Routen, `hreflang`/`x-default`, Sprach-Sitemaps, `og:locale`, JSON-LD `inLanguage`, Landing-SEO QA; ohne falsche 200-/301-/404-Ketten.
6. **PLATFORM:** Geo-Header am tatsächlichen Cloudflare-/Render-Pfad verifizieren und Country-Fallback testen (ohne IP-Speicherung).
7. `npm run test:i18n`, `npm run lint`, `npm run build` und kostenlose Required Checks auf PR grün; danach Owner-Merge und Live-Verifikation.

Kein Merge ohne human owner; keine automatische Produktion vor `main`. 
