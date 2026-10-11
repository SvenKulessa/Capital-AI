---
name: quant-research
description: "Faktormodelle, Backtesting, Portfolio Science und quantitative Validierung; shared specialist skill accessible in PRODUCT, MARKET, PLATFORM, TRUST and GROWTH."
---

# quant-research — CAPITAL-AI Fach-Skill

**Anwendungsbereich:** Faktormodelle, Backtesting, Portfolio Science und quantitative Validierung.
**Priorität:** Hoch; **fachliche Schwerpunkte:** MARKET. Alle fünf Domains dürfen diesen Skill im selben Chat verwenden.

## Fachlicher Ablauf

1. Hypothese, Universum, Benchmark, Faktor, Vintage, Dataset-Rechte und Rebalancing-Kalender spezifizieren.
2. Look-ahead, Survivorship, Selection und Leakage anhand Point-in-Time-/As-Of-Tests ausschließen.
3. Train/Validation/Test, Walk-Forward und Out-of-Sample strikt trennen.
4. Slippage, Transaktionskosten, Liquidität, Drawdown, Turnover, Unsicherheit und Stress-Szenarien berichten.
5. Simulierte Forschung nicht als echte Rendite, geprüfte Anlagestrategie oder aktive Produktionsfunktion darstellen.

## Repository-Anker

- `src/platform/FinanceScoringResearch/FinancePointInTimeAdmission.ts`
- `src/platform/FinanceScoringResearch/CommodityHistoricalBacktestEngine.ts`
- `src/platform/FinanceScoringResearch/FinanceResearchModelEvaluation.ts`

## Erwartete Evidence und Grenzen

Input-Dataset/Vintage, Code-SHA, Backtest-Parameter, Leakage-Tests und Provenance; Performance-Claims ohne reproduzierbare Evidence NOT_PROVEN.

## Gemeinsamer Arbeitsmodus

- `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1` ist die einzige autorisierende Repository-Richtlinie. Dieser Skill erzeugt **keine zusätzlichen Required Checks**, Reviews, Admissions, Handoffs, Kosten- oder Deployment-Freigaben.
- Im aktuellen `main` und an den realen Trust Boundaries prüfen, nur gezielte versionspassende Primärquellen heranziehen. Bei Bedarf mit beliebigen anderen Domain- oder Spezial-Skills kombinieren.
- Optionen nach Wirkung, Kosten, Sicherheit, Datenschutz, Lizenzen und Reversibilität beurteilen. Technische Testerfolge getrennt von Security-, Rechte- und Production-Freigaben ausweisen; VERIFIED nur mit Evidence, sonst NOT_PROVEN oder REVIEW_REQUIRED.
- Skill-Dateien gewähren keine ChatGPT-Plugin-Installation, Secrets, Providerberechtigung oder Tool-Rechte. Keine kostenpflichtige Aktivierung ohne ausdrückliche Owner-Zustimmung.
