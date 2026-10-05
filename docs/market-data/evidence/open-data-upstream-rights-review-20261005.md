# Open-Data Upstream Rights Review — 2026-10-05

## Korrelation

- Repository: `SvenKulessa/Capital-AI`
- CURRENT_MAIN: `caa2c14fb4b317529f7a05385ca11eb7016b7f8a`
- Policy: `OPEN_SOURCE_AND_OPEN_DATA_ONLY`
- Scope: read-only rights research; no runtime activation, no provider admission mutation, no deploy.

## Crypto — RepOD Binance140

Candidate:
- RepOD DOI: https://doi.org/10.18150/WPGY4R
- Dataset: 140 Binance crypto/USDT exchange-rate series, 1-minute sampling, 2021-01-01 to 2024-09-30.
- Repository record declares CC0 for the deposited dataset.

Upstream:
- The dataset is explicitly sourced from Binance.
- Binance Vision Dataset Terms v1.0 (2026-08-26) classify Binance historical datasets as CC BY-NC-SA 4.0 and state that commercial use requires a separate written enterprise data licence.

Decision:
- `BLOCKED_UPSTREAM_NONCOMMERCIAL`
- RepOD CC0 does not establish a rights chain that overrides upstream Binance restrictions.
- No `marketQuotes` or `scoringPriceInput` admission.

Evidence:
- https://repod.icm.edu.pl/dataset.xhtml?persistentId=doi%3A10.18150%2FWPGY4R
- https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md

## Stocks — Zenodo / Yahoo Finance

Candidate:
- Zenodo DOI: https://doi.org/10.5281/zenodo.20192822
- Daily OHLCV for 20 S&P 500 equities and VIX.
- Zenodo record declares CC BY 4.0 for the authors' curated dataset.
- Record explicitly states values were retrieved from Yahoo Finance through yfinance.

Upstream:
- Publicly available Yahoo/yfinance documentation does not provide a verified commercial redistribution grant for Yahoo Finance market data.
- Available Yahoo Finance client documentation warns that actual Yahoo Finance data is intended for personal use and refers users to Yahoo terms for the actual data rights.

Decision:
- `BLOCKED_UPSTREAM_COMMERCIAL_RIGHTS_UNVERIFIED`
- Do not bind the 20 SEC identities to this snapshot for production price/OHLCV use.

Evidence:
- https://zenodo.org/records/20192822
- https://github.com/yahoo-finance/yahoo-finance

## Commodities — World Bank Pink Sheet

Source:
- World Bank Commodity Markets / Pink Sheet.
- World Bank Data Catalog states World Bank-produced open datasets default to CC BY 4.0 unless otherwise marked.
- CC BY 4.0 permits copying, modification and distribution for commercial use with attribution and indication of changes.

Semantic boundary:
- Treat as `REFERENCE_SERIES`.
- Do not label as live spot market data.
- No `marketQuotes` or `scoringPriceInput` capability is granted by this review.

Decision:
- `RIGHTS_PASS_REFERENCE_SERIES_RUNTIME_ADAPTER_PENDING`

Evidence:
- https://datacatalog.worldbank.org/public-licenses
- https://www.worldbank.org/en/research/commodity-markets

## Forex — ECB euro reference rates

Source:
- ECB / ESCB publicly released statistics and euro foreign exchange reference rates.
- ESCB policy permits free commercial and non-commercial reuse of publicly released statistics if the source is quoted and the statistics/metadata are not modified.
- Third-party data are excluded.
- ECB states euro FX reference rates are published for information purposes and discourages transaction use.

Semantic boundary:
- Treat as `REFERENCE_RATE`, not executable spot FX.
- Preserve original value/metadata and source attribution.
- No `marketQuotes` or `scoringPriceInput` capability is granted by this review.

Decision:
- `RIGHTS_PASS_REFERENCE_RATE_RUNTIME_ADAPTER_PENDING`

Evidence:
- https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html
- https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html

## Indices — OECD share-price indices

Source:
- OECD Share Prices indicator / OECD Data Explorer.
- OECD Terms permit commercial reuse of OECD data except where additional restrictions or third-party rights apply.
- OECD explicitly requires users to verify metadata/source ownership and obtain permissions from third-party owners where applicable.
- Share-price index series are commonly sourced from national exchanges/index providers.

Decision:
- `BLOCKED_SERIES_LEVEL_THIRD_PARTY_RIGHTS_UNVERIFIED`
- No 20-cash-index production manifest can be admitted until each concrete series has owner/source/right evidence.

Evidence:
- https://www.oecd.org/en/about/terms-conditions.html
- https://www.oecd.org/en/data/indicators/share-prices.html

## Admission impact

- Crypto spot OHLCV: BLOCKED
- Stock price/OHLCV: BLOCKED
- Commodities reference series: RIGHTS PASS; runtime/source-admission contract pending
- Forex reference rates: RIGHTS PASS; runtime/source-admission contract pending
- Cash indices: BLOCKED

No `OPEN_SOURCE_OPEN_DATA_ADMITTED` production capability was added by this review because the full source-admission contract, adapter/software evidence, instrument scope, and runtime evidence are not yet complete.
