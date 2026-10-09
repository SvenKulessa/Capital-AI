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

## Sechs-Varianten-Abnahme (2026-10-09)

Die frühere Drei-Testkäufe-Policy ist für neue Abnahmen ersetzt: alle drei Tiers
jeweils monthly und annual. Historische Readbacks vom 06.10. bleiben historische
Evidence; ihre requiredCount=3-Angabe ist keine aktuelle Abnahme-Anforderung.

- `npm run stripe:test-purchases:create`: erstellt ausschließlich sechs Sandbox/Testmode-Sessions;
  jeder Preis wird vorher live beim Provider als aktiv, EUR, testmode und korrektes Intervall geprüft.
- `npm run stripe:test-purchases:verify`: **nur lesender** Verifier; erwartet abgeschlossene
  bezahlte Session, passende Subscription, Subscription-created-Event, verarbeitete
  Zustellungsquittung, genau eine DB-Projektion, passende Session-Identität und
  CADS-Tier/Capabilities sowie anonymen HTTP-401-Nachweis.
- Sechs getrennte existierende Testnutzer verhindern Überschreiben der einzigen
  Subscription-Projektion je User. Keine Nutzer werden vom Runner angelegt.
- Je Variante `STRIPE_TEST_<TIER>_<MONTHLY|ANNUAL>_PRICE_ID`, `_USER_ID`,
  für Verify zusätzlich `_SESSION_ID`, `_EVENT_ID`, `_COOKIE`.
- `STRIPE_TEST_SECRET_KEY=sk_test_...`; sechs Live-IDs sind verboten.
- `STRIPE_TEST_RETURN_BASE_URL`, `STRIPE_TEST_SUPABASE_URL` und
  `STRIPE_TEST_SUPABASE_READ_KEY` zeigen ausschließlich auf eine isolierte Testumgebung.
  Die bekannten Produktionsorigins werden abgewiesen. Cookies/Keys niemals versionieren.

Der Test-Sync muss die Sandbox-Price-IDs in seiner isolierten Umgebung korrekt
abbilden. Die produktive Migration akzeptiert ausschließlich die sechs Live-IDs
und `livemode=true`; Test-Subscriptions dürfen niemals produktive Entitlements erzeugen.
Der Runner richtet weder Test-Sync noch Preise, Webhooks, Nutzer oder Billing ein.

Der aktuelle Managed Sync schreibt nicht nachweislich in `public.stripe_event_inbox`.
Ohne eine korrelierte processed-Receipt aus diesem bestehenden Ledger schlägt der
Verifier mit NOT_PROVEN fehl; ein vorhandenes Stripe-Event allein beweist keine Zustellung.
Keine parallele produktive Webhook-Implementierung wird eingeführt.

Der tatsächliche Zugriffspfad ist `auth.resolvePaidTier()` und
`GET /api/cads/commerce/entitlement`, kein neu erfundener Subscription-Access-RPC.
Testmode-Abnahme ist keine Production-Evidence. Upgrade/Downgrade/Cancel/Reactivation
und tatsächliche Provider-Duplicate-/Retry-Zustellung bleiben getrennte Nachweise.

## Strikte produktive Preisbindung

Die neue Migration `20261009104641_enforce_subscription_price_authority.sql`
weist unbekannte/fehlende Preise, mehrere Items, Testmode, inaktive Zustände,
ungültige oder widersprüchliche plan_id ab. Ein einzelner bekannter Live-Preis
bleibt auch ohne plan_id als Fallback gültig. Kein Backfill, kein Event-Replay.
Produktiv noch nicht angewendet. Vor Anwendung bestehende Legacy-/Multi-Item-Abos
auf mögliche Herabstufung beim nächsten Sync prüfen.

## Isolierte SQL-Evidence

`npm run test:stripe:postgres` benötigt eine extern installierte PGlite-Laufzeit
über `STRIPE_ISOLATED_PG_MODULE` (absoluter Pfad zu dist/index.js).
Keine neue App-Dependency, kein Netzwerk im Test, kein Produktionsanschluss.
Die alte Migration reproduziert den Metadaten-only-Fehler; die neue wird als echte
PL/pgSQL-Triggerfunktion ausgeführt. Sechs Preise, Fallbacks, Denials, wiederholte
Zustellung/Update und Cancellation/Reactivation sind als DB-Verhalten geprüft.
Das ersetzt keinen Parallelitäts-/Provider-Replay-Test und keine PostgreSQL-17-Abnahme.
