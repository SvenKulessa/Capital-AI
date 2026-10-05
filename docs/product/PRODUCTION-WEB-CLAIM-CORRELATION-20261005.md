# Production-Web Claim-Korrelation

Stand: 2026-10-05  
Baseline: `main@4d98d9c6ed8128c109ee86d99980d57e6fdb826b`  
Primary Domain: PRODUCT  
Cross-Domain: MARKET / TRUST / GROWTH

## Authority

Für MARKET-bezogene Website-Aussagen ist
`docs/market-data/PRODUCTION-WEB-01-MARKET-20261005.yaml` maßgeblich.

Der korrelierte CURRENT_MAIN besitzt:

- keine zugelassene gemeinsame `marketQuotes`-Quelle,
- keine zugelassene `scoringPriceInput`-Quelle,
- `productiveQuoteState = BLOCKED`,
- `productiveScoringState = BLOCKED`.

Daraus folgt: Die öffentliche Website darf derzeit keine ungeprüften Live-/Realtime-,
Latenz-SLA-, Provider-Health- oder produktiven Scoring-Claims darstellen.

## Korrigierte User-Surfaces

| Surface | vorheriger Drift | Production-Projektion |
|---|---|---|
| Header | Echtzeit-/Sub-45ms-Runtimeanzeige | entfernt |
| Mobile Drawer | Feed-Latenz, Security-Status, Mock-Trends | entfernt |
| Studio | `Sub-45ms Active`, sichtbare interne Versionsangabe | entfernt |
| Architecture | institutionelle/Sub-45ms/Production-Ready-Claims | als Research-/Designkonzept gekennzeichnet |
| Provider Matrix | konkrete Provider-/SLA-Werte ohne Admission | fail-closed hinter Evidence-Gate |
| /provider-status | Runtime-/Fleet-Details öffentlich erreichbar | generischer fail-closed Status ohne Systemdetails |

## Canonical Navigation

Kanonische Produktpfade bleiben:

- `/marketscreener`
- `/studio`
- `/pipeline-builder`
- `/architecture`
- `/learning`
- `/vocabulary`
- `/dokumentation`
- `/pricing`
- `/profile`
- `/profile/security`
- `/profile/key-vault`
- `/control-center` — ausschließlich Owner

Aliase werden über `src/utils/appNavigation.ts` auf diese Pfade normalisiert.

## Accessibility

Für die globale mobile Navigation sind nun explizit gebunden:

- `aria-expanded`
- `aria-controls`
- `aria-haspopup="dialog"`
- Dialog-Rolle
- `aria-modal="true"`
- zugänglicher Dialogname

Dies ersetzt noch keine vollständige WCAG-Abnahme mit Browser-/Screenreader-Evidence.

## Nicht als abgeschlossen behauptet

- Browser-Evidence für Mobile/Tablet/Desktop,
- vollständige WCAG-Abnahme,
- MARKET Production Admission,
- produktive Realtime-/Latency-Evidence,
- Production-Deploy.
