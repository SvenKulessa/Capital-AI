# Architecture A Growth-/SEO-Engine — Standard-API/OSS first, Gemini generative

Stand: 2026-10-06
Primary Domain: CAPITAL-AI-GROWTH
Baseline: `SvenKulessa/Capital-AI@4fa3e3f92547cd6356f46490a38e9b7515f69a6d`
Policy: `GROWTH_AI_PROMOTION_POLICY@1`

## Ziel

CAPITAL-AI nutzt kostenlose, kommerziell zulässige Standard-APIs und OSS bevorzugt. Gemini ist ein generativer Draft-/Research-Provider, wenn deterministische Standard-APIs die Aufgabe nicht sinnvoll lösen und Kosten-/Terms-Gates separat erfüllt sind. Die strategischen Kontrollpunkte bleiben jedoch CAPITAL-AI-eigen: Discovery, Provenance, Compliance, Claim-Evidence, Approval, Publication Authority und Analytics-Attribution werden nicht an ein LLM delegiert.

## Verifizierter Providerstand am 2026-10-06

Offizielle Google-Quellen:

- Gemini API Additional Terms: https://ai.google.dev/gemini-api/terms
- Google Search Grounding: https://ai.google.dev/gemini-api/docs/google-search
- URL Context: https://ai.google.dev/gemini-api/docs/url-context
- Gemini Image Generation: https://ai.google.dev/gemini-api/docs/image-generation
- Gemini TTS: https://ai.google.dev/gemini-api/docs/speech-generation
- Veo: https://ai.google.dev/gemini-api/docs/veo
- Gemini Deprecations: https://ai.google.dev/gemini-api/docs/deprecations

### Kommerzielle Nutzung

Die aktuellen Gemini-API-Bedingungen sind auf professionelle bzw. geschäftliche Nutzung ausgerichtet. Google beansprucht kein Eigentum an originär generiertem Output. Für API-Clients, die Nutzern im EWR, der Schweiz oder dem Vereinigten Königreich angeboten werden, ist die Nutzung kostenpflichtiger Dienste erforderlich.

Das ist eine Provider-/Vertragsbewertung und keine Aussage, dass jeder generierte Inhalt automatisch rechtlich zulässig oder veröffentlichungsfähig ist. Marken-, Urheber-, Datenschutz-, Wettbewerbs-, Finanzwerbe- und Plattformregeln bleiben getrennte Gates.

## Gemini-first Entscheidungsmatrix

| Fähigkeit | Primär | Status | CAPITAL-AI-Grenze |
|---|---|---|---|
| Produkt-/SEO-Copy | Gemini 3.8 Flash | ADMITTED / DRAFT | striktes Zod-Schema, Evidence für Claims |
| URL-Analyse | Gemini URL Context | RESTRICTED | nur zugelassene URLs; kein Prospect-Harvesting |
| Search Grounding | Gemini Google Search | RESTRICTED / INTERACTIVE | kein Lead-Index, kein Link-Harvesting, keine Persistenz des Grounded Result |
| Marketing-Bilder | Gemini 3.1 Flash Lite Image operational; Nano Banana 2.1 price-gated | ADMITTED / DRAFT | Brand-/Rights-/Claim-Review + Asset-Hash; kein Aufruf ohne verifiziertes Cost Meter |
| TTS | Gemini 3.8 Flash TTS | ADMITTED / DRAFT | Voice-Consent, Asset-Hash, Approval |
| Video | Veo 3.1 | RESTRICTED / DRAFT | Production erst nach Modellstatus-, Kosten- und Terms-Admission |
| Business-Lead-Enrichment | Gemini | RESTRICTED | nur zugelassene Business-Evidence; keine sensitiven Inferenzattribute |
| Lead Discovery | OSS / eigene Pipeline | CANDIDATE | Crawlee/Search-Source separat admitten |
| Outreach Delivery | CAPITAL-AI intern | BLOCKED | Legal basis, Suppression, Opt-out, Rate Limits, Audit fehlen |
| Analytics | CAPITAL-AI/OSS + GSC | CANDIDATE | Umami bevorzugt evaluieren; GA4 separat hinter Consent |

## Warum Google Search Grounding nicht die Lead-Suchmaschine wird

Die aktuellen Gemini-Bedingungen beschränken Search Grounding auf die Antwort für den Endnutzer, der den Prompt ausgelöst hat, und untersagen unter anderem das programmgesteuerte Sammeln von Grounded Links zum Aufbau eines Indexes oder zur Identifikation von Crawl-/Scrape-Zielen.

