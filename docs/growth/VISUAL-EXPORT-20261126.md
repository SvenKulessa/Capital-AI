# Visual Intelligence export v1 — local draft path

Baseline main: 8c49a34c1fd27cf3229896b9ce10c95e0970fe60.
Reuses the existing Resvg image recipes and runtime Sharp 0.35.5; no new package, provider, scheduler, API endpoint or publishing grant.

## Operator execution

With the existing root Node dependencies and pinned runtime dependencies installed (npm ci in deploy/runtime, using the existing lock):
```sh
node --import tsx scripts/growth/growth-intelligence-image-drafts.mjs --write-visual
python3 scripts/growth-agent/product_opportunity_graph.py --visual-data docs/growth/drafts/growth-intelligence-images-20261121-visual-v1/visual-graph-input.json
```

Use the actual output directory returned by the first command if the canonical OUTPUT changes. Redirect only the graph report to a private JSON file and import that file using the existing Owner Control Center LangGraph report import; the existing versioned Owner workspace/archive can retain the documented projection when its existing archive permissions and recovery are satisfied. The exporter is create-only; move a reviewed run out of the working output location before another run. Do not publish or commit generated draft assets or private operator reports.

The local receipt records exact source/output/manifest hashes, asset formats/sizes, pixel error bounds, encoder elapsed time, candidate channel, first-party source references, alt text and review-required rights. MediaKit import is quarantine only. Lossless and bounded lossy WebP compete by size; unchanged PNG remains the web fallback. JPEG is a separate channel draft, not automatic carousel admission. SVG is retained from the existing trusted renderer. The graph checks metadata consistency, not actual bytes or legal rights; all imported KPIs are documentation only. Provider calls/cost are zero for this explicitly offline path, but overall operating costs, manual time savings, productive deployment and failed-run statistics remain NOT_PROVEN. No automated repair loop has been added; the successful receipt records zero repair cycles.

## Evidence boundary

Local synthetic adapter tests: 3 passed with locally installed Sharp 0.34.1; source/test blob hashes 42d8141dcc1827b6c93fef31f39d96df9de7e72c and 1cecb11e4dbf01e8bcd624e53a6e5911a20aef3d. Independent prior Pillow evidence is a reference only, not certification of this code. Pinned Sharp 0.35.5 tests, real Resvg integration, existing LangGraph join, existing Owner import/roundtrip tests and full security/browser CI must be read back at the actual PR head. Browser live performance, production graph activation and authenticated archive readback are separately NOT_PROVEN.

Rollback: revert the scoped PR. No data migration, secret, paid service, public asset publication or runtime worker activation.
