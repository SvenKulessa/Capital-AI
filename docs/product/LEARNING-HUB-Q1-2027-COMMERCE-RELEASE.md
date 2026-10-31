# CAPITAL-AI Learning Hub — Angebots- und Release-Contract Q1 2027

**Stand:** 2026-10-31 · **Entscheidung:** Produkt- und Checkout-Zielvertrag · **Umsetzungsstatus:** Code-/CI-/Runtime-Evidence separat.
**Quelle:** aktueller `main` beim Branch-Start `a799d7416eaca8c399098ec5eff2f3bee6e6e0dc`; `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`) bleibt alleinige Engineering-Policy.
**Skills:** `.agents/skills/revenue-engineering/SKILL.md`, PRODUCT, GROWTH und TRUST; Stripe-Checkout-/Webhook- und Schlüssel-Sicherheitsbest-Practices.

## 1. Verbindliche Produktpositionierung

**Learning Portal, einmalig EUR 25 (2.500 Cent, im Stripe-Katalog `tax_behavior=inclusive`).** Einmalzahlung, keine automatische Verlängerung und kein verpflichtendes Starter-/Pro-/Enterprise-Abo. Der bestehende Checkout-Betrag ist der **Bruttopreis im Sinne der aktuellen Preis-Konfiguration**; rechtliche Steuer-/Rechnungsangaben und länderspezifische Behandlung sind separat anhand der tatsächlichen Stripe- und Händlerkonfiguration zu verifizieren. Keine pauschale Nettoerlös- oder Umsatzsteuersatz-Annahme.

Bereits vorhandene Angebote und Abgrenzung (Quellautorität: `src/data/vocabularyOffer.ts`, `src/features/learning/LearningPurchase.tsx`, `docs/product/LEARNING-PORTAL-ROLLOUT-20261009.md`):
- **Free:** öffentliche Glossarbegriffe und ausdrücklich ausgewiesene Vorschau-/Gratis-Funktionen; keine fiktive 25-€-Paywall für öffentliche Definitionen.
- **25 € einmalig:** Learning-Portal-Zugriff über das vorhandene `quantProEntitled`-Entitlement, Premium-Übungskarteikasten, zulässige tägliche Lern-/Quiz-Funktionen und tatsächlich veröffentlichte freigegebene Lernmedien.
- **Separat:** Chartatlas und Modul-Erklärungen benötigen laut bisherigem Zugriffsmodell mindestens Starter; Chart-Erkennungstraining zusätzlich Pro oder Enterprise. Keine stillschweigende Freischaltung dieser Abofunktionen durch den 25-€-Kauf.
- **Legacy:** gültige EUR-19-`market-vocabulary`-Kaufbelege bleiben bestandsgeschützt. Der historische Preis ist **nicht** der autoritative Neupreis; bestehende Rechnungen und Zugriffszusagen werden nicht umgeschrieben.
- Founder-/B2B- und Blueprint-Angebote bleiben Anfragen bzw. gesonderte, rechtegebundene Produkte; keine unbewiesenen Inhalte, Features oder Providerlizenzen als Inklusivleistung anpreisen.

**Kaufentscheidung:** Die produktive Stripe-Preis-ID gehört ausschließlich in serverseitige Checkout-Konfiguration und das autorisierte Live-Katalog-Readback; sie ist kein geheimes Token. In der Web-Anzeige ist die Preisdefinition aus `src/data/vocabularyOffer.ts` maßgeblich. Mehrere Preis-IDs am selben Stripe-Produkt sind zulässig, wenn SKU, Gültigkeit und Berechtigungsvergabe eindeutig sind.

## 2. Verifizierbarer Checkout- und Entitlement-Contract

```text
/learning → Login + Widerrufsinformation → serverseitige EUR-25-Preisprüfung
         → Stripe Checkout Session (mode=payment, genau 1 Position)
         → signierter Webhook / sekundärer Return-Readback
         → Stripe GET Session + GET line_items (limit=2)
         → SKU + User + Status + Total + Price-ID/Product-ID/Quantity/Währung
         → idempotente Supabase entitlement-RPC → privater Learning-Zugriff
         → pseudonyme Kauf-Analytics nur mit gültiger Mess-/Consent-Basis
```

