# Subscription Commerce Contract

Stand: 2026-10-06  
Baseline für diesen Slice: `main@96178b35db215754eb69785535f035b4fb4d96af`

## Authority

- Produkt-/Price-Authority: `server/billing-catalog.mjs`
- Checkout-Handler: `server/subscription-checkout.mjs`
- Auth-Authority: verifizierte Supabase-Session über `auth.verify()`
- Subscription-Projektion: `public.subscriptions`
- bestehender Sync-Contract: `supabase/migrations/20260905103413_user_lifecycle_subscription_identity_authority.sql`
- Stripe-Katalog-Readback: `docs/security/evidence/stripe-catalog-readback-20261006.json`
- Supabase Stripe Sync/Wrapper dient als Readback-Evidence; Checkout-Price-Authority bleibt ausschließlich `server/billing-catalog.mjs`

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

- **genau 3 Stripe-Testmode-Käufe**: je einer für Starter, Pro und Enterprise; Monats-/Jahres-Mapping bleibt deterministisch unit-getestet
- Stripe-managed Subscription Readback
- `public.subscriptions` Tier-/Status-Projektion
- Upgrade/Downgrade/Cancel/Reactivation
- Webhook-/Sync-Reconciliation
- Entitlement-Abnahme


## Drei-Testkäufe-Policy

Die aktuell über Supabase synchronisierten sechs Subscription-Prices sind `livemode=true`.
Sie dürfen deshalb **nicht** für die drei Testkäufe verwendet werden.

Für die E2E-Evidence müssen getrennte Stripe-Testmode-Price-IDs und ein `sk_test_...`-Credential
verwendet werden. Pro Tier wird genau ein Kauf ausgeführt:

1. Starter
2. Pro
3. Enterprise

Der Test muss Checkout-Session, Stripe-Subscription-Readback und die resultierende
`public.subscriptions`-Projektion prüfen. Ein erfolgreicher Testkauf ist keine
Production-Freigabe.

## Supabase Stripe Security Gate

Der Readback vom 06.10.2026 zeigt 29 Tabellen im `stripe`-Schema ohne RLS.
Diese Exposure-Frage bleibt **BLOCKED** und muss vor Production-Handoff durch eine
bewusste Data-API-/RLS-Entscheidung geschlossen werden. In diesem PR wurde keine
automatische RLS-Mutation ausgeführt.
