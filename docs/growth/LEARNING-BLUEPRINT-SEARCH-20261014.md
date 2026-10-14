# Learning Hub, Blueprints und Screener-Scoring: Search-Update

Basis: `1b2da809d2c13215501cd0c9d62fba59e7884fd1`, 14.10.2026. Autorität: AGENTS.md / SOLO_MAINTAINER_FLOW@1.

## Wirkung

- Homepage-Titel: **Capital-AI | Learning Hub, Blueprints & Screener-Scoring**. Beschreibung erklärt Finanzwissen, Datenkonzepte und nachvollziehbare Demo-Methodik.
- Titel/Description/OG/Twitter aus dem SEO-Manifest; statischer Bootstrap synchronisiert. Projekt-Schema verwendet denselben Produktfokus, ohne Verkaufs-/Performance-Claims.
- Bestehendes freigegebenes Vendor-Logo im Analytics-Hub-Einstieg. Google-Favicon ausdrücklich als vorhandenes quadratisches 96px-PNG referenziert; kein neues Artwork.
- Drei öffentliche Themenabschnitte aus `shared/public-search-focus.mjs` in React, HTTP-Startseite und Markdown. Besucher und Crawler erhalten dieselben Fakten. German copy is marked lang=de in React.
- Nur bekannte indexierbare Seiten werden von Case-/Trailing-Slash-Varianten zur kanonischen URL umgeleitet; Tab-Redirects bleiben vorhanden, private/API-Pfade bleiben getrennt.
- `/index.md`, `/.md`, `Accept: text/markdown` und `/llms-full.txt` liefern öffentliche Homepage-Inhalte, Link-Canonical und Sitemap. Öffentlicher `/AGENTS.md`-Guide enthält keine interne Engineering-Policy/Secrets. `Vary: Accept` verhindert Verwechslung durch Caches.
- Sitemap-lastmod nur für die tatsächlich geänderte Homepage (2026-10-14); keine erfundenen frischen Daten für 316 unveränderte Einträge.

## Agent Ready: tatsächlicher Live-Baseline-Scan

https://agent-ready.dev/scan/8VDpiJDydr — **71/100** Agent-Lesbarkeit, **97/100** llms.txt, fünf gescannte Seiten. Der Scanner meldet 100/100 in seinem begrenzten statischen Accessibility-Scope; dies ist kein Browser-/WCAG-/Screenreader-Attest.

Befunde: lastmod fehlt; öffentlicher Agent-Guide fehlt; wenige Überschriften und wenig Text; Markdown-Mirror/Negotiation fehlen; llms-full fehlt. Dieser Patch adressiert diese konkreten Pfade. BreadcrumbList und umfassende seitenspezifische Markdown-Parität bleiben eigenständige Folgearbeiten. Kein neuer Live-Score wird aus dem Diff abgeleitet.

## Gefundene Growth-Aufgaben in der Roadmap

Quelle: `src/data/roadmapData.ts`, Arbeitspaket `CA-GROWTH-SEO-ARCHITECTURE`, `docs/growth/SEO-LEADGEN-FOLLOWUP-20261014.md`, Issue #388 WP-07.

| Priorität | Roadmap | Konkrete nächste Wirkung / Monetarisierung |
|---|---|---|
| 1 | SEO-03, SEO-08 | Nach Deployment Canonicals, Redirects, Favicon, Markdown, Sitemap und Agent-Scan live nachweisen. |
| 2 | SEO-04, SEO-05 | Separate Learning-/Datenkonzept-/Scoring-Intent-Seiten mit existierenden Beispielen und klaren Learning-/Blueprint-Anfragepfaden, ohne unbewiesene Blueprint-Lieferrechte. |
| 3 | SEO-07, #388 WP-07 | GSC read-only und consent-basierte Messung Learning-Einstieg → Angebot → Kauf prüfen; keine erfundenen Klick-/Umsatzwerte. |

Roadmap-Status bleibt OFFEN; dieser Patch ist keine Gesamt-Abnahme SEO-00–11. Technische SEO-Korrekturen benötigen keinen veröffentlichten X-Artikel; der bestehende Social-Pilot bleibt separat.

## Verifikation und Grenzen

- `npm run test:seo`: 33 Tests bestanden, einschließlich echter HTTP-Requests für Mirrors, Negotiation, Canonical-Redirects und private Inhalte. Negative bestehende Auth-/Noindex-Pfade bleiben abgedeckt.
- `node --import tsx --test scripts/navigation.test.mjs scripts/market-blueprint-demo.test.mjs`: 42 Tests bestanden.
- `npm run build`: bestanden. `git diff --check`: bestanden.
- Browser: kein installiertes Chromium; Playwright-Download liefert ungültiges/leeres ZIP. Mobile-/Desktop-/Zoom-/Keyboard-Darstellung am neuen Build bleibt NOT_PROVEN. Build/HTTP-Tests ersetzen sie nicht.
- CI, Merge, Production und Googles tatsächliche Darstellung separat prüfen. Google kann Titel und Snippet selbst wählen; Favicon erscheint erst nach erneuter Verarbeitung und ist nicht garantiert.
- Rücknahme: normalen Revert des Scope-Commits verwenden; keine Datenmigration, keine neue kostenpflichtige Ressource, kein Provider-Enablement.

