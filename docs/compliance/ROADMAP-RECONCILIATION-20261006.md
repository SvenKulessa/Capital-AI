# Roadmap-Reconciliation — 06.10.2026

Basis-Main: `cef1d11f607778f5226ca1df97376ba408652c69`
Arbeitsbranch: `capital-ai-product/multi-agent-roadmap-20261006`
Primary Domain: PRODUCT
Cross-Domain: MARKET / PLATFORM / TRUST / GROWTH

## Zweck

Dieser Abgleich rekonstruiert die kanonische CAPITAL-AI-Roadmap aus dem aktuellen Code- und Dokumentzustand.
Er ersetzt keine Runtime-, Lizenz-, Security-, Provider-, Marketplace- oder Production-Freigabe.

Die Roadmap enthält aktuell **111 eindeutige Work-Packages**. Die Vollständigkeit wird durch
`src/data/roadmapCurrentMainState.ts` und
`src/data/__tests__/roadmapCurrentMainState.test.ts` regressiv erzwungen.

## Vollständiger Paketbestand

| Quelle | Work-Packages |
|---|---:|
| `src/data/roadmapData.ts` | 83 |
| `src/data/productionWebsiteWorkPackage.ts` | 5 |
| `src/data/socialContentRoadmap.ts` | 13 |
| `src/data/trustArchitectureAWorkPackages.ts` | 10 |
| **Gesamt** | **111** |

Jede ID ist genau einmal im Reconciliation-Snapshot enthalten. Wird ein Paket hinzugefügt, entfernt oder
umbenannt, schlägt die Roadmap-Reconciliation fehl, bis der Snapshot bewusst aktualisiert wurde.

## Methodik

Statuswerte werden nicht aus PR-Titeln oder grünen Tests abgeleitet. Ein Paket wird nur aktualisiert, wenn
mindestens eine konkrete Code-, Test-, Contract-, Evidence- oder Dokumentauthority im aktuellen Main den
Status trägt.

`progressPercent=100` bedeutet ausschließlich, dass der im Paket beschriebene Repository-Slice vollständig
implementiert und regressionsbelegt ist. Es bedeutet **nicht** Production-, Security-, Lizenz- oder
Runtime-Freigabe.

Für materiell fortgeschrittene, aber noch nicht abgeschlossene Pakete bleibt
`progressPercent=null` und `evidenceState=OFFEN` oder `GEHALTEN`.

## Wesentliche Korrekturen gegenüber älteren Roadmap-Ständen

### PRODUCT

- Die Hub-Navigation ist implementiert und regressionsbelegt.
- Learning Portal und Glossar besitzen einen implementierten Basisslice.
- Control Center und interaktive Roadmap sind vorhanden.
- Production-Web-PRODUCT ist nicht mehr bloß `planning`, bleibt aber wegen Runtime-/Handoff-Gates offen.
- Benchmark/CADS ist ein aktiver Produktpfad.
- CADS wird im Website-Commerce an die **bestehenden** Starter-/Pro-/Enterprise-Tiers gebunden; es werden
  keine neuen Stripe-SKUs erfunden.
- GitHub Marketplace bleibt eine separate, noch nicht implementierte Billing-/Entitlement-Authority.

### MARKET

- Die 50-Komponenten-/Scoring-Basis ist implementiert, produktive Rankings bleiben wegen Feature-/DQ-/
  Rights-/Scoring-Gates offen.
- Kraken Spot besitzt einen `AddOrder(validate=true)` Dry-Run mit Preview, Risk, Confirmation,
  Idempotency-Slice und Audit-Evidence; Live-Submit bleibt blockiert.
- Kraken Futures/Perpetuals besitzen getrennte Credential-Capabilities, aber keine Live-Execution.
- Uniswap ist als Quote-/Arbitrage-Analysepfad integriert; Wallet-Signatur und Execution bleiben getrennt.
- PR #212 ist in Main: Kraken/Binance Read-only BYOK, zentraler Private-Provider-Query-Contract und eine getrennte Rust/NATS-Bridge sind implementiert; Runtime-/Deployment-Evidence und mutierende Execution bleiben separat.
- Die Infrastruktur-/Benchmark-Arbeit ist aktiv, reale NATS/Kafka × Node/Rust Evidence bleibt auszuführen.

### PLATFORM

- Image-backed Docker-/Supply-Chain-Basis, Observability und CADS-Telemetrie sind vorhanden.
- Die Observability-Baseline ist regressionsbelegt.
- Komponenten-Inventar und Control-Center-CADS-Projektion sind als Repository-Slice verifiziert.
- Production Runtime, Restore/DR, Release-Handoff und reale Multi-Asset-Kapazität bleiben separate Gates.

### TRUST

- Contract-/Provider-/Security-Regressionen laufen im Preflight und Docker Security Gate.
- Auth-, AAL2-/MFA-, Owner-IAM-, BYOK- und Public-Artifact-Grenzen besitzen implementierte Basisslices.
- Supply-Chain-, Lizenz-, Datenrechte- und Production-Handoff-Freigaben bleiben getrennt.
- Ein erfolgreicher Test oder Benchmark darf keine dieser Freigaben implizieren.

