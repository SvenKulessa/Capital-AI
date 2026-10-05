# CAPITAL-AI — Enterprise Market Intelligence Part 2 Migration

Status: **SHADOW / NON-AUTHORIZING**  
Primary Domain: **MARKET**  
Base: `main@8045c78956e163af3011ed47f734184aca14aa04`  
Branch: `capital-ai-market/enterprise-pipeline-part2-20261005`

## Ziel

PART 2 erweitert die bereits vorhandene kanonische Market-Intelligence-Basis additiv. Bestehende produktive Daten-, Provider-, Scoring- oder Delivery-Pfade werden nicht ersetzt. Shadow-Ergebnisse bleiben nicht publizierbar und können weder Ranking noch Alerts oder Production-Activation autorisieren.

## Bereits vorhandene kanonische Basis

- `src/contracts/canonicalContracts.ts`: AssetIdentity, DataProvenance, FeatureValue, ScoreResult, FinalRankResult.
- `src/services/providerAdapters.ts`: provider-neutrale Adaptergrenze mit Open-Source/Open-Data Admission.
- `src/services/featureStore.ts`: Feature-Store-Interface und immutable Shadow-Snapshots.
- `src/services/componentRunner.ts`: Runner-Vertrag für die registrierten 50 Komponenten.
- `src/contracts/pipelineExecution.ts`: acht Pipeline-Stages, versionierte Shadow-Konfiguration und Snapshot-Vertrag.
- `src/services/scoringEngine.ts`: hard eligibility, confidence, sechs Score-Familien und sechs Risk-Familien.
- `src/services/shadowPipeline.ts`: deterministische Offline-Ausführung, content-addressed Evidence und Replay.
- `src/config/shadowScoreConfig.ts`: versioniertes, nicht produktionsautorisierendes Score-Profil.

## Additive Änderungen dieses Branches

1. Plausibility-Validation vollständig fail-closed erweitern:
   - keine Future-Timestamps,
   - keine stale/delayed/demo Daten als LIVE,
   - Currency/Unit/Bounds prüfen,
   - Category-Count-Konsistenz prüfen,
   - keine unbelegte Kausalitäts-/Gewissheits-/Empfehlungssprache,
   - institutionelle Counterparty nur mit Provenance,
   - On-Chain-Inferenz nur mit Chain, Transaction, Wallet-Label-Confidence und Zeitstempel,
   - Dark-Pool nur mit Provider, Scope, Delay und Methodik,
   - Latency-Claims nur mit gemessener Telemetrie.
2. Die zehn geforderten Pipeline-Configurator-Views als maschinenlesbaren Contract registrieren.
3. Production-Activation als read-only Assessment modellieren. Ohne MARKET, TRUST, PLATFORM, Runtime-Evidence und Owner jeweils `PASS` plus Evidence bleibt die Bewertung fail-closed.
4. Regressionstests ausschließlich mit explizit nicht-produktiven Test-Fixtures ergänzen.

## Migration

### Phase A — Shadow Baseline

- Nur bestehende Shadow-Konfiguration verwenden.
- Provider-Registry bleibt production-seitig leer, solange Open-Source/Open-Data Admission fehlt.
- Keine `active`-Promotion der 50 Komponenten ohne Contract-, Provider-, Feature-, Rights- und Evidence-Nachweis.
- Kein Output aus Shadow darf über Market Cards, Screener, Alerts oder API als Live-Ranking publiziert werden.

### Phase B — Evidence-backed Provider Admission

Je Provider und Dataset separat:

1. Software-/Data-License und Nutzungsrechte belegen.
2. exakte Dataset/Symbol/Venue-Scope erfassen.
3. Staleness, Delay, Telemetry und Raw-Input-Reference nachweisen.
4. Shadow-Run und Replay auf identischer Evidence erfolgreich ausführen.
5. Provider-Vergleich und Disagreement-Policy validieren.

### Phase C — Component Admission

Je Komponente:

1. alle Input-/Output-Contracts auflösen,
2. benötigte Features real berechnen,
3. Quality/Freshness/Agreement gegen Policy validieren,
4. Reason-Codes und Risk-Gates testen,
5. deterministischen Replay-Nachweis erbringen.

Komponenten werden einzeln zugelassen; eine Registry-Eintragung allein ist keine Production-Freigabe.

### Phase D — Production Activation

Production-Aktivierung ist außerhalb dieses Branches. Vor einer Aktivierung müssen mindestens folgende Perspektiven mit konkreter Evidence `PASS` sein:

- MARKET
- TRUST
- PLATFORM
- Runtime Evidence
- Owner

Der Activation-Assessment-Contract führt keine Mutation, keinen Deploy und keine Provider-Aktivierung aus.

## Rollback

Der Branch ist strukturell reversibel:

- Plausibility-Erweiterungen sind auf einen Validator und zugehörige Tests begrenzt.
- Configurator-Erweiterungen sind additive Exporte und eine read-only Bewertungsmethode.
- Keine Datenmigration, keine Schema-Mutation in Supabase/PostgreSQL, kein NATS-Subject-Change und kein Runtime-Flag werden vorgenommen.
- Rollback kann durch Revert der Branch-Commits erfolgen; gespeicherte Production-Daten oder externe Ressourcen werden nicht verändert.

## Nicht als Evidence zulässig

- Demo-, Seed-, Mock- oder Testwerte,
- ungeprüfte Provider-Namen oder historische Registry-Einträge,
- synthetische Score-/Confidence-Werte,
- selbst behauptete Lizenz- oder Redistribution-Rechte,
- Latenzwerte ohne gemessene Telemetrie,
- institutionelle/on-chain/dark-pool Aussagen ohne die geforderte Provenance.

## Release-Zustand

PART 2 ist nach Merge weiterhin **SHADOW / NON-AUTHORIZING**, bis reale Provider-/Instrument-Admission, produktive Component-Implementierungen, Runtime-Evidence und alle Production-Gates nachgewiesen sind.
