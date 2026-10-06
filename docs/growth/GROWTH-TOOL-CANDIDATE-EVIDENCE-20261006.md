# GROWTH Tool Candidate & Provider Evidence — 2026-10-06

Primary Domain: CAPITAL-AI-GROWTH  
Baseline: `SvenKulessa/Capital-AI@4fa3e3f92547cd6356f46490a38e9b7515f69a6d`  
Status: `CANDIDATE_EVIDENCE / NO_RUNTIME_ADMISSION`

## Zweck

Dieses Evidence-Dokument korreliert die geplanten Growth-/SEO-Komponenten gegen den aktuellen Provider- und OSS-Stand. Es ist **keine** Runtime-, Production-, Kosten- oder Veröffentlichungsfreigabe.

## Gemini Provider Readback

Offizielle Quellen:

- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- URL Context: https://ai.google.dev/gemini-api/docs/url-context
- Image Generation: https://ai.google.dev/gemini-api/docs/image-generation
- TTS: https://ai.google.dev/gemini-api/docs/speech-generation
- Veo: https://ai.google.dev/gemini-api/docs/veo
- Deprecations: https://ai.google.dev/gemini-api/docs/deprecations

Verifizierter Stand am 2026-10-06:

| Capability | Modell | Status / Preisbasis |
|---|---|---|
| Text / URL Context | `gemini-3.8-flash` | unterstützt URL Context; Standard Paid bis 2026-12-31: USD 0.75 / 1M Input, USD 3.75 / 1M Output |
| Image | `gemini-3.1-flash-image` | stable model; Paid-only Image-Ausgabe; 1K derzeit USD 0.067 je Bild, 2K USD 0.101, 4K USD 0.151 |
| TTS | `gemini-3.8-flash-tts` | stable model; bis 2026-12-31 USD 0.50 / 1M Input, USD 9 / 1M Audio-Output; 25 Audio-Tokens/s |
| TTS fallback | `gemini-3.8-flash-lite-tts` | explizit auswählbare, nicht automatische Alternative; USD 6 / 1M Audio-Output bis 2026-12-31 |
| Video | `veo-3.1-generate-preview` | Preview; kein Free Tier; Standard 720p/1080p USD 0.40/s, 4K USD 0.60/s |

Konsequenz:

- kein Provideraufruf ohne Request- und Monatsbudget;
- kein automatischer Wechsel auf kostenpflichtige Modelle;
- URL Context zählt geladene Inhalte als Inputtokens;
- Veo bleibt production-ineligible, bis Status, Pricing, Terms, Budget, Rights und Owner-Approval gemeinsam als aktuelle Evidence vorliegen.

## Lead Discovery Candidate Review

### Crawlee

- Repository: https://github.com/apify/crawlee
- Latest stable GitHub Release am Prüfdatum: `v3.18.2` (2026-09-29)
- Lizenz: Apache-2.0
- Node/TypeScript-nativ, Browser-/HTTP-Crawler und Self-hosting möglich
- Upstream `master` zeigt bereits 4.0.0-Arbeit; diese unveröffentlichte Major-Linie ist **kein** Admission-Target.

Entscheidung: `CANDIDATE`.

Vor Aufnahme erforderlich:
- reproduzierbarer CAPITAL-AI Crawl-Benchmark;
- transitive Dependency-/CVE-/License-Scan;
- robots/Terms-/Rate-Limit-Harness;
- Netzwerk- und Browser-Isolation;
- exact-version Lock/Provenance.

### SearXNG als Search-Source-Kandidat

- Repository: https://github.com/searxng/searxng
- geprüfter Rolling-Commit: `d48c4b555421e824342c51d68482dd0898e54d0f` (2026-10-04)
- Lizenz: AGPL-3.0-or-later
- Docs: https://docs.searxng.org/dev/search_api.html
- Self-hosted HTTP Search API unterstützt JSON/CSV/RSS, wenn diese Formate aktiviert sind.

Wesentliche Grenze:

SearXNG reicht Suchanfragen an konfigurierte externe Search Engines weiter. Die SearXNG-Lizenz und Self-hosting-Eigenschaft ersetzen **nicht** die Nutzungsbedingungen, Quoten, Scraping-/Redistribution-Regeln oder Datenrechte der jeweils eingebundenen Upstream-Engine.

Entscheidung: `CANDIDATE / ISOLATED_SERVICE_ONLY`.

Vor Aufnahme erforderlich:
- AGPL Packaging-/Service-Grenze dokumentieren;
- erlaubte Engine-Liste statt Default-Mix;
- pro Engine Terms-/Quota-Evidence;
- keine Public-Instance-Abhängigkeit als Production-Authority;
- Search Result darf nicht automatisch Outreach-Authority erzeugen.

### Candidate-Pipeline

```text
self-hosted SearXNG (pinned, engine allowlist)
        ↓
search-result provenance
        ↓
Crawlee v3.18.2 (bounded)
        ↓
robots / terms / rate / purpose gate
        ↓
organization-only candidate
        ↓
deterministic lead score
        ↓
optional Gemini enrichment
        ↓
marketing outreach compliance gate
```

Diese Kombination ist **noch nicht** zum Standard promoted. Sie ist die priorisierte Benchmark-Kombination unter der bestehenden Zero-Cost-/Self-hosted-Präferenz.

## Umami Evaluation

- Repository: https://github.com/umami-software/umami
- Latest stable GitHub Release am Prüfdatum: `v3.4.0` (2026-09-17)
- Lizenz: MIT
- Docs: https://docs.umami.is/
- v3 deckt Traffic, Campaigns, Visitor Behavior, Conversions, Retention und Revenue ab.
- v3.4.0 ergänzt API Keys, typed API client und read-only MCP; Self-hosted MCP ist standardmäßig deaktiviert.

Entscheidung: `CANDIDATE` als first-party Product-/Conversion-Analytics-Layer.

Nicht behauptet:
- keine installierte Umami-Instanz;
- kein Production-Tracking;
- kein Consent-/Privacy-Gate als abgeschlossen;
- keine Ablösung von GSC;
- keine Ablösung offizieller Social-Provider-Metriken.

Zieltrennung:

```text
GSC             = Search Visibility / Index Evidence
Umami candidate = First-party Website/Product/Conversion Analytics
Social APIs     = Provider Publication / Engagement Evidence
        ↓
GROWTH_ATTRIBUTION_POLICY@1
```

## CADS / Architekturstatus

Noch kein finaler CADS-Score: Es fehlt ein reproduzierbarer gemeinsamer CAPITAL-AI-Workload mit CPU/RAM/Netzwerk, Fehlerverhalten, CVE-/Supply-Chain-Scan, Upgrade-/Rollback-Test und realer Betriebsmetrik.

Daher:
- Crawlee: `DISCOVERED / BENCHMARK_PENDING`
- SearXNG: `DISCOVERED / BENCHMARK_PENDING / AGPL_BOUNDARY_REQUIRED`
- Umami: `DISCOVERED / BENCHMARK_PENDING`
- keine neue Dependency in Root- oder Runtime-Lockfiles;
- keine neue Datenbank / kein neuer Service provisioniert;
- keine externe Control-Plane mutiert.
