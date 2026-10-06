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
