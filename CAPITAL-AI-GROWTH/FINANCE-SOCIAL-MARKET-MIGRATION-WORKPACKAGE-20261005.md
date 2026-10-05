# Finance → Capital-AI: Social-Media-Engine + MARKET/Data Migration

**Work Package:** `CAPITAL-AI-FINANCE-SOCIAL-MARKET-MIGRATION-01`  
**Stand:** 2026-10-05  
**Primary Domain:** `GROWTH`  
**Cross-Domains:** `MARKET · PLATFORM · TRUST · PRODUCT`  
**Source:** `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`  
**Target baseline:** `SvenKulessa/Capital-AI@9c5fc40318cf538308724c2efb18441185e8cbae`  
**Status:** `PLANNED / MIGRATION CONTRACT MATERIALIZED`

## Ziel

Die in Finance vorhandene Social-Media-Engine sowie ausgewählte fortgeschrittene DATA-/MARKET-Komponenten werden kontrolliert nach Capital-AI überführt. Capital-AI bleibt die Ziel-Authority; neuere Zielverträge dürfen durch ältere Finance-Architektur nicht überschrieben werden.

Das Zielprodukt unterstützt zwei strikt getrennte Betriebsarten:

1. **kommerzielles Capital-AI Social Media Engine Produkt** mit ausschließlich kommerziell zulässigen, redistributierbaren oder service-seitig zulässigen Komponenten;
2. **Owner-private Tooling** für Sven Kulessa, das nur außerhalb des Kundenprodukts aktiviert werden darf und nur dann kommerzielle Outputs erzeugen darf, wenn die konkrete Drittanbieter-/Modelllizenz dies ausdrücklich erlaubt.

Eine Non-Commercial-Lizenz wird nicht dadurch kommerziell zulässig, dass nur der Owner den Runtime-Aufruf ausführt.

## Maschinenlesbarer Kern

```yaml
schemaVersion: "CAPITAL_AI_DOMAIN_WORK_PACKAGE@1"
id: "CAPITAL-AI-FINANCE-SOCIAL-MARKET-MIGRATION-01"
domain: "GROWTH"
crossDomains: ["MARKET", "PLATFORM", "TRUST", "PRODUCT"]
scope: "finance-to-capital-ai-migration-and-productization"
priority: "high"

source:
  repository: "SvenKulessa/Finance"
  sha: "dcef421fe6e350a3a2ade61d0299aad9ecca213c"

target:
  repository: "SvenKulessa/Capital-AI"
  baselineSha: "9c5fc40318cf538308724c2efb18441185e8cbae"
  migrationPolicy: "target-main-wins-on-newer-contracts"

licenseModes:
  - "COMMERCIAL_PRODUCT_BUNDLE"
  - "COMMERCIAL_INTERNAL_SERVICE"
  - "OWNER_PRIVATE_COMMERCIAL_ALLOWED"
  - "OWNER_PRIVATE_NONCOMMERCIAL_ONLY"
  - "RESEARCH_ONLY"
  - "BLOCKED_UNKNOWN"

hardRules:
  - "no_noncommercial_component_for_commercial_output"
  - "no_unknown_license_in_customer_runtime"
  - "no_third_party_weights_without_exact_artifact_license"
  - "no_provider_or_data_rights_bypass"
  - "no_copy_of_credentials_tokens_or_user-identities"
  - "no_second_scoring_authority"
  - "no_second_publishing_authority"
  - "no_failed_or_missing_evidence_as_pass"

exit:
  commercialProduct:
    requires:
      - "third_party_notices_complete"
      - "redistribution_or_service_rights_verified"
      - "security_and_supply_chain_pass"
      - "runtime_role_isolation_pass"
      - "commercial_generation_path_contains_no_noncommercial_artifact"
  ownerPrivate:
    requires:
      - "owner_role_verified"
      - "runtime_not_exposed_to_customers"
      - "artifact_license_allows_intended_use"
      - "outputs_not_commercial_if_license_is_noncommercial"
```

## Deep-Scan-Befund: Social Media Engine

Aus Finance werden als primäre Migrationskandidaten behandelt:

