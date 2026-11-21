# CAP-BP-001 · Rechte, kanonische Contracts, PIT und Replay — Admission-Evidence

Datum: 2026-11-19. Primary Domain MARKET, impacted TRUST/QUALITY.
Governance: root AGENTS.md, SOLO_MAINTAINER_FLOW@2. Branch baseline: main@17add5a50247b09318309d192cd429bd3414ea8a.
Dieses Dokument ist source-derived technische Evidence, keine Rechte-, Produkt-, Runtime- oder Handelsfreigabe.

## Nachgewiesener Ist-Zustand

| Voraussetzung | Autoritative Fundstelle | Befund | Status |
|---|---|---|---|
| Kanonische Komponentenidentität | src/contracts/analysisComponentRegistry.ts | market_integrity_gate status=blocked, provenanceMode=unavailable, lastValidatedAt=null, calculationVersion=1.2.0 | BLOCKED |
| Input-/Output-Verträge | src/contracts/analysisComponentRegistryValidator.ts | RawTickStreamContract, ExchangeStatusContract und IntegrityStatusContract sind nicht in der auflösbaren produktiven Zod-Contract-Map; CAP_BP_001_INPUT@1 und RESULT@1 sind ausschließlich Demo-Dokumentation | BLOCKED |
| Provider-Rights-Inventar | docs/security/evidence/license-rights-review.json | status REVIEW_OPEN; deployEligible false; Binance und Kraken contractScope unverifiziert; Coinbase kein eigenständig erfasster Providerbeleg im Inventar; TwelveData bedingt, Feed-/Retention-Scope unvollständig | BLOCKED |
| Rights-Entscheidung | src/contracts/marketDataRightsEligibility.ts | Use-case-spezifische Evidence kann internal_analysis, derived_scoring_research und cache_retention prüfen; Datensätze, Vertragskonditionen und unabhängige Herkunft bleiben erforderlich | IMPLEMENTED, AUTHORITY NOT_PROVEN |
| Existing research diagnostics | src/services/marketResearchGateDiagnostics.ts | Prüft L1-Quote, Rechte, canonical provenance, Sequenz-/Timestamp-Aussagen; keine validierte echte Tickfolge, kein live-scoring-Runner | RESEARCH_ONLY |
| PIT-Historie | src/platform/FinanceScoringResearch/FinancePointInTimeAdmission.ts | Commodity-spezifischer PIT-Contract vorhanden, keine CAP-BP-001-Tick-/Exchange-Release-Aufnahme mit authentifiziertem Historien-Nachweis | NOT_PROVEN |
| Immutable Shadow Replay | src/services/shadowPipeline.ts | Hash/Storage/Replay von Offline-Shadow-Snapshots vorhanden, aber keine gebundene reale CAP-BP-001-RawTickStream-/ExchangeStatus-Quelle | NOT_PROVEN |

## Kleinster sicherer zusätzlicher Implementierungspfad

src/contracts/capBp001AdmissionReview.ts fügt ausschließlich eine maschinenlesbare Read-only-Gap-/Candidate-Inspection hinzu:

- CAP_BP_001_ADMISSION_PROBE@1 bindet AssetIdentitySchema, DataProvenanceSchema, MarketDataRightsEvidenceSchema, historischen Entscheidungszeitpunkt, optionale PIT-Availability-Metadaten und ein optionales Digest-Kandidatentoken.
- Die Inspector-Funktion nutzt validateAnalysisComponentRegistry und componentActivationReasons als einzige kanonische Aktivierungsautorität. Unaufgelöste Contracts bleiben ausdrücklich ungelöst und werden namentlich ausgegeben.
- Bestehendes evaluateMarketDataRights wird use-case-spezifisch auf internal_analysis, derived_scoring_research und cache_retention angewandt. Fehlender Feed-Scope, Provider-ID-Mismatch, späte Rechteprüfung, Verfall und offene Obligations ergeben Gründe, keine Freigabe.
- PIT prüft observedAt <= receivedAt <= publishedAt <= decisionAt <= evaluatedAt, latency, 5s-registry-staleness, sourceAvailableAt/retreivedAt. Spätere Veröffentlichungen oder angebliche Releases dürfen nicht rückdatiert werden.
- Ein nur übergebenes releaseReference, rightsEvidenceReference, Hash oder EVD-ID beweist keine unabhängige externe Authentizität. Selbst vollständig formatgültige Eingaben enden in BLOCKED; immutableReplayVerified=false; score/rank/decision/production/publication=false.
- Keine neue Provider-Anbindung, keine Cache-/DB-Mutation, kein Scoring-Runner, kein fremder Secret-Zugriff, keine Product-Delivery, kein OAuth-/Flag-Umschalter.

