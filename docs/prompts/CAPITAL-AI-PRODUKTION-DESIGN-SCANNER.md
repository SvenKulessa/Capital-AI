# Auftrag: CAPITAL-AI-PRODUKTION — Sideboard, Hubs & Lizenzscanner

Arbeite als Grafikdesigner und Frontend-Entwickler für Capital-AI.
PRODUCT ist für UI/UX zuständig, TRUST für Lizenz-/Security-Entscheidungen,
GROWTH für Forschungstexte/SEO und PLATFORM für Build/Digest/Handoff.
„PRODUKTION“ ist dieser Arbeitsauftrag, kein Ersatz für die kanonischen Domains.

## Verbindliche Quellen und Skill-Nutzung

Lies aktuellen Main, Repo-Anweisungen und offene PRs in SvenKulessa/Capital-AI.
Lies den aktuellen öffentlichen SvenKulessa/FRONTEND-Stand über den Connector
und pinne dessen SHA. Verwende ihn als Designreferenz für Sideboard und Hubs.
Die neue Bildherkunft steht in docs/security/evidence/hero-owner-statement-20261001.json.
Die bereits integrierten Forschungs-/Lizenzseiten und die Unterschiede zum
FRONTEND-Original sind im Handoff-Bericht dokumentiert.

Nutze bei vorhandener Fähigkeit product-design:image-to-code für die Umsetzung
einer ausgewählten visuellen Referenz; lies dafür den Skill und seine Voraussetzungen.
Für eine Qualitätsprüfung nutze product-design:audit. Falls diese Skills fehlen,
nenne das und arbeite mit dem konkreten FRONTEND-Code als visueller Referenz.
Erfinde keinen „Grafikdesigner-Skill“ und verwende keine kostenpflichtigen
Rendering-/Design-Dienste ohne ausdrückliche Freigabe.

Nutze bevorzugt den vorhandenen React-/Vite-/Tailwind-/Lucide-/Motion-Stack,
SVG/CSS und den Cloudbrowser für Screenshot-Vergleiche. Für zusätzlich nötige
OSS-Werkzeuge zuerst offizielle Quelle, Version, Hash, Lizenztext und tatsächliche
Kostenfreiheit prüfen. Verfügbare Social Media Engine aus Finance lesen;
installierte Tools nicht mit ausgeführten Generierungsläufen gleichsetzen.

## Umsetzung

1. Sideboard und neues Hub-Design aus FRONTEND selektiv übertragen. Bestehende
   Capital-AI-Farben, Erde, Logo, Layoutsprache und Assets erhalten. Keine
   pauschale Ersetzung von App.tsx, Auth, echten Provider-Statusabfragen oder
   Sicherheitskorrekturen durch ältere FRONTEND-Mocks. Keyboard-Fokus,
   Mobile-Touch-Ziele, Back/Forward und Tab-/URL-Synchronisierung erhalten.

2. Forschungs-/Lizenzmodul integrieren und den Scanner um eine belegbare
   Ergebnisansicht erweitern: Paket/Asset/Provider, Version, Hash, SPDX-ID,
   Fundstelle, Nutzungsscope, Pflichten, Scanzeitpunkt und Status. Zustände:
   VERIFIED / OFFEN / GEHALTEN / UNGEKLÄRT. Scannerbefund und Owner-Freigabe
   bleiben getrennt. Fehlende/übersprungene Scans sind keine Freigabe.
   SPDX-/CycloneDX-Dateien nur mit Größen-/Schema-Prüfung importieren;
   keine Secrets, Vertragsvolltexte oder Dateien ungefragt an Dritte übertragen.
   Der Browser startet keine beliebigen Shell-Befehle aus Scanergebnissen.

3. FRONTEND-Zertifikatsmodul nur übernehmen, wenn die Dateien tatsächlich im
   gepinnten Commit existieren. PDF-Export als „Prüfbericht / Forschungsdossier“
   gestalten, mit Quellen, Scope, Stand und offenen Punkten. Keine erfundenen
   Firmenadressen, HRB-Nummern, Personen, Unterschriften, Siegel, Lizenznummern
   oder BaFin-/Provider-Zertifizierungen. Bestehende Branding-Qualität erhalten.

4. Datenintegritäts- und Lizenzhinweise kontextbezogen anzeigen. Attribution
   und Disclaimer erfüllen konkrete Informationspflichten, ersetzen aber keine
   Erlaubnis. Fehlende externe Datenrechte über geeignete technische Begrenzung
   lösen: nur tatsächlich erlaubte Forschung, unverfängliche Demo-Daten oder
   gesperrte betroffene Datenfunktion. Dabei das Design erhalten. Keine
   pauschale „Academic Approved“, „100% konform“ oder „Derived Data Exemption“.

5. Landingpage-Forschungsbeschreibung erhalten/verbessern: günstige gehostete
   Infrastruktur, Datenintegrität, reproduzierbare Pipelines und Multi-Asset-
   Scoring. Förderung/Sponsoring als geplant kennzeichnen, bis belegt.
   Legal Pages unter /impressum, /datenschutz, /agb, /lizenz,
   /datenprovider-lizenzen, /opensource-lizenzen und /forschung direkt erreichbar
   machen. Echte Betreiberdaten aus der bestehenden Legal-Identity-Quelle nutzen.
   Crawlbare Texte, Titel, Canonicals und strukturierte Daten prüfen.
   Search Console und GA4 sind getrennte Integrationen. Ohne echte Property,
   Measurement-ID und passende Einwilligung keine Anbindung behaupten oder
   Tracking aktivieren. Kein DNS-Wechsel als Nebenwirkung.

## Fünf Validierungen und Abschluss

1. SHA-/Asset-/Lizenzinventar gegen beide Mains und den tatsächlichen Code prüfen.
2. Mobile/Desktop mit FRONTEND-Referenz vergleichen; Screenshots und A11y prüfen.
3. Routes, Deep Links, Footer, Hub-Tabs, Back/Forward und PDF/Scanner-Fehler testen.
4. Security-/Lizenzregressionen prüfen: keine False-Approval-Urkunden, keine
   Geheimnisse/ungefragten Uploads, keine neuen unbelegten Provider-Freigaben.
5. Betroffene lokale Checks, Build und bestehende Handoff-Gates auswerten.

Erstelle einen deutschen PRODUCT-PR auf capital-ai-product/<zweck>-YYYYMMDD.
Beschreibe Quell-SHAs, angepasste Dateien, Screenshots, Tests und Restlücken.
Lerne erkannte Muster über Regressionstests; dauerhafte Self-Healing-Regeln
erst nach drei unabhängigen positiven Validierungen verankern.
Dependencies nicht nebenbei major-updaten. NATS/Valkey nicht wegen UI-Änderungen
deployen. Publish/Deploy nur mit der geltenden Ausführungsfreigabe und gültigen
Gates; bestehende Research-/Lizenzgrenzen nicht umgehen.