## PR-Reihenfolge

Offene Baseline: #486 (X/Founder), #484/#483 (Dependencies), #471/#460 (Roadmap-Evidence). #486 überschneidet `shared/seo-source-provenance.mjs`; dieser Search-Patch ändert Homepage-Fingerprints, #486 Learning-/Legal-Fingerprints. Bei späterem Sync Generator erneut ausführen statt Fingerprints blind übernehmen. Dieser kleine unabhängig wirksame Search-Patch kann zuerst geprüft werden; abhängig von tatsächlicher CI/Head-Änderung Reihenfolge vor Merge erneut bestimmen. Keine fremden PRs in diesem Patch zusammenführen.

Quellen: Google Search Central title-link, favicon-in-search, canonicalization; geprüft 14.10.2026. Kein Analytics-Providerkonto oder Google-Ads-Business-Logo verändert; es gibt dafür in diesem Auftrag keine verifizierte Kontoevidence.


## Fortsetzung nach Owner-Push-Freigabe (14.10.2026)

- Explizite GitHub-Veröffentlichungsfreigabe im Chat erhalten. Main-Basis synchronisiert auf `bca67f4`; Provenienzkonflikt durch Neuberechnung aus vereinten Quellen gelöst.
- **Fünf Seiten erklärt:** Scan `8VDpiJDydr` meldet S8: `Valid sitemap with 317 URLs`, S4: 11 llms.txt-Links, L7: `All 5 sampled links are accessible`. Die fünf sind Stichproben des Agent-Scans, kein Google-Indexierungsnachweis und keine Gesamtinventur. `pagesDiscovered=5` im Plugin ist daher kein belastbarer Site-Crawl-Zähler. Exaktes internes Sampling-Limit jenseits dieses Reports nicht separat nachgewiesen.
- SEO-04: zwei vollständige, eigenständige redaktionelle Intent-Seiten `/blog/datenkonzept-blueprint` und `/blog/screener-scoring-lernen`; gemeinsame Artikelquelle in React und HTTP, eigene Metadata/Canonicals/Schema, Sitemap und llms.txt. Keine globale Freischaltung interaktiver NOINDEX-Hubs. Blog und Learning verlinken die Artikel; diese verlinken Methodik, Blueprint-Demos und Learning-Angebot. Öffentliches Inventar damit 319 URLs.
- SEO-07: bestehende Basic-Consent-GA4-Integration wiederverwendet. Öffentliche Seitenaufrufe entfernen Queries/Fragmente; Suchreferrer nur als erlaubter Origin, keine Suchbegriffe. Zusätzlich `purchase` ausschließlich nach serverseitig zugeordnetem, vollständig geprüftem **Live**-Learning-Checkout mit tatsächlichem Betrag nach Rabatt. Testzahlungen, fremde Nutzer, ungültige Zahlungen und bloße Entitlements erzeugen keine Kaufdaten.
- GA4 erhält keine Stripe-Session-/Payment-/User-ID, sondern eine zweckgebundene HMAC-Transaktionskennung zur Revenue-Deduplizierung; bei Rotation des Stripe-Schlüssels ändert sich diese Kennung. Browser-Deduplizierung gilt im Dokument, GA4-Transaktionsdeduplizierung über Dokumentwechsel. Kein nachträgliches Replay bei fehlender Einwilligung. Reale GA4-Dateneingänge und GSC-Klickzahlen sind separat nachzuweisen.
- Datenschutzhinweise und alle sechs Consent-Sprachen erklären Kaufmessung. Version `2026-10-14.1` invalidiert alte optionale Consent-Receipts; Kaufweg bleibt ohne Analytics nutzbar. Keine neue Integration, keine kostenpflichtige Aktivierung.
- `.dockerignore` ergänzt um das bereits importierte `shared/public-search-focus.mjs`; andernfalls würde der lokale Build den fehlenden Docker-Kontext nicht erkennen.
- Veraltete separate Legal-Suite aktualisiert: echter LocaleProvider im SSR-Harness, serverseitiger deutscher Locale-Fallback und aktuelle Google-OAuth-/Consent-Kaufhinweise. Alle vier Tests grün. Lint/TypeScript und Frontend-Boundaries grün. Bestehender Chromium-Audit um beide Artikel und Screenshots bei 320/390/768/1280px ergänzt; tatsächliche CI-Ergebnisse separat auswerten.
- Offene PRs #493/#495 überschneiden nur die Post-Merge-Milestone-Reparatur; #494 OAuth-UI unabhängig. #492 überschneidet Privacy/SEO-Provenienz: bei Sync beide Offenlegungen erhalten und Generator neu ausführen. #489/#483/#484/#471 unabhängig. Main und offene Menge vor Merge erneut prüfen.
