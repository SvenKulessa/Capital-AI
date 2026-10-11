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