## Akzeptanz und Test-Evidence

- Testdatei: src/contracts/__tests__/capBp001AdmissionReview.test.ts; Integration in vorhandene analysisFoundation.test.ts. Deterministische Synthetikprüfungen für vollständig formatgültige Kandidaten und Negativtests für Rechte, Cache, Feed, Identities, historische Lookahead/Release-Zeiten, unverified Replay, ungültige Extras/Secrets.
- Lokaler Befehl: node --import tsx --test src/contracts/__tests__/analysisFoundation.test.ts
- Bestehende Gates: npm run lint, npm test (CI Build-Stufe), Docker Security Gate, Domain Governance und aktive GitHub-Rulesets. Die tatsächlichen CI-Run-IDs und Exit-Codes werden im PR dokumentiert, sobald vorhanden.
- Zulässige Report-Zustände: BLOCKED, rightsCandidateConsistent / pitCandidateConsistent nur für syntaktisch/semantisch plausible Angaben; keine der beiden Aussagen ist eine unabhängige Markt-/Rechteprüfung.

## Offene tatsächliche Admission-Abhängigkeiten

1. 👋⚙️ Rechts-/Vertragsbelege und Feed-/Symbol-/Venue-/Retention-/Derived-Use-Scopes der real eingesetzten Provider durch den Berechtigten; technische Registrierung ersetzt keinen Vertrag.
2. Implementierte und getestete provider-neutrale RawTickStreamContract, ExchangeStatusContract und IntegrityStatusContract mit instrument-/zeitbezogenen Schemas; erst dann gezielte Auflösung in der kanonischen Contract-Map ohne vorzeitige Aktivierung.
3. Authentifizierte Point-in-Time-Quelle inklusive historischer Availability, unveränderlicher Raw-Retention und korrespondierender Input-/Output-Hashes mit Write/Readback/Replay-Verifikation für dieselbe Version, Instrumente und Datenrechte.
4. Separater kompletter kanonischer Admission-Nachweis für echte Daten, DQ, Asset-Taxonomie, Scorer-Gates und Runtime-Identity. Die bestehende Registry bleibt bis dahin blocked/unavailable/lastValidatedAt=null.

## Rollback

Revert des isolierten MARKET-Commits/PR: neue Inspector-Datei, Testdatei, analysisFoundation-Testimport und dieses Dokument. Keine produktiven Mutationen oder Provider-Entitlements betroffen.


## 2026-11-21: Provider-neutral PIT candidate contracts (feature branch)

New strict, versioned Zod schemas in `src/contracts/capBp001MarketDataContracts.ts`:
`RawTickStreamContractSchema`, `ExchangeStatusContractSchema` and
`IntegrityStatusContractSchema`. A read-only PIT pair inspector checks
same instrument/venue/provider, ordered timestamps, decision-time availability,
contiguous sequences, crossed books and exchange halts. Negative fixtures are
in `src/contracts/__tests__/capBp001MarketDataContracts.test.ts`, imported
by the existing analysisFoundation CI suite.

**Boundary:** These are offline *candidate* schemas. They are intentionally
NOT added to the live `analysisComponentRegistryValidator` contract resolver.
Schema acceptance, supplied SHA-256-shaped digests and internally consistent
PIT claims cannot establish independent feed authenticity, licensed rights,
immutable storage, retention permissions or a write/readback/replay receipt.
The canonical registry stays blocked/unavailable, and the production contract
references remain unresolved until a separately verified runtime adapter
and authenticated source/archive are available. No provider secrets, new
resources, deployment, data ingestion or customer-facing capability.
