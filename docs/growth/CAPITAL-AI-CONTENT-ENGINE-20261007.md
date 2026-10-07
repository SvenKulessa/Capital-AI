# CAPITAL-AI Content Engine — modularer Growth-Orchestrator

Stand: 2026-10-07  
Domain: GROWTH, mit PRODUCT-/PLATFORM-Schnittstellen

## Ziel

Die in PR #222 eingeführten Growth-Tools werden nicht als einzelne Spezialpfade betrieben, sondern über einen kleinen provider-neutralen Orchestrator zusammengesetzt.

```text
Campaign Brief
   ↓
CAPITAL_AI_CONTENT_ENGINE@1
   ├─ COPY
   ├─ URL_CONTEXT
   ├─ IMAGE
   ├─ TTS
   ├─ VIDEO
   ├─ DISCOVERY / ENRICHMENT (optional)
   ├─ ATTRIBUTION
   └─ PUBLISHER → Social Media Engine (später)
```

Die Content Engine besitzt **keine eigene Provider-, Rechte- oder Publication Authority**. Sie komponiert ausschließlich die bestehenden Growth Contracts.

## Modulgrenzen

- COPY → bestehendes `CONTENT_DRAFTING`
- URL_CONTEXT → bestehendes `URL_CONTEXT`
- IMAGE → bestehendes `IMAGE_GENERATION`
- TTS → bestehendes `TTS`
- VIDEO → bestehendes `VIDEO_GENERATION`
- DISCOVERY → bestehendes `LEAD_DISCOVERY`
- ENRICHMENT → bestehendes `BUSINESS_LEAD_ENRICHMENT`
- ATTRIBUTION → bestehendes Growth-Attribution-Modell
- PUBLISHER → absichtlich nur Adapterpunkt; spätere Social Media Engine

## Aktuelle Grenze

Alle Kampagnenassets bleiben DRAFT. Die Engine darf keinen Public-Publish simulieren. Die spätere Social Media Engine übernimmt Scheduling, kanalbezogene Publisher, Provider-IDs, Redelivery und Dublettenvermeidung.

## Kampagne 01

`Build your own FinTech Score` erklärt CAPITAL-AI als Scoring-/Analyseplattform:

1. BYOK Datenquellen
2. provider-neutrale Analysebausteine
3. eigene Score-Komposition
4. Evidence und Replay
5. Screener
6. Infrastruktur skaliert erst mit realer Last

Maschinenlesbare Kampagnendefinition:
`src/data/contentCampaigns.ts`.

## Verbreitungsstrategie

- Website ist kanonische Quelle und CTA-Ziel.
- LinkedIn transportiert Architektur-/Produktthesen.
- YouTube erklärt Pipeline und Score Builder visuell.
- Reddit wird für technische Engineering-Posts genutzt, nicht für unaufgeforderte Promotion.
- Podcast/Learning Portal vertieft Architektur und Scoring.
- Attribution hält Search, Product und Social weiterhin getrennt und korreliert nur über Campaign-/Content-ID.

## Spätere Paketbildung

Wenn Social Media Engine und grafische Studio-Oberfläche migriert sind, werden beide Schichten als modularer Stack zusammengeführt:

```text
Content Engine
 + Social Media Engine
 + Content Studio
 + Publisher Adapter
 + Attribution
 = CAPITAL-AI Growth / Social Package
```
