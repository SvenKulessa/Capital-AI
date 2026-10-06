# Architecture A Growth-/SEO-Engine — Standard-API/OSS first, Gemini generative

Stand: 2026-10-06
Primary Domain: CAPITAL-AI-GROWTH
Baseline: `SvenKulessa/Capital-AI@c13de16d8af006c37b08db616d1016173c99e7db`
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
| Marketing-Bilder | Gemini 3.1 Flash Image | ADMITTED / DRAFT | Brand-/Rights-/Claim-Review + Asset-Hash |
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

## Nächster Implementierungsslice

1. serverseitigen `GrowthAiGateway` auf der vorhandenen `@google/genai`-Dependency aufbauen;
2. Gemini-Responses vor jeder Weitergabe mit `GrowthMarketingDraftSchema` validieren;
3. Kostenmeter, Model Router und Kill-Switch ergänzen;
4. URL Context zunächst nur read-only anbinden;
5. Search Grounding nur für interaktive Research-/Copy-Flows zulassen;
6. Gemini Image/TTS als draft-only Asset-Generatoren hinter Social-Engine-Gates anbinden;
7. Lead Discovery separat über admitted OSS-Bausteine implementieren;
8. Outreach erst nach eigenem Compliance-/Suppression-/Audit-Gate aktivieren.

## Nicht freigegeben

- automatisches Versenden an gefundene Leads;
- Massen-Outreach;
- Speicherung von Gemini Search Grounded Results als Lead-Datenbank;
- ungeprüfte Finanz-/Performance-/Regulatory-Claims;
- direkte Veröffentlichung von Gemini-Bild-, Audio- oder Videooutputs;
- Veo-Production ohne separaten Kosten-/Terms-/Modelstatus-Nachweis.

## Architecture A Zero-Cost Override
Kanonisch ist `src/contracts/zeroCostApiThresholds.ts`; kein Free Tier darf still in bezahlte Nutzung überlaufen.
