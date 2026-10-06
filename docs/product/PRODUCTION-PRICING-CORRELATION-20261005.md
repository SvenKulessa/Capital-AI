# Production Pricing Correlation

Stand: 2026-10-05  
Baseline fortgeschrieben auf: `main@96178b35db215754eb69785535f035b4fb4d96af`

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


## Zusatzprodukte

Die Production-Preissurface trennt SaaS-Tarife und zusätzliche Produkte in zwei Tabs:

- **Starter · Pro · Enterprise** — ausschließlich die drei katalogisierten Abonnements.
- **Zusatzprodukte** — ausschließlich bereits kaufbare zusätzliche Produkte.

Der aktuelle Zusatzprodukt-Katalog enthält nur **Market Vocabulary**. Geplante B2B-, API-, Token-, NFT-, White-Label- und Affiliate-Produkte werden nicht als verfügbar dargestellt.

### Vocabulary-Badge

Nach erfolgreichem serverseitig verifiziertem Vocabulary-Entitlement stehen ohne Zusatzpreis zur Verfügung:

- `/api/billing/vocabulary/badge`
- `/api/billing/vocabulary/badge-license`

Beide Endpunkte sind authentifiziert und entitlement-gebunden. Der Badge bleibt proprietär; die zulässige Nutzung wird durch `LicenseRef-CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-1.0` begrenzt.

## Bootstrap-Fallback

Der statische Bootstrap-Fallback reagiert nur noch auf einen tatsächlichen Ladefehler des App-Entry-Skripts. Eine allgemeine frühe `unhandledrejection` darf die Fehleroberfläche nicht mehr auslösen. Import-/Runtime-Fehler innerhalb der geladenen Anwendung bleiben Aufgabe der React Error Boundary.


## Subscription Checkout

Starter, Pro und Enterprise sind jetzt an einen serverautorisierten Checkout-Contract gebunden.

- Client übermittelt nur Tier + Billing-Zyklus.
- Price-ID wird ausschließlich aus `server/billing-catalog.mjs` gewählt.
- Checkout verlangt same-origin + verifizierte Supabase-Session.
- Aktivierung ist zusätzlich durch `STRIPE_SUBSCRIPTION_CHECKOUT_ENABLED=true` fail-closed.
- Ohne Aktivierung wird keine Zahlung gestartet und ein bereits angemeldeter Nutzer wird nicht zum Login zurückgeschickt.
- Stripe-Redirects werden clientseitig zusätzlich auf `https://checkout.stripe.com` begrenzt.

Kanonische Details: `docs/product/SUBSCRIPTION-COMMERCE-CONTRACT-20261005.md`.
