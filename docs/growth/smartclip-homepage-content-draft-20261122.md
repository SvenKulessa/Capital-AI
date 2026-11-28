# SmartClip — Homepage-Produktseite und Growth-Assets (interner Entwurf)
Status: DRAFT_ONLY · GROWTH / PRODUCT · 22.11.2026
Projekt: CAPITAL-AI. Keine Verbindung zu Device-Care-KI.
NOT_PUBLISHED / NOT_ADVERTISED / NO_PAYMENT_LINK

## Produktseitenentwurf (DE)

**Titel:** SmartClip – strukturierte Statusdaten für deinen eigenen Workflow
**Untertitel:** Lokale Terminalausgaben gezielt filtern und per bewusst ausgelöstem Android-Teilen-Menü weitergeben.
**Zielgruppe:** fortgeschrittene Acode-/AcodeX-Nutzer mit einem kompatiblen Android-Gerät und selbst eingerichteten Terminal-Helfern.
**Funktionsumfang (nur unter Nachweis bewerben):** Strukturierte Statusmeldungen zusammenfassen; definierte sensible Felder minimieren; Inhalt bewusst in die Android-Zwischenablage übernehmen; Android-Share-Menü auf ausdrückliche Interaktion öffnen.
**Wichtige Grenze:** SmartClip überträgt keine Inhalte automatisch an ChatGPT. Beim manuellen Teilen entscheidet der Nutzer, welche App die Daten erhält. Acode, Android, ChatGPT und Acti sind unabhängige Produkte ohne behauptete Partnerschaft.
**Kompatibilität:** bisher nur Einzelgerät-/Android-15- und AcodeX-Kontext teilweise nachgewiesen; CLI-Test und Plugin-UI-E2E getrennt dokumentieren; keine generelle Geräte- oder Tastaturfreigabe.
**Geplantes Lizenzmodell:** kostenlose, klar als solches deklarierte Acode-Store-Installation (`plugin.json.price=0`) und davon strikt getrennter, bisher nicht freigegebener Einmal-Lizenzverkauf über die CAPITAL-AI-Website (Ziel-Gesamtpreis 2,49 EUR, erst nach Steuer-/Verbraucherprüfung). Der kostenlose Plugin-Download belegt **keine** Kaufberechtigung. Kein externer Checkout-Link oder Kauf-Redirect innerhalb des Plugins ohne explizite Plattformrechtsfreigabe.
**B2C-Hinweis:** Vertragsverantwortlicher, steuerliche Preisangabe, Pflichtinformationen, Widerruf, Leistungs- und Updatepflichten sind nicht endgültig geklärt.
**CTA:** [Nicht aktiv: KAUFWEG_RECHTEPRÜFUNG]. Kein Button-Link, keine Zahlungsseite und kein Live-SKU vor Admission.


## Anbieterantwort Acode: kostenloser Store-Download, separate Lizenzierung (22.11.2026)

Quelle: schriftliche Antwort des Acode-Teams / Foxbiz Software Private Limited auf die Verkäuferrollen-Anfrage.
Gmail: https://mail.google.com/mail/u/?authuser=sven.kulessa%40gmail.com#all/1a204bdb673e99dd

- Acode empfiehlt ausdrücklich ein **kostenloses** Plugin im Acode Store mit gesonderter Konto-/Lizenzprüfung und Zahlungen auf der eigenen Website. Für extern abgewickelte Zahlungen erhebt Acode nach eigener Aussage keine Store-Provision.
- Betreiber der eigenen Website bleiben für Steuern, Rechnungen, Widerruf, Refunds, rechtliche Verbraucherpflichten, Support und Updates verantwortlich. Die Antwort enthält **keine** Freigabe für ein konkretes externes Kauf-CTA innerhalb des Plugins.
- Strikte Kanalisierung: `acode_free_plugin` ist nur ein Installations-/Distributionskanal; nur `homepage_sandbox` und ein gegen Stripe serverseitig nachgelesener Kauf kann eine **Sandbox**-Berechtigung erzeugen. Kein Grant aus einem kostenlosen Acode-Download, Acode-Store-Metadaten oder einer Success-URL.
- Acode-Manifeste für einen späteren kostenlosen Release haben `price:0`. `license` muss wahrheitsgemäß proprietäre Bedingungen benennen, ohne falsche OSS-Lizenzbehauptung; konkrete Plugin-Dateien und EULA wurden für diese Store-Variante nicht vollständig geprüft.
- Ein Acode-Plugin kann sich **nicht** allein durch den vorhandenen Website-`sameOrigin`-/Session-Cookie-Endpunkt für `/api/billing/smartclip-sandbox/access` authentifizieren. Der spätere unabhängige Login-/Lizenz-Sync für das Plugin benötigt einen separaten datensparsamen Auth-/Device-/PKCE-Entwurf, negativen Tenant-Test und Zustimmung zur erforderlichen personenbezogenen Verarbeitung. Keine unsichere direkte Service-Role- oder Stripe-Secret-Nutzung im Plugin.
- Produktseitige Fairness: Die Store-Beschreibung muss unmissverständlich zwischen kostenlos enthaltenen Funktionen und ggf. separat lizenzpflichtigen Funktionen unterscheiden. Keine implizite Kaufaufforderung oder erzwungene off-store Zahlungsnavigation.
- Status: `ACODE_RESPONSE=VERIFIED`, `FREE_STORE_RECOMMENDATION=VERIFIED`, `LICENSE_ACTIVATION_IN_ACODE=NOT_PROVEN`, `STORE_REVIEW=NOT_PROVEN`, `PUBLIC_UPLOAD=BLOCKED`.