- `src/platform/SocialMediaEngine/Contracts/MediaProject.ts` und Validation als providerneutraler Timeline-/Asset-Vertrag;
- Editing-Core und Media-Studio-Templates;
- D3 Planning Visual Adapter für Roadmaps, Dependency-Maps und deterministische Visualisierungen;
- deterministischer Pillow-/FFmpeg-Renderpfad mit `publishReady=false`, Hashmanifesten und lokalen Inputs;
- Voice-/TTS-Verträge, P1-Benchmark- und Evidence-Harness;
- Text-Content-Generation, Approval-, Publication- und Analytics-Verträge;
- Social OAuth/Publisher nur als fachliche Referenz: Auth, Tokenstore und Provider-APIs werden gegen die aktuelle Capital-AI-Authority neu gebunden und nicht blind kopiert.

Nicht als Beweis für Production-Reife gelten historische Dokumentstatus, alte Provider-Versionen oder grüne Quelltexttests ohne reale Runtime-Evidence.

## Deep-Scan-Befund: fortgeschrittene DATA-/MARKET-Inhalte

Finance enthält zusätzliche Bausteine, die Capital-AI nur nach Deduplizierung mit der neueren Shadow-/Replay-/Scoring-Architektur übernehmen soll:

| Finance-Komponente | Zielentscheidung | Capital-AI-Regel |
|---|---|---|
| `ScoringModelRegistry` + `ScoringDispatcher` | **REWRITE / CONVERGE** | nicht parallel zur vorhandenen `ScoringEngineService` und 50er Component Registry betreiben; eine Authority herstellen |
| `ValidatedFinancialFeatureContract` | **PORT/ADAPT** | in bestehende `FeatureValue → PipelineSnapshot`-Kette integrieren; vollständige Provider-/Freshness-/Evidence-Lineage erhalten |
| `UniversalAssetAdapter` | **ADAPT** | gegen bestehende `AssetIdentity` normalisieren; keine zweite Asset-ID-Authority |
| `AnalysisConnectionRegistry` | **PORT AFTER DEDUPE** | nur als Capability-/Evidence-Registry, nicht als paralleler Lifecycle-Owner |
| `PatternResearchEngine` / `PatternSignalResolver` | **PORT RESEARCH-ONLY** | `scoreEligible=false`, `decisionEligible=false`; Multi-Timeframe-Evidence beibehalten |
| `CryptoOrchestratorResearchModels` | **PORT SELECTIVELY** | Sentiment, Momentum, Regime, Pattern-Confluence und Signal-Fusion nur als Research Enrichment |
| `candlestickPatterns.ts` | **PORT** | deterministisch, OHLC-Provenienzpflicht, keine synthetischen Kerzen |
| `marketDataCompatibilityFacade` | **REWRITE OR DROP** | nur falls der aktuelle Market-Data-Rights-/Admission-Pfad nicht geschwächt wird |
| ältere providergebundene/Legacy-Scoring-Pfade | **DROP/SUPERSEDE** | keine Rückkehr zu Fallback-, Direct-Scoring- oder Neutral-Default-Semantik |

## Lizenz- und Produktgrenze

### Kommerzieller Standardpfad

Der Kunden-/Produktbuild darf nur Komponenten enthalten, deren konkrete Version, Artefakte, Modelle, Gewichte, transitive Dependencies und Redistribution-/Service-Rechte verifiziert sind. Drittanbieter bleiben unter ihren eigenen Lizenzen; Capital-AI vergibt keine Rechte weiter, die es selbst nicht besitzt.

### Owner-private Isolation

Nicht redistributierbare oder nicht kommerziell freigegebene Tools dürfen höchstens als **nicht ausgelieferte Adapterdefinition** im Code inventarisiert werden. Binaries, Modelle und Gewichte werden nicht in Kundenimages, npm-/Python-Pakete, Desktop-/Mobile-Bundles oder Downloadartefakte aufgenommen.

```text
Customer/Product Runtime
  └─ COMMERCIAL_PRODUCT_BUNDLE
  └─ COMMERCIAL_INTERNAL_SERVICE

Owner Private Runtime
  └─ OWNER_PRIVATE_COMMERCIAL_ALLOWED
  └─ OWNER_PRIVATE_NONCOMMERCIAL_ONLY
  └─ RESEARCH_ONLY

BLOCKED_UNKNOWN
  └─ darf nirgends generieren
```

