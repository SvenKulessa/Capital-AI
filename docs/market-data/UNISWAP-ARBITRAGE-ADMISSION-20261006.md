> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**
> Diese Datei bleibt als historische oder fachliche Dokumentation erhalten. Sie erzeugt keine zusätzlichen Repository-Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Autoritativ ist ausschließlich `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`. Konkrete gesetzliche, regulatorische, Security- oder Provider-/Lizenzpflichten bleiben davon unberührt.

# Uniswap Arbitrage Integration – Gate 2026-10-06

Status: QUOTE_INTEGRATED_EXECUTION_BLOCKED
Domain: MARKET + TRUST + PRODUCT

## Scope

CAPITAL-AI integriert Uniswap zunächst als serverseitig authentifizierte Quote-/Routing-Quelle
für spätere CEX↔DEX-Arbitrage. Der aktuelle Slice erzeugt keine Swap-Transaktion und hält
keinen Wallet-Private-Key serverseitig.

Routen:

- `GET /api/market/arbitrage/uniswap/readiness`
- `POST /api/market/arbitrage/uniswap/quote`
- `GET /api/market/trading/capabilities`

## Sicherheitsgrenzen

- `UNISWAP_API_KEY` bleibt ausschließlich serverseitig.
- Quote-Aufrufe verlangen verifizierte User-Session und same-origin.
- Token-/Wallet-Adressen, Chain-IDs, Betrag und Slippage werden bounded validiert.
- Die Upstream-`/quote`-Antwort wird auf Analysefelder projiziert; `swapTransaction`,
  `permitTransaction`, `permitData`, `encodedOrder` und andere ausführbare
  Payloads werden im Quote-only-Slice nicht an den Browser weitergereicht.
- `executionEnabled=false` und `arbitrageExecutionEligible=false` bleiben hart gesetzt.
- Ein späterer Swap benötigt User-Wallet-Signatur oder einen separat genehmigten Custody-Vertrag.
- Kein Kraken-/Supabase-Secret wird für Uniswap wiederverwendet.

## Production-/Rechte-Gate

Die technische Quote-Integration ist keine Provider-Terms-, Datenrechte-, Smart-Contract-,
Wallet-, MEV-, Slippage- oder Production-Freigabe. Vor automatisierter Arbitrage müssen
mindestens Route-/Token-Allowlist, Chain/RPC-Authority, Quote-Freshness, Gas, MEV/Slippage,
Approval/Permit, Nonce, Idempotency, Wallet-Signatur, Audit-Evidence und Verlustlimits
separat geschlossen werden.


## Arbitrage Risk Envelope

Der Quote-Pfad liefert zusätzlich einen fail-closed Risk-Envelope:

- Quote-Freshness: lokale `receivedAt`-Zeit plus kurze `expiresAt`-Grenze; eine Provider-`observedAt`-Zeit wird nicht erfunden.
- Slippage: gegen `UNISWAP_MAX_SLIPPAGE_PERCENT` geprüft.
- Price Impact: gegen `UNISWAP_MAX_PRICE_IMPACT_PERCENT` geprüft, sofern der Providerwert vorhanden ist; fehlt er, bleibt das Gate geschlossen.
- Gas: gegen `UNISWAP_MAX_GAS_FEE_USD` geprüft, sofern ein belastbarer USD-Gaswert projiziert werden kann.
- Verlustlimit: benötigt expliziten Analysekontext mit `notionalUsd`, `expectedGrossProfitUsd` und `maxLossUsd`; ohne diese Evidence bleibt die Arbitrage-Analyse blockiert.
- MEV: nur ein expliziter `PRIORITY`-Routewert wird als UniswapX-Priority-Signal erkannt; daraus entsteht trotzdem keine Execution-Freigabe.

### Wallet Boundary

- `walletPrivateKeyServerSide=false`
- `signatureAuthority=USER_WALLET`
- `custodyEnabled=false`
- Permit-/Swap-/Order-Payloads werden im aktuellen Quote-only-Pfad nicht als serverseitige Signatur- oder Broadcast-Autorität verwendet.
- `/swap` und `/order` werden von CAPITAL-AI in diesem Slice nicht aufgerufen.

Status:
`ARBITRAGE_ANALYSIS_FAIL_CLOSED / USER_WALLET_SIGNATURE_REQUIRED / EXECUTION_BLOCKED`
