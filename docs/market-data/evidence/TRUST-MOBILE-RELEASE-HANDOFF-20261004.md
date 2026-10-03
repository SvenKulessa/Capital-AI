# MARKET → TRUST Mobile-Release-Handoff — 2026-10-04

## Status

**BLOCKED / PARTIAL EVIDENCE / keine Release-Freigabe**

Diese Übergabe korreliert MARKET-Evidence mit `SvenKulessa/Capital-AI@de4c268311c42877f8a7e1361e7de986ffb096cb`,
`SvenKulessa/Capital-AI-Mobile@2a86e7532cf1a78f96dc4994ba19c3d622e985cb` und Mobile-PR #2 Head
`86f7efd5132e3eb24862f942ba09303ae0811714`. Sie autorisiert weder Merge noch Production-Deploy noch APK-Signierung.

## Korrelation

- Web `current main`: `de4c268311c42877f8a7e1361e7de986ffb096cb`. Der übergebene MARKET-SHA `3c8cd0d4fa1745d60282132de48f722f48857fcb` ist nicht mehr current main.
- Mobile `current main`: `2a86e7532cf1a78f96dc4994ba19c3d622e985cb`.
- Mobile PR #2: offen und bei der Prüfung mergebar, Head `86f7efd5132e3eb24862f942ba09303ae0811714`.
- Web hatte bei der Korrelation keine offenen PRs; Mobile hatte PR #2 als offene Arbeit.
- Mobile besitzt keine `AGENTS.md`; Root-Authority ist `AGENTS.md@currentmain` aus Web.
- Bestehende Mobile-PR-#2-Dateien werden in diesem MARKET-PR nicht verändert.

## Instrumentmanifest

Manifest: `docs/market-data/evidence/instrument-manifest-20261004.json`  
SHA-256: `fd25579bd3ddd6bd6c2597ae6056f7a995e6cff4ac2670ac3f48df565651a011`

Katalogpilot:
- Crypto: 20 Instrumente / 20 kanonische Assets.
- Aktien: 20 Instrumente / 20 kanonische Assets.
- Rohstoffe: 20 Instrumente / **8 kanonische Underlyings**.
- Forex: 20 Instrumente / 20 kanonische Assets.
- Indizes: 20 Instrumente / 20 kanonische Assets.
- Perpetuals: 0 verifiziert.

Katalogsichtbarkeit ist keine kommerzielle Datenzulassung. Trading-Status, OHLCV-Semantik,
Freshness, Rate-Limits, Reconnect und Replay wurden deshalb nicht als Produktionsnachweis ausgeführt.

## Rechte-/Quellenergebnis

Die zehn OSS-Kandidaten bleiben strikt von tatsächlichen Datenprovidern getrennt.
Keiner der Kandidaten allein autorisiert kommerzielle Marktdaten.

- Twelve Data: reale Instrumentkataloge vorhanden; konkreter Vertragsnehmer, Tarif/Add-ons,
  Exchange-/Indexrechte, Display, Derived Use, Redistribution und Retention sind nicht belegt.
  Status: `REVIEW_REQUIRED`.
- Massive: Standard-Market-Data-Terms reichen ohne gesonderte Business-Erlaubnis nicht für
  CAPITAL-AI. Status: `BLOCK`.
- FinancialData.Net: zulässiger Umfang hängt vom konkreten Subscription-Scope ab.
  Status: `REVIEW_REQUIRED`.
- Kraken: öffentliche API-Zugänglichkeit ist keine kommerzielle Freigabe. Owner-Anfrage ist offen;
  Kraken fordert weitere Geschäftsdaten. Status: `BLOCK`.
- Binance und CoinGecko bleiben für Mobile ausgeschlossen.
- `nautilus_trader`: Benchmark-Pin ist auf `ad9d283...` festgehalten, beobachteter Head war
  `b0a9868...`; LICENSE-Blob blieb gleich. Vor Nutzung ist erneuter Source-Review nötig.
