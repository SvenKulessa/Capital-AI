\# CAPITAL-AI State of the Art Enterprise Screening Architecture

\## Dokument-ID ARCH-SCREEN-0002

\## Version 1.0.0

\## Status Zielarchitektur-Blueprint â¬- basierend auf ARCH-SCREEN-0001 (Bestandsaufnahme + Erweiterung)

\## Bezug Baut auf `ENTERPRISE_SCREENING_SCORING_MASTER_ARCHITECTURE.md` (ARCH-SCREEN-0001) auf. Der Bestandsreport ist die Grundlage, dieses Dokument definiert die Zielarchitektur mit tieferen Schichten, Subcategory-Evaluation-Tools und Integrationsstrategie.

- \---

\## 1. VOLLSTÃ„NDIGKEITSPRÃœFUNG DES GRUNDLAGENREPORTS

Der Report ARCH-SCREEN-0001 wurde gegen alle Pflichtabschnitte des Master-Prompts geprÃ¼ft:

| Master-Prompt-Abschnitt | Report-Abschnitt | Status | |---|---|---| | 0. Erfassung (15 Schritte) | 0.2â¬10.16 + 0.20 Rohinventar | VollstÃ¤ndig | | 0.17 Zusammenfassung | 0.17 | VollstÃ¤ndig | | 0.18 Bewertungsrahmen | 0.18 (27 Komponenten bewertet) | VollstÃ¤ndig | | 0.19 QualitÃ¤tskriterien | 0.19 | VollstÃ¤ndig | | 1. Executive Summary | Header/Status-Zeile | Indirekt â¬- wird hier in Abschnitt 2 kompensiert | | 2. Gesamtarchitektur | verteilt Ã¼ber Abschnitt 3 | Indirekt â¬- wird hier in Abschnitt 4 kompensiert | | 3. Komponentenregister | Abschnitt 3 (12 Komponenten) | VollstÃ¤ndig | | 4. Universal Asset Interface | Abschnitt 4 + Mapping-Tabelle | VollstÃ¤ndig | | 5. Assetklassen-Tiefenstruktur (8 Klassen) | 5.1â¬–5.8 je mit 0â¬–8 Sub-Abschnitten | VollstÃ¤ndig | | 6. Scoring und Ranking | 6.1â¬–6.6 | VollstÃ¤ndig | | 7. DatenqualitÃ¤t und Confidence | 7.1â¬27.4 | VollstÃ¤ndig | | 8. Dependency-Inventar | Abschnitt 8 | VollstÃ¤ndig (Version-Spalte fehlt formal) | | 9. Erweiterungs-Playbook | 9.1â¬99.3 | VollstÃ¤ndig | | 10. Compliance und Audit | 10.1â¬‒10.3 | VollstÃ¤ndig | | 11. Backlog und Roadmap | Abschnitt 11 (13 Backlog-Items) | VollstÃ¤ndig | | 12. Ausgabeformat | Markdown + JSON + YAML | VollstÃ¤ndig | | 13. Arbeitsweise (10 Schritte) | Alle 10 Schritte durchgefÃ¼hrt | VollstÃ¤ndig |

Formale RestlÃ¼cken (nicht blockierend): - Executive Summary und Gesamtarchitektur als eigenstÃ¤ndige Abschnitte fehlen â¬
 werden hier in Abschnitt 2 und 4 nachgeliefert. - Dependency-Inventar hat keine `Version`-Spalte â¬- wird hier in Abschnitt 9 ergÃ¤nzt. - Dokumentationsinventar (Schritt 14) fasst 94 Dateien aggregiert zusammen â¬— akzeptabel, da die zentralen Selbstaudits mit Scores einzeln zitiert sind.

**Fazit**: Der Report ist fachlich ausreichend als Grundlage fÃ¼r dieses Architektur- Blueprint.

- \---

\## 2. EXECUTIVE SUMMARY

CAPITAL-AI benÃ¶tigt eine entkoppelte Enterprise-Screening-Architektur, die alle Assetklassen (Krypto, Aktien, Forex, Indizes, Bonds, Rohstoffe, ETFs, Derivate) mit tiefen Subklassen-Modellen und eigenstÃ¤ndigen Bewertungstools abdeckt. Die bestehende Produktivumgebung (v0.6.0) verfÃ¼gt Ã¼ber 4 isolierte Scoring-Engines (Krypto Base/DeFi, Krypto Enterprise 9-Faktor, Meme-Coin, Rohstoffe) mit inkonsistenten DatenqualitÃ¤tsmodellen, fehlendem Master-Supervisor und keinen Modellen fÃ¼r 6 von 8 Assetklassen.


Dieses Blueprint definiert eine **9-Schicht-Architektur** (Data Ingestion â†’ Normalization â†’ Classification â†’ Factor Tools â†’ Scoring â†’ Valuation â†’ Ranking â†’ Audit â†’ Reporting) mit **40+ Subcategory Evaluation Tools**, einem **Model Registry** fÃ¼r versionierte Scoring-Modelle, einem **Adapter-Layer** fÃ¼r die Produktivumgebung und einer **4-Phasen-Integrationsstrategie** (Adapter â†’ Shadow Mode â†’ Parallel Ranking â†’ Produktivumschaltung).

Die Architektur ist framework-unabhÃ¤ngig (keine festen TypeScript/Node-AbhÃ¤ngigkeiten), Ã¼ber YAML/JSON konfigurierbar, vollstÃ¤ndig auditierbar und BaFin-konform.

\---

\## 3. ARCHITEKTURPRINZIPIEN

1. **Produktiv-Entkopplung**: Die Zielarchitektur existiert unabhÃ¤ngig von der Produktivumgebung. Verbindung ausschlieÃŸlich Ã¼ber Adapter-Layer. 2. **Layer-Trennung**: Jede Schicht hat definierte Eingaben, Ausgaben und Contracts. Keine Cross-Layer-Aufrufe auÃŸer Ã¼ber den Supervisor. 3. **Subclass-Tools**: Jede Unterkategorie einer Assetklasse hat eigene Bewertungstools mit spezifischen Metriken, Formeln und Datenquellen. 4. **Model Registry**: Alle Scoring-Modelle sind in einer zentralen Registry registriert, versioniert und Ã¼ber YAML konfigurierbar. 5. **Shadow-First**: Neue Modelle laufen erst im Shadow Mode parallel zur Produktion, bevor sie aktiviert werden. 6. **Audit-Everywhere**: Jede Berechnung erzeugt einen Audit-Trail mit Input-Snapshot, Formelversion, Gewichtungen und Zwischenergebnissen. 7. **Confidence-Gated**: Kein Score ohne Confidence-Wert und DataQualityScore. Ranking- Zulassung ist an Schwellenwerte gekoppelt. 8. **Event-Driven**: Alle Schichten kommunizieren Ã¼ber Events (data.validated â†’ score.approved â†’ report.completed).

\---

\## 4. GESAMTARCHITEKTUR â¬– 9-SCHICHT-MODELL

``` â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”

â”‚

LAYER 9: REPORTING

â”‚

LAYER REPORTING

â”‚ Markdown Reports Â· JSON Summaries Â· Roadmap Â· QA Â· Dashboards â”‚ â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤

â”‚

LAYER 8: AUDIT & GOVERNANCE

â”‚

LAYER AUDIT GOVERNANCE

â”‚ Audit Trail Â· Formula Trace Â· Model Version Â· Compliance Scanner â”‚ â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤

â”‚

LAYER 7: RANKING

â”‚

LAYER RANKING

â”‚ RankScore Â· Eligibility Filter Â· Top-N Modes Â· Tie-Breaking

â”‚

â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤

â”‚

LAYER 6: VALUATION

â”‚

LAYER VALUATION

â”‚ Value Corridor Â· FairValueGap Â· Model-Specific Multipliers

â”‚

â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤

â”‚

LAYER 5: SCORING

â”‚

LAYER SCORING

â”‚ Model Registry Â· Weighted Scoring Â· Risk Adjustment

â”‚

â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤

â”‚

LAYER 4: FACTOR TOOLS

â”‚

LAYER IN FACTOR TOOLS

â”‚ Subcategory Evaluation Tools (40+ Tools, je Asset-Subklasse)

â”‚

â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


```
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ LAYER 3: CLASSIFICATION â”‚
â”‚ Asset Class Â· Category Â· Subcategory Â· Asset Type Â· Tier â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ LAYER 2: NORMALIZATION â”‚
â”‚ Clamp Â· Log-Scale Â· Percentile Â· ZScore Â· Inversion Â· Renormalize â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ LAYER 1: DATA INGESTION â”‚
â”‚ REST APIs Â· WebSockets Â· On-Chain Â· Database Â· Cache Â· Fallback â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ADAPTER LAYER (zur Produktivumgebung) â”‚
â”‚ CryptoAdapter Â· EquityAdapter Â· ForexAdapter Â· CommodityAdapter â”‚
â”‚ Â· BondAdapter Â· IndexAdapter Â· ETFAdapter Â· DerivativeAdapter â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â†• â†• â†•
Produktivumgebung Model Registry Config Store (YAML/JSON)
```

```

## \### 4.1 Schicht-VertrÃ¤ge

Jede Schicht hat einen definierten Eingabe- und Ausgabe-Contract:

```
| Schicht | Eingabe | Ausgabe | Contract |
|---|---|---|---|
| 1 Data Ingestion | Source-Config (YAML) | RawMarketData | `RawDataContract` |
| 2 Normalization | RawMarketData | NormalizedMetric (0-100) | `NormalizedMetricContract`
|
| 3 Classification | Symbol/ISIN + NormalizedMetrics | ClassificationResult |
`ClassificationContract` |
| 4 Factor Tools | ClassificationResult + NormalizedMetrics | FactorScore (0-100) |
`FactorToolContract` |
| 5 Scoring | FactorScores + ModelConfig | ScoringResult | `ScoringContract` |
| 6 Valuation | ScoringResult + ReferenceValue | ValuationCorridor | `ValuationContract` |
| 7 Ranking | ScoringResult + ValuationCorridor + DQ | RankingResult | `RankingContract` |
| 8 Audit | Alle Schichten | AuditTrail | `AuditContract` |
| 9 Reporting | RankingResult + AuditTrail | Report | `ReportContract` |
```

\---

\## 5. CORE MODULE

\### 5.1 Master Supervisor

Der Master Supervisor ist der zentrale Orchestrator. Er koordiniert alle Analysepfade, wÃ¤hlt Modelle aus, lÃ¶st Konflikte und stellt Auditierbarkeit sicher.

**Entscheidungs-Pipeline:**

```

- 1. Receive(asset_id, symbol) â†’ trigger Classification

- 2. Classification â†’ asset_class, category_main, category_sub, tier

- 3. Model Selection â†’ model_registry[asset_class][category_sub] ?? model_registry[asset_class].default

- 4. Factor Tool Execution â†’ parallel execution of all applicable subclass tools

- 5. Data Quality Assessment â†’ DQScore, Confidence

- 6. Scoring â†’ weighted aggregation per selected model

- 7. Valuation â†’ value corridor computation

- 8. Ranking â†’ rankScore, eligibility

- 9. Audit â†’ append trail at every step

- 10. Return Universal Asset Interface object ```

Ã


