# CAPITAL AI — CAP-BP-001/002 kommerzielle Einzelprodukte

Owner-Entscheidung 2026-10-12: jedes Blueprint **EUR 50,00 netto**, zuzüglich anwendbarer Steuer. Dauerhafte Lizenz für das namentlich kaufende Unternehmen; eigene Software, einschließlich eigener Kundenprojekte, gestattet, **kein Weiterverkauf des Blueprint-Originals**. Automatische Auslieferung im authentifizierten CAPITAL-AI-Konto nach verifizierter Zahlung. Autoritativ ist `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`; dieses Dokument ist Implementierungs-Evidence, kein neuer Governance-Gate.

## Identität / Stripe-Live-Readback

| SKU | Produkt (Live, inaktiv) | neuer aktiver Einzelpreis | Preis | alter inkl.-Preis (inaktiv) |
|---|---|---|---|---|
| `CAP-BP-001` | `prod_VQPRXoyoJLA17V` | `price_1UPoyMPKr4joNbEcbHllSBQ5` | 5000 Cent EUR, `tax_behavior=exclusive` | `price_1UPYcJPKr4joNbEcxdm8MmFj` |
| `CAP-BP-002` | `prod_VQPR1vMN76D6pf` | `price_1UPoyOPKr4joNbEcnxUWvnFK` | 5000 Cent EUR, `tax_behavior=exclusive` | `price_1UPYcLPKr4joNbEcu5nYfpyp` |

Die zwei Produkte bleiben im Stripe-Katalog inaktiv, bis Checkout und sichere Lieferung verifiziert sind. Die ausgewählte Stripe-Steuerkategorie `txcd_10503000` bezeichnet herunterladbare digitale Einzeldokumente. Stripe Tax Settings = `active`; zwei DE-Registrierungen im Live-Konto sind vorhanden, aber tatsächliche Berechnung/Auslandssteuer und rechtliche Zuordnung sind **NOT_PROVEN**. Eine gebührenpflichtige Live-Steuerberechnung wurde **nicht** ohne ausdrückliche Kostenfreigabe ausgelöst.

## Private Artefakte / Rechte

- Originale: Dropbox `/CAPITAL-AI/SCREENER-BLUEPRINTS/CAP-BP-00X/1.0.0/`; unabhängig verschlüsseltes Backup: Google Drive `CAPITAL-AI/PRIVATE-BACKUPS/...`.
- Lieferkopien: `private.blueprint_release_artifacts` in der bestehenden Supabase-Datenbank, `bytea`, unveränderte Datei, SHA-256-Constraint, Release-Schalter. Keine Originalbytes in Git, im Frontend, in Logs oder öffentlichem Static-Asset. Die zuvor angelegte private Supabase Storage Bucket bleibt davon unabhängig; das kleine `bytea`-Artefakt vermeidet dafür einen zusätzlichen Cloud-Token/Transfer-Worker.
- Byte-Längen und Hashes: CAP-BP-001 30462 Bytes `54f07ffeb1e5eb533027840595c8bf3c659eae34a5acdf32ec56db3471f9d4e1`; CAP-BP-002 36545 Bytes `1f96b6de3601cf40dd91069226ab3e9719de5d291c83c70865fd4b64a22f74ba`.
- Lizenz: `docs/licenses/CAPITAL-AI-BLUEPRINT-COMPANY-LICENSE-1.0.md`, serverseitig unter `/api/billing/blueprints/license` verfügbar. Die Benutzerzustimmung und die getrennten Erklärungen zur digitalen Sofortlieferung und möglichen Widerrufsrechtsfolge werden vor dem Stripe Checkout erfasst und in Stripe-Session-Metadaten zur späteren Beweisführung gebunden. Erforderliche Vertragsbestätigung auf dauerhaftem Datenträger und Verbrauchertexte im operativen Kaufprozess müssen vor Live-Freigabe nachgewiesen sein. Kein automatischer Schluss „Checkbox = rechtsgültiger Widerrufsverzicht“.

## Implementierter Service