### GROWTH

- SEO besitzt einen aktiven konsolidierten Architekturpfad.
- Social-Migration, Tool-/Modellrechte und Foundation sind inzwischen aktive Arbeitsstränge statt reinem
  Planungszustand.
- Kanal-Publishing, TTS-/Video-Qualität, UGC und Pilotabnahme bleiben evidence-bound offen.

## CADS-Monetarisierung — aktueller Produktzustand

Kanonische Authorities:

| Zweck | Authority |
|---|---|
| Website-Preise | `server/billing-catalog.mjs` |
| Subscription-Checkout | `server/subscription-checkout.mjs` |
| Paid-Tier-Readback | `auth.resolvePaidTier()` / `public.subscriptions` |
| CADS-/Benchmark-Capabilities | `packages/benchmark-core/index.mjs` |
| Benchmark Runs | `server/benchmark-runs.mjs` |
| Persistenz/Usage | `server/benchmark-store.mjs` |
| CADS Commerce Projection | `server/cads-commerce.mjs` |
| Pricing Surface | `src/features/pricing/MonetizationModal.tsx` |
| Account Entitlement Surface | `src/components/ProfilePage.tsx` |

Website-Tiers:

| Capability | Starter | Pro | Enterprise |
|---|---:|---:|---:|
| Standardprofile | ja | ja | ja |
| GitHub Check | neutral | neutral | enforced |
| Historische Vergleiche | nein | ja | ja |
| Regression Detection | nein | ja | ja |
| Evidence Export | nein | ja | ja |
| Custom Profiles | nein | nein | ja |
| Custom Thresholds | nein | nein | ja |
| Enforced PR Gate | nein | nein | ja |
| CADS API | nein | nein | ja |
| Self-hosted Runner | nein | nein | ja |

Diese Capability-Matrix ist Produktkonfiguration. Benchmark-Evidence bleibt
`productionEligible=false` und `decisionEligible=false`.

## Noch offene CADS-Monetarisierungs-Gates

1. Drei echte Stripe-Testmode-Käufe für Starter, Pro und Enterprise durchführen und Subscription-Readback
   gegen `public.subscriptions` verifizieren.
2. Upgrade, Downgrade, Cancel und Reactivation separat prüfen.
3. `BENCHMARK_RUN_API_ENABLED` und tatsächliche Runtime-Persistenz erst nach Runtime-Evidence freigeben.
4. `CAPITAL_AI_EVENT_BACKBONE@1` als reale NATS/Kafka × Node/Rust 4er-Matrix ausführen.
5. Evidence Export, Regression Detection und Enterprise-Capabilities mit realen Run-Daten end-to-end prüfen.
6. GitHub Marketplace als **separate** Authority implementieren:
   GitHub App Minimalrechte, Marketplace Plan IDs und `marketplace_purchase` Lifecycle.
7. Pricing-, Privacy-, Support- und Marketplace-Publisher-Evidence vor Listing schließen.
8. Kein Stripe-Tier darf automatisch GitHub-Marketplace-Entitlement erteilen.

## Offene PRs zum Basiszeitpunkt

- #214 — PRODUCT Multi-Agent-Roadmap und Agent-Trajectory
- #217 — TRUST Repo-Inventur, Roadmap-Korrelation und CADS-Monetarisierung, Draft
- #218 — TRUST CADS Community-first Marketplace-Grenzen, Draft

PR #215 — JaJa Universe Buddy v0.1 — ist in `main@cef1d11f607778f5226ca1df97376ba408652c69` gemergt. Dessen MIT-lizenzierter
`Chat Buddy/src/core/`-Bereich wird deshalb als vorhandene Agent-Core-Baseline korreliert; JaJa Branding,
Persona, Voice, Pricing und PRODUCT-spezifische Logik bleiben außerhalb dieses OSS-Core. Die offenen PRs
werden nicht als implementierter Main-Zustand ausgegeben.

## Freigabegrenze

Dieser Bericht belegt den Repository-Zustand und den auf diesem Branch implementierten Roadmap-/CADS-Slice.
Er ist **keine** Production-Freigabe, kein Lizenzgutachten, kein Datenrechte-Nachweis und keine
GitHub-Marketplace-Zulassung.


### Multi-Agent Ergänzung aus PR #214

Die Reconciliation auf diesem Branch erweitert die kanonische Paketmenge von 108 auf 111:

- `CA-PRODUCT-MULTI-AGENT-ORCHESTRATION`
- `CA-PLATFORM-AGENT-TRAJECTORY-OBSERVABILITY`
- `CA-PRODUCT-AGENT-PATH-CONTROL-CENTER`

Baseline für diese Konvergenz ist `main@cef1d11f607778f5226ca1df97376ba408652c69` nach Merge von #215. Der neue MIT Agent-Core wird als wiederverwendbare Primitive korreliert; es besteht kein Dateioverlap mit den #214-Roadmap-/Trajectory-Dateien, daher ist die Post-Merge-Aktion `CORRELATE_ONLY`. Die drei Pakete bleiben evidence-bound und erteilen keine Production-, Write-, Trading-, Publication- oder Legal-Authority.
