# CAP-BP-001 — Market Integrity Gate · Produktzuordnung

**Blueprint-ID:** `CAP-BP-001` · **Component-ID:** `market_integrity_gate` · **Blueprint-Version:** `1.0.0` · **Status:** `CONCEPT / NOT_PROVEN`.

Der gemeinsame Leistungsumfang aus [SCREENER-COMPONENT-BLUEPRINT-PRODUCT-CONTRACT-V1.md](./SCREENER-COMPONENT-BLUEPRINT-PRODUCT-CONTRACT-V1.md) gilt uneingeschränkt. Dieses Repository-Dokument ist eine **Produktzuordnung und ein konzeptioneller Überblick**, kein Ersatz für die komplette 14-Modul-Fachspezifikation oder eine ausgeführte Komponente.

## Vorgesehener Gegenstand

Das vorgeschaltete Gate kontrolliert Asset-Identität, Datenherkunft, Zeitbezug, Einheiten, Marktstatus und Datenkonsistenz vor der Weitergabe in Feature-/Scorepfade. Ergebnisentwurf: `eligibility` (`ELIGIBLE|BLOCKED|CONDITIONAL|NOT_APPLICABLE`), `integrity_status` (`PASS|WARN|FAIL|UNKNOWN`), `data_status`, nullable diagnostischer `integrity_score`, nullable `confidence`, `reason_codes` und `evidence_reference`. Es ist **kein Alpha-, Rendite- oder Handelsentscheidungsscore**.

## Die 14 Module im Lieferkonzept

| Modul | Soll-Inhalt | Evidence |
| --- | --- | --- |
| 01 Component Identity | Registry-ID, Blueprint-ID, Version, Asset-Scopes | CONCEPT |
| 02 Business Purpose | Pre-Scoring Integrity und Sperrgründe | CONCEPT |
| 03 Data Contracts | AssetIdentity, DataProvenance, MarketFact, MarketStatus, ValidationContext, MarketIntegrityResult | PROPOSED |
| 04 Data Pipeline | Provider-neutral: Raw → Adapter → Normalisierung → PIT-/Provenienzprüfung → Gate → Evidence | PROPOSED |
| 05 Feature Engineering | Spread, Sequence Continuity, Timestamp Jitter und Referenzvalidierungen | PROPOSED |
| 06 Analytical Tools | Semantische Feld-, Kalender-, Einheiten-, Sequenz- und Plausibilitätsprüfungen | PROPOSED |
| 07 Scoring Model | Diagnostischer Integrity Score, darf Veto niemals überstimmen | NOT_VALIDATED |
| 08 Weighting | Fachlich zu begründende Gewichtungen und Normalisierung | NOT_VALIDATED |
| 09 Confidence | Datenstützung statt Gewinnwahrscheinlichkeit; nullable bei fehlender Evidence | NOT_VALIDATED |
| 10 Risk & Gates | Hard-Veto für ungültige Identität, fehlende Pflichtprovenienz und kritische Inkonsistenzen | PROPOSED |
| 11 Evidence | Reason Codes, Version, Replay-/Source-Fingerprint-Konzept | PROPOSED |
| 12 UI | Status, nachvollziehbare Sperrgründe, Demo-Badge und Architekturdiagramm | DESIGNED |
| 13 API | Separate technische DTO-/Zod-Referenzen, keine produktive API-Behauptung | PROPOSED |
| 14 Acceptance Criteria | Positive und negative Tests, Demo-/Live-Trennung, Rechte-/Runtime-Grenzen | DESIGNED |

Alle Formeln, Gewichte und Schwellen gelten als `PROPOSED / NOT_VALIDATED`. Datenlücken nicht durch Defaults auffüllen; `unknown`, `stale`, `conflicting`, `invalid` getrennt behandeln. Synthetic fixtures sind `isDemo=true`, `DEMO`, nicht rank-/actionable-eligible.

## Ist-Abgrenzung aus der kanonischen Registry

`src/contracts/analysisComponentRegistry.ts` führt `market_integrity_gate` als `blocked`, `provenanceMode=unavailable`, `lastValidatedAt=null`. Der bestehende Vertrag referenziert `RawTickStreamContract`, `ExchangeStatusContract` → `IntegrityStatusContract` und die Feature-Namen `bid_ask_spread`, `sequence_continuity`, `timestamp_jitter`. Referenznamen und Provider-Kandidaten sind **kein Nachweis** für angeschlossene Quellen, vollständig implementierte DTOs oder Datenrechte. Blueprint-Version `1.0.0` darf nicht mit der Registry-Calculation-Version `1.2.0` gleichgesetzt werden.

**Kommerzielle Abgrenzung:** Kein separates SKU, Preis, Checkout, Paid Delivery, Provider-Entitlement oder Kundenlizenz wird durch diesen Überblick aktiviert. Keine Vertriebsfreigabe und keine behauptete empirische Modellvalidierung. Vollständige individuelle Fachspezifikation und spätere private Auslieferung müssen separat nachgewiesen werden.
