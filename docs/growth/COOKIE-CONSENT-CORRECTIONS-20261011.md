# Cookie UX, Ablaufbereinigung und öffentliches Speicherverzeichnis

Scope: Ergänzung des bestehenden PR #387 auf Main-Basis `1a1534d`.

Die vorhandenen Engineering-/Advisory-Skills für PRODUCT, TRUST, PLATFORM und GROWTH/SEO wurden angewandt; MARKET bleibt für lizenzierte Finanzdaten zuständig, die durch diese Änderung nicht verändert werden. Keine neuen Domain-Gates oder Consent-SaaS-Abhängigkeiten.

## Direkt wirksame Änderungen

- Consent-Bereich: `max-height` relativ zum dynamischen Viewport, vertikales Scrollen; Anpassungsaktion referenziert den Detailbereich statt die Überschrift.
- Ungültige, abgelaufene oder an alte Datenschutzhinweis-Versionen gebundene Präferenzen werden beim nächsten Zugriff aus Local Storage entfernt; Speicherfehler bleiben Default-Deny. Die Frist ist ausdrücklich Gültigkeit und Bereinigung beim nächsten Zugriff, keine unmögliche Löschung bei geschlossenem Browser.
- Einwilligungsdialog, Footer-/Kontoeinstieg und Speicherverzeichnis sind auf Deutsch, Englisch, Italienisch, Spanisch, Portugiesisch und Französisch verfügbar.
- Öffentliches Verzeichnis auf `/datenschutz#cookie-storage`: tatsächliche Cookie-/Local-Storage-Namen, Zwecke, Laufzeiten, fehlende automatische Fristen und Sicherheitsattribute; keine gespeicherten Werte werden angezeigt.
- Datenschutzhinweis-Version aktualisiert: bereits gespeicherte Entscheidungen müssen erneut getroffen werden.

Minimaler interner Ansatz gegenüber externem Consent-SaaS: kein neues Budget/Provider und Wiederverwendung der getesteten v3-Speicherlogik. Alternative externe CMP bietet Vorlagen und Providerintegration, bringt aber neue Abhängigkeit/Verarbeitung; für die Cookie-Korrekturen nicht nötig.

## Nachweise und Grenzen

Acht ausgeführte Consent-Tests und sechs Analytics-/SEO-Tests bestanden; `tsc --noEmit` bestanden. Browserprüfung und GitHub-Checks werden separat am finalen Commit dokumentiert, nicht aus Quelltexttests abgeleitet.

GA4 und Marketing bleiben deaktiviert. Der weitergehende Auftrag zur Messung tatsächlich eingegangener Kursanfragen benötigt die Webstream-Mess-ID und einen bestätigbaren Empfangsweg. Eine GA4-Property-ID ersetzt keine Mess-ID; ein Mailto-Klick bestätigt keinen Versand. Hier wird weder ein wirkungsloser Trackingadapter geliefert noch ein Lead erfunden. Keine neue CI-Ebene und kein Merge/Production-Start ohne PR-spezifische Owner-Freigabe.

## Kursformular und Basic Consent Mode (Erweiterung)

Die Voraussetzungen wurden vom Owner bestätigt: Webstream `G-0542DT2HCE` liegt in Render bislang als `GA4_NEASUREMENT_ID`; SMTP_HOST, SMTP_USER und SMTP_PASSWORD sind vorhanden. Die vorherige Beschreibung der fehlenden Voraussetzungen ist damit historisch.

Das Kursformular POSTet ausschließlich an den eigenen Server. Der Mailserver muss den festen Supportempfänger akzeptieren, bevor der Browser eine Bestätigung erhält. Dies beweist die SMTP-Annahme, nicht die spätere Inbox-Zustellung. Zufällige Wiederholungsschlüssel verhindern mehrfachen Versand; Nutzereingaben werden nicht geloggt und nicht als GA4-Parameter verwendet. Ohne Analytics-Einwilligung bleiben Formular und E-Mail-Alternative nutzbar.

GA4 wird erst nach gültigem Opt-in und verifizierter Providerkonfiguration geladen. Basic Consent Mode verweigert die Werbezwecke; öffentliche Seitenaufrufe werden dedupliziert und ohne Query/Fragment übermittelt. Private Seiten stoppen den Adapter. Widerruf entfernt GA-Cookies und lädt das Dokument neu, um auch Google-Listener aus dem Speicher zu entfernen. Arbiträre UI-Ereignisse bleiben deaktiviert.

Der bestehende Main-only Workflow `Google Learning SEO Setup`, Modus `apply`, deaktiviert Enhanced Measurement global (inkl. automatischer Formular- und History-Ereignisse), prüft Redaction, Schlüsselereignis und die tatsächliche Mess-ID, und setzt anschließend nur die beiden eigenen Render-Variablen am exakt bestätigten Main-Service. Der Browser-Adapter startet nur, wenn `GA4_ENHANCED_MEASUREMENT_VERIFIED=true` gilt. Bestehender Tippfehler bleibt kompatibel; der kanonische Variablenname wird ergänzt. Nach dem Merge sind der bestehende Apply-Lauf und der Runtime-/Browser-Readback nötig; die Quellcodeimplementierung behauptet keine bereits laufende Google-Messung. Environment-Schreiben allein beweist keinen Neustart der Runtime.

Nodemailer 10.0.15 wird aus der bereits geprüften Repository-Abhängigkeit in die minimale Runtime-Grenze übernommen, ohne neuen Provider oder Budget. Quellen: Google EnhancedMeasurementSettings, https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/EnhancedMeasurementSettings (11.10.2026); vorhandene Nodemailer-Lizenznachweise und SMTP-Dokumentation.