Daher gilt:

```text
Gemini Search Grounding
  = interaktive Recherche / Faktenfundierung
  != autonomer Lead-Crawler
  != persistenter Prospect-Index
```

Für Discovery bleibt die Zielarchitektur deshalb provider-neutral:

```text
admitted search source
        ↓
Crawlee / eigener bounded crawler
        ↓
robots / terms / rate / provenance gate
        ↓
normalized business candidate
        ↓
Gemini enrichment (restricted)
        ↓
deterministic lead score
        ↓
GDPR / outreach eligibility
        ↓
approval
        ↓
publisher / email connector
```

## Marketing-Output-Contract

`src/contracts/growthAiPromotion.ts` erzwingt:

- Policy-Version;
- Produkt-ID und Source-SHA;
- Canonical URL;
- Zielkanäle;
- strikte Gemini-Provider-/Modell-Evidence;
- Claim-Typen;
- mindestens eine Evidence-URL je Claim;
- keine unbekannten Outputfelder;
- getrennte Capability-Gates für READ_ONLY, DRAFT, DISCOVERY und PUBLISH.

Ein erfolgreicher Gemini-Aufruf ist dadurch niemals automatisch eine Veröffentlichungserlaubnis.

## Umsetzungsstand nach CURRENT_MAIN-Korrelation 2026-10-06

Auf dem Branch `capital-ai-growth/growth-engine-controls-20261006` sind folgende noch nicht auf Main vorhandene Controls umgesetzt:

1. `src/contracts/growthProviderRuntime.ts`: providerweiter Kill-Switch, Modell-Allowlist/-Router, Request- und Monatsbudget, Pricebook/Cost Estimate, Usage Evidence sowie URL-Context-Allowlist;
2. `server/growth-ai-gateway.ts`: Budget-Prüfung vor Provideraufruf, Usage-/Cost-Evidence danach und URL Context nur für public-safe CAPITAL-AI-Quellen;
3. `src/contracts/growthMediaApproval.ts`: Image/TTS nur hinter explizitem `SOCIAL_ENGINE_COMPLETION_GATE=PASS`, Rights-, Brand-, Claim- und Voice-Consent-Evidence; Public Publish bleibt gesperrt;
4. Veo bleibt ohne vollständige `VeoProductionAdmission` production-ineligible;
5. `src/contracts/growthDiscovery.ts`: robots-/Terms-/Purpose-Provenance und deterministisches 0–100 Lead Scoring; Discovery kann keine Outreach-Authority erzeugen;
6. `MARKETING_OUTREACH_POLICY@3`: E-Mail-Marketing-Erlaubnis und DSGVO-Basis getrennt; Suppression, Unsubscribe, Sender Identity, Audit, Frequency Caps sowie ein standardmäßig deaktiviertes Runtime-Authorization-Gate;
7. `GROWTH_ATTRIBUTION_POLICY@1`: GSC, Umami-Kandidat und Social-Provider-Evidence werden über Canonical/Campaign/Content korreliert, semantisch aber getrennt gehalten;
8. `docs/growth/GROWTH-TOOL-CANDIDATE-EVIDENCE-20261006.md`: Crawlee v3.18.2, SearXNG und Umami v3.4.0 als Benchmark-Kandidaten dokumentiert, ohne Runtime-Admission oder Dependency-Aufnahme.

Noch offen sind insbesondere persistente Consent-/Suppression-/Audit-Stores, realer Bounce-/Complaint-Readback, Social-Engine Completion PASS, ein reproduzierbarer Crawlee/SearXNG/Umami-CADS-Benchmark und jede Production-/Publish-/Outreach-Autorität.

## Nicht freigegeben

- automatisches Versenden an gefundene Leads;
- Massen-Outreach;
- Speicherung von Gemini Search Grounded Results als Lead-Datenbank;
- ungeprüfte Finanz-/Performance-/Regulatory-Claims;
- direkte Veröffentlichung von Gemini-Bild-, Audio- oder Videooutputs;
- Veo-Production ohne separaten Kosten-/Terms-/Modelstatus-Nachweis.

## Architecture A Zero-Cost Override
Kanonisch ist `src/contracts/zeroCostApiThresholds.ts`; kein Free Tier darf still in bezahlte Nutzung überlaufen.