`server/blueprint-commerce.mjs`:

- `GET /api/billing/blueprints/offer` — öffentliche, nicht vertrauliche Produktinformation, Checkout-Flag.
- `GET /api/billing/blueprints/license` — Lizenztext v1.0.0.
- `POST /api/billing/blueprints/checkout` — gleiche Origin, verifizierte Sitzung, Konto/Lizenz und Widerrufsbestätigungen, Stripe Product+Price Live-Readback, Artefakt-Readiness, Duplikatsprüfung und Stripe-hosted Checkout mit automatischer Steuerberechnung.
- `POST /api/billing/blueprints/webhook` — Stripe-Raw-Body-HMAC, Zeitgrenze, Session- und PaymentIntent-/Charge-Readback, exakte Line-Item-/Mengen-/Preisbindung, einmaliges Entitlement; asynchroner Erfolg, volle Erstattung und Dispute-Sperrung.
- `GET /api/billing/blueprints/access` — kontogebundene, serverseitig geprüfte Kaufrechte.
- `GET /api/billing/blueprints/download/CAP-BP-00X` — nur nach Session-Prüfung + bezahltem Entitlement + SHA-256-Check, no-store, kein öffentlicher Download-Link.

- Nach verifizierter Zahlung: serverseitig an die bereits bestätigte Konto-E-Mail gebundene **Vertragsbestätigung** mit tatsächlichem Netto-/Steuer-/Gesamtbetrag, Vertrags-/Lizenznehmer, SKU, Release-Version und als Anhang eingefrorenem Lizenztext. Keine Blueprint-Datei als ungeschützter E-Mail-Anhang: der Käuferdownload bleibt an die Kontositzung gebunden.
- Die Bestätigung wird über die bestehende SMTP-Infrastruktur mit TLS versandt. Ein atomarer service-role-only DB-Lease verhindert reguläre parallele Doppelzustellungen; bei SMTP-/DB-Fehlern gibt der Webhook 503 zurück, damit Stripe erneut zustellen kann. Deterministischer Mail-Message-ID reduziert (verhindert aber nicht unter allen Fehlerbedingungen) Doppelzustellungen nach unbekanntem Mail-Server-Acceptance-Status.
- `confirmation_sent_at` bedeutet **SMTP-Server hat angenommen**, nicht Empfänger-Postfachzustellung. In der Tabelle werden keine zusätzlichen E-Mail-/Adressdaten oder Secrets gespeichert. Webhook-Fehlermeldungen enthalten keine personenbezogenen Daten. Für den Checkout muss die verifizierte Konto-E-Mail und funktionierende SMTP-Konfiguration vorhanden sein.


`private.blueprint_purchase_entitlements` hält User, SKU, Release-Version, Stripe Checkout/PaymentIntent, juristischen Lizenznehmer, Status und Lizenzversion. Die service_role-only RPC `public.capital_ai_blueprint_commerce` ist für `anon`/`authenticated` nicht ausführbar und nutzt `SECURITY INVOKER`, keinerlei öffentliche RLS-Policies. Eine Unternehmenslizenz gestattet interne Nutzung, begründet aber keinen pauschalen Zugriff für alle beliebigen Tenant-IDs: primär ist der bezahlende Konto-User berechtigt; Erweiterung auf weitere Unternehmens-Accounts erst nach verifizierter Mitgliedschaft.

## Inbetriebnahme und Grenzen

Konfiguration (alle serverseitig, **keine Secretwerte im Repository**):

