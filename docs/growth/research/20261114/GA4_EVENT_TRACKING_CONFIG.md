# GA4 Event-Tracking – Konfiguration
**Status:** DOKUMENTIERT (bestehende Implementierung)  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Measurement ID
`G-0542DT2HCE` (nur nach explizitem Analytics-Consent)

## Aktivierungsbedingungen
- Explizites Analytics-Opt-in (`analytics: true`)
- Nur auf messbaren öffentlichen Pfaden (`isAnalyticsMeasurable`)
- Keine Messung auf privaten, NOINDEX- oder nicht freigegebenen Routen
- Consent Mode: `analytics_storage: granted` nur nach Opt-in; Ads bleiben denied
- Google Signals und Ad-Personalisierung deaktiviert

## Implementierte Events

| Event | Auslöser | Payload-Restriktionen | Status |
|-------|----------|------------------------|--------|
| `page_view` | SPA-Navigation auf messbaren Pfaden | Keine Query/Fragment, nur kanonische Pfade | VERIFIED |
| `generate_lead` | Erfolgreiche Learning-Inquiry | Keine E-Mail, keine Receipt-ID, nur `lead_type` | VERIFIED |
| `view_item` | Sichtbares Produktangebot | Nur erlaubte `item_id`, EUR, begrenzter Wert | VERIFIED |
| `begin_checkout` | Checkout-Start | Wie view_item + Session-Validierung | VERIFIED |
| `purchase` | Verifizierter Kauf | HMAC-Transaktions-ID, EUR, ein Item, Deduplizierung | VERIFIED |
| `campaign_landing` | Instagram-Kampagne auf `/learning` | Begrenzte Campaign-Parameter, einmal pro Document | VERIFIED |

## Sicherheits- und Datenschutzregeln
- Keine personenbezogenen Daten, E-Mails, Nutzer-IDs oder Roh-Queries
- Transaktions-IDs nur als HMAC (64 hex)
- Deduplizierung pro Document-Lifetime
- Bei Consent-Widerruf: Tag entfernen, Cookies löschen, Reload
- Messung blockiert die Anwendung niemals

## Nicht aktiviert / nicht empfohlen ohne Freigabe
- Automatische Enhanced Measurement
- Formular-Interaktionen
- Scroll- oder Click-Tracking ohne expliziten Zweck
- Cross-Domain oder User-ID-Tracking

## Quelle
Implementierung in:
- `src/utils/consentedAnalytics.ts`
- `src/utils/analytics.ts`
- Consent- und Measurement-Policy

**Abschluss:** Die Event-Tracking-Konfiguration ist bereits restriktiv und consent-basiert umgesetzt. Weitere Events erfordern explizite Freigabe und Evidence.
