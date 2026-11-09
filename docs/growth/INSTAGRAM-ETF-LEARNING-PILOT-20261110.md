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