**Besonders wichtig:** `OWNER_PRIVATE_NONCOMMERCIAL_ONLY` darf keine Assets für bezahlte Kunden, Produktmarketing, Monetarisierung, Werbung oder sonstige kommerzielle Nutzung erzeugen.

## Sequenzielle Umsetzung

### 00 · Baseline und Inventar
- CURRENT_MAIN + Root-`AGENTS.md` vor jeder Mutation frisch lesen.
- Finance-Dateiinventar für Social, Scoring, MarketData, FinTechCore, Tests und Evidence erzeugen.
- Zieläquivalente in Capital-AI markieren: `PORT / REWRITE / REPLACE / DROP / ALREADY_SUPERSEDED`.
- Keine Secrets, OAuth-Tokens, Supabase-/Auth-Identitäten oder historische Runtime-Credentials migrieren.

### 01 · Tool-Admission und Lizenzengine
- `social-media-tool-admission.yaml` als Source-of-Truth verwenden.
- Code, Modellgewichte, Datensätze, Fonts, Musik, Stockmedien, Encoder und Outputs getrennt bewerten.
- Runtime prüft vor Generierung `intendedUse`, `runtimeAudience`, `commercialIntent` und exakte Artifact-Lizenz.
- UNKNOWN oder fehlende Evidence → fail-closed.

### 02 · Social Core
- `MediaProjectV2`, Validator, Editing-Core, Templates und D3 Planning Visuals portieren.
- Brand-/Design-Token-Quelle auf Capital-AI-Current-Main umstellen.
- `publishReady=false` bleibt Default.
- JSON-/Assetgrößen, Pfade, Remote-URLs und untrusted media strikt begrenzen.

### 03 · Deterministischer Media Renderer
- Pillow/Poppler/FFmpeg-Logik auf Capital-AI portieren, aber FFmpeg-Buildprofil separat zulassen.
- 1:1, 4:5, 16:9, 9:16, Thumbnail, OpenGraph und Short-Video als versionierte RenderRecipes.
- SHA-256 für Inputs, Assets und Outputs; A/V-, Caption-, Safe-Area- und End-of-speech-Prüfung.
- Keine direkte Social-Publikation aus dem Renderer.

### 04 · Voice, ASR und private Tool Partition
- VoiceContract/P1 Evidence-Harness übernehmen.
- kommerziell freigegebene TTS/ASR-Kandidaten separat benchmarken.
- nichtkommerziell lizenzierte Gewichte nur im Owner-private-noncommercial Profil.
- Hörfreigabe + ASR + Zahlen-/Ticker-/Disclaimer-Prüfung; ASR-PASS allein ist kein Voice-PASS.

### 05 · Publishing und Distribution
- Finance-Publisher nicht mit alten Tokenstores übernehmen.
- aktuelle Capital-AI-Auth-/IAM-Authority nutzen.
- persistente Approval-/Job-/Provider-ID-States: QUEUED → UPLOADING → PROVIDER_PROCESSING → PUBLISHED/PARTIAL/FAILED/UNKNOWN.
- idempotente Redelivery; UNKNOWN nie blind erneut posten.
- Provider-API-Versionen, Scopes, App-Reviews und Plattformbedingungen vor Aktivierung frisch verifizieren.

### 06 · MARKET/Data Advanced Migration
- Finance Research-/Scoring-Komponenten gegen Capital-AI `FeatureValue → PipelineSnapshot → Shadow Score → Replay` mappen.
- `ValidatedFinancialFeatureContract` als Evidence-/Freshness-Brücke übernehmen.
- Pattern-/Momentum-/Sentiment-/Regime-/Signal-Fusion nur research-only starten.
- Scoring Registry/Dispatcher nur dann übernehmen, wenn daraus **eine** kanonische Score-Authority entsteht; sonst Funktionen in vorhandene `ScoringEngineService` integrieren.
- keine Datenquelle oder Provider zulassen, deren Software-/Datenrechte nicht Production-admitted sind.

### 07 · Social × MARKET ContentFact
- Social Content darf Marktwerte nur aus admitted, freshness-validen Evidence-Snapshots lesen.
- ContentFact bindet `assetId`, Observation-Zeit, Provider-/Rights-Evidence, Score-Version, scoreEligible/decisionEligible und Disclaimer.
- keine Live-/Realtime-/Score-Claims aus Research-, Demo-, stale-, partial- oder nicht rechtengeklärten Daten.
- generierte Charts müssen exakt denselben Zahlen-/Provenienzsnapshot wie die Website konsumieren.

