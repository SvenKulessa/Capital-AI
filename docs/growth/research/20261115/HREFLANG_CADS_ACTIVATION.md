# Hreflang für die Sprachseiten

Der Server liefert für `/de/`, `/en/`, `/it/`, `/fr/`, `/pt/` und `/es/` einen lokalisierten Einstieg mit Finanzwissen, Screener-Demo und Sprachwechsel. Der Inhalt stammt aus den bestehenden Übersetzungen der Anwendung. Die Sprachseiten funktionieren auch ohne JavaScript.

Jede Sprachseite verweist kanonisch auf ihre eigene URL mit abschließendem Schrägstrich. Alle sechs Varianten und die Startseite als `x-default` referenzieren dieselbe Gruppe. `/sitemap.xml` und `/sitemap-main.xml` bilden diese Gruppe mit `xhtml:link` ab. Die HTTP-Regression prüft auch Alias-Weiterleitungen und Pfade wie `/en/profile`, die von der Gruppe ausgeschlossen bleiben.

## Abnahme

- HTTP: `node --test scripts/locale-policy.test.mjs server/locale-html.test.mjs`
- SEO-Verträge und Quellfingerabdrücke: `npm run test:seo`
- Nach Bereitstellung: `CAPITAL_I18N_REQUIRE_INDEXABLE=1 node scripts/growth-i18n-production-readback.mjs --http`
