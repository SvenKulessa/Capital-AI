# CAP-BP-001 | Providerbezogene Rights / PIT / Immutable-Replay-Evidence-Matrix

Stand 2026-11-21. Scope: MARKET / CAP-BP-001 / market_integrity_gate. Quellenstand: main 7dffe0457dc45c28ceb69341bc228bcbd02cd240 und PR #882. Dokumentation und Quellenprüfung, keine Provider-Abfrage und keine produktive Datenfreigabe.

**Statussemantik:** VERIFIED = ausschließlich der ausdrücklich bezeichnete, anhand einer Quelle eingesehene Beleg. BLOCKED = konkrete Production-Admission-Voraussetzung unerfüllt bzw. restriktive Bedingungen. NOT_PROVEN = kein unabhängiger zuordenbarer Source-/Runtime-Readback. Weder ein öffentlich dokumentierter API-Zugriff noch ein vorhandener Vertragstext ist ein nutzungsberechtigendes Entitlement für CAPITAL-AI.

## Provider-Matrix

| Provider | Offizielle Quelle / recherchierbarer Sachverhalt | Rights für CAPITAL-AI | Historische CAP-BP-001 Tick-/Status-Snapshots | Immutable Replay-Receipt | Production |
|---|---|---|---|---|---|
| Binance | VERIFIED: Binance Vision Terms v1.0 vom 2026-08-26 dokumentieren historische Datensätze; kommerzielle Verwendung ist ohne separate schriftliche Enterprise-Vereinbarung ausgeschlossen. Binance Spot MiniTicker ist nicht L1 Tick-/Orderbuchhistorie. | **BLOCKED**: keine zu CAPITAL-AI gebundene Vertragspartei, spezifischer Live-Stream-, Derived-Use-, Cache-, Replay- oder Redistribution-Scope im Inventar | **NOT_PROVEN**: kein authentifiziertes Roh-Tick-/Exchange-Status-Paar mit Capture-/AvailableAt-, Version-/Korrektur- und Hash-Nachweis im geprüften Scope | **NOT_PROVEN**: kein CAP-BP-001-spezifischer Write/Readback/Replay-Receipt | **BLOCKED** |
| Kraken | VERIFIED: REST/WS-Feeds und historische Time-and-Sales-Trades dokumentiert; schriftliche Support-Antwort vom 2026-10-24 bestätigt begrenzt interne Sammlung, Speicherung und Analyse für eigene Zwecke ohne Rohdaten-Verteilung an Dritte. Für kommerziellen Endkundeneinsatz separate Prüfung erforderlich | **BLOCKED**: keine verbindliche CAPITAL-AI-Kundenprodukt-/Feed-/Venue-/Derived-Score-/Redistributionsfreigabe; die begrenzte eigene Nutzung ist keine Produktlizenz | **NOT_PROVEN**: Trade-Archive sind nicht gleich archivierten Bid/Ask-Ticks plus historischen Exchange-Status-Events; kein Original-Capture-Paar gefunden | **NOT_PROVEN**: keine korrelierte signierte/immutable CAP-BP-001-Evidence | **BLOCKED** |
| Coinbase | VERIFIED: Coinbase Exchange Market Data Terms of Use liegen vor. Standardnutzung grundsätzlich auf persönlichen/internen Research-Scope begrenzt, Dritt-Endnutzer-App und AI/ML-Verarbeitung ohne passende gesonderte Rechte problematisch | **BLOCKED**: konkrete schriftliche Sonderrechte für CAPITAL-AI, Scoring/AI, Retention, Kundenpräsentation und Redistribution fehlen; Coinbase nicht als eigener Provider im aktuellen license-rights-review Inventar erfasst | **NOT_PROVEN**: kein vom Provider authentifiziertes PIT Bid/Ask-/Status-Archivpaar | **NOT_PROVEN**: kein CAP-BP-001-spezifischer persistierter Replay-Receipt | **BLOCKED** |
| Twelve Data | VERIFIED: providerseitige schriftliche bedingte Auskunft vom 2026-10-05; kommerzielle Display-/abgeleitete nicht rekonstruierbare Ergebnisse sind tier-/scope-abhängig; externe Rohdatenumverteilung braucht zusätzliche Rechte; Terms verlangen Retention-/Exchange-Compliance | **BLOCKED**: tatsächliches CAPITAL-AI-Konto, Region, bezahlter Plan, Feeds/Symbole/Börsen, Add-ons, durchgeleitete Kundenrechte, Archiv-/Replay-/Backup-Scope und Vertrag nicht belegt | **NOT_PROVEN**: kein lizenz- und instrumentgebundener Source-Snapshot mit historischer Veröffentlichung und Abrufzeit nachgewiesen | **NOT_PROVEN**: schriftliche Antwort deckt Replay/JetStream/Backup ausdrücklich nicht ab | **BLOCKED** |

