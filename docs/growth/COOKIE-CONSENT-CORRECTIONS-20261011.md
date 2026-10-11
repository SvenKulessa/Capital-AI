# Einwilligung, Speichertransparenz und bestätigte Kursanfragen

Ergänzung des bestehenden PR #387, auf aktuellem Main einschließlich PR #386 abgeglichen. Die vorhandenen Engineering-/Advisory-Skills für PRODUCT, TRUST, PLATFORM und GROWTH/SEO wurden angewandt. MARKET bleibt für lizenzierte Finanzdaten zuständig; diese Änderung verändert keine Marktdaten oder Scorings. Keine neuen Domain-Gates oder Consent-SaaS-Abhängigkeiten.

## Produktwirkung

- Cookie-Dialog bleibt durch dynamische Viewport-Höhe und eigenes Scrollen auch bei 320 × 568 Pixeln sowie vergrößerter Schrift erreichbar. Die Anpassungsaktion referenziert den tatsächlichen Detailbereich.
- Ungültige/abgelaufene Einwilligungen werden beim nächsten Zugriff aus Local Storage entfernt. Die 180-Tage-Frist beschreibt die Gültigkeit, keine Löschung bei geschlossenem Browser. Schreib- oder Löschfehler können eine alte Zustimmung in diesem Dokument nicht weiter autorisieren.
- Dialog, Footer-/Kontoeinstieg, Kursformular und Speicherverzeichnis sind auf Deutsch, Englisch, Italienisch, Spanisch, Portugiesisch und Französisch verfügbar. Datenschutzhinweis-Version aktualisiert; alte Entscheidungen müssen neu getroffen werden.
- `/datenschutz#cookie-storage` enthält die tatsächlich verwendeten Cookie-/Local-Storage-Namen, Zwecke, Fristen, fehlende automatische Fristen und Sicherheitsattribute. Gespeicherte Werte werden nicht angezeigt.
- Das Kursformular sendet nur an den eigenen Server und den festen Supportempfänger. Bestätigung erst nach SMTP-Annahme; dies beweist keine spätere Inbox-Zustellung. Wiederholungsschlüssel verhindern Mehrfachversand, Versandlimits begrenzen Missbrauch. Ohne Analytics-Einwilligung bleibt das Formular nutzbar.
- GA4 Basic Consent Mode lädt das Google-Tag erst mit gültigem Analytics-Opt-in und verifizierter Providerkonfiguration. Werbezwecke verweigert; öffentliche Seitenaufrufe dedupliziert, ohne Query/Fragment. Private Seiten stoppen den Adapter. Widerruf entfernt GA-Cookies und lädt das Dokument ohne Google-Listener neu.
- `generate_lead` nur nach bestätigter Formularannahme; keine E-Mail, Nachricht, Wiederholungsschlüssel, Nutzerkennung oder erfundenen Geldwerte in Events. Mail-Link-Klicks und beliebige UI-Ereignisse werden nicht zu Leads.

## Konfiguration und Aktivierung

Vom Owner bestätigt: Mess-ID `G-0542DT2HCE` liegt bislang als `GA4_NEASUREMENT_ID` in Render; SMTP_HOST, SMTP_USER und SMTP_PASSWORD sind vorhanden. Der bestehende Schreibfehler bleibt kompatibel; kanonischer Variablenname `GA4_MEASUREMENT_ID` wird ergänzt.

Nach autorisiertem Main-Merge den bestehenden Main-only Workflow `Google Learning SEO Setup` in Modus `apply` ausführen. Er deaktiviert Enhanced Measurement global (inkl. automatischer Formular-/History-Ereignisse), prüft Redaction, Schlüsselereignis und tatsächliche Mess-ID, und setzt anschließend nur die zwei eigenen Render-Variablen am bestätigten Main-Service. Der Browser startet nur bei `GA4_ENHANCED_MEASUREMENT_VERIFIED=true`. Environment-Schreiben allein beweist keinen Runtime-Neustart: anschließend den normalen Main-/Render-Pfad und `/api/public/learning-config`, Browser-Netzwerk und GA4-Readback prüfen. Diese Quellcodeänderung behauptet keine bereits laufende Google-Messung und keine tatsächlich eingegangenen Leads.

## Architekturentscheidung

Interne kostenlose Consent-Umsetzung und vorhandener SMTP-Anbieter gegenüber externer CMP/Formular-SaaS: keine neue Verarbeitung oder Budgetposition, Wiederverwendung der vorhandenen v3-Logik und Mailinfrastruktur. Externe SaaS wäre eine reale Alternative mit Vorlagen/Hosted-Formularen, aber zusätzlicher Abhängigkeit und Datenverarbeitung. Nodemailer 10.0.15 wird aus der bereits geprüften Abhängigkeit in die minimale Runtime-Grenze übernommen. Keine ausgeweiteten Nutzer-Vault-Rechte oder neuen Paid-Provider.

## Prüfung

Gezielte Consent-, Analytics-/SEO-, SMTP-, Aktivierungs- und Google-Setup-Tests; TypeScript und Produktionsbuild. Docker-Allowlist und alle drei Server-COPY-Pfade enthalten den neuen Endpoint; das bestehende Docker Security Gate führt die Tests aus. Keine zusätzlichen manuell vorgeschalteten CI-Gates.

Lokaler Chromium-Readback: mobile Dialoggrenzen/Scrollen bei 320 × 568, vergrößerte Root-Schrift, italienische Auswahl und Speicherverzeichnis, Desktop 1440 × 1000 sowie sichtbarer Tastaturfokus. Integration von Formularbestätigung und GA4 wird mit simuliertem SMTP-ACK und abgefangenem Google-Tag geprüft; diese Simulation ist kein echter Lead, kein Live-Mailversand und kein Google-Empfangsnachweis. GitHub-Checks und Production werden getrennt berichtet.

Quellen: vorhandene Runtime-/SMTP- und Lizenznachweise; Google EnhancedMeasurementSettings, https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/EnhancedMeasurementSettings (11.10.2026).
