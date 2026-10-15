# Datenschutz-Hinweis – JaJa Buddy Notizen

**Status: PR-Implementierung, produktiver Betrieb noch nicht nachgewiesen.**

JaJa Buddy speichert Notizen nach einer ausdrücklichen Aktion eines angemeldeten Benutzers über die vorhandene same-origin-API `/api/profile/notes` in der bestehenden privaten Supabase-Notizablage. Anders als im ursprünglichen PR-Entwurf verlassen die gespeicherten Notizen den Browser also zum Speichern. Ein gemeinsamer `localStorage`-Schlüssel wird nicht mehr verwendet.

Für Schreibaktionen validiert der Server die authentifizierte Benutzeridentität sowie `expectedUserId`. Die API ist identisch mit derjenigen des privaten Dashboards. Die optionale Kurzfassung ist eine rein lokale extraktive Bearbeitung von Notiztext und verwendet keinen Cloud-KI-Dienst.

**Rechtlicher Abgleich:** Die bestehende Datenschutzseite auf Zweck, Rechtsgrundlage, Empfänger, Aufbewahrung und Löschung prüfen und erst mit Live-Nachweis die Funktion öffentlich bewerben. Browser- oder Production-Verifikation steht noch aus. Gleichzeitig editierte Textnotizen aus mehreren Tabs werden derzeit nicht mittels serverseitigem Versionstoken atomar zusammengeführt; der Client liest vor einem Schreibvorgang erneut und prüft den unveränderten Quelltext.