```
**KonfliktlÃ¶sungsregeln:**
1. DatenqualitÃ¤t > Confidence > Tiering (PrioritÃ¤t bei widersprÃ¼chlichen Agent-Outputs)
2. Bei Confidence < 0.65: Score wird berechnet, aber `ranking_eligibility.eligible =
false`
3. Bei DataQuality = 'low': Score wird berechnet, aber mit `risk_flags:
["low_data_quality"]` markiert
4. Bei Modell-Konflikt (zwei Modelle liefern stark abweichende Scores > 20 Punkte): beide
Scores im Audit-Trail, Supervisor wÃ¤hlt das Modell mit hÃ¶herer Confidence
**Schnittstelle:**
```typescript
interface MasterSupervisor {
analyze(asset: AssetRequest): Promise<UniversalAssetInterface>;
batchAnalyze(assets: AssetRequest[]): Promise<UniversalAssetInterface[]>;
getTopN(mode: TopNMode, n: number): Promise<UniversalAssetInterface[]>;
shadowCompare(asset: AssetRequest): Promise<{ production: any; enterprise: any; delta:
number }>;
}
```
### 5.2 Model Registry
Zentrale Registry fÃ¼r alle Scoring-Modelle, versioniert und Ã¼ber YAML konfigurierbar.
```yaml
# model_registry.yaml
version: "2.0.0"
models:
crypto:
default: "crypto-base-1.1.0"
registry:
crypto-base-1.1.0:
asset_types: ["coin", "token"]
categories: ["Layer 1", "Layer 2", "Infrastructure", "Oracle", "Smart Contract
Platform"]
weights: {marketCap: 0.15, liquidity: 0.13, volatility: 0.10, tokenomics: 0.07,
supplyTransparency: 0.05, networkActivity: 0.12, security: 0.12, utility: 0.09, adoption:
0.07, risk: 0.06, sentiment: 0.04}
inverted: [risk, volatility]
value_corridor: {conservative: 0.85, optimistic: 1.15}
tools: [tokenomics_tool, onchain_quality_tool, security_audit_tool]
crypto-defi-1.1.0:
categories: ["DeFi"]
weights: {liquidity: 0.22, tokenomics: 0.16, marketCap: 0.08, volatility: 0.08,
utility: 0.16, adoption: 0.10, security: 0.12, networkActivity: 0.05, risk: 0.03}
inverted: [risk, volatility]
value_corridor: {conservative: 0.82, optimistic: 1.18}
tools: [defi_cashflow_tool, tvl_quality_tool, governance_strength_tool]
crypto-stablecoin-1.0.0:
categories: ["Stablecoin"]
weights: {compliance: 0.35, reserveQuality: 0.30, supplyTransparency: 0.20,
liquidity: 0.15}
inverted: []
value_corridor: {conservative: 0.95, optimistic: 1.05}
tools: [stablecoin_reserve_tool, compliance_tool]
crypto-meme-1.1.0:
categories: ["Meme"]
weights: {liquidity: 0.30, trendStructure: 0.25, momentum: 0.20,
volatilityQuality: 0.15, rugRisk: 0.10}
inverted: [rugRisk, volatilityQuality]
value_corridor: {conservative: 0.70, optimistic: 1.30}
tools: [meme_liquidity_tool, rug_risk_tool, community_velocity_tool]
crypto-rwa-1.0.0:
categories: ["Real World Assets"]
weights: {compliance: 0.30, utility: 0.25, revenue: 0.25, adoption: 0.20}
inverted: []
value_corridor: {conservative: 0.88, optimistic: 1.12}
tools: [rwa_compliance_tool, rwa_revenue_tool]
equity:
```


default: "equity-quality-value-1.0.0" registry:

equity-quality-value-1.0.0: categories: ["Large Cap", "Mid Cap", "Blue Chip", "Value"] weights: {quality: 0.25, value: 0.30, growth: 0.20, momentum: 0.15, risk: 0.10} inverted: [risk] value_corridor: {mode: graham_dcf, conservative: grahamValue, neutral:

"0.8*dcf+0.2*graham", optimistic: "dcf*1.15"}

tools: [quality_value_tool, balance_sheet_stress_tool, graham_margin_tool] equity-growth-momentum-1.0.0: categories: ["Growth", "Small Cap"] weights: {growth: 0.35, momentum: 0.30, analystConsensus: 0.20, risk: 0.15} inverted: [risk] tools: [growth_acceleration_tool, earnings_momentum_tool, analyst_revision_tool] equity-dividend-income-1.0.0: categories: ["Dividend"] weights: {dividendYield: 0.30, payoutSustainability: 0.25, quality: 0.25, risk:

0.20}

inverted: [risk] tools: [dividend_sustainability_tool, payout_ratio_tool] equity-distressed-recovery-1.0.0: categories: ["Penny Stock", "Micro Cap"] weights: {recoveryPotential: 0.40, risk: 0.30, value: 0.30} inverted: [risk] tools: [distress_scanner_tool, recovery_signal_tool]

forex:

default: "forex-macro-carry-1.0.0" registry:

forex-macro-carry-1.0.0: categories: ["G10 Majors", "G10 Crosses", "Emerging Market Currencies", "Carry

Currencies", "Safe Haven Currencies"]

weights: {carry: 0.30, macroMomentum: 0.25, volRegime: 0.20, intermarketCorr:

0.15, risk: 0.10}

inverted: [risk] value_corridor: {band_pct: 10} tools: [carry_score_tool, macro_divergence_tool, central_bank_policy_tool,

safe_haven_flow_tool] index:

default: "index-breadth-regime-1.0.0" registry:

index-breadth-regime-1.0.0: categories: ["Broad Market", "Sector", "Strategy", "Volatility", "Thematic"] weights: {breadth: 0.30, trendStrength: 0.25, volatility: 0.20, flow: 0.15,

sentiment: 0.10}

inverted: [volatility] value_corridor: {band_pct: 12} tools: [breadth_tool, sector_rotation_tool, concentration_risk_tool,

volatility_regime_tool] bond:

default: "bond-credit-duration-1.0.0" registry:

bond-credit-duration-1.0.0: categories: ["Government", "Corporate Investment Grade", "Corporate High Yield",

"Municipal", "Inflation-Linked", "Emerging Market Sovereign"]

weights: {defaultRisk: 0.25, spreadAttractiveness: 0.25, durationRisk: 0.20,

rating: 0.15, liquidity: 0.15}

inverted: [durationRisk] value_corridor: mode: yield_band band_pct: 5 tools: [duration_convexity_tool, credit_spread_tool, rating_migration_tool,

sovereign_risk_tool] commodity:

default: "raw-materials-0.6.0" registry:

raw-materials-0.6.0: categories: ["Metal", "Energy", "Agriculture", "Industrial", "Recycling"] weights: {fundamentals: 0.35, risk: 0.20, liquidity: 0.15, processing: 0.20,

strategicValue: 0.10}


```
inverted: [risk] tools: [supply_demand_tool, inventory_seasonality_tool, cost_curve_tool,
geopolitical_supply_risk_tool] etf:
default: "etf-quality-1.0.0" registry:
etf-quality-1.0.0: categories: ["Index-ETF", "Active ETF", "Smart Beta", "Thematic",
"Leveraged/Inverse", "Commodity-ETC"]
weights: {trackingError: 0.25, expenseRatio: 0.20, aum: 0.20, liquidity: 0.20,
concentration: 0.15}
inverted: [expenseRatio, concentration] value_corridor: mode: nav_premium_band band_pct: 3 tools: [tracking_error_tool, holdings_quality_tool, nav_premium_discount_tool,
fee_efficiency_tool] derivative: default: "derivatives-structure-1.0.0" registry:
derivatives-structure-1.0.0: categories: ["Index Futures", "Commodity Futures", "Crypto Futures", "Options",
"Swaps"]
weights: {curve: 0.30, openInterest: 0.25, fundingRate: 0.20, skew: 0.15,
gammaRisk: 0.10}
inverted: [gammaRisk] value_corridor: mode: basis_band band_pct: 8 tools: [futures_curve_tool, funding_oi_tool, volatility_skew_tool,
gamma_exposure_tool]
```
### 5.3 Taxonomy Registry
Zentrale Registrierung der kanonischen Asset-Klassifikation. LÃ¶st das Problem der 3 inkonsistenten `CryptoClassification`-Typen aus der Produktivumgebung.
```typescript interface TaxonomyRegistry { resolve(symbol: string, hints?: ClassificationHints): ClassificationResult; getCanonicalAssetClass(legacyType: string): string; getSubcategory(assetClass: string, symbol: string): string; registerAlias(legacyType: string, canonical: ClassificationResult): void; // Legacy Types: 'layer1', 'defi', 'meme' â†’ canonical 'crypto/Layer 1', 'crypto/DeFi', 'crypto/Meme' }
```
Migration der 3 bestehenden CryptoClassification-Typen: | Quelle | Legacy-Type | Canonical Mapping | |---|---|---| | cryptoOrchestrator.ts | `CryptoClassification` (enum) | `crypto/{category_main}` | | scoring.service.ts | `asset_type` (string) | `crypto/{category_main}` | | cryptoRankingService.ts | `tier` (1/2/3) | `crypto/tier_{1|2|3}` (Metadaten, nicht taxonomisch) |
### 5.4 Market Integrity Layer
Eigene Komponente fÃ¼r Manipulationsschutz â¬- schlieÃxt die zentrale LÃ¼cke aus ARCH-
SCREEN-0001 (VWAP/Outlier nicht gefunden).
```typescript
interface MarketIntegrityLayer {
checkVWAPDeviation(symbol: string, price: number, vwap: number): IntegrityFlag;
checkMultiExchangeSpread(symbol: string, exchanges: ExchangePrice[]): IntegrityFlag;
checkWashTradingRisk(symbol: string, volumeProfile: VolumeProfile): IntegrityFlag;
checkVolumePriceOutlier(symbol: string, history: PriceVolume[]): IntegrityFlag;
checkLiquidityCliff(symbol: string, orderBook: OrderBookSnapshot): IntegrityFlag;
```


```
checkRugHoneypotRisk(symbol: string, contractData: ContractData): IntegrityFlag;
computeIntegrityScore(flags: IntegrityFlag[]): number; // 0-100, higher = cleaner
}
```
| PrÃ¼fung | Formel | Risk Flag |
|---|---|---|
| VWAP-Abweichung | `deviation = abs(price - vwap) / vwap * 100`; flag if > 5% |
`vwap_deviation` |
| Multi-Exchange-Spread | `spread = max(price_i) - min(price_i)` across exchanges; flag if
> 2% | `exchange_spread_anomaly` |
| Wash-Trading-Risk | Volume-to-trade-count ratio vs. historical baseline; flag if > 3Ïƒ |
`wash_trading_suspected` |
| Volume/Price-Outlier | zScore of current return vs. 30d distribution; flag if |z| > 3 |
`price_outlier` |
| Liquidity-Cliff | Order book depth drop > 50% in top 5 levels |
`liquidity_cliff_warning` |
| Rug/Honeypot-Risk | Contract has hidden mint/ban functions or liquidity not locked |
`honeypot_suspected`, `rug_risk` |
Integrity Score flow: `integrityScore < 50 â†’ risk_flags.push('market_integrity_failed')
â†’ confidence_penalty = 0.5`
### 5.5 Asset Engine Registry
Jede Assetklasse hat eine eigene Engine, die als Modul unabhÃ¤ngig geladen, getestet und versioniert werden kann.
```typescript
interface AssetClassEngine {
readonly assetClass: string;
readonly version: string;
classify(input: ClassificationInput): Promise<ClassificationResult>;
selectModel(classification: ClassificationResult): string;
executeTools(classification: ClassificationResult, metrics: NormalizedMetric[]):
Promise<FactorScore[]>;
score(factorScores: FactorScore[], modelId: string): Promise<ScoringResult>;
value(scoringResult: ScoringResult, referenceValue?: number):
Promise<ValuationCorridor>;
getRequiredDataSources(classification: ClassificationResult): DataSource[];
}
```
### 5.6 Data Quality Agent
Vereinheitlichtes Modell (ersetzt die 3 inkonsistenten Ad-hoc-Formeln aus der Produktivumgebung):
```
DataQualityScore = 0.25Â·sourceCoverage + 0.25Â·freshness + 0.20Â·supplyTransparency
+ 0.15Â·exchangeBreadth + 0.15Â·outlierStability
```
| Faktor | Berechnung | Skala |
|---|---|---|
| sourceCoverage | real angebundene Pflichtmetriken / gesamt | 0-1 â†’ 0-100 |
| freshness | clamp(100 - freshness_min/maxAcceptableÂ·100) | 0-100 |
| supplyTransparency | Datenoffenlegungsgrad (100/50/0) | 0-100 |
| exchangeBreadth | Anzahl Ã¼bereinstimmender Quellen / max Quellen | 0-100 |
| outlierStability | 100 - zScore-basierte Anomalie-Erkennung | 0-100 |
Level: low (0-39) | medium (40-74) | high (75-100) | unknown
### 5.7 Confidence Model
```
Confidence = baseConfidence Â· dataQualityMultiplier Â· sourceCountMultiplier Â·
freshnessMultiplier
```


```
baseConfidence = classification.confidence (0.60â¬—0.95)
dataQualityMultiplier = {high: 1.0, medium: 0.85, low: 0.6, unknown: 0.4}
sourceCountMultiplier = clamp(0.5 + 0.1Â·sourceCount, 0.5, 1.0)
freshnessMultiplier = clamp(1.0 - freshness_minutes/1440, 0.5, 1.0)
```
```

\### 5.8 Risk Engine

Die Risk Engine sammelt Risikofaktoren aus allen Factor Tools und aggregiert sie:

```
```typescript
interface RiskEngine {
collectRiskFactors(toolOutputs: FactorScore[]): RiskFactor[];
computeAggregateRisk(riskFactors: RiskFactor[]): number; // 0-100, higher = riskier
generateRiskFlags(riskFactors: RiskFactor[]): string[];
// Output: RiskScore (invertiert in Final Score), risk_flags array, per-factor breakdown
}
```
```

## \### 5.9 Backtesting Agent

```
```typescript
interface BacktestingAgent {
recordSnapshot(asset: UniversalAssetInterface, marketPrice: number): void;
evaluateHitRate(horizonDays: number, threshold: number): HitRateReport;
walkForward(modelId: string, startDate: Date, endDate: Date): WalkForwardReport;
detectDrift(modelId: string, windowDays: number): DriftReport;
compareShadowVsProduction(assetId: string): ShadowComparison;
}
```
```

\### 5.10 Compliance Agent

Erweitert die bestehenden 21 Compliance-Scanner um eine neue Kategorie `SCORING`:

```
| Scanner-ID | Name | PrÃ¼fung |
|---|---|---|
| SCORING-01 | Weight Normalization | Gewichtssumme = 1.0 pro Modell |
| SCORING-02 | DataQualityScore Completeness | DQScore fÃ¼r jedes Asset vorhanden |
| SCORING-03 | Audit Trail Presence | audit_trail Array nicht leer |
| SCORING-04 | Model Version Registered | model_used in Model Registry vorhanden |
| SCORING-05 | Confidence Threshold | confidence >= 0.65 fÃ¼r ranking-eligible Assets |
| SCORING-06 | Risk Flags Consistency | risk_flags bei low DQ gesetzt |
| SCORING-07 | Formula Reproducibility | Gleiche Inputs â†’ gleiche Scores bei gleicher
Version |
```

\---

\## 6. CONTRACTS

\### 6.0 Traceability-Matrix: ARCH-SCREEN-0001 â†’ Architekturentscheidungen

```
| Befund aus ARCH-SCREEN-0001 | Architekturentscheidung in diesem Blueprint |
|---|---|
| 4 parallele, isolierte Scoring-Engines | Master Supervisor (5.1) + Model Registry (5.2)
als zentrale Orchestratoren |
| Kein einheitlicher DataQualityScore (3 Ad-hoc-Formeln) | Data Quality Agent (5.6) mit
vereinheitlichter 5-Faktor-Formel |
| Kein Master Supervisor mit AusfÃ¼hrungslogik (nur Dashboard) | Master Supervisor (5.1)
mit vollstÃ¤ndiger Entscheidungs-Pipeline |
| Kein Manipulationsschutz (VWAP/Outlier nicht gefunden) | Market Integrity Layer (5.4)
mit 6 PrÃ¼fungen |
| 3 inkompatible CryptoClassification-Typen | Taxonomy Registry (5.3) mit Legacy-
Migrationstabelle |
| Aktien/Forex/Index/Bonds: nur generische Heuristik | Asset-Class Engines (Abschnitt 7)
mit eigenen Modellen und Tools |
| ETF/Derivate: not_found | ETF Engine (7.7) + Derivative Engine (7.8) mit eigenen
Modellen |
| `renormalizeAndScore()` als robust erkannt | Normalization-Layer (Layer 2) Ã¼bernimmt
```


```
dieses Pattern als Standard |
| Ranking-Formel: `0.70Â·finalScore + 0.15Â·dq + 0.10Â·tier + 0.05Â·liq` | Ranking-Layer
(Layer 7) Ã¼bernimmt Formel, erweitert um Tie-Breaking (6.7) |
| Eligibility: `confidence â‰¥ 0.65 âˆ§ liquidity â‰¥ 50 âˆ§ DQ.level â‰ 'low'` |
Eligibility-Filter in Ranking-Layer Ã¼bernommen, konfigurierbar via Model Config |
| Tiering: hardcoded symbol table | Taxonomy Registry verwaltet Tier als Metadaten, nicht
als Taxonomie |
| 13 Backlog-Items (SCR-001 bis SCR-013) | Alle SCR-Items in Modul-Spezifikationen
eingearbeitet |
### 6.1 Universal Asset Interface (unverÃ¤ndert aus ARCH-SCREEN-0001)
Der harte Vertrag â¬‒ alle Komponenten mÃ¼ssen dieses Interface bedienen.
### 6.2 Scoring Contract (unverÃ¤ndert aus ARCH-SCREEN-0001)
Jedes Asset MUSS folgende Score-Felder liefern: `base_score`, `asset_class_score`,
`category_score`, `risk_adjusted_score`, `confidence_score`, `data_quality_score`,
`rank_score`, `final_enterprise_score`, `score_breakdown`, `explanation_trace`.
### 6.3 Factor Tool Contract
```typescript
interface FactorTool {
readonly toolId: string;
readonly assetClass: string;
readonly subcategory: string;
readonly version: string;
execute(input: ToolInput): Promise<ToolOutput>;
getRequiredMetrics(): string[];
getOptionalMetrics(): string[];
getRequiredDataSources(): string[];
getFallbackBehavior(): FallbackConfig;
}
interface ToolInput {
assetId: string;
symbol: string;
classification: ClassificationResult;
metrics: NormalizedMetric[];
dataQuality: DataQualityResult;
}
interface ToolOutput {
toolId: string;
factorName: string;
factorScore: number; // 0-100
confidence: number; // 0-1
riskFlags: string[];
auditFields: {
inputs: Record<string, any>;
formula: string;
intermediateResults: Record<string, any>;
version: string;
};
explanationTrace: string[];
}
```
### 6.4 Model Config Contract (YAML-Schema)
```yaml
# Jedes Scoring-Modell muss folgende Struktur einhalten:
model_id: string model_id: string # z.B. "crypto-base-1.1.0" z.B. "crypto-base-1.1.0"
version: string version: string # semver semver
asset_class: string # crypto|equity|forex|index|bond|commodity|etf|derivative
categories: [string] # zutreffende Hauptkategorien
weights: weights: # Gewichte, Summe = 1.0 Gewichte, Summe
```


metric: number inverted: [string]

\# Metriken, die invertiert werden (100 - value)

value_corridor:

value_corridor:

\# Wertkorridor-Definition

Wertkorridor-Definition

mode: "score_multiplier" | "yield_band" | "nav_premium_band" | "basis_band" | "graham_dcf" conservative: number | string # Zahl oder Formel-Referenz optimistic: number | string

band_pct: number

\# fÃ¼r Band-Modi

fA%r Band-Modi

band_pct: number

thresholds:

\# Eligibility-Schwellen

Eligibility-Schwellen

thresholds:

min_confidence: number min_liquidity: number max_data_quality: string tools: [string] ```

\# exclusive (z.B. "low" = alles auÃŸer low)

\# zugehÃ¶rige Factor Tool IDs

\### 6.5 Event Contract

```

data.validated â†’ data.rejected â†’ data.needs_review score.approved â†’ score.rejected â†’ score.review_required report.completed â†’ roadmap.completed â†’ workflow.completed

\# Erweitert: model.selected â†’ tools.dispatched â†’ tools.completed risk.assessed â†’ ranking.computed â†’ audit.appended shadow.compared â†’ shadow.divergence_detected

```

\### 6.6 Ranking Modes und Tie-Breaking

**Ranking Modes** (wÃ¤hlbar via `TopNMode`):

| Mode | Beschreibung | SortierschlÃ¼ssel | |---|---|---| | `best_score` | HÃ¶chster Final Enterprise Score | `final_enterprise_score DESC` | | `low_risk` | Bestes Risk-Adjusted Score | `risk_adjusted_score DESC` | | `momentum` | StÃ¤rkster Momentum-Faktor | `score_breakdown.momentum DESC` | | `value_gap` | GrÃ¶ÃŸte Abweichung Score vs. Marktpreis | `valuation_corridor.fair_value_gap DESC` | | `income` | HÃ¶chste Dividend/Yield-Score | `score_breakdown.dividend_yield DESC` | | `shadow_delta` | GrÃ¶ÃŸte Abweichung Enterprise vs. Produktion | `shadow_delta DESC` |

**Tie-Breaking-Reihenfolge** (bei gleichem PrimÃ¤rschlÃ¼ssel):

```

1. rank_score DESC 2. confidence DESC 3. data_quality_score DESC 4. liquidity DESC 5. market_cap DESC 6. symbol ASC (deterministic final tiebreaker)

```

Kein Asset wird durch Zufall bevorzugt â¬‒ alle Tie-Breaker sind deterministisch.

\### 6.7 Adapter Contract

```typescript interface ProductionAdapter { readonly assetClass: string;

// Liest bestehende Service-Outputs aus der Produktivumgebung fetchFromProduction(symbol: string): Promise<ProductionOutput>;

// Mappt Production-Output auf Universal Asset Interface mapToUAI(production: ProductionOutput): Partial<UniversalAssetInterface>;

// FÃ¼hrt Shadow-Vergleich durch shadowCompare(symbol: string): Promise<{production: any; enterprise: any; delta:


```
number}>;
// PrÃ¼ft, ob Adapter aktiviert ist (Feature Flag)
isEnabled(): boolean;
}
```
---
## 7. ASSET-CLASS ENGINES
Jede Assetklasse hat eine eigene Engine. Die Engine kapselt Klassifikation, Tool-Auswahl,
Scoring, Valuation und Ranking-Regeln.
### 7.1 Crypto Engine
**Subklassen und Tools:**
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Layer 1 | crypto-base | tokenomics_tool, onchain_quality_tool, security_audit_tool,
network_activity_tool |
| Layer 2 | crypto-base | tokenomics_tool, onchain_quality_tool, l2_security_tool,
bridge_risk_tool |
| DeFi | crypto-defi | defi_cashflow_tool, tvl_quality_tool, governance_strength_tool,
smart_contract_risk_tool |
| Stablecoin | crypto-stablecoin | stablecoin_reserve_tool, compliance_tool,
redemption_pressure_tool |
| Meme | crypto-meme | meme_liquidity_tool, rug_risk_tool, community_velocity_tool |
| RWA | crypto-rwa | rwa_compliance_tool, rwa_revenue_tool, asset_backing_tool |
| Infrastructure | crypto-base | network_activity_tool, staking_yield_tool,
validator_risk_tool |
| Oracle | crypto-base | oracle_reliability_tool, data_source_diversity_tool |
| Exchange Token | crypto-base | exchange_backing_tool, burn_mechanics_tool,
revenue_share_tool |
| Governance | crypto-base | governance_strength_tool, proposal_participation_tool,
treasury_transparency_tool |
| Privacy | crypto-base | privacy_audit_tool, regulatory_risk_tool |
| Gaming | crypto-base | user_adoption_tool, revenue_per_user_tool, ecosystem_depth_tool |
| AI/Data | crypto-base | compute_utilization_tool, ai_revenue_tool, data_moat_tool |
### 7.2 Equity Engine
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Large Cap / Blue Chip | equity-quality-value | quality_value_tool,
balance_sheet_stress_tool, graham_margin_tool, earnings_sentiment_tool |
| Mid Cap | equity-quality-value | quality_value_tool, growth_acceleration_tool,
acquisition_premium_tool |
| Small Cap | equity-growth-momentum | growth_acceleration_tool, earnings_momentum_tool,
analyst_revision_tool |
| Micro Cap / Penny Stock | equity-distressed-recovery | distress_scanner_tool,
recovery_signal_tool, dilution_risk_tool |
| Growth | equity-growth-momentum | growth_acceleration_tool, earnings_momentum_tool,
revenue_growth_quality_tool, rd_efficiency_tool |
| Value | equity-quality-value | graham_margin_tool, asset_based_valuation_tool,
mean_reversion_tool |
| Dividend | equity-dividend-income | dividend_sustainability_tool, payout_ratio_tool,
dividend_growth_tool, free_cash_flow_coverage_tool |
### 7.3 Forex Engine
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| G10 Majors | forex-macro-carry | carry_score_tool, macro_divergence_tool,
central_bank_policy_tool |
| G10 Crosses | forex-macro-carry | carry_score_tool, intermarket_correlation_tool,
cross_volatility_tool |
| EM Currencies | forex-macro-carry | sovereign_risk_tool, capital_flow_tool,
```


