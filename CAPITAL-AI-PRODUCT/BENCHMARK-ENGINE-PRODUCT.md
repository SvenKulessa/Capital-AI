# CAPITAL-AI Benchmark Engine — Product- und Monetarisierungsstart

Primary Domain: PRODUCT  
Cross-Domain: PLATFORM / TRUST  
Status: WEB_SAAS_ENTITLEMENT_SLICE_IMPLEMENTED

## Ziel

Die Benchmark Engine wird als reproduzierbares Evidence-Produkt aufgebaut. Der erste reale Benchmark ist
`CAPITAL_AI_EVENT_BACKBONE@1` mit der Matrix:

- NATS JetStream + Node/TypeScript
- NATS JetStream + Rust
- Apache Kafka + Node/TypeScript
- Apache Kafka + Rust

Gemessen werden Publish, Persist, Consume, ACK, Redelivery, Replay, Restart-Recovery,
Latenz p50/p95/p99, Throughput, CPU, RAM, Disk, verlorene/duplizierte Events sowie Security-/SBOM-/CVE-Evidence.

## Preisautorität

Es werden **keine neuen Stripe-Produkte oder Preise** angelegt. Die Benchmark Engine wird an den bestehenden
CAPITAL-AI SaaS-Katalog gebunden.

Live read-only gegen Stripe am 2026-10-05 bestätigt:

| Tier | Produkt | Monat | Jahr |
|---|---|---:|---:|
| Starter | `prod_VMtsmoPBqTHdww` | 7,00 EUR | 75,60 EUR |
| Pro | `prod_VMtsNeuSad0Dvx` | 29,00 EUR | 248,00 EUR |
| Enterprise | `prod_VMtsvVRz0nORcx` | 109,00 EUR | 1.280,00 EUR |

Die Price IDs bleiben im bestehenden `src/data/pricingCatalog.ts` authoritative.

## Benchmark-Entitlements v1

| Capability | Starter | Pro | Enterprise |
|---|---:|---:|---:|
| Standardprofile | ✓ | ✓ | ✓ |
| Neutraler GitHub Check | ✓ | ✓ | — |
| Historische Vergleiche | — | ✓ | ✓ |
| Regression Detection | — | ✓ | ✓ |
| Evidence Export | — | ✓ | ✓ |
| Custom Profiles | — | — | ✓ |
| Custom Thresholds | — | — | ✓ |
| Enforced PR Gate | — | — | ✓ |
| API | — | — | ✓ |
| Self-hosted Runner | — | — | ✓ |

Diese Matrix ist eine Produktkonfiguration und keine Sicherheits- oder Production-Freigabe.

## Evidence-Grenze

Jeder Run muss an exakten Git-SHA, Broker-Image-Digest, Worker-Image-Digest und SBOM-Digest gebunden sein.

`CAPITAL_AI_BENCHMARK_EVIDENCE@1` setzt deshalb immer:

- `productionEligible=false`
- `decisionEligible=false`
- `reason=BENCHMARK_EVIDENCE_ONLY`

Ein erfolgreicher Benchmark darf später von einer separaten Release Policy als Evidence konsumiert werden,
erteilt aber niemals selbst eine Production-Freigabe.

## GitHub Marketplace

Stripe und GitHub Marketplace bleiben getrennte Commerce-/Entitlement-Systeme:

- CAPITAL-AI Website: bestehende Stripe-Tiers Starter / Pro / Enterprise.
- GitHub Marketplace: eigene Marketplace Plan IDs und `marketplace_purchase`-Lifecycle.
- Kein Stripe-Status wird als autoritative Marketplace-Entitlement-Quelle interpretiert.
- Gemeinsame Capability-Namen können geteilt werden; Billing Authority bleibt systemspezifisch.

## Implementierter Website-Commerce-Slice

PRODUCT bindet CADS jetzt ohne neue Stripe-SKUs an die bestehenden SaaS-Tiers:

- `server/cads-commerce.mjs` projiziert die kanonische Capability-Matrix.
- `auth.resolvePaidTier()` bleibt die serverseitige Website-Entitlement-Authority.
- `GET /api/cads/commerce/readiness` veröffentlicht nur nicht-sensitive Produkt-/Capability-Metadaten.
- `GET /api/cads/commerce/entitlement` verlangt verifizierte Authentifizierung und ein aktives/trialing Paid-Tier.
- Die Pricing-Oberfläche zeigt CADS-Funktionen je Starter/Pro/Enterprise direkt aus `BENCHMARK_TIERS`.
- GitHub Marketplace wird ausdrücklich nicht aus Stripe-Status abgeleitet.

## Nächster Vertical Slice

PLATFORM führt `CAPITAL_AI_EVENT_BACKBONE@1` als reale NATS/Kafka × Node/Rust 4er-Matrix isoliert aus.
TRUST bindet SBOM/CVE/Reachability-Evidence. PRODUCT ergänzt Ergebnisprojektion und Runtime-Readback.
Danach kann die separate GitHub-Marketplace-App mit Minimalrechten, Plan IDs und
`marketplace_purchase`-Lifecycle implementiert werden.