- Mobile PR #2 beschreibt OpenBB noch als AGPL-3.0; die aktuelle kanonische Web-Evidence
  prüft den gepinnten OpenBB-Stand als Apache-2.0. Das ist Dokumentdrift, keine Freigabe.

## Mobile-Gate OSS_SOURCE_ADMISSION

**FAIL.**

Für PASS erforderlich:
1. OSS-Software-/Adapter-Provenance inkl. Lizenz/NOTICE für die tatsächliche Paketierung.
2. Konkreter Datenprovider, Dataset, Venue, Tarif/Vertrag, Vertragsnehmer und Region.
3. Explizite Rechte für die aktivierten Web-/Mobile-Use-Cases.
4. Retention/Cache/JetStream-Replay sowie Attribution und Exchange-/Indexpflichten.
5. Serverseitiger Credential-Pfad und unveränderliche Evidence-Referenz.
6. Kein Binance-/CoinGecko-Pfad für Mobile.
7. Owner-Entscheidung zum Gate-Modell, falls proprietär lizenzierte Daten genutzt werden.

Architektur-Fund:
Der aktuelle Mobile-Code verlangt zusätzlich eine Open-Data-Lizenz
(CC0/CC-BY/CC-BY-SA/ODbL). Empfehlung: `OSS_SOFTWARE_ADMISSION` und
`DATA_RIGHTS_ADMISSION` getrennt führen und `OSS_SOURCE_ADMISSION` als fail-closed
Aggregat erhalten. Bis zur Owner-Entscheidung keine Architekturmutation.

## Mobile-Gate MULTI_ASSET_LIVE_UNIVERSE

**FAIL.**

Für PASS erforderlich:
1. Source Admission PASS.
2. 20 reale kanonische Assets je Klasse aus zugelassenen Live-Datasets.
3. Live bestätigter Handels-/Publikationsstatus und Provider-/Venue-Identität.
4. Reale Datenfelder, OHLCV-Semantik, Kalender, Freshness, Duplikate, Lücken und Future-Timestamps.
5. Gemessene Rate-Limits, Timeout/Reconnect und soweit angebunden deterministischer Replay.
6. Separate Derivatevidence für Perpetuals.
7. Nicht unterstützte Klassen als `NOT_SUPPORTED`, niemals durch andere Instrumenttypen ersetzen.

Der jetzige Pilot erreicht katalogseitig 20 Instrumente je Klasse, aber bei Rohstoffen
nur acht kanonische Underlyings. Mobile-Scoring unterstützt außerdem weiterhin nur Crypto.

## Scoring-Grenze

Die Mobile-UI und der vorhandene Scorer unterstützen nur Crypto.
Aktien, Rohstoffe, Forex und Indizes bleiben `NOT_IMPLEMENTED` für Scoring.
Kein Krypto-Score darf ungeprüft auf andere Klassen übertragen werden.

## Kleinste nächste Nachweise

- Twelve Data: tatsächlichen Business-Tier/Order-Form plus schriftlichen Dataset-/Venue-/Display-/
  Derived-/Retention-/Redistribution-Scope in TRUST-Evidence übernehmen.
- Massive: Business Order Form oder ausdrückliche schriftliche kommerzielle Rechte; sonst BLOCK.
- FinancialData.Net: tatsächlichen Subscription-Scope plus originale SDK-Lizenz/NOTICE-Evidence.
- Kraken: Owner bestätigt Firmenname/Rechtsform, Partnerschaftsgrund und primäres Betriebsland;
  erst schriftliche Market-Data-Erlaubnis als Gate-Evidence akzeptieren.
- Rohstoffe: zusätzliche zugelassene Spot-Rohstoff-Underlyings beschaffen; Quote- oder
  Gewichtseinheiten zählen nicht als zusätzliche Basis-Assets.
- Danach erst Live-Feldprobes und Replay-/Freshness-Messungen.

Finale Release-Freigabe bleibt bei TRUST.