### 08 · Produktisierung und lizenzierte Dokumentation
- Capital-AI-eigene Social-Engine-Dokumentation unter proprietärer Capital-AI-Produktlizenz pflegen.
- Third-Party-Notices, SPDX/LicenseRefs, Versionen, Hashes und Obligations mitliefern.
- Kunden erhalten nur Rechte am Capital-AI-Produktumfang gemäß Vertrag; Drittanbieterrechte bleiben separat.
- Feature-Matrix kennzeichnet: bundled, server-side service, BYOK, owner-private, unavailable.
- Export/SDK darf keine Owner-private Tools oder Gewichte enthalten.

### 09 · Validation und Cutover
- Unit, Integration, negative license tests, asset-provenance tests, replay/determinism tests.
- Security-/Supply-Chain-Scan und exact-head Evidence.
- Commercial build muss beweisen, dass keine `OWNER_PRIVATE_NONCOMMERCIAL_ONLY`-Artefakte enthalten sind.
- Finance erst nach erfolgreichem Cutover als Runtime-Quelle deaktivieren; Audit-/Provenance-Historie bleibt erhalten.

## Tool-Advisory: initiale Einordnung

- **D3**: kommerziell grundsätzlich permissiv; exact version/NOTICE im Build prüfen.
- **Pillow/Poppler/FFmpeg**: verwendbar, aber FFmpeg-Lizenz hängt vom konkreten Build/Codecprofil ab.
- **ComfyUI**: GPL-3.0; kommerzielle Nutzung möglich, Distribution/Integration hat Copyleft-Pflichten. Nur isoliert nach Legal-/Packaging-Review.
- **MoneyPrinterTurbo**: MIT-Core als Referenz/isolierter Adapter; transitive Provider-/Stock-/TTS-Dienste separat.
- **Qwen3-TTS**: Codefläche Apache-2.0; exakte Modellgewichte/Artefakte vor kommerzieller Nutzung separat pinnen und prüfen.
- **Chatterbox**: MIT-Code; exakte Checkpoints/Transitives weiterhin artifact-basiert prüfen.
- **F5-TTS**: Code MIT, offizielle vortrainierte Gewichte CC-BY-NC; deshalb keine kommerzielle Generierung mit diesen Gewichten.
- **MuseTalk**: Upstream beschreibt Code und trainiertes Modell als kommerziell nutzbar; Testdaten sind non-commercial und dürfen nicht in Produktdaten übernommen werden.
- **Wan2.2**: Upstream-Modellrepo Apache-2.0; Dependencies/Modelvarianten trotzdem exakt inventarisieren.
- **Remotion**: Sonderlizenz; nicht als redistributierbarer Kern der verkauften Engine behandeln. Interne Nutzung nur nach aktueller Entity-/Use-Case-Prüfung.

## Exit-Evidence

```yaml
validation:
  required:
    - "source_to_target_file_manifest"
    - "license_and_rights_matrix"
    - "third_party_notices"
    - "commercial_build_dependency_inventory"
    - "owner_private_runtime_isolation_test"
    - "media_determinism_and_hash_test"
    - "market_data_rights_and_freshness_test"
    - "shadow_replay_regression"
    - "scoring_authority_singleton_test"
    - "publishing_idempotency_and_unknown_state_test"
    - "security_supply_chain_scan"
    - "exact_head_correlation"

approval:
  required:
    - "TRUST license/security evidence"
    - "MARKET data/claim-rights evidence"
    - "PRODUCT customer-boundary review"
    - "PLATFORM runtime/worker isolation evidence"
    - "Human Owner merge"
```

## Nicht zulässig

- Non-Commercial-Modell für kommerziellen Output verwenden.
- Drittanbietergewichte in das verkaufte Produkt kopieren, wenn Redistribution nicht belegt ist.
- GPL/AGPL-Komponenten still in proprietäre Bundles integrieren.
- Finance-Provider-/Scoring-Legacy über neuere Capital-AI-Gates legen.
- OAuth-/Auth-Identitäten oder Tokens migrieren.
- fehlende/failed Evidence als geschlossen oder PASS markieren.