## Quellen und Evidence-Grenzen

1. **Kanonische Registry**: `src/contracts/analysisComponentRegistry.ts` stellt CAP-BP-001 `blocked`, `unavailable`, `lastValidatedAt=null`, `calculationVersion=1.2.0` dar; erforderliche Provider Binance, Kraken, Coinbase und Twelve Data. `src/config/providers/providerRegistry.ts` listet passende Provider technisch, aber `productionAdmission=BLOCKED`. Der technische Provider-Adapter oder der HTTP-200-Status ist keine Nutzungslizenz.
2. **Repository-Inventar**: `docs/security/evidence/license-rights-review.json` steht auf `REVIEW_OPEN`, `deployEligible=false`. Binance/Kraken fehlen ausgeführte Providerverträge, Coinbase fehlt als separater Datensatz, Twelve Data enthält nur bedingte Rechte. `src/contracts/marketDataRightsInventoryProjection.ts` erhält `null` und setzt keine Rechte auf ALLOW. `server/market-spot-ingestion.mjs` markiert alle vier als `NOT_ADMITTED`.
3a. **Kraken – ergänzender privater Beleg (minimiert)**: Zielgerichteter Read-only-Readback einer Kraken-Supportantwort vom 2026-10-24 bestätigt nur begrenzte eigene Datenerhebung, Speicherung und Analyse ohne Weitergabe der Rohdaten an Dritte und ohne Produktfreigabe. Kraken fordert für Kundenprodukte oder andere kommerzielle Nutzungen weitere Abklärung. Status **VERIFIED** für den Wortlaut dieser bedingten Erklärung, **BLOCKED** für CAPITAL-AI-Customer-Display/Redistribution/Replay-Rechte. Keine E-Mail-Adressen, Nutzerkennungen oder Korrespondenz im Repository kopiert.
3b. **Twelve Data – ergänzende Supportantwort (minimiert)**: Die Supportantwort vom 2026-10-05 bestätigte allgemeine interne Nutzung und dass API-Datenauslieferung gewöhnlich einen Enterprise-Plan benötigt. Für Broker-Replay, Backups und kundenspezifische Feed-Rechte wurde damit kein separater Beleg erbracht. Bestehendes `docs/market-data/evidence/twelve-data-rights-20261005.json` bleibt der einzige öffentliche projektspezifische Kurzbeleg.
3. **Twelve Data**: `docs/market-data/evidence/twelve-data-rights-20261005.json`: `WRITTEN_CONDITIONAL_PROVIDER_RIGHTS_CONFIRMED`, aber `productionAdmission=false`, `datasetScopeVerified=false`, Retention auf lizenzierte Nutzung bezogen, Rohdaten nach Vertragsende binnen 30 Tagen löschen. Live-Replay/JetStream/Backup und Vermittler-/Sublizenzrecht `REVIEW_REQUIRED`. Kein Rechteupgrade aus E-Mail-Metadaten.
4. **Bestehender Research-Pfad**: `src/contracts/capBp001AdmissionReview.ts` prüft temporale/vertragliche Kandidaten, gibt aber stets BLOCKED aus. `src/services/shadowPipeline.ts` implementiert generisches Digest-/Readback-/Replay für *Shadow*-Fixtures, aber bindet keinen authentifizierten CAP-BP-001-Provider-Rohfeed mit Rechten. `server/market-spot-ingestion.mjs` hat zwar persist/replay-Logik, jedoch sperren Rights-/Instrument-Gates vor dem Schreiben.
5. **Historische Fremdsnapshots**: `docs/growth/FINANCE-ORIGINAL-HISTORICAL-EVIDENCE-READBACK-20261009.md` enthält ältere Aggregate über Legacy-Score-Snapshots, aber ausdrücklich keine verifizierten Original-Tick-/Source-/Score-Triplets. Diese historisch belegten Aggregate sind kein CAP-BP-001-Readback. Die aktuelle Prüfung ist eine Repository-/öffentliche Terms-Prüfung, keine exhaustive Suche in privaten Konten, DB, Backups oder Cloud Storage.

### Offizielle Provider-Quellen (lesen ersetzt keine Vertragsfreigabe)