```
political_risk_tool |
| Carry Currencies | forex-macro-carry | carry_score_tool,
interest_rate_differential_tool, carry_unwind_risk_tool |
| Safe Haven | forex-macro-carry | safe_haven_flow_tool, risk_appetite_correlation_tool,
crisis_beta_tool |
### 7.4 Index Engine
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Broad Market | index-breadth-regime | breadth_tool, sector_rotation_tool,
concentration_risk_tool, volatility_regime_tool |
| Sector | index-breadth-regime | sector_rotation_tool, relative_strength_tool,
earnings_trend_tool |
| Strategy | index-breadth-regime | factor_exposure_tool, smart_beta_consistency_tool |
| Volatility | index-breadth-regime | vol_surface_tool, term_structure_tool, skew_tool |
| Thematic | index-breadth-regime | theme_momentum_tool, constituent_quality_tool,
concentration_risk_tool |
### 7.5 Bond Engine
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Government | bond-credit-duration | duration_convexity_tool, sovereign_risk_tool,
yield_curve_positioning_tool |
| Corporate IG | bond-credit-duration | credit_spread_tool, duration_convexity_tool,
rating_migration_tool, recovery_rate_tool |
| Corporate HY | bond-credit-duration | default_probability_tool, recovery_rate_tool,
liquidity_stress_tool, covenant_quality_tool |
| Municipal | bond-credit-duration | tax_equivalent_yield_tool, credit_quality_tool,
sector_concentration_tool |
| Inflation-Linked | bond-credit-duration | real_yield_tool, breakeven_inflation_tool,
inflation_sensitivity_tool |
| EM Sovereign | bond-credit-duration | sovereign_risk_tool, currency_mismatch_tool,
political_risk_tool |
### 7.6 Commodity Engine
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Edelmetalle | raw-materials-0.6.0 | supply_demand_tool, inventory_seasonality_tool,
safe_haven_demand_tool, cost_curve_tool |
| Industriemetalle | raw-materials-0.6.0 | supply_demand_tool, inventory_seasonality_tool,
cost_curve_tool, geopolitical_supply_risk_tool |
| Energie | raw-materials-0.6.0 | supply_demand_tool, inventory_seasonality_tool,
opec_policy_tool, refining_margin_tool |
| Agrar | raw-materials-0.6.0 | supply_demand_tool, weather_risk_tool, seasonality_tool,
stock_to_use_tool |
| Kritische Rohstoffe | raw-materials-0.6.0 | supply_demand_tool,
geopolitical_supply_risk_tool, substitution_risk_tool, strategic_stockpile_tool |
| Recycling | raw-materials-0.6.0 | recycling_efficiency_tool, scrap_availability_tool,
substitution_potential_tool |
### 7.7 ETF Engine
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Index-ETF | etf-quality | tracking_error_tool, holdings_quality_tool,
fee_efficiency_tool |
| Active ETF | etf-quality | alpha_generation_tool, holdings_quality_tool,
manager_track_record_tool |
| Smart Beta | etf-quality | factor_exposure_tool, smart_beta_consistency_tool,
fee_efficiency_tool |
| Thematic | etf-quality | theme_momentum_tool, constituent_quality_tool,
concentration_risk_tool |
| Leveraged/Inverse | etf-quality | volatility_decay_tool, rebalancing_cost_tool,
path_dependency_tool |
| Commodity-ETC | etf-quality | tracking_error_tool, nav_premium_discount_tool,
counterparty_risk_tool |
```


