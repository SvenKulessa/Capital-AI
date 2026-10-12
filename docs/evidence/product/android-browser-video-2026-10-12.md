# PRODUCT — Android-Video und Accessibility-Evidence (2026-10-12)

**Scope:** PR #423, CAPITAL-AI Webprodukt, Chrome auf Android. Quelle: private, vom Owner in Google Drive bereitgestellte Aufnahme `screen-20261012-021706.mp4`. **Original, Drive-Link, Bilder, Benutzernamen, E-Mail-Adressen, MFA-Codes und Zugangsdaten bleiben außerhalb des Repositories.**

## Aufnahme und Methode

- **Datei:** MPEG-4/H.264, 720 × 1612 Pixel, ca. 06:03 Minuten; **keine Audiospur**.
- **Verfahren:** Manuelle Sichtprüfung mit zeitlich verteilten und gezielten Einzelbildern.
- **Verifizierbar:** Auf dem Video sichtbare Android-/Chrome-Bedienabläufe und die dort gerenderten Produkttexte.
- **Nicht verifizierbar:** Deployed Commit-SHA, DOM/Accessibility-Tree dieser Aufnahme, tatsächliche TalkBack-Ausgabe, vollständiger WCAG-Status, Tenant-Isolation und serverseitige Entitlements.
- **Keine Sicherheitsschlussfolgerung aus Markennamen:** Entfernen eines Provider-Labels verbessert die Kunden-UX; die tatsächlichen Sicherheitsgrenzen bleiben Session-Cookies, Backend-Autorisierung und RLS.

## Video-Befunde und Repository-Korrekturen

| ID | Videozeit | Sichtbefund | Änderung auf PR #423 / Restrisiko |
| --- | --- | --- | --- |
| VIDEO-01 | 00:36–00:58 | Header zeigt Free, Profil OWNER. | Header zeigt OWNER als Rolle; Profil trennt Rolle, statusgeprüften Tarif und serverseitige Produktentitlements. Das verleiht keine Pro-Rechte. |
| VIDEO-02 | 00:58, 04:18 | Login/Profil nennen technischen Auth-Provider. | Kundenneutrale Anmeldung, Fehlermeldungen und übersetzte Auth-Copy. Providernamen allein waren keine echte Sicherheitslücke. |
| VIDEO-03 | 00:50, 02:36, 05:48 | Alte Hub-Bezeichnungen. | Kanonische Labels **Analytics Hub**, **Learning Hub** und **Dokumentation Hub** im gemeinsamen Hub-Katalog, Header und Learning-/Dokumentations-Überschrift. Historische URL-Pfade bleiben für Backward Compatibility. |
| VIDEO-04 | 02:36, 05:48 | Learning-Unterbereiche umbrechend/mehrzeilig. | Shared `HubNavigationPanel`: `flex-nowrap`, `overflow-x-auto`, Touch-Swipe, fokussierbare native Links, Scroll-Into-View und hub-spezifische Akzentfarben. |
| VIDEO-05 | 00:42–01:00 | Englisch gewählt, zentrale Menütexte noch Deutsch. | `navigationCopy` für sechs unterstützte Sprachen, deutsch/englische und weitere Kern-Navigationslabels; tieferliegende, nicht in `navigationCopy` erfasste Fließtexte können weiterhin deutsch sein. Gesamte i18n-Abdeckung: **NOT_PROVEN**. |
| VIDEO-06 | 04:46–05:02 | Chat Buddy überdeckt Profildetails. | Mobile Overlay-Höhe begrenzt/scrollbar; Modal-Drawer erhält Escape, Tab-Fokusumbruch und Fokus-Rückgabe. Zusammenspiel realer Assistive Technology: **NOT_PROVEN**. |
| VIDEO-07 | 01:24–02:00 | Vocabulary-Karten wechseln. | **VERIFIED für sichtbare Aufnahme**, kein gesonderter Codefix notwendig. |
| VIDEO-08 | 04:36–05:02 | Testnutzer zeigt Pro / active. | Nur sichtbare Darstellung; Stripe-/Tenant-Entitlement-Gültigkeit **NOT_PROVEN**. |
| VIDEO-09 | 01:10, 05:24 | Private Notizen mit Speichern-Aktion sichtbar. | Backend-Cross-Identity-Abweisung aus vorherigen PR-Commits bleibt; echte Live-Cross-Tenant-Lese-/Schreibtests **NOT_PROVEN**. |

## Reproduzierbare Tests

- `node --test scripts/navigation.test.mjs` — kanonische Hub-Labels, horizontaler Scroll-Contract, Native-Anchor-Semantik, Focus-Indikatoren, eigene Hub-Farbe.
- `node --test scripts/frontend-security.test.mjs` — getrennte Owner-/Tariflabels, providerneutrale Auth-Copy, verfügbare Links zu Rechtlichem, Drawer Escape/Tab/Fokus-Rückgabe und Dialoghöhen.
- `node scripts/product-accessibility-browser.mjs https://<autorisiertes-staging>` (oder `npm run test:product:browser-a11y -- https://<autorisiertes-staging>`) — **optional**, reales Chromium DevTools Protocol, Accessibility.getFullAXTree; je 390 × 844 und 1280 × 800 auf `/`, `/learning`, `/login`.
  - Erfasst Teilaspekte: `lang` (WCAG 3.1.1), Alt-Texte (1.1.1, partial), Formularlabels (3.3.2, partial), benannte Buttons (4.1.2, partial), vorhandene Navigation-AX-Knoten und horizontale Learning-Hub-Leiste.
  - Ein `TARGETED_PASS` ist **kein** vollständiges axe-/WCAG-Ergebnis und **kein** Screenreader-Test.
  - Test benötigt Browserinstallation und autorisiert erreichbares Staging/Runtime; eine tatsächlich erfolgreiche Ausführung gegen CAPITAL-AI muss separat mit exakt benanntem Head/Deploy und Rohreport belegt werden.

## Fail-closed Evidence-Status

| Evidenz | Status |
| --- | --- |
| Video-Beobachtungen des damaligen Android-Produkts | **VERIFIED (visuell, nur Aufnahme)** |
| Repository-Implementierung der beauftragten UX-Fixes | **IMPLEMENTED auf PR-Branch, nicht gleich Production** |
| CI am finalen Head | **PENDING**, nach Änderungen erneut auswerten |
| Echter Browser-DOM/AX-Tree der live laufenden CAPITAL-AI-Anwendung | **NOT_PROVEN** ohne Probe-Laufreport |
| Screenreader TalkBack/NVDA/VoiceOver | **NOT_PROVEN**; Video ohne Audiospur |
| Tenant-übergreifender Test unter zwei echten Sessions | **NOT_PROVEN** |
| Autonome ChatGPT-Skill-Aktivierung in Runtime | **NOT_PROVEN** ohne verifizierbaren Trace |
| Production-/Deploy-SHA und aktualisierte UI im Livebetrieb | **NOT_PROVEN** bis Main-Merge und Runtime-Readback |

**Rollback:** Neue PRODUCT-Commits des PR reversibel revertieren; keine Änderung an Stripe-Produktrechten, Backend-Secrets oder externen Providerkonfigurationen. Kein neues Required-Gate, keine Paid-Aktivierung und keine Veröffentlichung der privaten Aufnahme.
