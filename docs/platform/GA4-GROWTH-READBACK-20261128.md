# GA4 und Growth: getrennte Prüfbereiche

Stand: 2026-11-28. Basis: main a8386552b2cac583bcdc90e5316c22f782524143.
Keine Schlüssel, Tokens oder privaten Provider-Payloads enthalten.

| Bereich | Status | Nachweis und Grenze |
| --- | --- | --- |
| Acode-Speicher | VERIFIED | Owner-Ausgabe: ACODE_STORAGE=VERIFIED; bestehende isolierte venv verwenden, siehe PR #1004. |
| IAM-Schlüsselzuordnung | VERIFIED | Owner-Ausgabe: PRIVATE_JSON, IAM_KEY_METADATA und KEY_ASSIGNMENT=VERIFIED. Kein neuer Schlüssel angelegt. |
| GA4 mit exakter Datei | VERIFIED | Owner-Ausgabe: GA4_SEVEN_DAY_REPORT=VERIFIED; GA4_CREDENTIAL_SOURCE=EXACT_PRIVATE_FILE. |
| Render-Konfiguration | VERIFIED | Owner-Diagnose: JSON_VALID=true, PROJECT_MATCH=true, GA4_CONFIG_VALID. |
| Render-Provider | VERIFIED | Owner-Readback: PROVIDER_READ_VERIFIED, properties/548187678, observedAt 2026-11-28T03:04:24.399Z. Doppelt geposteter identischer Cachewert ist kein zweiter Abruf. |
| Browser-Opt-in/Widerruf | VERIFIED | Live-Test: Tag G-0542DT2HCE nach Analytics-Zustimmung vorhanden; nach Nur notwendige und Reload abwesend; erneutes Opt-in lädt Tag wieder. DOM-Prüfung, keine vollständige Netzwerkaufzeichnung. |
| Browserereignis bis GA4 | NOT_PROVEN | Kein isoliertes Live-Testereignis mit anschließender eindeutiger Provider-Korrelation. Vorhandene page_view-Ereignisse beweisen diesen einzelnen Test nicht. |
| Eigene Angebotsverweise | VERIFIED | Bestehende Learning-, Pricing- und B2B-Verweise auf der öffentlichen Website. Kein neuer externer Werbedienst nötig; keine neue Aktivierung behauptet. |
| AdSense | BLOCKED | Keine Integration/Publisher-ID im geprüften Code. Anbieterfreigabe und für EWR-Traffic geeignete zertifizierte CMP nicht nachgewiesen. |
| Kraken als Werbepartner | AUSGESCHLOSSEN | Owner hat Kraken als Partner und Werbung zurückgenommen. Referral-Banner und automatische YouTube-Empfehlung werden entfernt. Technische Markt-/Dry-Run-Adapter sind nicht Teil dieses Widerrufs. |
| Anbieterbudgets | VERIFIED | Owner-Klarstellung: Google Cloud 5 EUR/Monat, Render 15 EUR/Monat; getrennte Grenzen. Tatsächliche Verbrauchseinhaltung NOT_PROVEN. |

## Kosten und Aktivierung

Render-Readback: ein Web-Service, Plan 0.5c-512mb und 5 GB persistente Disk.
Offizieller Listenpreis: 7 USD/Monat plus 5 × 0,25 USD/Monat = 8,25 USD/Monat,
vor Steuern, Wechselkurs, Gutschriften und weiteren Ressourcen. Das ist keine Rechnung.
Die 5-EUR-Grenze gilt ausschließlich für Google Cloud; Render hat eine eigene
15-EUR-Grenze. Keine Restbudgetberechnung aus Listenpreisen ableiten.
Kein Downgrade oder Löschen der Disk.

Bestehendes consented Analytics, private GA4-Readbacks und eigene Angebotsverweise
wiederverwenden. Keine zusätzlichen Worker, Scheduler, Datenspeicher, API-Abos,
Werbekampagnen oder manuellen Deployments gestartet. Die FAQ-Korrektur behebt
die falsche Behauptung, Analytics sei vollständig deaktiviert. Marketingfreigabe
wird durch eine Analytics-Einwilligung nicht erteilt; die Runtime hält
ad_storage, ad_user_data und ad_personalization auf denied.

## Nächste Owner-Schritte bei verbleibenden Blockern

1. Im privaten Billing-Editor aktuelle Kosten sowie Gutschriften je Anbieter prüfen;
   keine Rechnungs-/Zahlungsdaten in öffentliche Artefakte kopieren.
2. Der Owner hat alle drei Wege beauftragt: eigene Produktwerbung,
   AdSense-Einnahmen und Affiliate. Bei AdSense Websitefreigabe, Publisher-Kennung
   und CMP-Nachweis über geschütztes Acode/gcloud prüfen. Spätere Owner-Korrektur:
   Kraken ist als Werbe- und Affiliate-Partner ausdrücklich ausgeschlossen.