## \### 7.8 Derivative Engine

```
| Subklasse | Standardmodell | Factor Tools |
|---|---|---|
| Index Futures | derivatives-structure | futures_curve_tool, basis_convergence_tool,
open_interest_tool |
| Commodity Futures | derivatives-structure | futures_curve_tool, roll_yield_tool,
inventory_correlation_tool |
| Crypto Futures | derivatives-structure | futures_curve_tool, funding_oi_tool,
liquidation_risk_tool |
| Options | derivatives-structure | volatility_skew_tool, gamma_exposure_tool,
put_call_ratio_tool |
| Swaps | derivatives-structure | counterparty_risk_tool, basis_risk_tool,
collateral_quality_tool |
```

\---

\## 8. SUBCATEGORY EVALUATION TOOL CATALOG

Jedes Tool ist ein eigenstÃ¤ndiges Bewertungsmodul mit definierten Inputs, Formeln, Datenquellen und TestfÃ¤llen.

\### 8.1 CRYPTO TOOLS

\#### Tool: Tokenomics Quality Tool

```
\- **Assetklasse**: Crypto
- **Unterklasse**: Layer 1, Layer 2, DeFi, Infrastructure
- **Zweck**: Bewertet Token-Verteilung, Supply-Mechaniken, Inflation und Vesting-Schedules
- **Inputs**: circulatingSupply, maxSupply, totalSupply, topHolderConcentration, vestingSchedule
- **Outputs**: tokenomicsScore (0-100), riskFlags (z.B. "high_concentration",
"inflationary")
- **Formel**: `score = 0.30Â·circulationRatio + 0.30Â·(100-holderConcentration) +
0.25Â·releaseScheduleScore + 0.15Â·burnMechanismScore`
- **Datenquellen**: CCXT, DefiLlama, Etherscan (On-Chain, falls verfÃ¼gbar)
- **Fallback**: LLM-basierte qualitative Klassifikation (kein numerischer Ersatz; bei
fehlenden Daten: Reweighting + Confidence-Penalty + Audit-Flag `heuristic`)
- **Risk Flags**: `high_concentration` (Top-10 > 50%), `inflationary` (annualInflation >
10%), `no_max_supply`
- **Audit-Felder**: inputs, formula_version, intermediate_values, data_source
- **TestfÃ¤lle**: BTC (niedrige Inflation, hohe Verteilung), DOGE (inflationary),
Stablecoin (n/a â†’ skip)
```

\#### Tool: On-Chain Quality Tool

```
\- **Inputs**: activeAddressesGrowth, transactionVelocity, whaleAccumulation, gasUsed,
blockUtilization
- **Outputs**: onchainScore (0-100), riskFlags
- **Formel**: `score = 0.35Â·addressGrowth + 0.25Â·txVelocity + 0.25Â·whaleTrend +
0.15Â·networkUtilization`
- **Datenquellen**: Etherscan RPC, Dune Analytics Subgraph, Glassnode (falls verfÃ¼gbar)
- **Fallback**: LLM-basierte qualitative EinschÃ¤tzung (kein numerischer Ersatz; bei
fehlenden Daten: Reweighting + Confidence-Penalty + Audit-Flag `heuristic`)
- **Risk Flags**: `declining_activity`, `whale_distribution` (Whales verkaufen)
- **Audit-Felder**: block_height, data_source, rpc_endpoint
- **TestfÃ¤lle**: ETH (hohe AktivitÃ¤t), Ghost-Chain (niedrige AktivitÃ¤t â†’ low score)
#### Tool: DeFi Cashflow Tool
- **Assetklasse**: Crypto
- **Unterklasse**: DeFi
- **Zweck**: Bewertet Protocol Revenue, Fee Generation und Cashflow-Verteilung an Token
Holder
- **Inputs**: protocolRevenue, feesGenerated, tokenHolderShare, revenueTrend,
revenueDiversification
- **Outputs**: cashflowScore (0-100)
```

Â

Â

Â


\- **Formel**: `score = 0.35Â·revenueAbsolute + 0.25Â·revenueTrend + 0.20Â·holderShare + 0.20Â·revenueDiversification` - **Datenquellen**: DeFiLlama, TokenTerminal, Protocol Treasury Contracts - **Fallback**: LLM-basierte qualitative EinschÃ¤tzung (kein numerischer Ersatz; bei fehlenden Daten: Reweighting + Confidence-Penalty + Audit-Flag `heuristic`) - **Risk Flags**: `revenue_declining`, `revenue_concentrated` (>80% aus einer Quelle) - **TestfÃ¤lle**: Uniswap (hohe Fees, diversified), Ghost-Protocol (kein Revenue)

\#### Tool: TVL Quality Tool - **Assetklasse**: Crypto - **Unterklasse**: DeFi - **Zweck**: Bewertet QualitÃ¤t, StabilitÃ¤t und Konzentration der Total Value Locked - **Inputs**: totalTVL, tvlTrend30d, tvlConcentration, tvlVolatility, stickyLiquidity - **Outputs**: tvlQualityScore (0-100) - **Formel**: `score = 0.30Â·tvlAbsolute + 0.25Â·tvlStability + 0.25Â·(100-concentration) + 0.20Â·stickyRatio` - **Datenquellen**: DeFiLlama, DefiLlama TVL API - **Risk Flags**: `tvl_declining`, `tvl_concentrated` (Top-3 Pools > 70%) - **TestfÃ¤lle**: AAVE (hohe TVL, diversifiziert), Long-Tail Protocol (niedrige TVL)

\#### Tool: Stablecoin Reserve Quality Tool - **Assetklasse**: Crypto - **Unterklasse**: Stablecoin - **Zweck**: Bewertet die QualitÃ¤t und Transparenz der Reserven, die den Stablecoin stÃ¼tzen - **Inputs**: reserveComposition, reserveAttestationFrequency, reserveDiversification, redemptionHistory, auditStatus - **Outputs**: reserveQualityScore (0-100) - **Formel**: `score = 0.30Â·reserveDiversification + 0.25Â·attestationFreshness + 0.25Â·auditStatus + 0.20Â·redemptionReliability` - **Datenquellen**: Issuer-Website (attestation reports), ChainLink (on-chain proof of reserves) - **Fallback**: Kein Fallback â¬— ohne Reserve-Daten `not_applicable` (Stablecoin ohne Reserven = risk_flag) - **Risk Flags**: `no_attestation`, `stale_attestation` (>30 Tage), `reserve_concentration` - **TestfÃ¤lle**: USDC (monatliche Attestation, diversified), UST-historic (keine Reserven â†’å´©æºƒ)

\#### Tool: Meme Liquidity Rug Risk Tool - **Assetklasse**: Crypto - **Unterklasse**: Meme - **Zweck**: Bewertet Manipulationsrisiko, Rug-Pull-Wahrscheinlichkeit und LiquiditÃ¤tsstabilitÃ¤t - **Inputs**: liquidityLockStatus, devWalletConcentration, holderDistribution, liquidityDepth, contractAuditStatus - **Outputs**: rugRiskScore (0-100, higher = safer), riskFlags - **Formel**: `score = 0.35Â·liquidityLock + 0.25Â·(100-devConcentration) + 0.20Â·holderDistribution + 0.20Â·auditStatus` - **Datenquellen**: DexScreener, TokenSniffer, GoPlus Security API - **Fallback**: Kein Fallback â¬- ohne Daten `risk_flags: ["unable_to_assess"]` - **Risk Flags**: `no_liquidity_lock`, `dev_concentration_high`, `no_audit`, `honeypot_suspected` - **TestfÃ¤lle**: SHIB (locked liquidity, distributed), Scam-Token (dev 90%, no lock â†’ very low score)

\#### Tool: RWA Compliance Tool - **Assetklasse**: Crypto - **Unterklasse**: Real World Assets - **Zweck**: Bewertet regulatorische Compliance, Asset-Backing-QualitÃ¤t und Offenlegungsgrad des zugrundeliegenden Real-World Assets - **Inputs**: regulatoryFilingStatus, assetBackingType, legalOpinionExists, jurisdiction, transferRestrictions - **Outputs**: complianceScore (0-100) - **Formel**: `score = 0.30Â·filingStatus + 0.25Â·legalOpinion + 0.25Â·backingQuality + 0.20Â·jurisdictionClarity` - **Datenquellen**: SEC EDGAR (falls US-registriert), Issuer-Dokumentation, On-Chain Proof of Reserves - **Fallback**: LLM-basierte qualitative EinschÃ¤tzung (kein numerischer Ersatz; bei


fehlenden Daten: Reweighting + Confidence-Penalty + Audit-Flag `heuristic`) basierend auf Issuer-Website - **Risk Flags**: `no_legal_opinion`, `unregulated_jurisdiction`, `backing_unverified` - **TestfÃ¤lle**: Ondo Finance (registered, audited), Anonymes RWA-Token (keine Dokumentation)

\### 8.2 EQUITY TOOLS

\#### Tool: Quality Value Tool - **Assetklasse**: Equity - **Unterklasse**: Large Cap, Mid Cap, Blue Chip, Value - **Zweck**: Bewertet UnternehmensqualitÃ¤t (ProfitabilitÃ¤t, BilanzstÃ¤rke) und Value (Preis vs. innerer Wert) - **Inputs**: ROE, ROA, Debt/Equity, P/E, P/B, Graham Margin, Interest Coverage, Free Cash Flow - **Outputs**: qualityScore (0-100), valueScore (0-100) - **Formel**: `qualityScore = 0.30Â·ROE + 0.20Â·ROA + 0.25Â·(100-D/E_norm) + 0.25Â·interestCoverage`; `valueScore = 0.40Â·PE_percentile + 0.30Â·PB_percentile + 0.30Â·grahamMargin` - **Datenquellen**: Alpha Vantage Fundamentals, Stooq (Preis) - **Fallback**: Graham-Heuristik (Daten aus assetRegistry, wenn Fundamentals fehlen) - **Risk Flags**: `high_leverage`, `negative_fcf`, `overvalued` (PE > 90th percentile) - **Audit-Felder**: fundamentals_source, price_source, calculation_timestamp