- `STRIPE_BLUEPRINT_CHECKOUT_ENABLED=true` **erst wenn** vollständiger Launchpfad funktioniert; default disabled.
- `STRIPE_BLUEPRINT_TAX_ENABLED=true` **erst nach** überprüfter passender Tax-/Registrierungs- und Checkout-Steuerbehandlung; default disabled.
- Bestehende `SMTP_HOST`, `SMTP_USER` und `SMTP_PASSWORD` für die transaktionale Vertragsbestätigung; nur serverseitig, keine ungeprüfte E-Mail im Stripe-Session-Parameter. Test mit synthetischen Accounts, kein realer Kundentest ohne gesonderte Rechts-/Steuerbereitschaft.
- `STRIPE_BLUEPRINT_WEBHOOK_SECRET` für den dedizierten Stripe-Endpoint `/api/billing/blueprints/webhook` mit Events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created` und separaten HMAC-Schlüsseln.
- Bestehende `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_BASE_URL` auf dem Render-Webdienst werden wiederverwendet. Im Browser niemals Service-Role- oder Stripe-Keys.
- Stripe Products müssen erst nach bestandenem Kauf-/Liefer-/Refund-/Tenant-Test von `active=false` auf `true` gesetzt werden. Bestehende Webhooks für Stripe Sync nicht ändern.
- Verbraucherrecht: je nach tatsächlichem B2B/B2C-Angebot Widerrufsbelehrung/Musterformular, Preis einschließlich Steuern soweit berechenbar, ausdrückliche Bereitstellungszustimmung und Kenntnisbestätigung, Vertragsbestätigung auf dauerhaftem Datenträger; rechtliche Texte zur konkreten Produktauslieferung prüfen. Keine Rechtsfreigabe aus einem technischen Test ableiten.
- Technische Tests: `node --test server/blueprint-commerce.test.mjs`; negativer Auth/CSRF/Webhook/Download/Refund/Replay-Test; Supabase SQL grants und Artefakt SHA. Docker Security Gate und Domain Governance bleiben die einzigen Required Checks gemäß `AGENTS.md`.
- **Nicht nachgewiesen**: SMTP-Server-Annahme unter produktiver Last, Empfänger-Postfachzustellung, Käufer-Vertragsbestätigung auf dauerhaftem Datenträger nach deutschem Verbraucherrecht, Stripe-Sandbox-E2E, B2B-Lizenznehmerprüfung. Isolierte Mocks und CI ersetzen diese Nachweise nicht.
- **Nicht nachgewiesen**: echter Sandbox-Kauf inkl. Stripe Webhook→Supabase→Download, tatsächlicher Checkout-Tax-Betrag, Vertragsbestätigung per E-Mail, unternehmensweite Seat-Authentifizierung, Runtime-/Browser-Readback. Solange diese Nachweise fehlen: `NOT_ENABLED`.

Rollback: Produktaktivität und Checkout-Flag auf `false`; Server-PR revertieren; abgeschlossene Entitlements nicht blind löschen oder fremde Stripe-Sync-Metadaten verändern. Bereits bezahlte Rechte und gesetzliche Pflichten bleiben von einem Rollback unberührt.

## TRUST-Umsetzung 2026-10-13 — Vertragsbestätigung

- Branch `capital-ai-trust/blueprint-contract-confirmation-20261013` auf aktuellem Main-Snapshot; bestehendes Commerce-System erweitert, keine neue Applikation und kein neues Required Gate.
- Repository-Arbeitsanleitungen tatsächlich gelesen: `AGENTS.md`, `.agents/skills/trust-engineering/SKILL.md`, `.agents/skills/trust-advisory/SKILL.md`, `.agents/skills/visual-chat/SKILL.md` und `.agents/skills/product-engineering/SKILL.md`. Angewandte Skill-Aspekte: Tenant-/Auth-Grenze, service-role-only Lease, gefahrlose E-Mail-Evidence, produktbezogener Lizenztext, nachvollziehbare Runtime-Readbacks.
- Testvertrag: `node --test server/blueprint-commerce.test.mjs` inklusive Vertragsanhang, Steueraufschlüsselung, fehlender SMTP-Konfiguration, fehlender bestätigter Konto-E-Mail, Wiederholungs- und Retry-Verhalten. Docker Security Gate und Domain Governance bleiben Required Checks gemäß `AGENTS.md`.
- Checkout bleibt `false`; Rechts- und Steuerberatung beziehungsweise ggf. B2B/B2C-Verifizierung bleibt separat `REVIEW_REQUIRED`. Keine pauschale Verbraucherrechts-Freigabe durch CI.
