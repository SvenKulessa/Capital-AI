# Wallet / Crypto-Checkout Residual — 2026-11-06

**Issue:** #579 CA-COMMERCE-WALLET-01  
**Status:** Vorbereitung isoliert, Live-Aktivierung BLOCKED  
**Baseline:** aktueller main

## Verifizierter Bestand
- Auth bleibt Supabase-Session/Identität; Wallet-Adresse ist keine User-ID.
- Bestehende Stripe-Checkout- und Entitlement-Pfade dürfen nicht durch Crypto umgangen oder gefälscht werden.
- Separater Settlement-Ledger für Crypto erforderlich (noch nicht implementiert).

## Vorbereiteter Branch
`capital-ai-product/wallet-discovery-feature-20261106`  
Isoliertes `server/wallet-discovery.mjs` mit Feature-Flag `CAPITAL_AI_WALLET_DISCOVERY_ENABLED`.  
Connect / Quote / Checkout / Subscription / Mainnet-Capabilities für Polygon, Solana, XRPL strikt deaktiviert.  
Negative Tests vorhanden. Kein HTTP-Route-Wiring, keine UI, kein Wallet-Connect.

## Offene Meilensteine (Owner-Action erforderlich)
- M0: Supabase-Provider read-only + MiCA/AML/Steuer-Grenzen
- M1: Read-only UI unter Flag + Wallet-Challenge (Nonce, Origin, Replay-Schutz)
- M2–M4: Testnet-Adapter, Settlement-Ledger, Rechte/Security/Mainnet-Freigabe → BLOCKED bis Owner-Readback

**Keine Kosten, kein Custody, keine privaten Schlüssel, keine Mainnet-Zahlungen in diesem Schritt.**

Nächster autonomer Schritt: nach CI-Nachweis auf dem Vorbereitungsbranch isolierte Tests reviewen; kein Merge ohne vollständigen Scope-Nachweis.
