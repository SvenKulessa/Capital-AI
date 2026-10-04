# Lizenz und Herkunft: CAPITAL-AI Hero Buddy

- Asset: `src/components/HeroBuddy.tsx`
- Kennung: `CAPITAL-AI-HERO-BUDDY-1`
- Lizenzstatus: proprietäres CAPITAL-AI-Produktasset. Kommerziell nutzbar durch den Rechteinhaber. Keine freie Weiterverwendung und keine Open-Source-Lizenz.
- Lizenzbezug: Repository-Kennzeichner `UNLICENSED`.
- Rechteinhaber: Sven Kulessa / capital-ai.online.
- Geltungsbereich: Webportal capital-ai.online, zugehörige Build-Artefakte und interne Weiterentwicklung.

## Kommerzielle Nutzungsrechte

Der Rechteinhaber darf den Hero Buddy im Portal, in Werbung, in Produktvideos und in bezahlten Tarifen einsetzen, vervielfältigen und anpassen. Dritte erhalten keine Lizenz, außer der Rechteinhaber erteilt sie schriftlich.

Erlaubt für den Rechteinhaber:

- Einbindung als portalweiter Support-Agent.
- Nutzung der Sprechblasen-Interaktion und der lokalen Hilfeerkennung.
- Kombination mit Stripe-Tarifen, Market Vocabulary und anderen CAPITAL-AI-Produkten.
- Bearbeitung von Text, Farbe und SVG-Marke.

Nicht erlaubt ohne gesonderte Freigabe:

- Weitergabe des Quelltexts als eigenständiges Produkt.
- Behauptung einer BaFin-, Anlageberatungs- oder Zertifizierungsfreigabe.
- Einbindung fremder Marken in die Buddy-Marke.

## Werkzeuge und Fremdmaterial

Umgesetzt nur mit kommerziell nutzbaren, projekteigenen Mitteln:

- React und die bereits im Portal verwendeten Abhängigkeiten.
- Eigene Pointer-, Touch- und Scroll-Heuristik ohne Drittanbieter-Tracking-SDK.
- Eigenes SVG. Keine Stockgrafik, keine Icon-Datei und keine eingebettete Schriftdatei.
- Kein Maus- oder Touchprofil verlässt den Browser für diesen Agenten.

`lucide-react` bleibt die bereits gebundene Icon-Abhängigkeit des Portals und wird nur für das Schließen-Icon verwendet. Die Buddy-Marke selbst ist SVG und nicht davon abgeleitet.

## Hilfeerkennung

Die Erkennung läuft lokal: Zögern im kleinen Bereich, Mehrfachklick oder Mehrfachtipp, Scroll-Richtungswechsel und längerer Fokus ohne Eingabe. Sie ist eine Bedienhilfe, kein biometrisches Verfahren und keine Nutzerprofilierung. Abweisen sperrt die Sprechblase für 90 Sekunden.

## Grenzen

Diese Datei ersetzt keine Markenprüfung und keine Production-Freigabe. Der Agent gibt keine Anlageberatung.

## Gesicht v2 — 2026-10-04

- Marke: eigenes SVG in `BuddyMark`, ViewBox 64 × 64.
- Ausdruck: größere Augen mit Lichtpunkt, Lid-Blink, weiches Lächeln, Sprechlinie.
- Entstehung: owner-directed, im Portal gezeichnet. Kein Stockcharakter, keine fremde Icon-Datei, keine eingebettete Schrift.
- Werbevideo und generierte Rasterbilder sind nicht Teil dieses Assets und nicht von dieser Lizenz umfasst.
- Kommerzielle Nutzung bleibt beim Rechteinhaber Sven Kulessa / capital-ai.online. Dritte erhalten keine Lizenz.
