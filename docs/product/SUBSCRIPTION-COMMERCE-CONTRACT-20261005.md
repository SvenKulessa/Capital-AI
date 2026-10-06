# Subscription Commerce Contract

Stand: 2026-10-05  
Baseline für diesen Slice: `main@96178b35db215754eb69785535f035b4fb4d96af`

## Authority

- Produkt-/Price-Authority: `server/billing-catalog.mjs`
- Checkout-Handler: `server/subscription-checkout.mjs`
- Auth-Authority: verifizierte Supabase-Session über `auth.verify()`
- Subscription-Projektion: `public.subscriptions`
- bestehender Sync-Contract: `supabase/migrations/20260905103413_user_lifecycle_subscription_identity_authority.sql`

## Zulässige Produkte

Nur folgende Kombinationen dürfen serverseitig zu einer Stripe Checkout Session werden:

- Starter · monthly / annual
- Pro · monthly / annual
- Enterprise · monthly / annual

Der Client übermittelt **keine autoritative Price-ID**. Tier und Zyklus werden serverseitig auf die Price-IDs aus dem Billing-Katalog abgebildet.

## Fail-closed Aktivierung

`POST /api/billing/subscriptions/checkout` ist nur aktiv, wenn:

1. ein serverseitiger `STRIPE_SECRET_KEY` vorhanden ist
2. `STRIPE_SUBSCRIPTION_CHECKOUT_ENABLED` nicht explizit auf `false` gesetzt ist
3. die Anfrage same-origin ist
4. eine verifizierte Benutzer-Session existiert
5. Tier und Billing-Zyklus im Serverkatalog enthalten sind

Fehlt eine Bedingung, wird keine Stripe-Session erstellt. `STRIPE_SUBSCRIPTION_CHECKOUT_ENABLED=false` bleibt ein expliziter Not-/Kill-Switch; bei nicht gesetzter Variable entscheidet die vorhandene serverseitige Stripe-Konfiguration über die Readiness.

## Stripe Metadata Contract

Die Checkout Session und die erzeugte Subscription erhalten:

- `user_id`
- `plan_id` = STARTER | PRO | ENTERPRISE
- `billing_cycle` = monthly | annual

Dadurch kann der vorhandene serverseitige Stripe→Supabase-Sync das Abo einem Nutzer und Tier zuordnen.

## UI State Machine

- nicht angemeldet → Login
- Session noch unbekannt → keine Zahlung, erneute Auswahl
- angemeldet + Checkout nicht freigeschaltet → Hinweis, keine Zahlung
- angemeldet + Checkout freigeschaltet → POST an Server
- nur `https://checkout.stripe.com/` wird als Redirect akzeptiert
- Server-/Netzwerkfehler → Hinweis, keine Zahlung

## Nicht enthalten

Dieser Contract aktiviert keine Render-Variable und führt keinen Production-Kauf aus. Reale Production-Evidence benötigt weiterhin:

- Stripe Checkout E2E je 6 Tier-/Zyklusvarianten
- Stripe-managed Subscription Readback
- `public.subscriptions` Tier-/Status-Projektion
- Upgrade/Downgrade/Cancel/Reactivation
- Webhook-/Sync-Reconciliation
- Entitlement-Abnahme
