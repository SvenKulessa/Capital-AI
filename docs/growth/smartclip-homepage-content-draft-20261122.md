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
