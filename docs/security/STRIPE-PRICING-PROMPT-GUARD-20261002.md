# Stripe-v2-Preiskatalog & Prompt-Injection-Härtung — 2026-10-02

## Runtime-Voraussetzung

Render-Service `Capital-AI` ist live auf immutable GHCR:
`ghcr.io/svenkulessa/capital-ai@sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`.

## Kanonischer Stripe-Katalog

| Tier | Product | Monat | Jahr | Jahresrabatt ggü. 12×Monat |
|---|---|---:|---:|---:|
| Starter | `prod_VMtsmoPBqTHdww` | `price_1UMA4qPKr4joNbEcvJXFWw45` · 7,00 € | `price_1UMA4wPKr4joNbEc1tgkxagi` · 75,60 € | 10,0 % |
| Pro | `prod_VMtsNeuSad0Dvx` | `price_1UMA4yPKr4joNbEckWSj3cJE` · 29,00 € | `price_1UMA50PKr4joNbEcrj0Lm79I` · 248,00 € | 28,7 % |
| Enterprise | `prod_VMtsvVRz0nORcx` | `price_1UMA51PKr4joNbEcbtWNCcCc` · 109,00 € | `price_1UMA53PKr4joNbEc3E3XyzgG` · 1.280,00 € | 2,1 % |

Bestehende Produkte/Prices wurden nicht deaktiviert oder migriert. Bestandskunden bleiben unverändert. Die neuen Produkte verwenden das commit-gepinnte Branding-Asset `public/branding/capital-ai-logo.jpg`.

Der öffentliche Backend-Readback `GET /api/billing/catalog` liefert nur Product-/Price-IDs; keine Stripe-Secrets.

## Prompt-Injection

`server/prompt-injection-guard.mjs` normalisiert Unicode, entfernt problematische Steuerzeichen und blockiert hochriskante Instruction-Override-/Secret-Exfiltration-/Role-Tag-Muster vor dem Gemini-Aufruf. Geblockte Prompts werden nicht in Logs gespiegelt; es wird nur ein SHA-256-Fingerprint erzeugt.

`server/prompt-injection-guard.test.mjs` ist Bestandteil von `test:security`.

Promptfoo 0.123.1 wurde als OSS-Red-Team-Referenz geprüft, aber bewusst nicht als Produktionsabhängigkeit installiert. So bleibt der Runtime-Supply-Chain-Scope klein.

## Offene Handoffs

- Keine neuen Checkout-Sessions auf die neuen Prices freigeben, bevor Supabase-Auth/AAL2 und Entitlement-Readback vollständig integriert sind.
- Alte Produkte erst nach Kunden-/Subscription-Migrationsplan archivieren.
- $CPT-Rabatt bleibt UI-seitig nicht preiswirksam, bis eigene Stripe-Price-Objekte und rechtlich/steuerlich geprüfte Zahlungslogik existieren.
- Product-/Price-ID-Korrelation gegen Supabase Stripe Sync nach Merge erneut lesen.