3. Für Browser-End-to-End-Nachweis ein definiertes zustimmungsbasiertes Testereignis
   mit Zeitpunkt und anschließendem privaten GA4-Readback korrelieren. Keine PII.

## Aktivierungsreihenfolge nach Owner-Entscheidung

| Weg | Vorhanden | Kostenarme Umsetzung | Konkrete verbleibende Voraussetzung |
| --- | --- | --- | --- |
| Eigene Produktwerbung | Learning-/Pricing-/B2B-Verweise öffentlich aktiv | Vorhandene Seiten und consented Analytics nutzen; keine neue Werbeplattform | Bestätigte Leads/Käufe getrennt von bloßen Klicks auswerten; kein bezahltes Anzeigenbudget erteilt |
| AdSense-Einnahmen | Kein Publisher-Tag und keine ID im geprüften Code | Bestehende Website nutzen; Google Privacy & messaging als CMP-Option prüfen, keinen zusätzlichen Cloud-Service anlegen | ca-pub-Kennung, Website-Prüfung, CMP-Konfiguration und Freigabestatus aus privatem AdSense-Konto; keine Kontoanlage/AGB-Annahme behaupten |
| Affiliate | Kein freigegebener Partner nach Kraken-Widerruf | Keine Kraken-Werbung und keine automatische Empfehlung in YouTube-Entwürfen | Anderen Partner nur mit eigener Owner-Freigabe und belegten Programmbedingungen vorsehen |

Google-Ads-Keyword-Recherche ist ein eigener lesender Pfad in PR #1000 und keine
AdSense-Integration oder Erlaubnis, bezahlte Kampagnen zu starten.
Das reguläre GA4-Servicekonto belegt keine AdSense-Kontoberechtigung.

## AdSense aus geschütztem Acode/gcloud

Versioniertes Skript:
scripts/platform/2026-11-28_PLATFORM_CHATGPT_ADSENSE_READBACK_v1.py.
Mit bestehender isolierter venv starten; keine neuen Pakete. Es verwendet nur den
vorhandenen gcloud-User-Zugang und begrenzte AdSense-v2-GETs auf accounts/sites.
Token bleibt im Prozessspeicher; kein Schlüsselzugriff, keine Login-/Scope-/API-
Aktivierung, keine Credential-Datei und kein Provider-Write. Ausgabe enthält nur
Status und die für capital-ai.online ermittelte öffentliche Publisher-Kennung;
keine Kontonamen, anderen Domains, Einnahmen oder Rohfehler.

403 wird nach belegtem Grund getrennt: ACCESS_TOKEN_SCOPE_INSUFFICIENT,
SERVICE_DISABLED oder sonstiger ADSENSE_HTTP_403. Konfigurierter gcloud-Account
ist kein Token-Identitätsnachweis. Vorhandener GA4-Schlüssel wird nicht verwendet.
Bei fehlendem Scope anschließend isolierten privaten User-OAuth-Kontext mit dem
bestehenden genehmigten Client und adsense.readonly vorbereiten; bestehende ADC
nicht überschreiben. Keine neue Anmeldung oder OAuth-Client-Anlage im Diagnosemodus.
Kontofreigabe, Websiteprüfung und CMP-Konfiguration bleiben getrennte Nachweise;
die AdSense-sites-API stellt in v2 nur get/list bereit und kann diese Schritte
nicht vollständig konfigurieren. Ein erfolgreiches GET aktiviert keine Anzeigen.

Geräteausführung und Drive-Sync sind bis zum tatsächlichen Owner-Readback
NOT_PROVEN. Drive-Erstellung nur über den vorhandenen projektweiten Lease-Pfad;
bei fehlender Lease-Bindung kein direkter Connector-Upload als Ersatz.

PR #1005: Der ursprüngliche Docker-Lauf 46101916540 scheiterte an der veralteten
SEO-Quellensignatur für src/content/publicLegalContent.ts. Die Reparatur verwendet
den bestehenden Generator refresh-seo-source-provenance.mjs; keine Prüfung wird
abgeschwächt. Aktuelle CI und produktiver Readback bleiben separat zu prüfen.

## Quellen

- https://render.com/pricing
- https://render.com/docs/disks
- https://support.google.com/adsense/answer/13554116
- https://support.kraken.com/articles/kraken-pro-app-referrals
- Runtime: src/utils/consentedAnalytics.ts, src/privacy/cookieConsentV3.ts.
- Bestehende Regressionen: test:cookie-consent-v3, test:commerce-measurement.

Lokale Tests belegen die implementierten Grenzen, keine aktuelle Providerrechnung
und keinen vollständigen Browser-Netzwerkmitschnitt. Änderungen sind bis zu Merge
und gesondertem Live-Readback nicht als produktiv ausgerollt zu bewerten.
