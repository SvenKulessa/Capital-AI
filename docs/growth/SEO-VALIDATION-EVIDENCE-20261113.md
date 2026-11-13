# SEO-Validierung Evidence — 2026-11-13

Baseline: main `d0bdbf86bc28c6e68ad4ff9719a749c4656192b3`

## 1. Lokale / CI-Checks

- `npm run test:seo`: **PASS** (44/44)
- `npm run seo:provenance:check`: **PASS** (source bytes match)

## 2. Production Readback (full)

- Command: `npm run seo:readback -- --full`
- Result: **PASS**
- 372 INDEX-Routen, 2261 Checks, 0 FAIL
- Runtime identity: RUNTIME_VERIFIED via RENDER_DEPLOYMENT_ENVIRONMENT (matches current main)
- Full report: `docs/growth/evidence/SEO-PRODUCTION-READBACK-20261113.json`

## 3. GSC / GA4 Audit (read-only)

- Workflow run: https://github.com/SvenKulessa/Capital-AI/actions/runs/43495505051 (success, audit mode)
- Sitemap registered, lastDownloaded 2026-11-13T17:52:55Z, 0 errors/warnings
- URL Inspection for `/learning`, `/vocabulary/orderbuch`, `/vocabulary/capital-eventmesh`: verdict NEUTRAL, lastCrawlTime null → index state **NOT_PROVEN**
- No ranking, traffic or conversion claims.

## Next

SEO-03 (Crawlability, Broken Links, Sitemap consistency, CWV evidence) remains the next residual.

## 4. SEO-03 Crawlability Gate (neu)

- Script: `scripts/seo-crawlability-gate.mjs`
- Offline-Tests: `scripts/seo-crawlability-gate.test.mjs` (4/4 PASS)
- Live-Lauf gegen `https://capital-ai.online`: **PASS**
  - expectedIndexCount: 372
  - sitemapUrlCount: 372
  - failedCount: 0
- Prüft: robots.txt-Vertrag, Sitemap enthält ausschließlich INDEX-Routen und deckt alle erwarteten INDEX-Routen ab, keine privaten/API-Pfade, Spot-Checks auf 200 + nicht-noindex.
- In `npm run test:seo` und Workflow `growth-seo-production-readback.yml` integriert.