- Für neue Käufe wird `STRIPE_LEARNING_PORTAL_PRICE_ID` plus `STRIPE_LEARNING_PORTAL_PRODUCT_ID` mit **exakt 2.500 EUR-Cent, einmalig**, geprüft; beim Fulfillment darf kein anderer konfigurierter Preis Zugang gewähren.
- Die unveränderte historische Preis-ID ist auf die Legacy-SKU und deren tatsächliches Stripe-Produkt begrenzt.
- `checkout.session.completed` **und** `checkout.session.async_payment_succeeded` durch signaturvalidierten Webhook prüfen; bei verzögerter Zahlung nicht vorzeitig freischalten. Ungewisse Stripe-/Supabase-Providerantworten dürfen nicht stillschweigend als Erfolg protokolliert werden.
- Mehrfache Webhook-Ereignisse, Return-Seite und Retries dürfen nicht zu mehrfachen Grants, inkonsistentem Status oder mehrfacher Umsatzattribution führen; serverseitig Idempotenz und originalen Stripe-Beleg verwenden.
- Rückerstattung/Dispute, tatsächliche Stripe-Webhooks, Supabase-Produktivschema, Browserzahlung und Rechnungsausgabe sind **vor gesondertem Beleg NOT_PROVEN**. Keine Live-Transaktion nur für einen statischen Test.

### Live-, Test- und Sandbox-Umgebungen

| Umgebung | Price- und Product-Identität | Kaufwirkung | Evidenz |
| --- | --- | --- | --- |
| **Stripe Live** | verifizierter 25-€-Price / Product aus Live-Katalog + `render.yaml` | nur reguläre Kundenzahlungen | getrennte live API-Readbacks, registrierte Webhooks, anonymisierte Receipts |
| **Stripe Sandbox/Test** | **eigene** in dieser Umgebung angelegte `price_test_...`-/`prod_test_...`-ähnliche IDs (tatsächliche Provider-IDs, kein hier vorgegebenes Präfixmuster) | ausschließlich künstliche Tests | redigierte Test-Event-ID, Modus, isolierter Checkout, erwartete und beobachtete Ergebnisse |
| **CI-Fixture** | künstliche, nicht an Stripe übermittelte IDs + Fake-`fetch` | keine Zahlung und keine Produktionsmutation | Node-Contract-Test, Commit und CI-Run-ID |

**Regel:** Live-IDs nicht als vermeintliche Sandbox-IDs verwenden; API-Schlüssel und Webhook-Secrets pro Umgebung separat und serverseitig speichern. `sk_*`/`rk_*` und `whsec_*` niemals in Git, ZIP-Exports, Browser, Social-Inhalten oder Logs. Ein erfolgreiches CI-Fixture ist **kein** Stripe-Testmodus- oder Realzahlungstest. Bevorzugt kurzlebige, eingeschränkte Schlüssel und eigene Stripe-Sandboxes; die derzeit verbundene Account-Sitzung ist auf Live-Readbacks begrenzt, solange kein Testkonto nachweisbar verbunden ist.

## 3. Marketing-, Content- und Provenance-Verzahnung

```text
Repo-/Fachquellen ─→ SOURCE_PROVENANCE@1 + Lizenzen ─→ Content-DRAFT
           ─→ CADS/Faktenprüfung ─→ redaktionelle/legal Freigabe
                  ├─→ Learning Hub / SEO ─→ verifizierter 25-€-Checkout
                  ├─→ Newsletter (berechtigte Empfänger, Unsubscribe, Suppression)
                  ├─→ X API (Owner-OAuth + Ausgabenlimit + Provider-Receipt)
                  └─→ YouTube (getrennte OAuth-Scopes, Demo-Video, Rechte)
```

`MARKETING_OUTREACH_POLICY@3` (`src/contracts/marketingOutreachPolicy.ts`) bleibt der E-Mail-Versand-Contract: Beleg für Einwilligung bzw. tatsächlich anwendbare Bestandskundenausnahme, GDPR-Basis, Suppression, Widerruf, Abmeldung, Frequenzlimit, Senderidentität, Kill Switch, Audit. Unbeauftragte Kampagnen, Massenmails, Social-Posts, Ads oder YouTube-Uploads bleiben gesperrt.

PR #555 ist der bereits existierende, **eigenständige** Export-PR für hashgebundene unabhängige ZIP-/KI-Prüfungen; diesen Scope nicht mit einem zweiten Manifest duplizieren. Identität: Git-SHA, Blob-Digests, Test-/Image-SHA, CI-Run-ID, Provider-/Commerce-Evidence-Quellen und Grenzen zwischen statischem Test/Provider-Readback/Live. Keine Kundendaten, Geheimnisse, unveröffentlichten Kaufbelege oder privaten Kontoprüfungen in öffentliche Audit-Exporte.

YouTube-Entwicklerverifikation: der föderierte `workflow_dispatch` in `.github/workflows/google-cloud-admin.yml` ist **read-only Google-Cloud-Operator-Evidence**, nicht automatisch ein Nachweis von `youtube.readonly`/`youtube.upload` oder publizierten Videos. Eigentümer-OAuth und Freigabe-/Widerrufspfad getrennt nachweisen.

