> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**
> Diese Datei bleibt als historische oder fachliche Dokumentation erhalten. Sie erzeugt keine zusätzlichen Repository-Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Autoritativ ist ausschließlich `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`. Konkrete gesetzliche, regulatorische, Security- oder Provider-/Lizenzpflichten bleiben davon unberührt.

# MARKET → TRUST Mobile-Release-Handoff — 2026-10-04

## Status

**BLOCKED / PARTIAL EVIDENCE / keine Release-Freigabe**

Diese Übergabe wurde zuletzt gegen `SvenKulessa/Capital-AI@c1a720a32a054c16944e6c582086a509be137fc4` korreliert. Das Instrumentmanifest selbst bleibt unveränderlich an seinem Erfassungs-Source-Commit `de4c268311c42877f8a7e1361e7de986ffb096cb` gebunden,
`SvenKulessa/Capital-AI-Mobile@2a86e7532cf1a78f96dc4994ba19c3d622e985cb` und Mobile-PR #2 Head
`86f7efd5132e3eb24862f942ba09303ae0811714`. Sie autorisiert weder Merge noch Production-Deploy noch APK-Signierung.

## Korrelation

- Web `current main` bei letzter Korrelation: `c1a720a32a054c16944e6c582086a509be137fc4`. Der Manifest-Erfassungsstand `de4c268311c42877f8a7e1361e7de986ffb096cb` bleibt als Source-Commit erhalten.
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
7. Qualifizierende Open-Data-Lizenz für das konkrete Dataset; ein proprietärer kommerzieller Vertrag ersetzt dieses Kriterium für Mobile nicht.

Owner-Entscheidung vom 2026-10-04: **Option A / OPEN_DATA_ONLY**.
Der bestehende Mobile-Code mit OSI-Softwarelizenz plus qualifizierender Open-Data-Lizenz
(CC0/CC-BY/CC-BY-SA/ODbL) bleibt unverändert und fail-closed. Kommerziell lizenzierte,
aber nicht offen lizenzierte Feeds können das Mobile-Gate `OSS_SOURCE_ADMISSION` nicht schließen.
Die zuvor empfohlene Gate-Aufteilung ist für Mobile durch diese Owner-Entscheidung superseded.

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

- Mobile: eine Quelle mit qualifizierender Open-Data-Lizenz, OSS-Adapter-Provenance und vollständiger Dataset-/Venue-/Use-Case-Evidence nachweisen.
- Twelve Data, Massive, FinancialData.Net und Kraken: kommerzielle Vertragsklärungen bleiben für Web/B2B relevant, schließen unter Option A aber nicht das Mobile-Open-Data-Gate.
- `fdnpy`: unabhängig davon originale SDK-Lizenz/NOTICE-Evidence vervollständigen.
- Rohstoffe: zusätzliche zugelassene Spot-Rohstoff-Underlyings beschaffen; Quote- oder
  Gewichtseinheiten zählen nicht als zusätzliche Basis-Assets.
- Danach erst Live-Feldprobes und Replay-/Freshness-Messungen.

Finale Release-Freigabe bleibt bei TRUST.
