# FinancialData.Net / fdnpy Integration — 2026-10-02

Primary Domain: MARKET  
Cross-Domain: TRUST / PLATFORM / PRODUCT

## Ausgangspunkt

Upstream SDK: `financialdatanet/fdnpy`  
Reviewed commit: `e46103c95ba04927057609268765a5711b3ad656`  
Package: `fdnpy 0.6.0`

Der SDK-Quellcode deklariert MIT über `setup.py`; PyPI führt 0.6.0 ebenfalls als MIT. Im geprüften GitHub-Root liegt jedoch keine separate `LICENSE`-Datei. Deshalb wird der SDK nicht vendored oder in das produktive Node-Image installiert. CAPITAL-AI integriert die Schnittstelle über einen isolierbaren Adaptervertrag.

## Provider vs. Software

`fdnpy` ist der Software-Connector. Der eigentliche Datenprovider ist `FinancialData.Net`.

Diese Identitäten dürfen nicht vermischt werden:

- Software-Lizenz des SDK: MIT-Metadaten;
- API-Zugang: FinancialData.Net Account/API-Key;
- Datenrechte: jeweiliger Subscription-Plan + Dataset-/Feed-Scope;
- Display/Redistribution: separate Providerrechte;
- Derived Scores/Research, Cache/Retention und Resale: weiterhin eigene Rights-Gates.

## Relevante Anbindungen

Katalogisiert sind:

1. FinancialData.Net REST API v1;
2. `fdnpy` Python SDK als optionaler Sidecar;
3. Universal Query als feld-/filterbare Abfrageschnittstelle;
4. offizieller FinancialData.Net MCP Server als AI-Agent-Anbindung;
5. Excel Add-in als Analysten-/Research-Workflow, nicht als produktiver Market-Ingress.

## Relevante Dataset-Gruppen

Aus dem offiziellen SDK werden folgende Gruppen in den MARKET-Katalog projiziert:

- Symbol-/Instrument-Reference;
- Marktpreise und Quotes;
- Optionen und Futures;
- Fundamentals, Statements und Ratios;
- News, Event-Kalender und Makro;
- Insider-, Senate-/House- und institutionelle Daten;
- ETF-/Mutual-Fund-, ESG- und Adviser-Daten;
- Analyst Consensus, Earnings, IPOs, Splits, Dividenden und Short Interest.

Die genaue Methodenliste liegt maschinenlesbar in `src/data/financialDataNetIntegration.ts`.

## Rechte-Readback

Die aktuellen FinancialData.Net Terms erlauben Nutzung nur im Rahmen der Legal Terms bzw. des jeweiligen Subscription-Plans. Redistribution ist dort ausdrücklich an einen Plan gebunden, der Redistribution erlaubt.

Die aktuelle Pricing-Seite unterscheidet unter anderem:

- **Professional:** Internal Commercial Use;
- **Enterprise:** Internal + External Commercial Use sowie Data Display & Redistribution.

Diese öffentliche Beschreibung ist **kein Nachweis**, dass der CAPITAL-AI-Account einen bestimmten Plan besitzt oder dass jeder einzelne Exchange-/Dataset-Scope darin enthalten ist. Deshalb bleibt der neue Provider-Datensatz in `license-rights-review.json` auf `CONTRACT_SCOPE_UNVERIFIED` und `deployEligible:false`.

## Aktivierungsgrenze

Der Adapter `financialdatanet` wird registriert, liefert aber absichtlich keine Observation. Bis die Rechte- und Canonical-Mapping-Evidence geschlossen ist, endet jeder Fetch mit:

`FINANCIALDATANET_RIGHTS_AND_DATASET_MAPPING_REQUIRED`

Auch der `fdnpy` Sidecar-Eintrag meldet bis dahin `ACTIVATION_REVIEW_REQUIRED`.

## Benchmark-Grenze

FinancialData.Net/fdnpy erhält **keine erfundenen Simulationswerte** für Latenz, Throughput, Recovery oder SLA. Der bestehende OSS-Pipeline-Simulator überspringt Ingress-Komponenten ohne verifizierten Profil-Eintrag. Ein späteres Benchmarkprofil muss aus reproduzierbaren Messungen entstehen und bleibt von Nutzungsrechten getrennt.

## Quellen

- https://github.com/financialdatanet/fdnpy
- https://pypi.org/project/fdnpy/
- https://financialdata.net/documentation
- https://financialdata.net/terms-of-service
- https://www.financialdata.net/pricing
