# Hreflang für die Sprachseiten

**Status:** BLOCKED  
**Geprüfte Main-Basis:** `91fe8f2e797fd61e098f4f5e187afeb225f9e721`

Die sechs Sprachpfade `/de/`, `/en/`, `/it/`, `/fr/`, `/pt/` und `/es/` sind als Vorschau klassifiziert. Der Server liefert `noindex, nofollow`. Der bestehende HTTP-Test `server/locale-html.test.mjs` prüft für alle sechs Pfade außerdem das Fehlen von hreflang und Canonical.

Die [bestehende Spezifikation](../20261114/HREFLANG_DETAILED_SPEC.md) dokumentiert unvollständige serverseitige Sprachinhalte. Eine überprüfbare inhaltliche Freigabe für alle sechs Versionen liegt in diesem PR nicht vor.

## Abnahme der Aktivierung

1. Den vollständigen öffentlichen Hauptinhalt pro Sprachpfad ohne JavaScript prüfen. Übersetzung, Terminologie und Produktangaben anhand der deutschen Quelle abgleichen.
2. Für freigegebene Seiten selbstreferenzierende Canonicals und wechselseitige hreflang-Verweise im ausgelieferten HTML implementieren. Nur indexierbare Varianten in die Sitemap aufnehmen.
3. Über die bestehenden Locale- und SEO-Tests HTTP-Status, Sprache, Canonical, hreflang, Sitemap und die Ausschlussregeln prüfen.
