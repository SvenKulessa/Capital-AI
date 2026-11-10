# Instagram-ETF-Lernpilot

Basis `fea4dbc49721ef50131063791db7fac2f4c399ab`, `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`.
Nach Merge erscheinen drei 1080x1350-Originalgrafiken und die passende Caption
im bestehenden Content Studio. Der PNG-Export erfolgt lokal im Browser.
Der CTA zeigt auf den bereits bestehenden Learning Hub.

**Evidenz:** Synthetisches Rechenbeispiel Bid 99,90 und Ask 100,10, Spread 0,20 EUR.
Versionierte inhaltliche Quelle: `shared/learning-journey.mjs` am genannten Commit.
Die drei SVG-Quelldateien haben SHA-256-Werte im bestehenden ContentSocialPackage.
Exportierte PNGs haben andere Bytes und sind **nicht** automatisch freigegeben.
Die Content-Engine akzeptiert nun auch Instagram als Kampagnenkanal.

**Grenzen:** DRAFT / REVIEW_REQUIRED, kein Account-OAuth, kein Provider-Aufruf,
keine Veröffentlichung, keine zusätzlichen Kosten, keine Nutzerdaten.
Redaktion, Rechte, mobile Browser-QA und Conversion-/Provider-Readback bleiben
NOT_PROVEN. Keine Anlageberatung oder Live-Kurse.

**Test:** `npm run test:instagram-learning`, danach normale GitHub-CI.
**Rücknahme:** geschützter Revert des Pilots ohne Änderung an Wallet/Provider/Vault.

## Ergänzung 2026-11-10 – consent-gated Profil-Link und Kampagnenmessung

Source-Identität bleibt `capital-ai-instagram-etf-learning-v1` /
`capital-ai-instagram-etf-kosten-20261110`; die neue gemeinsame Konstante
`src/contracts/instagramCampaignTracking.ts` erzeugt genau einen 4-Parameter-UTM-Link
für den öffentlichen Learning Hub. Im bereits vorhandenen Studio lässt er sich kopieren.
Die Instagram-Bio wird **nicht** automatisch geändert. Ohne veröffentlichten Link gibt es
keinen kausalen Nachweis für Social-Traffic.

Bestehende `consentedAnalytics.ts` sendet *nur* nach expliziter Analytics-Einwilligung,
auf dem kanonischen öffentlichen Host und bei exakt passender Kampagne das
`campaign_landing`-Event. Aus der URL werden ausschließlich vier whitelisted
Kampagnenkennzeichen interpretiert; zusätzliche Query-Parameter gelangen nicht in
`page_location` oder Event-Parameter. Duplikate oder manipulierte UTM-Felder
werden nicht attributiert. Die Seite erfasst diese Kennzeichen nur einmal pro
Browser-Dokument; keine neue Speicherung, keine neuen Cookies, kein Tracking vor
Consent. Die bereits bestehenden GA4-Opt-in-Cookies/Providergrenzen gelten unverändert.

**Interpretationsgrenze:** UTM ist selbstdeklarierter Kanal-Kontext, keine Provider-bestätigte
Instagram-Interaktion. `campaign_landing` ist ein Consent-abhängiger **Eventcount**,
kein eindeutiger Besucher und kein Käuferbeleg. Umsatz, Kausalität, Channel-ROI und
Purchase-Zuordnung bleiben `NOT_PROVEN`; dafür wäre separat genehmigte und belegte
End-to-End-Evidence erforderlich. GA4 benutzerdefinierte Berichts-Dimensionen und
Produktions-Event-Readback sind ebenfalls `NOT_PROVEN`.

Tests: `npm run test:instagram-learning`, `node --import tsx --test src/utils/consentedAnalytics.test.ts`,
reguläre GitHub-Pipeline. Unverändertes fail-closed Publishing, keine neuen Kosten-Dienste.