\- **TestfÃ¤lle**: AAPL (hohe QualitÃ¤t, moderater Value), Penny Stock (niedrige QualitÃ¤t)

\#### Tool: Growth Acceleration Tool - **Assetklasse**: Equity - **Unterklasse**: Growth, Small Cap - **Zweck**: Bewertet Wachstumsbeschleunigung in Revenue und Earnings - **Inputs**: revenueGrowthQoQ, earningsGrowthQoQ, revenueGrowthAcceleration, earningsGrowthAcceleration, researchDevelopmentRatio - **Outputs**: growthScore (0-100) - **Formel**: `score = 0.30Â·revenueGrowth + 0.30Â·earningsGrowth + 0.20Â·acceleration + 0.20Â·rdEfficiency` - **Datenquellen**: Alpha Vantage Earnings, SEC Filings - **Risk Flags**: `growth_decelerating`, `earnings_miss_streak` - **TestfÃ¤lle**: NVDA (starke Wachstumsbeschleunigung), stagnanter Blue-Chip

\#### Tool: Dividend Sustainability Tool - **Assetklasse**: Equity - **Unterklasse**: Dividend - **Zweck**: Bewertet Nachhaltigkeit der Dividende durch Payout Ratio, FCF Coverage und Dividendenhistorie - **Inputs**: dividendYield, payoutRatio, fcfCoverage, dividendGrowthStreak, dividendCutHistory - **Outputs**: sustainabilityScore (0-100) - **Formel**: `score = 0.25Â·payoutReasonableness + 0.30Â·fcfCoverage + 0.25Â·growthStreak + 0.20Â·(100-cutRisk)` - **Datenquellen**: Alpha Vantage, Dividend.com - **Risk Flags**: `payout_unsustainable` (>90%), `dividend_cut_history`, `low_fcf_coverage` - **TestfÃ¤lle**: JNJ (35 Jahre ErhÃ¶hung, moderate Payout), High-Yield Trap (90%+ Payout, declining FCF)

\#### Tool: Balance Sheet Stress Tool - **Assetklasse**: Equity - **Unterklasse**: Alle - **Zweck**: Stress-Test der Bilanz: LiquiditÃ¤t, Verschuldung, Working Capital - **Inputs**: currentRatio, quickRatio, debtToEquity, interestCoverage, workingCapital, cashRatio - **Outputs**: stressScore (0-100, higher = healthier) - **Formel**: `score = 0.20Â·currentRatio + 0.20Â·quickRatio + 0.25Â·(100-D/E_norm) + 0.20Â·interestCoverage + 0.15Â·cashRatio` - **Datenquellen**: Alpha Vantage Balance Sheet, SEC 10-Q/10-K - **Risk Flags**: `liquidity_distress`, `debt_overhang`, `negative_working_capital` - **TestfÃ¤lle**: MSFT (sehr starke Bilanz),distressed company (negative Working Capital)

\#### Tool: Earnings Sentiment Tool - **Assetklasse**: Equity


\- **Unterklasse**: Alle - **Zweck**: NLP-basierte Sentimentanalyse von Earnings Calls und Analyst Revisions - **Inputs**: earningsCallTranscript, analystRevisions, earningsSurprise, guidanceChange - **Outputs**: sentimentScore (0-100) - **Formel**: `score = 0.35Â·transcriptSentiment(FinBERT) + 0.25Â·revisionTrend + 0.25Â·surpriseScore + 0.15Â·guidanceTrend` - **Datenquellen**: NewsAPI, Alpha Vantage Earnings, FinBERT-Modell - **Fallback**: Wenn kein Transcript verfÃ¼gbar â†’ analystRevisions-only Score - **Risk Flags**: `negative_guidance`, `analyst_downgrade_streak` - **TestfÃ¤lle**: Positive Earnings Surprise + bullish transcript, negative guidance cut

\### 8.3 FOREX TOOLS

\#### Tool: Carry Score Tool - **Assetklasse**: Forex - **Unterklasse**: G10 Majors, G10 Crosses, Carry Currencies - **Zweck**: Bewertet Carry (Zinsdifferenz) zwischen zwei WÃ¤hrungen - **Inputs**: baseRate, quoteRate, rateDifferential, forwardPoints, carryVolatility - **Outputs**: carryScore (0-100) - **Formel**: `score = 0.50Â·rateDifferential_norm + 0.30Â·(100-carryVolatility) + 0.20Â·forwardAttractiveness` - **Datenquellen**: Zentralbank-Websites (Fed, ECB, BoJ, etc.), Stooq (FX rates) - **Risk Flags**: `carry_unwind_risk` (hohe VolatilitÃ¤t bei hohem Carry) - **TestfÃ¤lle**: USD/TRY (hoher Carry, hohes Risiko), EUR/CHF (niedriger Carry, niedriges

Risiko)

\#### Tool: Macro Divergence Tool - **Assetklasse**: Forex - **Unterklasse**: Alle - **Zweck**: Bewertet makroÃ¶konomische Divergenz zwischen zwei LÃ¤ndern (Inflation, GDP, Trade Balance) - **Inputs**: inflationDiff, gdpGrowthDiff, tradeBalanceDiff, currentAccountDiff, unemploymentDiff - **Outputs**: macroScore (0-100) - **Formel**: `score = 0.25Â·inflationDiff_norm + 0.25Â·gdpDiff_norm + 0.20Â·tradeBalanceDiff + 0.15Â·currentAccountDiff + 0.15Â·unemploymentDiff` - **Datenquellen**: World Bank API, IMF Data, TradingEconomics - **Fallback**: Stooq FX History als Proxy fÃ¼r Makro-Trend - **Risk Flags**: `extreme_inflation_divergence` - **TestfÃ¤lle**: USD/EUR (moderate Divergenz), USD/TRY (extreme Divergenz)

\#### Tool: Central Bank Policy Tool - **Assetklasse**: Forex - **Unterklasse**: Alle - **Zweck**: Bewertet Zentralbank-Politik-Divergenz (Hawkish vs. Dovish) - **Inputs**: policyRateDiff, forwardGuidanceDivergence, quantitativeTighteningDiff, marketExpectationDiff - **Outputs**: policyScore (0-100) - **Formel**: `score = 0.35Â·policyRateDiff_norm + 0.30Â·guidanceDivergence + 0.20Â·qtDivergence + 0.15Â·expectationAlignment` - **Datenquellen**: Zentralbank-Pressekonferenzen, Fed Dot Plot, ECB Staff Projections - **Risk Flags**: `unexpected_pivot`, `policy_uncertainty` - **TestfÃ¤lle**: Fed Hawkish / ECB Dovish (positive divergence), synchronized policy

\#### Tool: Safe Haven Flow Tool - **Assetklasse**: Forex - **Unterklasse**: Safe Haven Currencies - **Zweck**: Bewertet Safe-Haven-Flows in Krisenzeiten (CHF, JPY, USD) - **Inputs**: riskAppetiteIndex, vixLevel, goldCorrelation, crisisBeta, flowDirection - **Outputs**: safeHavenScore (0-100) - **Formel**: `score = 0.30Â·(100-riskAppetite) + 0.25Â·vixLevel_norm + 0.25Â·goldCorr + 0.20Â·crisisBeta` - **Datenquellen**: VIX (CBOE), Gold-Preis (Stooq), S&P 500 (Stooq) - **Risk Flags**: `risk_on_regime` (Safe Haven verliert bei Risk-On) - **TestfÃ¤lle**: CHF in Krise (hoher Score), CHF in Bull Market (niedriger Score)

\### 8.4 INDEX TOOLS

\#### Tool: Breadth Tool


\- **Assetklasse**: Index - **Unterklasse**: Broad Market, Sector - **Zweck**: Bewertet Marktbreite (wie viele Constituenten steigen vs. fallen) - **Inputs**: advancingCount, decliningCount, newHighs, newLows, breadthThrust, mcclellanOscillator - **Outputs**: breadthScore (0-100) - **Formel**: `score = 0.30Â·advanceDeclineRatio + 0.25Â·newHighsLows + 0.25Â·breadthThrust + 0.20Â·mcclellan` - **Datenquellen**: Stooq (Constituent-Preise), Alpha Vantage - **Risk Flags**: `breadth_divergence` (Index steigt, aber Breite sinkt) - **TestfÃ¤lle**: S&P 500 bei breitem Rally, S&P 500 bei schmalem Rally (Narrow

Leadership)

\#### Tool: Sector Rotation Tool - **Assetklasse**: Index - **Unterklasse**: Sector, Broad Market - **Zweck**: Bewertet Sektor-Rotationsmuster (defensiv vs. zyklisch) - **Inputs**: defensivePerformance, cyclicalPerformance, techPerformance, energyPerformance, rotationPhase - **Outputs**: rotationScore (0-100) - **Formel**: `score = 0.35Â·rotationClarity + 0.30Â·phaseAlignment + 0.20Â·sectorMomentum + 0.15Â·breadthConfirmation` - **Datenquellen**: Stooq Sector ETFs (XLK, XLE, XLV etc.) - **Risk Flags**: `rotation_failure` (erwartete Rotation findet nicht statt) - **TestfÃ¤lle**: Tech â†’ Energy Rotation (klarer Trend), vermischte Signale

\#### Tool: Concentration Risk Tool - **Assetklasse**: Index - **Unterklasse**: Broad Market, Thematic - **Zweck**: Bewertet Konzentrationsrisiko (Top-5-Gewicht im Index) - **Inputs**: top5Weight, top10Weight, herfindahlIndex, effectiveNumberOfConstituents - **Outputs**: concentrationScore (0-100, higher = more diversified) - **Formel**: `score = 0.40Â·(100-top5Weight_norm) + 0.30Â·(100-herfindahl) + 0.30Â·effectiveN_norm` - **Datenquellen**: Index Provider (S&P, MSCI), Stooq - **Risk Flags**: `extreme_concentration` (Top-5 > 40%), `single_stock_dominance` - **TestfÃ¤lle**: S&P 500 (moderate Konzentration), Nasdaq 100 (hohe Konzentration durch

Tech)

\#### Tool: Volatility Regime Tool - **Assetklasse**: Index - **Unterklasse**: Volatility, Broad Market - **Zweck**: Erkennt VolatilitÃ¤tsregime (Low-Vol vs. High-Vol) und gibt regime-basierten Score - **Inputs**: vixLevel, vixTermStructure, realizedVol30d, impliedVsRealizedDiff, volOfVol - **Outputs**: volRegimeScore (0-100) - **Formel**: `score = 0.30Â·(100-vix_norm) + 0.25Â·termStructureScore + 0.25Â·(100- realizedVol_norm) + 0.20Â·(100-volOfVol)` - **Datenquellen**: CBOE VIX, Stooq (realized vol from index returns) - **Risk Flags**: `regime_shift_detected`, `backwardation` (VIX Term Structure inverted) - **TestfÃ¤lle**: VIX 12 (low vol regime), VIX 35 (high vol regime)

\### 8.5 BOND TOOLS

\#### Tool: Duration Convexity Tool - **Assetklasse**: Bond - **Unterklasse**: Government, Corporate IG, Municipal - **Zweck**: Bewertet Zinsrisiko (Duration) und nicht-lineare Anpassung (Convexity) - **Inputs**: modifiedDuration, convexity, yieldToMaturity, yieldChange30d, timeToMaturity - **Outputs**: durationScore (0-100, higher = less rate risk) - **Formel**: `score = 0.35Â·(100-duration_norm) + 0.25Â·convexityBonus + 0.25Â·yieldAttractiveness + 0.15Â·maturityScore` - **Datenquellen**: Stooq (Yields), Alpha Vantage (Treasury data) - **Risk Flags**: `extreme_duration` (Duration > 15), `negative_convexity` - **TestfÃ¤lle**: US10Y (moderate Duration), 30Y Zero-Coupon (extreme Duration)

\#### Tool: Credit Spread Tool - **Assetklasse**: Bond - **Unterklasse**: Corporate IG, Corporate HY

Ã


\- **Zweck**: Bewertet Credit Spread Attractiveness und Spread-Ã„nderungs-Trend - **Inputs**: currentSpread, spread30dChange, spreadPercentile, spreadVolatility, spreadCurveShape - **Outputs**: spreadScore (0-100) - **Formel**: `score = 0.30Â·spreadAttractiveness + 0.25Â·(100-spreadVolatility) + 0.25Â·trendScore + 0.20Â·curveShapeScore` - **Datenquellen**: ICE BofA Indices, Stooq (Corporate yields) - **Risk Flags**: `spread_widening`, `inverted_credit_curve` - **TestfÃ¤lle**: Tight Spread IG (niedrige Attractiveness), Wide Spread HY (hohe Attractiveness mit hohem Risiko)

