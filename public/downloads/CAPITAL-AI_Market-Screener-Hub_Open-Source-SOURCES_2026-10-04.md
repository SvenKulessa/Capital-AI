# CAPITAL-AI Market Screener Hub - Open-Source + Open-Data Architecture v2.0

**Stand:** 2026-10-04  
**Darstellung:** Architektur-/Research-Evidence; keine Source Admission und keine Datenrechtsfreigabe.

## Kanonische CAPITAL-AI Quellen

- `AGENTS.md@currentmain`
- `docs/market-data/open-source-market-policy.json` - Branch `capital-ai-market/open-source-only-20261004`
- `docs/market-data/evidence/source-rights-matrix-20261004.json`
- `src/data/openSourceStack.ts`
- `server/open-source-market-policy.mjs`
- `server/oss-provider-adapters.mjs`
- `deploy/VALKEY-PUBSUB-NATS-HANDOFF.md`
- `docs/architecture/ARCH-PIPE-0002-target-state-delta-report.md`
- `package.json`
- GitHub PR #133: `[CAPITAL-AI-MARKET] Open-Source- und Open-Data-only für Market Data erzwingen`

## Owner-Entscheidung, die in dieser Version abgebildet wird

Der MARKET-Datenpfad von CAPITAL-AI Web und Mobile muss Open-Source-Software/Adapter **und** ein qualifiziertes Open-Data-Dataset verwenden. Eine öffentliche API, ein bezahltes Abo oder ein proprietärer Vertrag allein reicht nicht zur Admission.

Produktive Admission ist ausschließlich `OPEN_SOURCE_OPEN_DATA_ADMITTED`. Alle geforderten Software-, Dataset-, Provenance-, Use-Case- und Instrument-Gates werden unabhängig geprüft. Fehlende oder unbekannte Rechte führen fail-closed zu `BLOCK`.

## Open-Source-Software / Adapter - dargestellte Kandidaten

- CCXT - MIT - Adapter-Kandidat; Open-Data-Rechte der konkreten Quelle separat erforderlich.
- Hummingbot / Gateway - Apache-2.0 - Adapter-Kandidat; Source-Pin und Datenrechte separat.
- Cryptofeed - AGPL-3.0-or-later plus zusätzliche Attribution im geprüften Stand; Packaging/Copyleft und Datenrechte vor kommerzieller Nutzung separat prüfen.
- OpenBB V5 - Apache-2.0 - Provider-Router; Dataset-Rechte bleiben separat.
- DefiLlama API SDK - MIT - SDK-Lizenz ist kein Nachweis für die Lizenz des API-Datasets.
- NATS Server / JetStream - Apache-2.0 - bestehender Event-/Replay-Layer.
- Valkey - BSD-3-Clause - bestehender Hot-State-/PubSub-Layer.
- DuckDB - MIT - Analytics-/Replay-Kandidat.
- ClickHouse Server - Apache-2.0 - optionaler OLAP-Kandidat; Dokumentation/Assets separat behandeln.
- OpenTelemetry Collector - Apache-2.0.
- Prometheus - Apache-2.0.
- Qdrant - Apache-2.0 - optionaler Research-Retrieval-Layer, keine Market-Fact-Authority.
- OSS Review Toolkit - Apache-2.0.
- ScanCode Toolkit - Apache-2.0.

## Open-Data-Research - dargestellte Kandidaten

Kein Eintrag dieser Liste ist allein durch die Recherche produktiv zugelassen.

- World Bank Global Economic Monitor - CC BY 4.0; FX/Indices/Makro, keine Einzelaktien-Livequotes.
- World Bank Commodity Prices - CC BY 4.0; Historie/Projektionen, kein Realtime-Venue-Feed.
- Wikidata - CC0 1.0; Referenz-/Entitätsmetadaten, keine Marktpreise.
- SEC EDGAR Reference Data - US-Government-Reuse; TRUST-Klassifizierung gegen Policy-Allowlist offen.
- U.S. EIA - Public-Domain-/Reuse-Pfad; TRUST-Klassifizierung offen.
- ECB/ESCB Statistics - Reuse Policy; Dataset- und Drittanbieter-Scope separat prüfen.
- Eurostat - EC-Reuse-Policy; Dataset-Ausnahmen separat prüfen.
- Coin Metrics Community - CC BY-NC 4.0; für kommerziellen MARKET-Pfad blockiert.
- Pyth Website Price Feeds - non-commercial site terms im geprüften Research-Stand; blockiert.
- DefiLlama API Dataset - Dataset-Lizenz im geprüften Stand unverified; blockiert bis Evidence.

## Produktiv blockierte Legacy-Pfade

Gemäß neuer Owner-Policy werden im produktiven MARKET-Datenpfad derzeit blockiert:

`Binance`, `Kraken`, `Twelve Data`, `Polygon`, `Massive`, `FinancialData.Net`, `yfinance/Yahoo`, `CoinGecko`.

Historische Evidence darf für Audit und Research erhalten bleiben. Sie erzeugt keine neue Production Admission.

## Statusgrenze dieser Präsentation

- `admittedSources = 0`
- Produktive Coverage für Crypto, Stocks, Commodities, Forex und Indices: jeweils `0`
- `MARKET_QUOTES_ENABLED = false`, solange keine Source admitted ist
- Keine synthetischen oder erfundenen Live-Kurse als Ersatz
- Public Charts, Social Media, B2B API, Redistribution, Exporte und White Label benötigen jeweils eigene Evidence

## Präsentationslizenz

Originale Deck-Texte, Layouts und selbst erstellte Diagramme: **CC BY 4.0**, Copyright 2026 Sven Kulessa / CAPITAL-AI. Drittanbieter-Software, Namen, Marken, Dokumentation und Daten verbleiben unter ihren jeweiligen Rechten/Lizenzen und werden durch die Präsentationslizenz nicht relicensed.
