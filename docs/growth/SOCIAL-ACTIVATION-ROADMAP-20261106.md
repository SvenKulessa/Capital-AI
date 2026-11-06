# Social Media Activation Roadmap — 2026-11-06

**Baseline main:** `bea9223d1d661259d147d2cd22dc09004e62351f`  
**Contract:** SOLO_MAINTAINER_FLOW@1 / AGENTS.md  
**Related issues:** #388 (Operator Content/Social), #559 (YouTube pilot)  
**Principle:** Draft first · Owner approval required · Fail-closed · Evidence before claims

## Phase 0 – Baseline & Approval Model (immediate)

| Package | Content | Acceptance | Status |
|---------|---------|------------|--------|
| 0.1 Pipeline alignment | PR-Merge workflow vs. current code | Residuals documented | PARTIAL |
| 0.2 Rights evidence | Commercial rights for text/assets | REVIEW_REQUIRED or APPROVED | REVIEW_REQUIRED |
| 0.3 X-API budget | Credit, spending limit, per-call cost; 22.11. Expansion-Abrechnung | Query-Inventar belegt, X Console Readback durch Owner offen; ≤ 3 USD nur Vorschlag, nicht freigegeben | REVIEW_REQUIRED / NOT_PROVEN |
| 0.4 Owner gating | SOCIAL_X_* flags + PAID_WRITE/READ + IAM owner | Only owner can publish | VERIFIED (code) |
| 0.5 Content Studio | Draft preview, sources, disclaimer | Preview without publish | PARTIAL |

**Deliverable:** this document + residual notes.

## P0-Ergänzung: X-API Expansion Billing (06.11.2026)

- **VERIFIED (Code):** `x-url-context.mjs` verwendet ausschließlich `expansions=author_id`, benötigt `username` und `protected` zur verlässlichen Autoren- und Schutzprüfung. Der feste Parametervertrag ist mit einem Negativtest gegen zusätzliche Media-/Poll-/Place-/Post-Expansions abgesichert.
- **REVIEW_REQUIRED:** Ab 22.11.2026 können expandierte User-Objekte zusätzliche PPU-Kosten erzeugen. Ein Entfernen der einzig nötigen Expansion ohne gleichwertige Prüfung ist keine sichere Lösung.
- **NOT_PROVEN:** Kosten, reale API-Nutzung, Guthaben, Console-Spend-Cap und Auto-Recharge. Keine Zahl aus einem Forecast als tatsächlichen Kontostand verwenden; keine API-Calls oder Freischaltungen während des Audits.
- **Public Content:** kostenbewusster Daten-/Content-Workflow und Eigentums-/Rechteprüfung werden ohne Server-, Vault-, Deployment- oder Architektur-Interna im eigenen Website-Blog erklärt. Keine Behauptung, ein autonomer Scheduler oder messbarer Marketing-ROI sei bereits produktiv.
- **Evidence:** [X-PPU-EXPANSIONS-20261106.md](X-PPU-EXPANSIONS-20261106.md); P0 erst nach X Console-Readback schließen.

## Phase 1 – First Controlled Pilot (Week 1)

Single owner-gated X article via existing integrated path (`x-article-test` or milestone).

- Mo: Final draft in Studio (status DRAFT)
- Di: Owner review (text, disclaimer, @CapitalAIOnline, cost)
- Mi: One-shot publish (claim + receipt)
- Do: Provider readback → VERIFIED_PUBLISHED
- Fr: Evidence stored, next draft started

**Content pillar:** Learning & Evidence (OHLC, EMA/RSI/ATR, limits).  
**CTA:** https://capital-ai.online/learning

## Phase 2 – Four-Week Content Series (Weeks 2–5)

16 posts as sketched in the 2026-10-14 marketing concept. One owner approval per item. No unattended scheduler yet.

| Week | Focus | Example |
|------|-------|---------|
| 2 | Vision & Transparency | Mission, Indicator ≠ Signal |
| 3 | Multi-Source Pipeline | Provider identity, PIT, Quality Gate |
| 4 | Math & Screener | Weighted factors, Evidence → Score |
| 5 | B2B / Learning | Implemented vs. Planned, Docs/Contact |

**Residuals:** Persistent scheduler, live metrics, auto-variants for LinkedIn/Blog = NOT_PROVEN.

## Phase 3 – Measurement & Optimization (from Week 6)

Consent-aware, aggregated metrics only. No auto-follow, unsolicited replies, or keyword bots.

## Phase 4 – Expansion (from Week 8)

- Scheduler with budget caps and receipts
- Channel variants (LinkedIn/Blog)
- YouTube pilot after #559 blockers cleared
- SEO flywheel (SEO-06)

## Stop criteria

Missing rights, unclear budget, missing owner session, ambiguous API outcome, or account mismatch → immediate stop, no retry.

## Next recommended action

Complete Phase 0 evidence and present the prepared Chartanalyse draft for owner approval. Then execute Phase 1.