\#### Tool: Rating Migration Tool - **Assetklasse**: Bond - **Unterklasse**: Corporate IG, Corporate HY, EM Sovereign - **Zweck**: Bewertet Rating-Upgrade/Downgrade-Wahrscheinlichkeit - **Inputs**: currentRating, ratingOutlook, ratingTrend, agencyDisagreement, watchlistStatus - **Outputs**: migrationScore (0-100, higher = upgrade likely) - **Formel**: `score = 0.30Â·outlookScore + 0.25Â·trendScore + 0.20Â·agencyAgreement + 0.15Â·watchlistSignal + 0.10Â·sectorRelativeScore` - **Datenquellen**: Moody's, S&P, Fitch (falls verfÃ¼gbar), else Stooq proxy - **Fallback**: Stooq Yield-Spread als Rating-Proxy (hÃ¶herer Spread = schlechteres implizites Rating) - **Risk Flags**: `downgrade_imminent`, `split_rating` (Agencies uneinig) - **TestfÃ¤lle**: AAA stable (high score), BB negative outlook (low score)

\#### Tool: Sovereign Risk Tool - **Assetklasse**: Bond - **Unterklasse**: Government, EM Sovereign - **Zweck**: Bewertet LÃ¤nderrisiko (politisch, wirtschaftlich, WÃ¤hrungsrisiko) - **Inputs**: countryCDS, debtToGDP, politicalStabilityIndex, currencyReserves, currentAccountBalance - **Outputs**: sovereignScore (0-100, higher = safer) - **Formel**: `score = 0.25Â·(100-CDS_norm) + 0.25Â·(100-debtToGDP_norm) + 0.20Â·politicalStability + 0.15Â·reserveAdequacy + 0.15Â·currentAccountScore` - **Datenquellen**: IMF Data, World Bank, TradingEconomics - **Risk Flags**: `debt_crisis_risk`, `currency_mismatch`, `political_instability` - **TestfÃ¤lle**: US Treasury (sehr sicher), Argentina Sovereign (hohes Risiko)

\### 8.6 COMMODITY TOOLS

\#### Tool: Supply/Demand Balance Tool - **Assetklasse**: Commodity - **Unterklasse**: Alle - **Zweck**: Bewertet aktuelles Supply/Demand-Gleichgewicht - **Inputs**: globalSupply, globalDemand, supplyDeficit, demandGrowthRate, capacityUtilization - **Outputs**: supplyDemandScore (0-100) - **Formel**: `score = 0.35Â·deficitScore + 0.25Â·demandGrowth + 0.20Â·(100- capacityUtilization_norm) + 0.20Â·supplyTrend` - **Datenquellen**: USGS, IEA, FAO, World Bank Commodity Prices - **Fallback**: Rohstoff-Datenbank aus Produktivumgebung (10 statische EintrÃ¤ge) - **Risk Flags**: `supply_crisis`, `demand_destruction` - **TestfÃ¤lle**: Lithium (Defizit, hohe Nachfrage), Oversupplied Metal

\#### Tool: Inventory/Seasonality Tool - **Assetklasse**: Commodity - **Unterklasse**: Alle - **Zweck**: Bewertet LagerbestÃ¤nde und saisonale Muster - **Inputs**: inventoryLevel, inventoryTrend, seasonalPattern, daysOfForwardDemand, inventoryVs5yAvg - **Outputs**: seasonalityScore (0-100) - **Formel**: `score = 0.30Â·inventoryAdequacy + 0.25Â·trendScore + 0.25Â·seasonalAlignment + 0.20Â·historicalComparison` - **Datenquellen**: EIA (Energy), LME (Metals), USDA (Agriculture) - **Risk Flags**: `inventory_depletion`, `seasonal_risk` - **TestfÃ¤lle**: Natural Gas vor Winter (Low inventory, seasonal demand spike), Gold (stable inventory)


\#### Tool: Cost Curve Tool - **Assetklasse**: Commodity - **Unterklasse**: Industriemetalle, Kritische Rohstoffe - **Zweck**: Bewertet Position auf der globalen Cost Curve (Margin-Safety) - **Inputs**: productionCost, marginalCost90th, positionOnCurve, costTrend, energyCostShare - **Outputs**: costCurveScore (0-100, higher = lower cost position) - **Formel**: `score = 0.35Â·positionPercentile + 0.25Â·marginSafety + 0.20Â·(100- costTrend) + 0.20Â·energyEfficiency` - **Datenquellen**: S&P Global Commodity Insights, Wood Mackenzie (falls verfÃ¼gbar), else bestehende RAW_MATERIALS_DATABASE - **Risk Flags**: `high_cost_position`, `cost_inflation` - **TestfÃ¤lle**: Low-cost Copper Mine (high score), High-cost Gold Mine (low score)

\#### Tool: Geopolitical Supply Risk Tool - **Assetklasse**: Commodity - **Unterklasse**: Kritische Rohstoffe, Energie - **Zweck**: Bewertet geopolitische Risiken fÃ¼r die Versorgungskette - **Inputs**: producerConcentration, criticalInfrastructureRisk, tradeRouteRisk, sanctionsExposure, politicalInstability - **Outputs**: geopoliticalScore (0-100, higher = lower risk) - **Formel**: `score = 0.30Â·(100-producerConcentration) + 0.25Â·(100-infraRisk) + 0.20Â·(100-tradeRisk) + 0.15Â·(100-sanctionsRisk) + 0.10Â·(100-politicalRisk)` - **Datenquellen**: Bestehende `RiskAgent` (Rohstoffe) aus Produktivumgebung, erweitert um Echtzeit-News - **Risk Flags**: `critical_supply_concentration`, `sanctions_risk`, `trade_route_vulnerability` - **TestfÃ¤lle**: Rare Earths (China 80%+ â†’ hoher Risk), Gold (diversified â†’ niedriger Risk)

\### 8.7 ETF TOOLS

\#### Tool: Tracking Error Tool - **Assetklasse**: ETF - **Unterklasse**: Index-ETF, Commodity-ETC - **Zweck**: Bewertet Tracking-QualitÃ¤t gegenÃ¼ber dem Benchmark - **Inputs**: trackingError1y, trackingError3y, returnVsBenchmark, expenseDrag, samplingMethod - **Outputs**: trackingScore (0-100, higher = better tracking) - **Formel**: `score = 0.35Â·(100-TE1y_norm) + 0.30Â·(100-TE3y_norm) + 0.20Â·returnAlignment + 0.15Â·methodQuality` - **Datenquellen**: ETF Provider Fact Sheets, Morningstar (falls verfÃ¼gbar) - **Risk Flags**: `excessive_tracking_error`, `systematic_underperformance` - **TestfÃ¤lle**: SPY (minimal TE), niche thematic ETF (higher TE)

\#### Tool: Holdings Quality Tool - **Assetklasse**: ETF - **Unterklasse**: Active ETF, Smart Beta, Thematic - **Zweck**: Bewertet die QualitÃ¤t der Holdings (Constituent Quality Score) - **Inputs**: avgROE, avgEarningsGrowth, avgDebtToEquity, avgFCFYield, qualityTrend - **Outputs**: holdingsScore (0-100) - **Formel**: `score = 0.25Â·avgROE_norm + 0.25Â·avgGrowth_norm + 0.25Â·(100-avgDE_norm) + 0.25Â·avgFCFYield_norm` - **Datenquellen**: ETF Provider Holdings Reports (tÃ¤glich/wÃ¶chentlich) - **Risk Flags**: `low_quality_holdings`, `quality_declining` - **TestfÃ¤lle**: Quality-factor ETF (high score), leveraged ETF (quality is about derivatives, not fundamentals)

\#### Tool: NAV Premium/Discount Tool - **Assetklasse**: ETF - **Unterklasse**: Alle (besonders Commodity-ETC) - **Zweck**: Bewertet Abweichung des Marktpreises vom NAV - **Inputs**: marketPrice, nav, premiumDiscount, avgPD30d, pdVolatility - **Outputs**: navScore (0-100, higher = closer to NAV) - **Formel**: `score = 0.40Â·(100-PD_norm) + 0.30Â·(100-PDvolatility) + 0.30Â·creationRedemptionActivity` - **Datenquellen**: ETF Provider (NAV), Stooq (Market Price) - **Risk Flags**: `persistent_premium`, `illiquid_creation`, `arbitrage_breakdown` - **TestfÃ¤lle**: SPY (minimal PD), niche commodity ETC (potential large PD)


\#### Tool: Fee Efficiency Tool - **Assetklasse**: ETF - **Unterklasse**: Alle - **Zweck**: Bewertet Kosteneffizienz (Expense Ratio im Kontext der Kategorie) - **Inputs**: expenseRatio, categoryAverage, feeTrend, feeVsMedian, totalCostOfOwnership - **Outputs**: feeScore (0-100) - **Formel**: `score = 0.35Â·(100-expenseRatio_norm) + 0.25Â·relativeToCategory + 0.20Â·feeTrend + 0.20Â·(100-tco_norm)` - **Datenquellen**: ETF Provider Fact Sheets, ETF.com - **Risk Flags**: `overpriced` (Expense Ratio > 90th percentile of category) - **TestfÃ¤lle**: VTI (0.03% â†’ excellent), niche active ETF (0.85% â†’ potentially overpriced)

\### 8.8 DERIVATIVE TOOLS

\#### Tool: Futures Curve Tool - **Assetklasse**: Derivative - **Unterklasse**: Index Futures, Commodity Futures, Crypto Futures - **Zweck**: Bewertet die Futures Curve (Contango vs. Backwardation) - **Inputs**: frontMonthPrice, secondMonthPrice, curveShape, rollYield, basisToSpot - **Outputs**: curveScore (0-100) - **Formel**: `score = 0.35Â·rollYieldScore + 0.25Â·curveShapeAttractiveness + 0.20Â·basisConvergence + 0.20Â·(100-curveVolatility)` - **Datenquellen**: Exchange Data (CME, Binance Futures), Stooq - **Risk Flags**: `extreme_contango`, `backwardation_extreme` - **TestfÃ¤lle**: Oil in Contango (negative roll yield), Copper in Backwardation (positive roll yield)

\#### Tool: Funding/Open Interest Tool - **Assetklasse**: Derivative - **Unterklasse**: Crypto Futures - **Zweck**: Bewertet Funding Rate und Open Interest als Sentiment-Indikator - **Inputs**: fundingRate, fundingRateTrend, openInterest, oiChangeRate, oiVsVolume - **Outputs**: fundingScore (0-100) - **Formel**: `score = 0.30Â·fundingReasonableness + 0.25Â·(100-oiVolatility) + 0.25Â·oiTrend + 0.20Â·fundingVsPriceCorrelation` - **Datenquellen**: Binance Futures API, Coinglass, Bybit API - **Risk Flags**: `extreme_funding` (>0.1% per 8h), `oi_divergence` (OI rising, price falling) - **TestfÃ¤lle**: BTC Perp with 0.01% funding (neutral), Meme perp with 0.3% funding

(extreme)

\#### Tool: Volatility Skew Tool - **Assetklasse**: Derivative - **Unterklasse**: Options - **Zweck**: Bewertet Volatility Skew (Put vs. Call IV) als Sentiment-Indikator - **Inputs**: putIV, callIV, skew25Delta, skewTrend, riskReversal, butterfly - **Outputs**: skewScore (0-100) - **Formel**: `score = 0.30Â·skewExtremity + 0.25Â·skewTrend + 0.25Â·riskReversalScore + 0.20Â·termStructureScore` - **Datenquellen**: Deribit (Crypto Options), CBOE (Equity Options) - **Risk Flags**: `extreme_put_skew` (VIX-like fear), `inverted_skew` (call skew > put skew)

\- **TestfÃ¤lle**: BTC options neutral skew, SPX options extreme put skew (fear)

\#### Tool: Gamma Exposure Tool - **Assetklasse**: Derivative - **Unterklasse**: Options - **Zweck**: Bewertet Dealer Gamma Exposure als PreisstabilitÃ¤ts-Indikator - **Inputs**: netGamma, gammaProfile, dealerPositioning, charmExposure, vannaExposure - **Outputs**: gammaScore (0-100, higher = more stable price) - **Formel**: `score = 0.35Â·(100-gammaExtremity) + 0.25Â·profileStability + 0.20Â·(100- charmRisk) + 0.20Â·vannaBalance` - **Datenquellen**: CBOE, exchange data, SpotGamma (falls verfÃ¼gbar) - **Risk Flags**: `negative_gamma_regime` (volatility amplifier), `pin_risk` (near-the- money gamma spike)

\- **TestfÃ¤lle**: Positive gamma (low vol expected), negative gamma (high vol expected)