Einzelne personenbezogene Konto-, Geräte-, Kommunikations-, Partner- oder Orts-/Zeitachsenprüfungen gehören in ein **privates** Evidence-Register mit expliziter Quelle, Zeitbereich, Freigabe und Aufbewahrungsfrist. Nicht aus einem Ortsbezug, Gerätebeleg oder einer Kommunikationsunterbrechung auf Gmail-Kompromittierung, Partneridentität oder E-Mail-Vertrauenswürdigkeit schließen. Kein solcher personenbezogener Vorgang wird durch diesen PR publiziert.

## 4. Auslieferungsplan für das nächste Quartal — 01.01.–31.03.2027

| Zeitraum | Ergebnis | Abnahmekriterium / Stoppsignal |
| --- | --- | --- |
| **November–Dezember 2026: Stabilisierung** | Preis-/Line-Item-Prüfung, negative Checkout-Tests, Review-Provenance, vollständiger Owner-Readback von Webhook-/Supabase-Status | aktueller PR-Head: Docker Security Gate + Domain Governance + CodeQL PASS; keine Live-Checkout-Claims ohne Providerbelege |
| **Januar 2027: Kaufbar und verständlich** | Mobil getesteter Lernpfad Free → 25-€-Offer → Checkout → Signatur/Webhook → Entitlement; Preis und enthaltene Rechte überall konsistent | echter Live-Receipt-Test nur mit ausdrücklicher zulässiger Kaufhandlung, Browser-/A11y-Readback, Entitlement-/Refund-Pfad dokumentiert |
| **Februar 2027: Content-Distribution** | quellengebundene Newsletter-, X- und YouTube-Drafts plus verantwortbare SEO-Verlinkung zu `/learning` | keine Ausspielung ohne kanalbezogene Consent-/Provider-/Copyright-/Legal-Evidence; kein unbegrenztes API-Budget |
| **März 2027: Monetarisierungsreview** | 28-Tage-Kohorten-/Funnel-Vergleich, Onboarding-Probleme und Nettowert nach Refunds/Kosten evaluieren | nur tatsächliche signierte Verkäufe und zulässige consent-basierte Events; Quartalsentscheidung belegen, keine hypothetischen Conversions |

### Kennzahlen (Zieldefinitionen, keine behaupteten Ist-Werte)

- **Qualified learning visits**, **angebotssichtbare Sitzungen**, **Checkout Starts**, **verifizierte bezahlte Checkout Sessions**, **serverseitig aktivierte Entitlements**, **Refund-/Chargeback-Rate**, **Kurs-/B2B-Anfragen**.
- Conversion = verifizierte 25-€-Käufe / dazugehörige zulässig messbare qualifizierte Angebotsbesuche (gleicher Zeitraum/Kanal). Unbekannte Nenner führen zu `NOT_PROVEN`, nicht zu `0 %`.
- Bruttoumsatz = EUR 25 × tatsächlich bezahlte 25-€-Bestellungen abzüglich belegter Preisnachlässe; Nettoerlös erst nach Steuern, Refunds, Gebühren und etwaigen weiteren tatsächlichen Kosten bestimmen.
- Kanalbelege müssen gebundene Content-ID, kanonische URL, Datum, freigegebenes Asset-Digest und Provider-Durchführungs-ID besitzen. Datenschutzfreundliche Attribution führt keine Zahlungs-PII im Analytics-Event.
- **Q1-Exit:** vollständig reproduzierbare Kauf-/Grant-/Widerrufs- und rechtssichere Content-Kette; noch offene Punkte mit `NOT_PROVEN` oder `BLOCKED` dokumentieren, keine fiktive Vollständigkeit.

## 5. Grenzen, Rücknahme und Ownersicht

- Dieser Contract ändert **keine** Stripe-Preise, Refunds, API-Keys, Supabase-Tabellen, NATS/Rust Provider Bridge, E-Mail-Listen, X-/YouTube-Publisher oder Google-Operator-Rechte.
- Der revidierte Checkout-Pfad wird erst nach den regulären PR-Checks und separatem Render-Runtime-Readback als produktiv nachgewiesen. Bei Fehlverhalten den kleinen Checkout-Code-Commit per geprüften PR zurücknehmen, **nicht** historische Stripe-Belege oder Entitlements löschen.
- Zugriffsrechte für den Nutzer sind aus dem Serverzustand und bezahlten Provider-Beleg abzuleiten, nicht aus browserseitigen SKU-/Preis-/Event-Feldern.
- Verifikationsgrenzen: **Statischer Code ≠ erfolgreicher CI-Test ≠ Stripe-Live-Checkout ≠ Render-Live-Wirkung ≠ publizierter Newsletter/X/YouTube-Post.**
