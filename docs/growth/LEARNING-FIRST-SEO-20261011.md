# Learning-First SEO und nachvollziehbare Conversion

Stand 11.10.2026; Ausgangs-Main `3e30f0c537463f9c365b4b9b6b0b22c314f37292`, abgeglichen mit `093299d8de39aeca69e80be278953492a1883cb2` einschließlich PR #389/#391. Primary Domain GROWTH; Engineering-/Advisory-Skills GROWTH, PRODUCT und TRUST angewandt. Das Production-Readback-Script aus PR #389 wird nicht geändert. Der aktuelle Auftrag fordert einen PR ohne eigenmächtigen Merge.

## Drei belegte Probleme und wirksame Gegenmaßnahmen

1. **Getrennte, knappe Methodiktexte:** Server-Fallback und LearningArticles pflegten Gewichtung/Datenqualität unabhängig. Die neue gemeinsame Quelle `shared/learning-journey.mjs` liefert sechs vollständige Lernschritte mit Suchintention, Lernziel, synthetischem Rechenbeispiel, Annahmen und Interpretationsgrenzen. Server-HTML und React enthalten exakt dieselben Absätze; auch ohne JavaScript lesbar. Keine zusätzlichen SEO-Massenseiten.
2. **Unpräziser Angebotsrücksprung:** Lernartikel verlinkten lediglich /learning; es fehlte ein eindeutiges Angebotsziel. Der Lernpfad verbindet öffentliche Begriffe, mathematische Beispiele, synthetische Blueprint-Demos, /learning?tab=glossar#learning-offer und Kursanfrage. Der Deep Link landet beim unverändert zustimmungspflichtigen Einmalkauf, der die Anmeldung vor dem Kauf ausdrücklich erklärt. Die SEO-Provenienz enthält auch Kaufkomponente und kanonische Preisquelle. Wiedereröffnung nach Navigation und bestehender Zugang sind berücksichtigt. Die Live-API /api/billing/vocabulary/offer meldete 2500 EUR-Cent, einmalig, steuerinklusive, passend zu VocabularyOffer und serverseitiger Preisprüfung. Dies ist kein erfolgreicher Kaufnachweis. Chart-Module erfordern zusätzlich mindestens Starter, Chart-Training Pro; Videos sind nicht verfügbar. Keine Blueprint-SKUs erfunden.
3. **Unspezifische Lead-Messung und fehlende Source-to-Draft-Bindung:** Der bestehende organische Lernbericht enthielt alle keyEvents. Ein separater Bericht filtert jetzt ausdrücklich generate_lead. Der bestehende Main-only Setup-Workflow erhält eine sichere Länderaggregation, die Search-Klicks, Sitzungen und Lead-Ereignisse getrennt hält und echte Anfragen/Käufe nicht behauptet. Aus denselben Lerninhalten erzeugt der Offline-Befehl `npm run growth:learning-draft` sechs echte Text-Assets mit SHA-256, Suchintentionen, kanonischem Ziel und Content-Engine-/Social-Package-Verträgen. Kein Provideraufruf, keine Veröffentlichung, keine vorgetäuschte Asset-Approval.

## SEO-00 bis SEO-11: aktuelle Code-Einordnung

| Bereich | Ergebnis im betroffenen Scope |
|---|---|
| SEO-00 Indexierung | /learning und öffentliche Vocabulary-Terme INDEX; /pricing, /marketscreener/dokumentation, private und Sprachvorschau-Routen bleiben ausgeschlossen. Policy-Gründe aktualisiert, keine Klassifikation gelockert. |
| SEO-01 Manifest | Learning-Source-Refs enthalten gemeinsame Inhalte, React-Renderer und HTTP-Renderer. Bestehendes SHA-/Digest-Verfahren aktualisiert und Drift geprüft. Historischer Generierungsanker wird nicht als aktueller Commit ausgegeben. |
| SEO-02 Metadaten | Learning als CollectionPage für Lerninhalte statt DefinedTermSet; Glossar bleibt DefinedTermSet. Keine erfundenen Offers, Preise oder Ratings im Schema. Kanonisches /learning auch bei Tab-/Anchor-Navigation. |
| SEO-03 Crawlability | HTTP-Fallback mit allen sechs Lernschritten, realen internen Links und Angebots-/Anfrageankern; 404-/NOINDEX-/Sitemap-Regressionen unverändert geprüft. |
| SEO-04 Themencluster | Finanzbegriffe, Datenqualität/-vertrag, Normalisierung, Gewichtung, Volatilität, Validierung jeweils mit eigenem Lernziel und erklärten Grenzen. |
| SEO-05 Source-to-Website | Öffentliches Shared-Modul als kanonische Quelle statt Kopie interner Betriebs-/Security-Dokumente. |
| SEO-06 Content/Social | Bestehende planContentCampaign/buildDraftContentSocialPackage genutzt. Tatsächliche Textbytes gehasht. DRAFT/REVIEW_REQUIRED; OAuth, Publisher und Veröffentlichung nicht aktiviert. |
| SEO-07 Search Evidence | Bestehende GA4-/GSC-REST-Integration um getrennte generate_lead-Abfrage und begrenzte Länderaggregation erweitert. Live-Abfrage des neuen Codes folgt erst auf Main; aktuelle Zahlen bleiben NOT_PROVEN. |
| SEO-08 AI Search | Semantische Details, Lernziele, Formeln, Grenzen und Canonicals maschinenlesbar. Keine Garantie für Rich Results, AI-Zitationen oder Training. |
| SEO-09 Regression | Bestehende Tests und Required Checks; keine neuen organisatorischen oder manuellen Gates. |
| SEO-10 Reparatur | Provenienz gezielt mit vorhandenem Refresh-Befehl gepflegt. Kein allgemeiner automatischer Rewrite von Claims oder Canonicals. |
| SEO-11 Distribution | Prüffähige Social-Adaptionen vorhanden; externe Veröffentlichung und organischer Erfolg NOT_PROVEN. |

