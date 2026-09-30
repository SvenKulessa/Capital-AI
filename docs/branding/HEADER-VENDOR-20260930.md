# Header: Vendor-Bildzeichen ohne Schriftzug

Basis: Main `1cceddad71cbb63f1a7b4cbf7f27c8dbc4cda392`; PR #51 gemergt.

Header und Kopf des Navigationsmenüs verwenden jetzt BrandLogo-Variante `vendor`.
Quelle: `/branding/asset-pack/vendor/vendor-app-icon-512x512.png` aus dem vorhandenen, rechtegebundenen Asset-Paket.
Kein Capital-AI-Schriftzug und kein Slogan. Das Motiv enthält weiterhin sein ursprüngliches C/AI-Bildzeichen.
CSS `mix-blend-screen` blendet den dunklen Rasterhintergrund in die Headerfläche ein;
keine neue Hintergrundfläche oder zusätzlicher Rahmen. Das PNG selbst bleibt unverändert und ist nicht transparent.
Keine echte Vektorisierung behauptet. Die bestehenden SVGs sind ebenfalls rastererhaltende Wrapper.
Andere BrandLogo-Verwendungen behalten ihre bisherigen Varianten.

## Vier Validierungsschritte
1. Frischen Main und offene PRs gelesen; kein paralleler Writer vorhanden.
2. Bestehendes Vendor-Motiv visuell geprüft: Globus/Gold-Blau-Symbol, kein ausgeschriebener Markenname.
3. React-Rendering: passende Asset-URL, kein sichtbarer Schriftzug/Slogan, nativer Button, Fokus-/44px-Klickhöhen-Klassen und Screen-Blending: PASS.
4. TypeScript, Build, alle drei bestehenden Branding-Tests mit 67 Hashes und Diff-Prüfung: PASS.

Build meldet große JavaScript-Chunks; kein Buildfehler. Visuelle Smartphone-/Desktop-Prüfung
bleibt wegen des dokumentierten Chromium-SIGTRAP-Startabbruchs offen.
Kein Deployment oder manueller CI-Lauf ausgelöst.