- Binance Vision terms, Version 1.0, 2026-08-26: https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md
- Kraken APIs Notices (non-personal commercial use requires prior permission): https://docs-legacy.kraken.com/api/docs/guides/global-intro/
- Kraken historical time-and-sales availability: https://support.kraken.com/articles/360047543791-downloadable-historical-market-data-time-and-sales-
- Coinbase Market Data Terms: https://www.coinbase.com/legal/market_data
- Twelve Data Terms: https://twelvedata.com/terms
- Twelve Data commercial/personal usage guidance: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage


### Datentyp-/Zeitpräzision: zusätzlicher PIT-Blocker

Binance dokumentiert für SPOT-Dateien ab 2025-01-01 Zeitwerte in Mikrosekunden; die aktuellen CAP-BP-001-Kandidatenschemas nutzen konzeptionell Unix-Millisekunden. Jede echte Importstrecke benötigt daher explizite Quellpräzision, deterministische Umrechnung, konservative Grenzen und Negativtests für Verwechslungen von µs/ms. Aus historischen Trades lassen sich außerdem keine zuverlässigen historischen Top-of-Book-Bid-/Ask- oder Exchange-Halt-Ereignisse rekonstruieren. **Status: NOT_PROVEN** für eine solche reale Import-/PIT-Normalisierung. Quelle: https://github.com/binance/binance-public-data/blob/master/README.md.

Die technische README-Version und das Vision-Lizenzdokument betreffen historische Archive; sie sind keine Live-WebSocket-Lizenz und keine Bestätigung einer Originaldaten-Kette für CAP-BP-001.

## Technische Replay-Abnahmematrix (pro Provider, Instrument, Venue und Feed)

| Prüfkriterium | Erforderlicher bindender Beleg | Stand |
|---|---|---|
| Rights / Datasets | ausgeführter Vertrag oder verbindliche Provider-Bestätigung inkl. Lizenznehmer, Jurisdiktion, Feed/Symbol/Venue, Derived-/AI-Use, Retention, Broker-/Backup-/Replay und Kundenrechte | BLOCKED |
| Original PIT Capture | exakt erhaltene unveränderte Bytes des RawTickStream und ExchangeStatus, beobachtet/empfangen/publiziert/verfügbar/abgerufen mit Versions- und Korrekturhistorie; keine spätere Veröffentlichung vorgezogen | NOT_PROVEN |
| Original Input-/Output-Digests | SHA-256 über exakt definierte canonical raw bytes, Versionskennung, Instrument-, Venue-, Provider-/Dataset-, Zeitfenster-, Code-/Policy-Hash mit Herkunftsnachweis | NOT_PROVEN |
| Immutable Persist-/Readback | schreibgeschützte bzw. append-only Ablage mit nachvollziehbarer Write-ID, Readback derselben Bytes, Tenant-/Access-Isolation, Retention gemäß Vertrag | NOT_PROVEN |
| Deterministischer Original-Replay | Wiederholung mit exakt identischen lizenzierten Inputbytes, Code-SHA und Outputhash, negativer Tamper-/Lookahead-/TTL-/Rights-Testsuite | NOT_PROVEN |
| Live Admission / Eligibility | kanonische Contract-Map, Feature-/Provider-Admission, CI, unabhängiger Rights-Review, Runtime-Identity und Readback | BLOCKED |

**Konsequenz:** CAP-BP-001 bleibt research/concept-only. `scoreEligible=false`, `rankEligible=false`, `decisionEligible=false`, `productionEligible=false`, `publishable=false`. Fehlende Bytes oder Rechte nicht synthetisch ersetzen. Keine kostenpflichtigen Anbieter aktivieren; keine Credentials exportieren und keine Daten verändern.

## Kleinste nächste evidenzgebundene Schritte

1. Pro Provider schriftliche, auf den vorgesehenen Use Case bezogene Rechte-/Feed-/Retention-/Replay-Bestätigung beschaffen; nur geprüfte Aussagen als VERIFIED markieren.
2. Existierende private Archive gezielt **read-only** auf originale Quote-Tick- und Exchange-Status-Paare samt Release-/Capture- und Originalhash-Provenance prüfen; keine neuen Daten beziehen, bevor Rechte geklärt sind.
3. Nur nach validierten Rechten ein einzelnes isoliertes, unveränderliches Raw-Input/Output-Replay-Paar mit Write/Readback und Negativtests erzeugen; Evidence nicht mit Live-Admission verwechseln.

**Status dieses Dokuments:** RESEARCH_ONLY / NOT_PROVEN für Provider-/Runtime-Readback. Änderungen an CAP-BP-001-Registry-Flags, Provider-Admission, Live-Scoring oder Produktveröffentlichung: keine.