## Stripe Tax / Managed Payments – 22.11.2026

- Testkonto `Stripe Tax settings.status=active`, aber `GET /v1/tax/registrations` listet **0** Registrierungen; unverändert kein SmartClip-Testprodukt.
- Ein einmaliger **synthetischer** Testmodus-Steuer-Preview über 249 Eurocent inklusive Steuer und fiktive deutsche Kundenanschrift (Berlin, PLZ 10115) mit Stripe-Katalogcode `txcd_10202000` (downloadbare Software, persönliche Nutzung) ergab `taxability_reason=not_collecting`, `tax_amount_inclusive=0` und `livemode=false`. Eine Nullsteuer wegen fehlender Registrierung ist **kein** Nachweis steuerlicher Befreiung.
- Stripe-Katalog bietet mögliche Software-Kategorien `txcd_10202000` und `txcd_10202001`; die Wahl der rechtlich zutreffenden Kategorie ist ausdrücklich noch nicht freigegeben. Offensichtlich fachfremde Codes (etwa digitale News/Dokumente `txcd_10503000`) müssen im Sandbox-Adapter gesperrt bleiben.
- Stripe Managed Payments könnte als Merchant of Record für digitale Software in DE grundsätzlich passen, doch **konto- und produktbezogene Zulassung sowie Annahme der Bedingungen sind NOT_PROVEN**. Keine stillschweigende Aktivierung oder Umgehung der bestehenden Test-Gates.
- Status: `TEST_TAX_CALCULATION=VERIFIED`, `DE_TAX_COLLECTION_READY=BLOCKED`, `MANAGED_PAYMENTS_ACCOUNT_ELIGIBILITY=NOT_PROVEN`, `REAL_TEST_CHECKOUT=NOT_PROVEN`.

## Interne Produktseitenstruktur
1. Hero: vertrauenswürdige, lesbare Produktdefinition ohne Leistungsversprechen jenseits technischer Readbacks.
2. How it works: Input (Terminalstatus) → lokale Minimierung → Nutzer prüft → optional Android-Share; nie automatische ChatGPT-Übertragung.
3. Systemvoraussetzungen: nachgewiesene Versionen/Builds und ausdrücklich ungetestete Umgebungen.
4. Sicherheit: nur synthetische Screenshots ohne Personen-, Konto-, Geräte-IDs, Tokens oder Recoverydaten.
5. Lizenz & Support: EULA-Draft bis Rechtefreigabe, keine Aussagen über Ausschluss zwingender Verbraucherrechte.
6. Preis: sichtbarer geprüfter Gesamtpreis erst nach Steuer-/MoR-Klärung; getrennte Kanalpreise.
7. Kauf / Bestätigung / Download: intern definierte Zustände, öffentlich nicht gerendert.

## Growth Content Engine: Draft-Assets
Asset 1 — Hero-Infografik (Designbrief, noch KEIN gerendertes Artwork)
Format: 1920×1080, Universe-Palette des bestehenden Branding-Systems; Workflow-Abfolge „Text prüfen → minimieren → bewusst teilen“; keine echten Terminalausgaben. Alt-Text: „Drei Schritte beim lokalen SmartClip-Workflow“. Ohne Bildrendering keine Visual-/License-Evidence.

Asset 2 — Produktkarte (Text)
Headline: „Statusdaten teilen – erst nach eigener Prüfung.“
Subline: „SmartClip unterstützt einen kontrollierten, manuellen Arbeitsablauf.“
Haftung: Keine automatische Sicherheitszertifizierung, keine Partnerschaft mit Acode oder OpenAI.

Asset 3 — 15-Sekunden-Demo (Storyboard, keine Videoerstellung)
Sek. 0–4 synthetischer Statusbericht; Sek. 4–10 lokale Bearbeitung/Redaktion; Sek. 10–15 Nutzer startet explizit Android Share. Audio optional, Untertitel vorgesehen, Screenshots erst nach verifiziertem E2E.