## Messung: Aussagegrenzen

Die Länderaggregation umfasst Deutschland, Italien, Spanien, Portugal und Großbritannien. GA4: organische Learning-/Vocabulary-Landingpages, zwei benannte 28-Tage-Fenster, maximal 100 Reportzeilen; fehlende/ungültige Header oder Werte ergeben null, nicht erfundene Nullen. Search Console: letzte 28 Tage, höchstens 20 Seiten pro Land; Summen sind ausdrücklich keine vollständigen Website-Totals. Roh-URLs, Queries, Kontakte und Nutzerdaten werden nicht ausgegeben. Attribution, Consent, Datenschutzschwellen und Meldeverzug verhindern eine 1:1-Gleichsetzung von Klicks, Sitzungen und Lead-Ereignissen. Ein generate_lead-Bericht allein beweist weder Inbox-Zustellung noch Zahlung. Rankings, Umsatz und Uplift bleiben NOT_PROVEN.

## Alternativen und Risiken

Gewählte Lösung: vorhandene /learning-Seite substanziell erweitern und Shared-Quelle wiederverwenden; keine neue Bibliothek, SaaS oder kostenpflichtige API. Alternative: sechs separate Artikel mit eigenständigen Canonicals; höherer Pflege-/Provenienzaufwand und derzeit keine belegte Nachfrage für zusätzliche URLs. Pauschale Indexfreigabe für Pricing/Demos verworfen: die erforderliche vollständige Commerce-/Methodik-Landingpage ist noch nicht belegt.

Trust Boundary: ausschließlich öffentliche Bildungsinhalte und aggregierte, fest gebundene Google-Reports. Keine privaten Vocabulary-Inhalte, Entitlements, Zahlungsrechte oder Consent-Regeln erweitert. Social-Text bleibt ein prüfpflichtiger Entwurf. Formeln sind didaktisch, keine empirische Modellvalidierung. Rücknahme: PR-Code revertieren; keine externen Publishing-/Zahlungsschreibaktionen in diesem Paket.

## Reproduktion und tatsächliche Prüfung

- `node --test scripts/seo-metadata.test.mjs scripts/seo-content-manifest.test.mjs scripts/seo-source-provenance-drift.test.mjs scripts/docker-context.test.mjs`: 18 Tests erfolgreich.
- `node --test server/seo-indexing-policy.test.mjs`: 4 Tests erfolgreich, einschließlich echten HTTP-Fallbacks, Canonicals und NOINDEX.
- `node --import tsx src/features/learning/learningPolicy.test.tsx`: 10 Tests erfolgreich.
- `node --import tsx src/contracts/__tests__/contentSocialPackage.test.ts`: 6 Tests erfolgreich, inklusive echter Textprüfsummen und fehlender Publish-Authority.
- `node server/google-learning-setup.test.mjs`: 7 Tests erfolgreich, einschließlich separatem Lead-Filter und personenbezugsfreier Aggregation.
- Zusätzlich `node server/google-maintenance-api.test.mjs`: 12 Google-/MCP-Grenztests erfolgreich; `node scripts/privacy-analytics.test.mjs`: 6 Consent-/Canonical-Tests erfolgreich. Der erste automatische Google-Testlauf erwartete noch 14 statt 15 erlaubter MCP-Werkzeuge; die erwartete Liste und der parameterfreie neue Tool-Contract wurden korrigiert.
- TypeScript und Produktionsbuild erfolgreich; SEO-Provenienz-Check erfolgreich. Kein unabhängiger zusätzlicher CI-Workflow.
- Lokaler echter Node-Produktionsserver mit leerer Providerkonfiguration und gebauten Assets, frische anonyme Chromium-Profile bei 320×720, 390×844 und 1440×900: alle sechs Texte/Formeln und Conversion-Ziele vorhanden; ScrollWidth 320/320, 390/390, 1425/1440. Angebotsanker top=0; Kauf-Checkbox false und Button disabled, kein Checkout-Submit. Vergrößerte Root-Schrift (32px) hält den neuen Abschnitt bei 390px innerhalb der Breite; Tastaturfokus sichtbar. Vor Consent keine Google-Anfrage.
- Kein natives Android/iOS, keine vollständige Screenreader-/WCAG-Prüfung, kein Kauf, keine Mail und kein externer Social-Post aus dieser QA. Neue UI noch nicht Production.

Browser-Evidence: `docs/growth/evidence/learning-seo-browser-20261011.json`; sichtbare Vorschau `docs/growth/evidence/learning-methodology-390-20261011.png`.
GitHub-Checks gelten für den späteren PR-Head und werden im PR separat dokumentiert; diese lokalen Ergebnisse sind keine erfundene CI-/Production-Freigabe.

Gemessene Text-/Hintergrundpaare im neuen Abschnitt (Chromium-Canvas-Ausgabe in sRGB): Fließtext 13.71:1, Summary 16.37:1. Dies belegt diese Paare, keine vollständige WCAG-Konformität.