\---

\### 8.9 TOOL COVERAGE MATRIX

| Tool ID | Assetklasse | Unterklasse | Full Card | Status | |---|---|---|---|---| | tokenomics_tool | Crypto | Layer 1, Layer 2, DeFi, Infra | Ja | Spezifiziert | | onchain_quality_tool | Crypto | Layer 1, Layer 2, DeFi | Ja | Spezifiziert | | defi_cashflow_tool | Crypto | DeFi | Ja | Spezifiziert | | tvl_quality_tool | Crypto | DeFi | Ja | Spezifiziert | | stablecoin_reserve_tool | Crypto | Stablecoin | Ja | Spezifiziert | | meme_liquidity_tool | Crypto | Meme | Ja | Spezifiziert | | rug_risk_tool | Crypto | Meme | Ja | Spezifiziert | | community_velocity_tool | Crypto | Meme | Ja | Spezifiziert | | rwa_compliance_tool | Crypto | RWA | Ja | Spezifiziert | | security_audit_tool | Crypto | Layer 1, Layer 2 | Nein | Planned | | l2_security_tool | Crypto | Layer 2 | Nein | Planned | | bridge_risk_tool | Crypto | Layer 2 | Nein | Planned | | governance_strength_tool | Crypto | DeFi, Governance | Nein | Planned | | smart_contract_risk_tool | Crypto | DeFi | Nein | Planned | | compliance_tool | Crypto | Stablecoin, RWA | Nein | Planned | | redemption_pressure_tool | Crypto | Stablecoin | Nein | Planned | | network_activity_tool | Crypto | Infrastructure | Nein | Planned | | staking_yield_tool | Crypto | Infrastructure | Nein | Planned | | validator_risk_tool | Crypto | Infrastructure | Nein | Planned | | oracle_reliability_tool | Crypto | Oracle | Nein | Planned | | data_source_diversity_tool | Crypto | Oracle | Nein | Planned | | exchange_backing_tool | Crypto | Exchange Token | Nein | Planned | | burn_mechanics_tool | Crypto | Exchange Token | Nein | Planned | | revenue_share_tool | Crypto | Exchange Token | Nein | Planned | | proposal_participation_tool | Crypto | Governance | Nein | Planned | | treasury_transparency_tool | Crypto | Governance | Nein | Planned | | privacy_audit_tool | Crypto | Privacy | Nein | Planned | | regulatory_risk_tool | Crypto | Privacy | Nein | Planned | | user_adoption_tool | Crypto | Gaming | Nein | Planned | | revenue_per_user_tool | Crypto | Gaming | Nein | Planned | | ecosystem_depth_tool | Crypto | Gaming | Nein | Planned | | compute_utilization_tool | Crypto | AI/Data | Nein | Planned | | ai_revenue_tool | Crypto | AI/Data | Nein | Planned | | data_moat_tool | Crypto | AI/Data | Nein | Planned | | rwa_revenue_tool | Crypto | RWA | Ja | Spezifiziert | | asset_backing_tool | Crypto | RWA | Nein | Planned | | quality_value_tool | Equity | Large Cap, Mid Cap, Value | Ja | Spezifiziert | | growth_acceleration_tool | Equity | Growth, Small Cap | Ja | Spezifiziert | | dividend_sustainability_tool | Equity | Dividend | Ja | Spezifiziert | | balance_sheet_stress_tool | Equity | Alle | Ja | Spezifiziert | | earnings_sentiment_tool | Equity | Alle | Ja | Spezifiziert | | graham_margin_tool | Equity | Large Cap, Value | Nein | Planned | | acquisition_premium_tool | Equity | Mid Cap | Nein | Planned | | earnings_momentum_tool | Equity | Small Cap, Growth | Nein | Planned | | analyst_revision_tool | Equity | Small Cap, Growth | Nein | Planned | | distress_scanner_tool | Equity | Micro Cap | Nein | Planned | | recovery_signal_tool | Equity | Micro Cap | Nein | Planned | | dilution_risk_tool | Equity | Micro Cap | Nein | Planned | | revenue_growth_quality_tool | Equity | Growth | Nein | Planned | | rd_efficiency_tool | Equity | Growth | Nein | Planned | | asset_based_valuation_tool | Equity | Value | Nein | Planned | | mean_reversion_tool | Equity | Value | Nein | Planned | | payout_ratio_tool | Equity | Dividend | Nein | Planned | | dividend_growth_tool | Equity | Dividend | Nein | Planned | | free_cash_flow_coverage_tool | Equity | Dividend | Nein | Planned | | carry_score_tool | Forex | G10, Carry | Ja | Spezifiziert | | macro_divergence_tool | Forex | Alle | Ja | Spezifiziert | | central_bank_policy_tool | Forex | Alle | Ja | Spezifiziert | | safe_haven_flow_tool | Forex | Safe Haven | Ja | Spezifiziert | | intermarket_correlation_tool | Forex | G10 Crosses | Nein | Planned | | cross_volatility_tool | Forex | G10 Crosses | Nein | Planned | | sovereign_risk_tool | Forex/Bond | EM, Government | Ja | Spezifiziert (Bond) | | capital_flow_tool | Forex | EM | Nein | Planned |


| political_risk_tool | Forex/Bond | EM | Nein | Planned | | interest_rate_differential_tool | Forex | Carry | Nein | Planned | | carry_unwind_risk_tool | Forex | Carry | Nein | Planned | | risk_appetite_correlation_tool | Forex | Safe Haven | Nein | Planned | | crisis_beta_tool | Forex | Safe Haven | Nein | Planned | | breadth_tool | Index | Broad Market, Sector | Ja | Spezifiziert | | sector_rotation_tool | Index | Sector, Broad | Ja | Spezifiziert | | concentration_risk_tool | Index | Broad, Thematic | Ja | Spezifiziert | | volatility_regime_tool | Index | Vol, Broad | Ja | Spezifiziert | | relative_strength_tool | Index | Sector | Nein | Planned | | earnings_trend_tool | Index | Sector | Nein | Planned | | factor_exposure_tool | Index/ETF | Strategy, Smart Beta | Nein | Planned | | smart_beta_consistency_tool | Index/ETF | Strategy, Smart Beta | Nein | Planned | | vol_surface_tool | Index | Volatility | Nein | Planned | | term_structure_tool | Index | Volatility | Nein | Planned | | skew_tool | Index | Volatility | Nein | Planned | | theme_momentum_tool | Index/ETF | Thematic | Nein | Planned | | constituent_quality_tool | Index/ETF | Thematic | Nein | Planned | | duration_convexity_tool | Bond | Gov, IG, Muni | Ja | Spezifiziert | | credit_spread_tool | Bond | Corp IG, HY | Ja | Spezifiziert | | rating_migration_tool | Bond | Corp IG, HY, EM | Ja | Spezifiziert | | sovereign_risk_tool | Bond | Gov, EM | Ja | Spezifiziert | | yield_curve_positioning_tool | Bond | Government | Nein | Planned | | recovery_rate_tool | Bond | Corp IG, HY | Nein | Planned | | default_probability_tool | Bond | Corp HY | Nein | Planned | | liquidity_stress_tool | Bond | Corp HY | Nein | Planned | | covenant_quality_tool | Bond | Corp HY | Nein | Planned | | tax_equivalent_yield_tool | Bond | Municipal | Nein | Planned | | credit_quality_tool | Bond | Municipal | Nein | Planned | | sector_concentration_tool | Bond | Municipal | Nein | Planned | | real_yield_tool | Bond | Inflation-Linked | Nein | Planned | | breakeven_inflation_tool | Bond | Inflation-Linked | Nein | Planned | | inflation_sensitivity_tool | Bond | Inflation-Linked | Nein | Planned | | currency_mismatch_tool | Bond/Forex | EM Sovereign | Nein | Planned | | supply_demand_tool | Commodity | Alle | Ja | Spezifiziert | | inventory_seasonality_tool | Commodity | Alle | Ja | Spezifiziert | | cost_curve_tool | Commodity | Industriemetalle | Ja | Spezifiziert | | geopolitical_supply_risk_tool | Commodity | Kritische, Energie | Ja | Spezifiziert | | safe_haven_demand_tool | Commodity | Edelmetalle | Nein | Planned | | opec_policy_tool | Commodity | Energie | Nein | Planned | | refining_margin_tool | Commodity | Energie | Nein | Planned | | weather_risk_tool | Commodity | Agrar | Nein | Planned | | seasonality_tool | Commodity | Agrar | Nein | Planned | | stock_to_use_tool | Commodity | Agrar | Nein | Planned | | substitution_risk_tool | Commodity | Kritische | Nein | Planned | | strategic_stockpile_tool | Commodity | Kritische | Nein | Planned | | recycling_efficiency_tool | Commodity | Recycling | Nein | Planned | | scrap_availability_tool | Commodity | Recycling | Nein | Planned | | substitution_potential_tool | Commodity | Recycling | Nein | Planned | | tracking_error_tool | ETF | Index, Commodity-ETC | Ja | Spezifiziert | | holdings_quality_tool | ETF | Active, Smart Beta, Thematic | Ja | Spezifiziert | | nav_premium_discount_tool | ETF | Alle (besonders ETC) | Ja | Spezifiziert | | fee_efficiency_tool | ETF | Alle | Ja | Spezifiziert | | alpha_generation_tool | ETF | Active | Nein | Planned | | manager_track_record_tool | ETF | Active | Nein | Planned | | volatility_decay_tool | ETF | Leveraged/Inverse | Nein | Planned | | rebalancing_cost_tool | ETF | Leveraged/Inverse | Nein | Planned | | path_dependency_tool | ETF | Leveraged/Inverse | Nein | Planned | | counterparty_risk_tool | ETF/Derivative | Commodity-ETC, Swaps | Nein | Planned | | futures_curve_tool | Derivative | Index/Commodity/Crypto Futures | Ja | Spezifiziert | | funding_oi_tool | Derivative | Crypto Futures | Ja | Spezifiziert | | volatility_skew_tool | Derivative | Options | Ja | Spezifiziert | | gamma_exposure_tool | Derivative | Options | Ja | Spezifiziert | | basis_convergence_tool | Derivative | Index Futures | Nein | Planned | | open_interest_tool | Derivative | Index Futures | Nein | Planned | | roll_yield_tool | Derivative | Commodity Futures | Nein | Planned | | inventory_correlation_tool | Derivative | Commodity Futures | Nein | Planned | | liquidation_risk_tool | Derivative | Crypto Futures | Nein | Planned |

| put_call_ratio_tool | Derivative | Options | Nein | Planned |


```
| basis_risk_tool | Derivative | Swaps | Nein | Planned |
| collateral_quality_tool | Derivative | Swaps | Nein | Planned |
**Zusammenfassung**: 36 Full Cards spezifiziert, 90+ weitere Tool-IDs als Planned
markiert. Gesamt: 126 Tools im Katalog.
---
```

## \## 9. DEPENDENCY-INVENTAR (erweitert mit Version-Spalte)

```
| AbhÃ¤ngigkeit | Typ | Betroffene Komponenten | Version | Status | Risiko bei Ausfall |
Quelle |
|---|---|---|---|---|---|---|
| CMC API | REST | Crypto Data Ingestion | v2 (pro-api) | Produktiv | Mittel (Fallback
CoinGecko) | Produktiv |
| CoinGecko API | REST | Crypto Data Ingestion | public v3 | Produktiv | Mittel (Fallback
Binance) | Produktiv |
| Binance API | REST | Crypto Fallback | â¬- | Produktiv | Niedrig (Fallback Kraken) |
Produktiv |
| Stooq | REST/CSV | Equity/Forex/Commodity Data | â¬— | Produktiv | Hoch (kein Fallback)
| Produktiv |
| Alpha Vantage | REST | Equity Fundamentals | v5 | Produktiv (Quote only) | Hoch
(Fundamentals ungenutzt) | Produktiv, zu erweitern |
| NewsAPI | REST | Sentiment Agent | v2 | Produktiv (nicht an Scoring) | Niedrig
(optional) | Produktiv, zu erweitern |
| Supabase | DB/Auth | Backtesting, Audit, IAM | â¬- | Produktiv | Hoch | Produktiv |
| Google Gemini | LLM | alle Agenten | 2.5-flash / 3.1-pro | Produktiv | Hoch (Single
Provider) | Produktiv |
| EventMesh | Event Bus | Audit, Reporting | ESS-0013 | Teilweise | Mittel | Produktiv, zu
erweitern |
| Model Registry | YAML Config | alle Scoring-Modelle | 2.0.0 | Neu | Hoch (zentral) | Neu
|
| Factor Tool Registry | Code Modules | Layer 4 | 1.0.0 | Neu | Mittel (Fallback LLM) |
Neu |
| On-Chain Data | RPC/Subgraph | Crypto On-Chain Tools | â¬- | Fehlt | Mittel (LLM
kompensiert) | Neu (Backlog) |
| Fundamentals Feed | REST | Equity Tools | â¬- | Teilweise (Alpha Vantage ungenutzt) |
Hoch fÃ¼r Equity | Produktiv, zu erweitern |
| VIX Data | REST/CBOE | Index Vol Tools | â¬– | Fehlt | Mittel (proxy via Stooq) | Neu
(Backlog) |
| Bond Yield Feed | REST | Bond Tools | â¬– | Fehlt | Hoch fÃ¼r Bond-Modelle | Neu
(Backlog) |
| ETF Holdings Feed | REST | ETF Tools | â¬- | Fehlt | Mittel | Neu (Backlog) |
| Derivatives Feed | REST/WebSocket | Derivative Tools | â¬- | Fehlt | Hoch fÃ¼r
Derivativ-Modelle | Neu (Backlog) |
---
```

