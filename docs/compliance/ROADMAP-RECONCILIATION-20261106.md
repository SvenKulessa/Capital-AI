# Roadmap-Reconciliation — 06.11.2026

**Basis-Main:** `bea9223d1d661259d147d2cd22dc09004e62351f`  
**Vorheriger Snapshot:** `0bf052cbc8f7774db29cc77493f6f24bb28bd93b` (2026-10-06)  
**Contract:** `SOLO_MAINTAINER_FLOW@1` / AGENTS.md  
**Status:** Evidence-Update; keine Production-Freigabe, keine neuen Required Checks.

## Offene Issues (vollständig)

| # | Domain | Titel | Evidence-Stand | Nächster konkreter Schritt |
|---|--------|-------|----------------|----------------------------|
| 560 | TRUST | Leaked-password protection applicability | VERIFIED anwendbar · Aktivierung REVIEW_REQUIRED | Owner: Supabase-Dashboard Tarif + Setting prüfen/aktivieren |
| 559 | GROWTH | Chart-analysis YouTube + Learning embed | Mehrere Grenzen BLOCKED / NOT_PROVEN | Owner: OAuth/Channel-Consent, Rechte, authentifizierter Readback |
| 388 | PRODUCT | Content/Social Commercialization & Learning Isolation | Learning-Isolation Unit-Tests VERIFIED · Operator/Rights BLOCKED | Live dual-user Readback + Rechte-Evidence |

## Offene PRs

- **#548** (Draft): Private Notes OCC v2 — HOLD bis SQL-before-API-Cutover mit Backup/Restore nachgewiesen. Head mit main konsolidiert, Production-DB unverändert.
- Pending (Formulare vorbereitet, noch nicht gemerged):
  - `capital-ai-trust/password-auth-isolation-evidence-20261106` — Evidence + Isolation-Tests für #560
  - `capital-ai-product/learning-isolation-negative-cases-20261106` — negative Cross-User-Tests für #388 WP-02

## Strategische Prioritäten (Owner 2026-10-11, unverändert)

1. Commerce & Learning Portal monetarisieren  
2. Marketing & organische Reichweite  
3. Website-Korrektheit  
4. SEO-Management  
5. Content Engine & Social Pipeline  

NATS/Rust-Provider und Live-Market-Daten bleiben deaktiviert (Lizenz-Blocker).

## Overrides-Hinweis

`ROADMAP_CURRENT_STATE_OVERRIDES` in `src/data/roadmapCurrentMainState.ts` wurde nur in den Metadaten (`reviewedAt`, `baseMainSha`) aktualisiert. Einzelne Package-Status bleiben unverändert, bis die zugehörigen Evidence-PRs gemerged und die Tests in CI grün sind.

## Residual

- Kein Claim auf Live-Wirkung.  
- Stale Branches (historische `capital-ai-*/*`) sind nicht automatisch geschlossen.  
- Nächster autonomer Schritt nach Merge der Evidence-PRs: gezielte Fortsetzung der höchsten unabhängigen offenen WPs.