Asset 4 — Help/FAQ
Frage: „Lädt SmartClip meinen Terminalstatus automatisch hoch?“
Antwortentwurf: „Nicht im geplanten lokalen Plugin-Pfad. Ein Versand an andere Apps erfolgt nur über das vom Nutzer aktiv ausgewählte Teilen-Menü. Der Empfänger ist gesondert auf Datenschutz und Rechte zu prüfen.“
Frage: „Funktioniert es auf allen Android-Telefonen?“
Antwortentwurf: „Eine allgemeine Kompatibilität ist noch nicht nachgewiesen. Unterstützte Builds und Voraussetzungen werden vor Verkauf veröffentlicht.“

## SEO und Marketing
Slug-Vorschlag: /products/smartclip (DRAFT_ONLY, nicht live)
Title-Vorschlag: „SmartClip – Statusmeldungen lokal bearbeiten | CAPITAL AI“
Meta-Beschreibung: „Geplanter kontrollierter Workflow für strukturierte Terminalstatusdaten mit manueller Android-Weitergabe. Verfügbarkeit und Kompatibilität werden geprüft.“
Keine Suchanzeigen und keine öffentliche Landingpage solange CHECKOUT=BLOCKED.
Quellen-/Lizenznachweise pro tatsächlich verwendeter Grafik: source_id, creator, license/permission, SHA-256, usage_scope, approval state, asset version und Erscheinungsdatum.
Beispiel-UTMs nur bei späterer Einwilligung: utm_source=homepage oder dokumentierter Marktplatz; utm_medium=organic; utm_campaign=smartclip_launch; UTM-Werte niemals als Entitlement oder Zahlungsnachweis werten.
Vorhandene Growth Content Engine und Attribution Contracts verwenden; keine zweite Content Pipeline.

## Unabhängige Gates / Zuständigkeiten
PRODUCT: veröffentlichbare, belegte Funktionen und Supportmatrix.
PLATFORM: signed webhooks, Offline-Receipt- und Download-Sicherheit; sandbox Einmalcheckout.
TRUST: Eigentums- und Drittrechte, Acode- und Acti-Vertrag, EULA, Steuer/Checkout/MoR, Verkäuferidentität, DSGVO.
QUALITY: unabhängige Test-Gegenprüfung auf echten Geräte- und CI-Readbacks.
GROWTH: Publishing nur nach tatsächlichen positiven Admission- und Editorial-Befunden.

## Source References
- Projekt-Dokument https://docs.google.com/document/d/1SEoW3xFuv_HnyAr5Mb3E4-e4qw9lgrnwrQ7oeNsEbtU/edit
- Acode TOS https://acode.app/terms
- Acti TOS https://openacti.com/terms/
- Stripe Managed Payments https://docs.stripe.com/payments/managed-payments
- Stripe Checkout Webhooks https://docs.stripe.com/checkout/fulfillment
- Rechteklärung in Drive: 2026-11-22_TRUST_CHATGPT_SMARTCLIP_DE_EU_B2C_RELEASE_LEGAL_MEMO_v1.md

Statusmarkierungen
PAGE_DRAFT=SCRIPT_CREATED
MARKETING_ASSET_COPY=SCRIPT_CREATED
GRAPHICS_RENDERED=NOT_PROVEN
RIGHTS=NOT_PROVEN
CHECKOUT_PUBLIC=BLOCKED
SITE_PUBLISHED=BLOCKED

## 25.11.2026 — SmartClip private delivery / activation / conversion contract delta (DRAFT_ONLY)

### Delivery implementation boundary
Existing sandbox handler now supports a private GET download only when trusted server composition supplies an admitted private release reader. The production index does not inject one. Require verified same-origin user session, exact personal entitlement in the isolated ledger, exact TEST-only admission / SKU / release / license identity, bounded immutable ZIP snapshot with pinned SHA-256, then re-read entitlement before response. No client path or URL, no public static file, no new storage or runtime key. The existing Blueprint vault is restricted to CAP-BP-001/002 and is not an authorized SmartClip artifact source. Actual admitted ZIP, private reader, successful real download and device use remain NOT_PROVEN. Refunds deny subsequent downloads; already transferred files cannot be recalled.

