# Chromium-Download und GitHub-CI – 30.09.2026

Basis: Main `3dcecd0637347923a0254c85526361779e119bbf`.
PR #50 ist gemergt. Beim frischen Abgleich waren keine offenen PRs vorhanden.

## Offizielle Quellen

- Playwright-Installationsanleitung: https://playwright.dev/docs/browsers
- Google Chrome for Testing: https://github.com/GoogleChromeLabs/chrome-for-testing
- Versionsliste: https://googlechromelabs.github.io/chrome-for-testing/151.0.7922.34.json
- Tatsächlich verwendeter Download: https://storage.googleapis.com/chrome-for-testing-public/151.0.7922.34/linux64/chrome-headless-shell-linux64.zip

Installierter Playwright-Runtime-Manifest-Eintrag: Chromium Headless Shell,
Revision 1234, Browser-Version 151.0.7922.34. Verwendet wurde die dazu passende
offizielle Google-Build-Datei für Linux x64, keine Drittanbieter-Binary.

Der Playwright-CDN-Download lieferte hier statt ZIP eine 195 Byte große HTML-Antwort.
Sicherer Fallback: gleicher Browserbuild aus Googles offizieller Versionsliste.
TLS-Prüfung blieb aktiv; keine Zertifikatsausnahme verwendet.

## Vier Validierungsschritte

1. **Quelle und Version – PASS:** Versionsliste erfolgreich gelesen; ihre Linux-x64-
   Headless-Shell-URL entspricht exakt dem verwendeten Download.
2. **Archiv – PASS:** 120231126 Bytes, ZIP vollständig lesbar, CRC-Prüfung aller
   Einträge erfolgreich; keine absoluten Pfade oder `..`-Segmente beim Entpacken.
   SHA-256: `3cfc2bd00d1bafcf8a68dc74c9c92bb7150ddc8d26ade948a776316e1cec4f14`.
   Dieser Hash ist lokal erfasst; kein unabhängiger Hersteller-Hashvergleich behauptet.
3. **Binary – TEILWEISE:** `chrome-headless-shell --version` antwortet mit
   `Google Chrome for Testing 151.0.7922.34`. Playwright-Start und direkter
   Headless-Start brechen mit SIGTRAP ab; Ursache ungeklärt.
4. **Website – OFFEN:** Produktionsbuild des aktuellen Main erfolgreich.
   Visuelle Smartphone-/Desktop-Prüfung konnte wegen des Browserstartabbruchs
   nicht ausgeführt werden. Keine erfolgreiche Screenshot-/Browserprüfung behauptet.

## GitHub CI verständlich erklärt

CI bedeutet **Continuous Integration**, kontinuierliche Integration.
GitHub Actions führt die im Repository definierten Workflows aus, wenn deren
Trigger und Bedingungen zutreffen, etwa nach Push oder Pull Request.
Ein Workflow enthält Jobs; ein Job enthält einzelne Prüfschritte.
Die Checks-Seite eines PR zeigt deren Ergebnis für einen konkreten Commit.

- `success`: die ausgeführten Prüfschritte waren erfolgreich.
- `failure`: mindestens ein verpflichtender Schritt ist fehlgeschlagen.
- `queued / in_progress`: wartet oder läuft.
- `skipped`: wurde unter den aktuellen Bedingungen nicht ausgeführt.

Lokale Prüfungen, GitHub-CI und Render-Deployment sind verschiedene Nachweise.
Ein grüner CI-Sicherheitscheck belegt weder einen erfolgten Deploy noch
die Runtime-Identität oder den erfolgreichen echten ZITADEL-Login.

## Frisch gelesener CI-Nachweis

Workflow: **Docker Build Sicherheit**, Run **36753436044**.
URL: https://github.com/SvenKulessa/Capital-AI/actions/runs/36753436044
Geprüfter Commit: `3dcecd0637347923a0254c85526361779e119bbf`.

| Check | Ergebnis |
| --- | --- |
| Docker Security Gate | success |
| publish_candidate | skipped |
| Production Handoff Gate | skipped |

Erfolgreiche Schritte umfassen Dockerfile-Lint, Quellcode-/Secret-/Konfigurationsscan,
Build-Stufen-Scan, Image-Build, Regressionstests, Image-Scan, SBOM,
Runtime-Lizenzinventar und Runtime-Prüfung ohne Schreibrechte/Linux-Capabilities.
Aus den gelesenen Job-Ergebnissen folgt **Sicherheitsprüfung bestanden**,
nicht **Image veröffentlicht** oder **produktiv deployed**.
Kein manueller CI-Lauf oder Deployment für diese Dokumentation angestoßen.

## Wiederverwendung des Befunds

Bei erneut ungültigem CDN-Archiv: Inhalt/Größe prüfen, keine HTML-Antwort ausführen,
offizielle Versionsliste lesen und exakt dieselbe Build-Version aus dem offiziellen
Google-Speicher verwenden. Danach ZIP/CRC, Versionsausgabe und echten Browserstart
getrennt validieren. SIGTRAP darf nicht als erfolgreicher Browsertest verbucht werden.
