# CAPITAL-AI – zentral verwaltete E-Mail-Vorlagen

Das einzige HTML-Grundlayout liegt unter `supabase/email-templates/capital-ai-auth-email-shell.html`. Der gemeinsame Renderer und die Support-/Transaktionsinhalte werden unter `shared/mail-templates.mjs` verwaltet. Rechtliche Identitätsdaten kommen aus `shared/legal-identity.mjs`.

## Kanäle und Aktivierung

| Kanal | Quelle | Wirkung |
| --- | --- | --- |
| Supabase Auth (13 vorhandene Vorlagen) | `supabase/email-templates/templates.json`, `scripts/supabase-auth-config.mjs` | Gemeinsamer Renderer; kein eigenständiger Remote-Konfigurations-Apply |
| Support-Signatur | `renderSupportMail('signature')` | Kopierbares HTML-/Textfragment, kein automatischer Versand |
| Supportantwort | `renderSupportMail('reply', {name, topic, answer, nextSteps, subject})` | Manuelle Kundenantwort, Platzhalter anpassen |
| Abwesenheitsnotiz | `renderSupportMail('absence', {start, end})` | Erst nach separater Postfachaktivierung wirksam |
| Learning-/Kursanfrage | `renderLearningInquiryMail(message)` | HTML + Klartext über vorhandenen serverseitigen SMTP-Eingang an das Supportpostfach |

## Erzeugen und prüfen

```sh
node scripts/export-mail-templates.mjs --out-dir ./artifacts/mail
node --test scripts/mail-templates.test.mjs scripts/supabase-auth-config.test.mjs server/learning-inquiry.test.mjs
node scripts/supabase-auth-config.mjs
```

Der Offline-Export erzeugt genau drei HTML- und drei Textdateien. Der Export sendet keine E-Mail. Das Build-Image enthält die neue Testdatei, und das Laufzeit-Image erhält die kanonische HTML-Shell. Bei Support-Antwort und Abwesenheit sind vor dem Einsatz Platzhalter bzw. Datumsangaben auszufüllen.

## Sicherheit, Compliance und Betrieb

- Nutzer-/Formulartext wird vor der HTML-Ausgabe escaped; der text/plain-Part bleibt erhalten. Nachrichten werden nicht öffentlich protokolliert.
- Authentifizierungslink-Routen (`TokenHash`), SMTP-Empfänger, Rate-Limits und Idempotenz bleiben unverändert.
- Kein zusätzlicher Versandprovider, keine Mail-Marketing-Automatisierung und keine Abwesenheitsaktivierung. First-Party-Logo per HTTPS; Bilder können vom Mailclient blockiert werden. Logo-Alt-Text ist vorhanden.
- Keine unbelegten Produkt-/Renditezusagen. Keine Erwartung garantierter Antwortzeiten.
- Erneute Prüfung in realen E-Mail-Clients vor dem Postfach-Rollout empfohlen (`NOT_PROVEN`).
- CI-Minuten, laufender IONOS-SMTP-Betrieb und Provider-Limits können nutzungsabhängige Kosten verursachen. Kein neuer Tarif wird durch diese Implementierung aktiviert; tatsächliche verbleibende Quoten sind `NOT_PROVEN`.

## Rollback

Den Mail-Template-PR revertieren; Supabase-Remote-Konfigurationsänderungen und manuelle Postfachaktivierungen sind getrennte Vorgänge und werden nicht durch einen Repository-Revert automatisch rückgängig gemacht.