### License draft — SMARTCLIP_PERSONAL, draft-v3 (not effective)
- Scope: a single authenticated natural person may use the specifically admitted release on that person's own compatible devices, subject to the finally approved device policy. No business/enterprise grant, transfer, redistribution or sublicensing is implied. Free-store installation alone is not a license. Third-party software and content remain subject to their own rights and notices.
- Seller and product identity, approved final text and artifact digest, consumer price/tax, statutory withdrawal and conformity/update rights, support contact, privacy notice and durability of contract confirmation must be finalized before offer. Mandatory rights prevail; no blanket exclusion of refunds or updates. Sandbox consent markers do not establish an enforceable consumer agreement. Keep final acceptance version, timestamp and digest in the existing transactional entitlement lane once authorized; do not mutate the productive DB under #664.
- Support draft: existing verified support channel only; no published SLA or device compatibility claims before evidence. Refund/dispute handling uses Stripe-authoritative reversal and existing terminal tombstone; partial refunds require a distinct policy, not an automatic full revocation. Actual refund issuance needs the authorized payment path.

### Customer device activation contract (not implemented)
Reuse existing Supabase user identity and supported OAuth PKCE authorization if a compatible client integration is confirmed. Use a random installation key pair, not device serial/IMEI/clipboard data. Bind short-lived one-time challenge and proof of possession to the verified user, SKU, exact release and license version. Store only bounded public-key fingerprint, scope and activation state in an isolated service-only ledger; atomic consume, replay rejection, cross-user denial, explicit deactivation and revocation readback. Never repurpose owner-device authority, browser success redirects, Stripe secrets or service-role credentials in Acode. Require artifact/client access and lawful privacy decision before wiring; no activated customer device or durable store is asserted.

### Growth/SEO and consent contract
Retain the existing internal product page draft and Growth Content Engine; no separate publishing pipeline. Product identity SmartClip is distinct from AI-Smartcopy, CADS and X campaign initial-invoice subscription receipts. Only independently verified one-time purchase / refund / entitlement state with product-specific affirmative consent may feed a scoped aggregate. Proposed stages: product view, approved installation readback, checkout started, license granted, reversed. No clipboard contents, raw payment identifiers or customer emails in analytics. Withdrawal prevents optional measurement; necessary fulfillment/reversal remains separate. Reuse existing consent ledger / outbox / Growth Control Center / LangGraph patterns after adapting their actual scope, not the fixed X or Smartcopy campaign identity. Sandbox receipts cannot count as revenue; all actual metrics remain NOT_PROVEN. No historical cost-warning dead letters retried.


### TEST-only device pairing and download composition (implementation candidate)
The existing verified website session (including its existing PKCE login) authorizes four POST operations: device-challenge, device-activate, device-status, device-revoke. Ed25519 proof binds a 120-second random challenge to the authenticated user, SKU, release digest, license and public-key fingerprint. The service-only SQL candidate consumes the challenge atomically, binds activation to a specific paid entitlement row and denies use after refund/dispute or explicit revocation. Repurchase does not revive the old activation. A per-user 32-record safety cap is an isolated technical bound, not a commercial device policy; use a new key after explicit revoke. No serial, IMEI, device secret or token in responses. Status is an authenticated website readback, not a mobile license credential. The Acode client PKCE callback/secure key storage and real device compatibility are still NOT_PROVEN. The candidate SQL is deliberately outside migrations; no database was changed.
The existing private ZIP handler is now explicitly injectable through trusted server composition (smartclipReadAdmittedPrivateRelease). No default reader, storage location, file path, provider call, artifact admission or approved ZIP has been added. Default-off behavior remains. No public offer, paid feature activation, license or storage deployment is authorized. Existing CI runs the JS and isolated PostgreSQL candidate tests.


### Private artifact reader and portable pairing candidate
The opt-in reader uses only the fixed private directory /var/data/capital-ai-private-smartclip, the file SmartClip-acode-bridge-v2.zip and an independently owner-provisioned admission.json matching the existing TEST_ONLY_APPROVED contract. No directory creation or writes occur. Directory and files must be service-owned, private, non-symlinked; the bounded immutable byte snapshot and pinned digest are rechecked. Existing entitlement checks still surround the read. SMARTCLIP_SANDBOX_PRIVATE_DELIVERY_ENABLED defaults off and is not configured by this PR. The disk is not provisioned or populated; filesystem permissions are not an application-level encryption-at-rest claim. Admission is not generated by code or inferred from the historical rights note. The actual ZIP remains unavailable for current byte readback; the positive reader test uses a synthetic digest only through an internal test seam, never the runtime pin.
Portable browser pairing candidate: nonextractable Ed25519 CryptoKey objects stored by IndexedDB, per-user release-bound key slots, strict server challenge validation and the existing same-origin authenticated website session (including its existing PKCE). No tokens are persisted or exported. The native Acode callback, registered OAuth client and trusted session bridge remain unverified; this candidate deliberately refuses file:// and foreign origins and is not bundled into the current plugin. The existing Acode ZIP pin is unchanged. A new plugin build requires new version, source review, rights and digest admission; no existing release is silently replaced. No provider, database, storage or release activation.
