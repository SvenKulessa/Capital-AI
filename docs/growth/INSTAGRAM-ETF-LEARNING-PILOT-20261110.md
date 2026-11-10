# Instagram-ETF-Lernpilot

Artworks-Quellcommit `3c26d10db4675ac95d036943e9c25f3f100d442e` (PR #625); vorheriger Planungs-Baseline-Commit `fea4dbc49721ef50131063791db7fac2f4c399ab` enthält die SVGs noch **nicht**. `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`.
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

## Ergänzung 2026-11-10 – korrigierte SVG-Provenienz und JPEG-Review

Der frühere `INSTAGRAM_PILOT_SOURCE_SHA` referenzierte einen Commit ohne die drei SVG-Dateien. Der reine Herkunftsverweis ist nun auf den tatsächlichen SVG-Merge-Commit `3c26d10db4675ac95d036943e9c25f3f100d442e` korrigiert. Die drei bestehenden SVG-Hashes, das SVG-Rendering, der Client-PNG-Export, die Kampagnen-IDs, die Canonical-URL und die Veröffentlichungssperre bleiben unverändert. Ein Regressionstest fixiert diese Quellidentität.

Die drei privaten PNG-Exporte besitzen eigene SHA-256-Werte und können nicht die bisherigen SVG-Asset-Hashes übernehmen. Die bereits privat geprüften PNGs und separat bytegebundenen JPEG-Arbeitskopien liegen als **HOLD_NO_PUBLISH**-Freigabepaket im privaten Marketingordner. Das in diesem Repository laufende Pilot-Manifest enthält weiterhin ausschließlich SVG-Assets mit `approvals=[]` und `deliveries=[]`. Eine Veröffentlichung setzt einen unabhängigen, exakten Medien-Hash-Vertrag und belastbare Rechte-Evidence voraus; weder Instagram-Carousel-Adapter noch Publisher-Konto, öffentliche Bild-URLs oder kostenbezogene Berechtigung sind mit diesem Fix aktiviert oder belegt.

Für Meta-Carousel-Publishing ist der aktuelle `provider-publish.mjs`-Instagram-Pfad ungeeignet: Er bildet Reels (`video_url`, `media_type:REELS`), nicht drei Bildcontainer mit einem Carousel-Parent ab. Bis zur gesondert autorisierten, technisch geprüften Carousel-Anbindung ist Publishing weiterhin `BLOCKED`. Redaktion, Alt-Texte sowie Brand-Rechte bleiben `REVIEW_REQUIRED`.