## \## 10. INTEGRATIONSSTRATEGIE

Die Architektur wird in 4 Phasen an die Produktivumgebung angebunden, ohne bestehende Services zu verÃ¤ndern.

```
\### Phase 1: Adapter-Layer (Woche 1-3)
**Ziel**: Bestehende Service-Outputs werden Ã¼ber Adapter in das Universal Asset Interface
gemappt.
```
Produktivumgebung Produktivumgebung Enterprise Architecture Enterprise Architecture
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ CryptoOrchestratorâ”‚â”€â”€â†’ CryptoAdapter â”€â”€â†’â”‚ UAI Asset â”‚
â”‚ RawMaterialsOrch. â”‚â”€â”€â†’ CommodityAdapter â”€â”€â†’â”‚ UAI Asset â”‚
â”‚ scoring.service â”‚â”€â”€â†’ CryptoScoreAdapter â”€â”€â†’â”‚ UAI Score â”‚
â”‚ ranking.service â”‚â”€â”€â†’ RankingAdapter â”€â”€â†’â”‚ UAI Ranking â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
```


**Adapter implementieren**: - CryptoAdapter: mappt `CryptoAnalysisPayload` â†’ UAI - CommodityAdapter: mappt `RawMaterials.AnalysisPayload` â†’ UAI - EquityAdapter: mappt `calculateAssetScore()` â†’ UAI (vorlÃ¤ufig heuristic-basiert) - ForexAdapter, BondAdapter, IndexAdapter: neue Endpoint-Adapter (keine bestehende Logik)

**Feature Flag**: `enterprise_screening_enabled` (default: false). Adapter laufen nur, wenn Flag aktiviert.

\### Phase 2: Shadow Mode (Woche 4-6)

**Ziel**: Enterprise-Architektur berechnet parallel Scores, ohne Produktiv-Scores zu Ã¼berschreiben.

```typescript // Bei jedem /api/crypto/score Aufruf: 1. Produktivumgebung berechnet Score (wie bisher) 2. Enterprise-Architektur berechnet Score parallel (shadow) 3. Beide Scores werden in shadow_comparison Tabelle gespeichert 4. delta = enterpriseScore - productionScore wird geloggt 5. API-Response enthÃ¤lt nur Produktiv-Score (keine VerÃ¤nderung fÃ¼r User)

```

**Metriken**: - Delta-Verteilung (mean, median, p95) - Ranking-Ãœberschneidung (wie oft stimmen Top-10 Ã¼berein?) - Confidence-Delta

\- DQScore-Verbesserung

**Abbruchkriterium**: Wenn delta > 30 Punkte bei >20% der Assets â†’ Architektur-Review vor Phase 3.

\### Phase 3: Parallel Ranking (Woche 7-9)

**Ziel**: Top-10-Ranking wird parallel berechnet. User kÃ¶nnen beide Rankings vergleichen.

- ```

GET /api/crypto/top10 GET /api/enterprise/top10

â†’ Produktiv-Ranking (wie bisher) â†’ Enterprise-Ranking (neu)

GET /api/enterprise/compare â†’ Side-by-Side Vergleich

```

**Aktivierung**: - Feature Flag: `enterprise_ranking_visible` (default: true fÃ¼r Admin, false fÃ¼r User) - Audit-Trail vergleicht beide Rankings auf Konsistenz

\### Phase 4: Produktivumschaltung (Woche 10-12)

**Ziel**: Enterprise-Architektur wird primÃ¤res Scoring-System.

**Umschaltung**: 1. Feature Flag: `enterprise_scoring_primary = true` 2. /api/crypto/score nutzt Enterprise-Scoring 3. Produktiv-Scoring lÃ¤uft als Shadow weiter (Rollback-Sicherheit)

4. Nach 30 Tagen stabiler Operation: Produktiv-Scoring wird deprecated

**Rollback**: Feature Flag auf `false` setzen â†’ sofortige RÃ¼ckkehr zur Produktiv-Logik.

- \---

\## 11. AUDIT & GOVERNANCE

\### 11.1 Audit Trail Format

Jede Score-Berechnung erzeugt einen Audit-Trail-Eintrag:

```json {


```
"audit_id": "audit-2026-08-01-001",
"timestamp": "2026-08-01T16:00:00Z",
"asset_id": "crypto-eth-001",
"model_used": "crypto-base-1.1.0",
"model_version": "1.1.0",
"inputs": {
"marketCap": 450000000000,
"liquidity": 88,
"volatility": 61,
"source": "coinmarketcap"
},
"formula": "score = Î£(effectiveValue_i Â· weight_i / Î£ verfÃ¼gbarer weights)",
"weights_applied": {"marketCap": 0.15, "liquidity": 0.13},
"intermediate_results": {
"marketCap_normalized": 92,
"marketCap_weighted": 13.8,
"liquidity_weighted": 11.44
},
"final_score": 87.5,
"confidence": 0.95,
"data_quality_score": 88,
"model_reasoning": "category_main=Layer 1 -> default BaseModel",
"tools_executed": ["tokenomics_tool", "onchain_quality_tool", "security_audit_tool"]
}
```
### 11.2 Model Version Governance
- Jede ModellÃ¤nderung erfordert einen neuen Versionseintrag in der Model Registry
(semver).
- Major Version (x.0.0): GewichtsÃ¤nderung, neue Metriken, FormelÃ¤nderung.
- Minor Version (1.x.0): Neue Tools hinzugefÃ¼gt, Schwellenwert-Anpassung.
- Patch Version (1.0.x): Bugfixes, keine Score-Ã„nderung.
- Version-Wechsel erfordert Walk-Forward-Backtest und Shadow-Comparison.
### 11.3 BaFin-Compliance-Checkliste
- [x] Transparenz: Jede Score-Komponente nachvollziehbar (audit_trail)
- [x] Reproduzierbarkeit: `calculation_version` + `audit_trail.inputs` â†’ gleicher Score
- [x] Nachvollziehbarkeit: Datenherkunft dokumentiert (`data_sources`)
- [x] Fehlerresistenz: Missing-Field-Handling via `renormalizeAndScore()`
- [x] DatenqualitÃ¤t: `data_quality`-Objekt pro Asset
- [ ] SCORING-Compliance-Scanner (SCR-013, Backlog)
---
## 12. BACKTESTING & MONITORING
### 12.1 Walk-Forward Backtesting
```
FÃ¼r jedes Modell (modelId):
1. WÃ¤hle Startdatum T0 und Enddatum T1
2. Teile [T0, T1] in n Fenster gleicher LÃ¤nge
3. FÃ¼r jedes Fenster i:
a. Trainiere/Justiere Gewichte auf Fenster [0, i-1] (falls anpassbar)
b. Evaluiere auf Fenster i (out-of-sample)
c. Record: hitRate, precision, recall, F1, meanDelta
4. Aggregate: meanHitRate, hitRateStability, worstWindow
```
### 12.2 Drift Monitoring
```
FÃ¼r jedes Modell (modelId), tÃ¤glich:
1. Berechne Score-Verteilung der letzten 30 Tage
2. Vergleiche mit Score-Verteilung der vorherigen 30 Tage
3. KL-Divergenz > Threshold â†’ drift_alert
4. PrÃ¼fe auf Metrik-Level-Drift (welche Metrik hat sich am meisten verschoben?)
```


```

\### 12.3 Live-vs-Shadow Comparison

```

FÃ¼r jedes Asset mit Shadow-Score:

- 1. Berechne delta = enterpriseScore - productionScore

- 2. Tracke delta-Verteilung Ã¼ber Zeit

- 3. Alert bei delta > 2 Standardabweichungen vom 30-Tage-Mittel 4. Logging: welche Tools/Metriken tragen am meisten zum delta bei?

```

\### 12.4 Operational Monitoring (SLOs)

```
| SLO | Target | Alert Threshold | Metric |
|---|---|---|---|
| Scoring Latency (p95) | < 2s | > 5s | Zeit von data.validated bis score.approved |
| Data Source Availability | > 99.5% | < 98% | Erfolgreiche API-Calls / Gesamt |
| Score Drift | KL-Divergenz < 0.1 | > 0.3 | 30-Tage Score-Verteilungs-Vergleich |
| Model Error Budget | < 5% Anomalien | > 10% | Assets mit delta > 2Ïƒ vom 30-Tage-Mittel
```

|

```
| Audit Trail Completeness | 100% | < 99% | Audit-EintrÃ¤ge / Score-Berechnungen | | Shadow Delta Stability | mean delta < 5 | mean delta > 15 | Enterprise vs. Produktion | | Confidence Distribution | mean > 0.75 | mean < 0.60 | Alle eligible Assets | | DQ Score Distribution | mean > 70 | mean < 50 | Alle eligible Assets |
```

**Alert-KanÃ¤le**: Dashboard (real-time), Event Bus (`monitoring.alert`), optional Email/Push bei kritischem SLO-VerstoÃŸ.

\---

\## 13. ROADMAP ZUR ANBINDUNG

| Phase | Zeitraum | Ziel | Deliverables |

|---|---|---|---|

| Phase 1 | Woche 1-3 | Adapter-Layer | CryptoAdapter, CommodityAdapter, EquityAdapter,

Feature Flags |

| Phase 2 | Woche 4-6 | Shadow Mode | Shadow-Comparison-Tabelle, Delta-Metriken, Alert- Thresholds |

| Phase 3 | Woche 7-9 | Parallel Ranking | Enterprise Top-10 Endpoints, Side-by-Side UI, Admin Dashboard |

| Phase 4 | Woche 10-12 | Produktivumschaltung | Feature Flag Switch, Rollback-Test, Deprecation Plan |

| Phase 5 | Monat 4 | Subclass Tools | Implementierung der 40+ Factor Tools gemÃ¤ÃŸ Tool- Katalog |

| Phase 6 | Monat 5-6 | Neue Assetklassen | Equity/Forex/Index/Bond/ETF/Derivatives voll implementiert |

| Phase 7 | Monat 7+ | Cross-Asset | Meta-Score, Cross-Asset-Allokation, Portfolio- Optimierung |

\---

\## 14. ZUSAMMENFASSUNG

Dieses Blueprint definiert eine State-of-the-Art FinTech Enterprise-Architektur fÃ¼r Multi-Asset-Screening und Scoring mit:

```
\- **9 Schichten** von Data Ingestion bis Reporting
- **8 Asset-Class Engines** mit jeweils eigenen Modellen und Tools
- **126 Subcategory Evaluation Tools** (36 mit Full Specs, 90+ als Planned markiert) mit
definierten Inputs, Formeln, Datenquellen und TestfÃ¤llen
- **Model Registry** mit versionierten, YAML-konfigurierbaren Scoring-Modellen
- **Adapter-Layer** fÃ¼r entkoppelte Anbindung an die Produktivumgebung
- **4-Phasen-Integrationsstrategie** (Adapter â†’ Shadow â†’ Parallel â†’ Produktiv)
- **VollstÃ¤ndige Auditierbarkeit** und BaFin-KonformitÃ¤t
- **Backtesting-Framework** mit Walk-Forward und Drift-Monitoring
```

Die Architektur ist framework-unabhÃ¤ngig, Ã¼ber YAML/JSON konfigurierbar und kann unabhÃ¤ngig von der Produktivumgebung erweitert werden.


\---

*Dieses Blueprint basiert auf ARCH-SCREEN-0001 (Bestandsaufnahme + Erweiterung) und definiert die Zielarchitektur. Alle Ãœbernahme-/Ersetzungs-Entscheidungen aus ARCH-SCREEN-

0001 sind hier in die Modul- und Tool-Spezifikationen eingeflossen.*
