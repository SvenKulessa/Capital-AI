# PRODUCT · Hero-Globus und Homepage – Live-Evidence vom 15.11.2026

**Governance:** Root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`  
**Scope:** Nachprüfung des bereits gemergten [PR #744](https://github.com/SvenKulessa/Capital-AI/pull/744), Mobile-Navigation und Live-Viewport-Messung. Keine Änderung des Hero- oder Hub-Designs.

## 1. Eigentümerseitiger Rotationsnachweis

- Benutzerseitig eingereichte Bildschirmaufnahme: `Screenrecorder-20261115-210132.mp4` (vertrauliche Gesprächsanlage, **nicht im öffentlichen Repository**).
- Independenter SHA-256 der unveränderten MP4-Datei: `53d54d5497a600852e52862c224099f60762a5ab0d47b8a45584f4ce104a0217`.
- H.264, 720 × 1600, 17,5174 Sekunden. Für den zeitlichen Vergleich Frames bei ungefähr 1, 4, 8, 12 und 16 Sekunden betrachtet.
- Die Globus-Oberfläche und Orbitalringe verändern im Verlauf sichtbar die Position; Überschrift und CTA bleiben räumlich stabil. Zusätzlich hat der Owner am 15.11.2026 die Rotation ausdrücklich bestätigt.
- **VERIFIED:** Sichtbare Hero-Globus-Rotation im aufgezeichneten Android-Mobilbrowser.
- **NOT_PROVEN:** FPS, interne WebGL-Runtime-Buildidentität, Langzeitstabilität, Desktop-/andere Browser, exakte Runtime-Commit-SHA. Der Videovergleich beweist keine autonome Rechte-, Deploy- oder BuildIdentity-Freigabe.
- Persönliche Konto-/Profilinformationen aus einer separaten Screenshot-Rückmeldung werden nicht öffentlich mitgespeichert. Der ursprüngliche Videonachweis verbleibt außerhalb des GitHub-Repos; die SHA dient der späteren Echtheitsprüfung nur bei berechtigtem Zugriff auf das Original.

## 2. Live-Viewport-Prüfung nach Merge #744 (read-only)

**Ziel:** `https://capital-ai.online/` · beobachteter GitHub Main `071996eaa788229aba93d220d7dbc1eb51c4d82d` (nicht als produktive Runtime-SHA belegt).  
**Browser-Verfahren:** Isolierte, unauthentifizierte Firecrawl-/agent-browser-Chromium-Sitzung, mit `agent-browser set viewport <width> 900`, 1,2 Sekunden Wartezeit und anschließender DOM-Geometriemessung. Browser-Session `01a1e0e7-fa40-7209-ae74-ab46104631a3`. Keine Konto- oder Produktivmutationen.

| CSS-Viewport (px) | documentElement.clientWidth | scrollWidth | Karte: erste Breite | News-Karten | Überlauf | Karten außerhalb |
| ---: | ---: | ---: | ---: | ---: | --- | --- |
| 320 | 305 | 305 | 273 | 3 (einspaltig) | nein | nein |
| 390 | 375 | 375 | 343 | 3 (einspaltig) | nein | nein |
| 1440 | 1425 | 1425 | 381,3 | 3 (dreispaltig) | nein | nein |

Der Unterschied von 15 px zwischen innerWidth und documentElement.clientWidth entspricht dem gemessenen Scrollbar-Bereich; das Scrollmaß überschritt die Clientbreite **nicht**. Quelllinks waren bei allen Viewports mindestens 44 CSS-px hoch. HTML/CSS der live geladenen News-Rubrik wurde geprüft, nicht nur das vorherige isolierte PR-Mockup.

**VERIFIED:** Drei News-Karten im Viewport, kein horizontaler Dokumentüberlauf, Quelllinks ≥44 px, ein- bzw. dreispaltige Darstellung.  
**NOT_PROVEN:** Visuelle Pixelparität aller Hub-Details, eingeloggtes Owner-Profil unter den neuen Accordion-Änderungen und exakte aktuell deployte Runtime-SHA. Diese Punkte dürfen nicht als Live-PASS ausgegeben werden.

## 3. Profilmenü: begrenzter PRODUCT-Fix

Die vom Owner bereitgestellte Mobilaufnahme der Navigation zeigt fünf Kontoaktionen plus Logout unmittelbar oberhalb der bestehenden Hubs. Dadurch wird der sichtbare Hub-Bereich weit nach unten verdrängt. Die Ursache liegt in der bedingungslos gerenderten Konto-Aktionsliste in `src/components/Header.tsx`, sobald eine authentifizierte Session vorhanden ist.

Ein eigenes, standardmäßig geschlossenes Accordion `drawer-account-toggle` / `drawer-account-links` hält den Profilnamen und den Tarif sichtbar und zeigt nach Klick weiterhin Profil, Sicherheit, Konto & Rechte, Abos, Privates Dashboard und Abmelden. Ein erneutes Öffnen des Drawers beginnt wieder eingeklappt. Session-/Owner-Gates bleiben unverändert. Test: `node --test scripts/navigation.test.mjs`; CI am tatsächlichen PR-Head separat nachweisen.

## 4. Rollback / Scope

Nur die mobile Kontoanzeige in `src/components/Header.tsx`, ein fokussierter Navigationstest und diese Evidence-Datei dürfen geändert werden. Hero-Globus, Branding, `HubCatalog`, Hauptnavigation, Sitzungs-API, Login- und Logout-Logik, Redaktionsgrafiken und Marktdaten sind außerhalb des Scopes.

Rollback erfolgt bei regressivem Verhalten über einen regulären Revert-PR des späteren Squash-Merge-Commits, ohne Änderung von Authentifizierung oder Providerkonfiguration.
