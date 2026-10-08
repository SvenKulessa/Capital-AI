# CAPITAL AI — Monetarisierungs-DeepScan und Rechts-/Readiness-Matrix

**Stichtag:** 2026-10-08 (Europe/Berlin)  
**Repository:** `SvenKulessa/Capital-AI`  
**Baseline:** `main@ba6fc7183c3d017e116a88e247af6054d7690fa4` (Merge #287)  
**Primary domain:** TRUST (Produktentscheidung: PRODUCT; Scoring/Provider: MARKET; Runtime: PLATFORM; Vermarktung: GROWTH)  
**Methode:** GitHub-basierter **Code-/Datei-/Dokumenten-DeepScan** zentraler Produkt-, Preis-, Runtime-, Vertrags-, Lizenz- und Readiness-Quellen; kein vollständiger statischer Code-Scan jeder Datei, kein Dynamic-Scanning, kein echter Käufer-/Provider-Roundtrip, keine Live-Stripe-/Render-/Supabase-Verifikation. Alle Statusangaben sind **Scope-bezogen**; `MONETIZED` im Produktregister bedeutet nicht automatisch Live-Umsatz oder erlaubten Verkauf.

## Ausgangslage — geprüfte Quellen

| Quelle | Nachweis und kommerzielle Konsequenz |
|---|---|
| `src/data/monetizationRegistry.ts` und `docs/product/MONETIZABLE-PRODUCT-REGISTRY.md` | 23 inventarisierte Produktansätze, teils mit historischen readinessPct. Viele Prozentzahlen sind nicht gegen diesen Main neu berechnet. |
| `src/data/pricingCatalog.ts`, `server/billing-catalog.mjs` | Starter 7,00 EUR/M bzw. 75,60 EUR/J; Pro 29,00 EUR/M bzw. 248,00 EUR/J; Enterprise 109,00 EUR/M bzw. 1.280,00 EUR/J; Vocabulary 19,00 EUR einmalig. Konfigurationswerte sind kein erfolgreicher produktiver Checkout. |
| `server/subscription-checkout.mjs`, `server/subscription-entitlements.mjs`, `docs/product/PRODUCTION-PRICING-CORRELATION-20261005.md` | Website-Checkout-/Entitlement-Slice implementiert, echter E2E-Kauf und Runtime-Readback separat zu beweisen. |
| `src/services/marketIntelligenceReadiness.ts`, `src/contracts/analysisComponentRegistry.ts` und `docs/architecture/ENTERPRISE-MARKET-INTELLIGENCE-CURRENT-MAIN-AUDIT-20261008.md` | 50 kanonische Komponenten, auf Audit-Baseline 45 geplant / 5 blockiert / 0 aktiviert. Statische Inventarisierung ist keine live scorende Produktionsfunktion. |
| `src/services/scoringEngine.ts` und `src/platform/FinanceScoringResearch/*` | Berechnungs-, Evaluations-, Modell-/Faktorlogik und Forschung vorhanden; verifizierte vollständige Kundenscoring-E2E und Rechte bleiben ausstehend. |
| `server/user-provider-vault.mjs`, `server/private-provider-query.mjs`, `server/private-market-batch.mjs`, `services/provider-bridge-rs/src/main.rs` | Private BYOK-/Bridge-Architektur; kein Recht zum Feed-Repackaging oder zur Übertragung persönlicher Individual-Lizenzen auf die Plattform. |
| `server/ecb-reference-rates.mjs` | Öffentlicher täglicher Referenzratenpfad; kein Echtzeitkurs. ECB-Quellenhinweis, Datenunverändertheit und sonstige Regeln pro Datensatz prüfen. |
| `server/benchmark-runs.mjs`, `server/cads-marketplace.mjs`, `packages/benchmark-core/index.mjs`, `src/data/cadsCommercialReadiness.ts` | CADS Benchmark/Commerce/Billing-Pfade sind implementiert, Marketplace-/Runtime-Admission nicht belegt. |
| `src/features/learning/*`, `src/data/vocabularyOffer.ts`, `docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md` | Inhalte, getrennte Vocabulary-SKU und Nutzungslizenz eignen sich für Lernprodukt-Verkauf; Käufer-/Widerrufsnachweis offen. |
| `src/features/studio/*`, `src/features/pipeline-builder/*`, `src/data/roadmapData.ts` | Pipeline-Simulation, Konfiguration, Benchmark-/Dokumentationsoberflächen vorhanden; als eigenständige Bezahlfunktion noch nicht komplett zugeschnitten. |
| `server/social-media/*`, `CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md` | Content-/Social-Pipeline-Teile; reale Distribution, TTS-/GPU-Qualität, Provider-Accounts, Medien-/Modellrechte nicht pauschal abgenommen. |
| `docs/security/LICENSE-REVIEW.md`, `docs/security/LICENSE-RIGHTS.md`, `docs/licenses/CADS-PRODUCT-LICENSE.md` | Eigene IP ist getrennt von OSS-Bibliotheken, Bildern, Logos und Drittprovider-Rechten; Version/SBOM/NOTICE im ausgelieferten Artefakt prüfen. |
| PR #288 | Persönlicher BYOK/BYOM-Workspace als ungemergte Branch-Implementierung; nicht in `main` als Kundenfunktion bewerten. |
| Merge #287 | Finance-Research-Transport via JetStream/Valkey/Supabase ergänzt, aber ausdrücklich ohne live Scoring-/Datenrechtefreigabe. |

## Bewertungsskala

- **A — naheliegendes Produkt:** eigene Inhalte/Mathematik/Tools, keine proprietäre Feedredistribution als Voraussetzung; Commerce-/Runtime-Lücken bleiben separat.
- **B — bedingt skalierbar:** Software-Basis vorhanden; relevante Funktions- und Nutzerrechtenachweise offen.
- **C — Lizenz-/Regulierungs-abhängig:** begrenzter erlaubter Nutzungskreis; für kommerzielle Aktivierung vertragliche oder aufsichtsrechtliche Klärung erforderlich.
- **D — derzeit nicht als kaufbar behaupten:** kein technischer End-to-End-Pfad bzw. erheblicher rechtlicher Scope.

Diese Einstufung ist eine qualitative Produkt-/Rechtsrisiko-Vorbewertung und **keine Rechtsberatung, Umsatzprognose, Lizenzbescheinigung oder Produktionsfreigabe**.

## 24 verwertbare Monetarisierungsoptionen (Bestand + nahe Erweiterung)

| # | Monetarisierung | Bestandsanker | Verkaufsmodell | Klasse | Konkreter Entblocker |
|---:|---|---|---|---|---|
| 1 | **Market Vocabulary** | Vocabulary-SKU, Learning, Badge-Lizenz | 19 EUR einmalig im Katalog | A | Echte Checkout-/Download-/Widerrufs-/Steuer-Readbacks, Nutzungsrechte der Inhalte |
| 2 | **Starter/Pro/Enterprise SaaS** | Stripe Katalog, Checkout, Subscription-RPC | 7/29/109 EUR monatlich als bestehender Preis | A/B | Alle sechs Preisvarianten, Webhooks, Tier-Grenzen und Live-E2E nachweisen; nur verfügbare Features verkaufen |
| 3 | **Premium-Lerninhalte / Kurse** | Learning Portal, Glossar, Quizzes | Einmalkauf / Curriculum / Mitgliedschaft | A | Auth-/Entitlement-gebundene Auslieferung, Lehrstoff-Rechte, keine ungesicherten Renditeversprechen |
| 4 | **Algorithmik-/Indikatoren-Lizenzen** | Finance Research Models, Scoring Engine | API-/Seat-/Compute-Lizenz für *eigene Formeln* | A/B | Formeln, Rechtekette, reproduzierbare Beispieldaten, SDK-/Lizenzvertrag, keine fremden Rohdaten |
| 5 | **Offline-/Import-Scoring** | Scoring-Kernel, Verträge, Pipeline Builder | Berechnung pro Auftrag / Abonnement | A/B | Nutzerimporte datenschutz- und rechtssicher validieren; no-provider Demo/Offline-Modus; modellvalidiertes Output-Label |
| 6 | **Pipeline Simulator / Konfigurator** | Studio / Pipeline Builder, OSS simulation | Pro-Tool / Projektlizenz / B2B | A/B | Persistente Nutzerprojekte, Export, definierte SLAs/Entitlements; OSS-Notices beim Weitervertrieb |
| 7 | **CADS Software-/Benchmark-Service** | benchmark-core, CADS Commerce | B2B SaaS / Seat / Evidence-Retention | A/B | Ausführung, Kosten, Security- und Provenance-Evidence; Website-Entitlements echt testen |
| 8 | **CADS GitHub Marketplace App** | cads-marketplace, webhook ledger | Paid Starter/Pro/Enterprise in USD | B | GitHub Org + Verified Publisher + Mindestinstallationen + Listing-/Billing-Readbacks |
| 9 | **Security-/SBOM-/Provenance-Reports** | OCI Evidence, SBOM, Scan Scripts | B2B Audit-Werkzeug / Evidence-Paket | B | Recht zur Analyse kundeneigener Repos, Tool-Lizenzen, Datenlöschung, keine Zertifizierung behaupten |
| 10 | **White-Label Rechner/Charts ohne lizenzierte Kurse** | React UI, Calculator/Scoring Komponenten | Embed-/SDK-Lizenz | B | Paket isolieren, Mandanten-/Brand-Optionen, Kundeninput, CSP/Abuse-Tests, OSS-Lizenzen |
| 11 | **B2B Beratung / Custom Integration** | nachgewiesene Platform/Trust/Market-Artefakte | Auftrag / Festpreis / SLA | A/B | Leistungs-/Haftungsgrenzen, Auftragsdaten, keine ungeprüfte Compliance-Zertifizierung |
| 12 | **Revenue-/Tarif-Simulationen** | Revenue Simulator, Pricing Catalog | Einmalreport / Team-Tool | A/B | Plausible Annahmen, Szenarien und nicht garantierte Ergebnisse klar kennzeichnen |
| 13 | **Price Alerts / Watchlists** | Alerts-UI und Markt-Screener | Premium-Kontingente | B/C | Zustellung, Nutzerquota, echte Datenberechtigungen und keine unerlaubte öffentliche Feed-Anzeige |
| 14 | **Private BYOK Scoring SaaS** | Vault, Rust Bridge, Private Market Batch; PR #288 | Mathematik-Abo, Nutzer zahlt extern | B/C | Individuelle Tarif-/ToS-Prüfung *einschließlich Hosted-Service*, Tenant E2E, RLS, Private Cache, Scoring-Eligibility |
| 15 | **BYOM KI-Analyse / Token-Budgets** | Modell-/Agentenentwürfe; PR #288 nur Zuordnung | Nutzer-Key; optional Compute-Meter | B/C | Eigenes encrypted Model-Vault, Einwilligung, Budget/Retention, Modell-/Prompt-Rechte, kein stiller Provider-Datenexport |
| 16 | **ECB-/Open-Data FX-Analytics** | ECB Reference Adapter | Indikatoren/Visualisierungen/Alerts | B | Quellhinweis, korrekte Daily-Kennzeichnung, Nutzungsbedingungen, operative Daten-E2E |
| 17 | **Sentiment-Analytik** | UI + 50er Registry | Add-on / Analyse-API | C | Dritttext-/Social-Dataset-Rechte, belegbare Features, Lizenz für Derived Data, MAR-Abgrenzung |
| 18 | **B2B Score-/Feature-API** | Scoring Contracts / Research | metered API / Vertrag | C | Keine Provider-Rohdaten/Derived-Feeds ohne Rechte, Key-/Metering-/Tenant-Security, Modellvalidierung |
| 19 | **Whale Radar / On-Chain Intelligence** | Whale UI + Crypto Models | Premium Dashboard | C | Provenienz von On-Chain/Indexern, Datenlizenz, Scam-/Signalclaims, keine persönliche Kryptoanlageberatung |
| 20 | **Broker-Affiliate / Referral** | Kraken Banner | Disclosure-gekennzeichnete Provision | C | Affiliate-Vertrag, eindeutige Werbekennzeichnung, Konflikte/Tracking/Datenschutz, aufsichtsrechtlichen Grenzfall prüfen |
| 21 | **Social/GROWTH Content Engine** | social-media code + Docs | SaaS für Redaktionsprozesse / B2B | B/C | TTS/Modell-/GPU-Rechte, persistente Approval/Scheduling/Provider-E2E, echte Ausspielrechte, Freigabeprozesse |
| 22 | **Sponsoring/Forschungsförderung** | FUNDING, Sponsorship Evidence | freiwillige Unterstützung | B | Echtes Funding-Konto, transparente Mittelverwendung, Trennung von Sponsor und Score-/Research-Unabhängigkeit |
| 23 | **Live Trading / Fee Share / Portfolio-Service** | Kraken validate-only dry-run, Uniswap | Provisionen / Brokerage | D | Erlaubnis-/CASP-/Wertpapierdienstleistungs-Analyse; Order-/Kundenschutz, Verwahrung/Execution, Verträge und E2E |
| 24 | **$CPT Token, Staking oder Token-Zahlung** | Tokenomics UI, Registry | Token-/Zahlungsmodell | D | Erst wirtschaftliche Notwendigkeit, MiCA-/WpHG-/Prospekt-/Zahlungsrecht, Vertrags-/Smart-Contract-Prüfung; kein Launch jetzt |

**Zusatzpotenziale ohne eigene neue Produktlinie:** separater Support-SLA für Enterprise, institutionelle Methodikschulungen, kundenseitige On-Prem-/Private-Deployment-Lizenz für den *eigenen* Scoring-Kernel, unbezahlte Community-/Research-Distribution als Lead-Generator. Kein Fundraising- oder Security-Gütesiegel aus automatisierten Scans ableiten.

## Konkrete Rechtslage, Stand 08.10.2026

### 1. Personallizenz ≠ Plattformlizenz

- **Massive:** Individual-Market-Data-Tarife sind ausdrücklich nicht für den Aufbau einer Anwendung zur Nutzung durch weitere Endnutzer lizenziert. Auch abgeleitete Preisdarstellungen können unter Business-/Display-Rechte fallen. [Offizielle Market Data Terms](https://massive.com/legal/market-data-terms-of-service), [App-Dashboard FAQ](https://massive.com/knowledge-base/article/which-plan-do-i-need-to-show-massive-data-in-my-own-app).
- **Kraken und andere Provider:** Region/Endpunkt, gewählter Tarif, Display, Derived Data, Cache, API-/Screener-Weitergabe und persönliche/serverseitige Verarbeitung je Vertrag prüfen. BYOK bestätigt Authentizität, nicht kommerzielle Datenrechte.
- **ECB:** Veröffentlichtes statistisches Material kann unter Quellenangabe, unveränderter Wiedergabe der Originalstatistiken/Metadaten und weiteren Bedingungen kommerziell wiederverwendet werden; keine Drittanbieter- oder Confidential-Daten einschließen. Daily Reference ist kein Live-FX-Feed. [ESCB Reuse Policy](https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html), [Disclaimer](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html).

### 2. Finanzaufsicht

- **Neutraler Mathe-/Softwareverkauf:** Nicht jede Formel, Chart- oder technische Softwarelizenz ist Anlageberatung. Die konkrete Interaktion zählt.
- **Individuelle Wertpapierempfehlung/Portfolioverwaltung/Handelsausführung:** kann BaFin-reguliert sein; „nur Forschung“ oder Disclaimer sind kein Ersatz für die tatsächliche Produktklassifikation. [BaFin automatisierte Beratungssysteme](https://www.bafin.de/DE/unternehmen-maerkte/erlaubnis-registrierung/fintech/beratungs-handelssysteme/beratungs-handelssysteme_node.html).
- **Öffentliche Kauf-/Verkaufssignale, `undervalued/overvalued`-Scores:** selbst ohne persönliche Anlageberatung können Marktmissbrauchs-/Anlageempfehlungs-Transparenzregeln einschlägig sein (u.a. Quellen, Objektivität, Interessenkonflikte). [ESMA MAR Hinweise](https://www.esma.europa.eu/press-news/esma-news/requirements-when-posting-investments-recommendations-social-media), [ESMA FAQ zur Bewertung](https://www.esma.europa.eu/publications-data/questions-answers/1740).
- **Kryptowerte:** MiCA Art. 81 regelt persönliche Beratung/Portfolioverwaltung von Kryptoassets; weitere CASP-Leistungen wie Orderübermittlung, Ausführung, Verwahrung und Transfer fallen unter separate Tatbestände. [MiCA Art. 81](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-81-providing-advice-crypto-assets), [BaFin](https://bafin.de/DE/unternehmen-maerkte/erlaubnis-registrierung/geschaefte-krypto/kryptowerte-dienstleistungen/kryptowerte-dienstleistungen.html). Stand 08.10.2026: ESMA weist zusätzlich auf Restriktionen für nicht MiCA-konforme Stablecoin-Dienste hin: [ESMA-Mitteilung](https://www.esma.europa.eu/press-news/esma-news/esma-sets-out-supervisory-expectations-services-related-unauthorised).

### 3. Datenschutz, Software, digitale Verkäufe

- Für Auth-/Provider-Keys, Depotbestände und KI-Modellinputs: DSGVO-Rollen je Verarbeitung bestimmen, minimal speichern, Zweck und Löschung definieren; je Rolle gegebenenfalls AVV nach Art. 28, Drittlandtransfers/Unterauftragsverarbeiter absichern. [EU-Kommission SCC](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en).
- OSS-Komponenten, Modellgewichte, Bilder, Logos und Daten haben eigenständige Rechte. Eigentum an der eigenen Mathematik hebt keine Notice-, GPL-/MPL-/OFL-/Brand-/Provider-Pflichten auf. Die tatsächlich vertriebene Build-/Deployform entscheidet die Pflichten mit.
- Verbraucherrecht: B2C-Preisangaben, Leistungsumfang, USt, Kündigung und Widerruf sind produktabhängig korrekt zu gestalten. Widerrufsverlust bei **digitalen Inhalten** und Kündigung digitaler **Dienste** nicht pauschal gleichsetzen; erforderliche ausdrückliche Zustimmung, Bestätigung und zutreffender Vertragstyp prüfen. [EU-Verbraucherrechte-Richtlinie, konsolidiert 27.09.2026](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02011L0083-20260927).
- GitHub Marketplace Paid: Org-Owned + Verified Publisher, mindestens 100 GitHub-App-Installationen, monatliche/jährliche USD-Pläne, Billing Events und Listing-Freigabe. [Offizielle GitHub Listing Requirements](https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app).

## Empfohlene Reihenfolge — schneller Umsatz ohne künstliche Freigabeschichten

1. **Produkt-/Lizenzscope festlegen:** Math-, Learning- und CADS-SaaS unterscheiden. Keine lizenzierten Public Quotes/Investment Claims als ausgelieferte Leistung versprechen.
2. **Vorhandenes abschließen:** Vocabulary One-Time / Stripe-Subscription-E2E / Server Entitlements / reale Rechnungs-, Steuer- und Widerrufspfade bestätigen.
3. **Eigenständige Mathe-Engine verkaufen:** Import-/Offline-Kalkulator mit eigener Formellogik, Version-/Input-/Result-Evidence, ohne eingeschlossenen Datenfeed; nach fachlicher QA.
4. **Pipeline/CADS verkaufen:** Team- und Report-Export-Scope mit Reproduzierbarkeit, Security- und Leistungsgrenzen, GitHub Marketplace als späterer Distributionskanal.
5. **BYOK/BYOM privat ergänzen:** Nur passende Provider-/Tarifverträge, Nutzerisolierung, sichere Vault-/Tenant-Grenzen und schriftlich geklärte Servernutzung; Token-/Inference-Kosten stets transparent.
6. **Lizenzierte B2B Daten-/Score-APIs oder White-Label** nach expliziten Display-, Derived-Data- und Redistributionsrechten.
7. **Handel und Tokenisierung** ausdrücklich separate spätere Geschäftsentscheidungen nach konkreter Regulierungseinordnung.

## Kostenannahmen / Entscheidung

`NOT_PROVEN`: Stripe-Transaktionsgebühren, verbleibende CI-Kontingente, Render/DB/NATS/Valkey/Egress, Massive Business-Feedpreis, Börsenlizenzen, Kraken-/Modelltarife, GPU-Compute, App-Marketplace-Gebühren und Kosten je akzeptiertem Scoringlauf. Kein neues kostenpflichtiges Paket, keine Modellinferenz oder Nutzerabrechnung in diesem PR.

**Nicht durchgeführt:** Produktionsmigration, neues Checkout-SKU, GitHub Marketplace-Publisher-Verifikation, Providervertragsabschluss, Unternehmens-/Steuer- oder BaFin-Rechtsgutachten, Score-Aktivierung, Trading, Token Sale, externer Providerabruf. Dieser DeepScan ist die **Prüfmatrix für konkrete nächste Arbeitspakete**, keine allgemeine Lizenz- oder Marktfreigabe.
