# Production Pricing Correlation

Stand: 2026-10-05  
Baseline: `main@52666468b758c9a295709069b12f53ca93e9bfc4`

## Preisautorität

Die Production-Preissurface wird ausschließlich aus folgenden kanonischen Quellen abgeleitet:

- `src/data/pricingCatalog.ts`
- `server/billing-catalog.mjs`
- `src/data/vocabularyOffer.ts`

Aktuell katalogisierte Produkte:

| Produkt | Billing-Modell |
|---|---|
| Starter | monatlich / jährlich |
| Pro | monatlich / jährlich |
| Enterprise | monatlich / jährlich |
| Market Vocabulary | einmalig, eigenständiges Entitlement |

## Production-Regeln

- Vocabulary ist **nicht** Bestandteil von Starter, Pro oder Enterprise.
- Nicht katalogisierte B2B-, API-, Affiliate-, Revenue-Share- oder Broker-Preise werden nicht auf der Production-Preissurface dargestellt.
- Interne Stripe-`productId`-/`priceId`-Werte werden nicht als Endnutzerinformation angezeigt.
- Token-Produkte werden nicht dargestellt, solange kein entsprechendes Produkt existiert.
- Tarifkarten werden aus dem aktuellen Billing-Katalog projiziert; keine alternative Marketing-Bezeichnung ersetzt den kanonischen Tier-Namen.

## Accessibility

Der Pricing-Dialog besitzt:

- `role="dialog"`
- `aria-modal="true"`
- einen benannten Dialogtitel
- expliziten zugänglichen Schließen-Button
- initialen Fokus
- Escape-Schließen
- Tab-/Shift-Tab-Fokusbegrenzung
- semantischen Billing-Switch mit `aria-checked`

Diese Code-Evidence ersetzt keine Browser-/Screenreader-Abnahme.

## Offene Evidence

- Mobile Browser-Evidence
- Tablet Browser-Evidence
- Desktop 1280 / 1440 / 1920
- Screenreader-Smoke
- Kontrast-/Touch-Target-Abnahme
- Production-Deploy-Evidence
