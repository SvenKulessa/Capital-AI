# CAPITAL-AI Universe · Siebenfarben-Designsystem

**Stand:** 2026-11-15 · **Primary Domain:** GROWTH · **Version:** `CAPITAL_AI_UNIVERSE@1`

Dieses Dokument beschreibt die kreative Umsetzung innerhalb der bestehenden Content-/Social-Engine. Die einzige repositoryweite Engineering-Richtlinie bleibt Root-`AGENTS.md`; dieses Dokument ist ein Gestaltungsvertrag, kein zusätzliches Governance-Gate.

## Visuelle Identität

Originale, wiedererkennbare FinTech-Sci-Fi-Welt: planetare Umlaufbahnen, Konstellations-Netzwerke, leuchtende Datenlinien, holografische Karten und geometrische Sternfelder. Anmutung: großes, räumliches Science-Fiction-Universum, **ohne** Motive, Figuren, Raumschiffe, Schriftzüge, Insignien, Musik, UI-Nachbauten oder charakteristische Film-Eröffnungssequenzen aus geschützten Franchises. Keine vermeintliche Lizenzierung durch bloße stilistische Nähe behaupten.

Die kanonischen Farbfamilien stammen aus `shared/hub-branding.mjs`; die Renderer lesen die entsprechenden Werte aus `public/branding/asset-pack/meta/social-render-tokens.json`.

| Familie | Hex | Visuelles Element |
| --- | --- | --- |
| Cyan | `#67E8F9` | Energielinien und Datenpunkte |
| Violett | `#B794F4` | Orbit und Analysestrukturen |
| Gold | `#F9BF21` | CAPITAL-AI-Wortmarkenakzent |
| Pink | `#F9A8D4` | kreative Entwurfsbahnen |
| Rosé | `#F87171` | zusätzliche Orbit-Ebene |
| Blau | `#60A5FA` | Sternnetz und Navigation |
| Grün | `#4ADE80` | zusätzliche Netzwerkverbindungen |

**Siebenfarben-Regel:** Jede neu erzeugte *visuelle* Einheit (Bild, Infografik, Cover, Video-Frame, Podcast-Cover, Artikelillustration) soll alle sieben Farbfamilien enthalten, auch wenn nur ein oder zwei das Primärmotiv dominieren. Eine diskrete, beschnittsichere Spektralleiste oder sieben getrennte HUD-Punkte reichen aus; nicht jede Textzeile braucht sieben Farben. Reine Texte und Audiodateien besitzen naturgemäß keine Pixelfarben; ihr Plan transportiert die Designidentität für begleitende Medien.

## Konkrete Gestaltungsbausteine

1. **Universe-Hero:** eigenständiger CAPITAL-AI-Globus als Einstieg, daneben ruhige leuchtende Orbits. Keine Änderung oder Neuerfindung des dokumentierten Hero-Logo-Assets.
2. **Finanz-Konstellationen:** fachlich korrekt beschriftete Node-/Edge-Diagramme für Quellen, Scoring, Evidenz und Lernschritte; die Orbit-Anmutung ist Dekoration, niemals ein Ersatz für Datennachweise.
3. **Seven-Colour Spectrum:** sieben eindeutig unterscheidbare Punkte/Balken als gemeinsame Signatur, auch in kleinen Thumbnails.
4. **Cinematic HUD:** dunkelblauer Hintergrund, geometrische Rahmen, sparsame Lichtspuren und gut lesbare Hell-auf-Dunkel-Textflächen; keine blinkenden Anzeigen oder erzwungene Parallaxen.
5. **Storytelling:** „Fakten entdecken → Analyse verstehen → Evidenz prüfen → Learning Hub öffnen“ als didaktischer Spannungsbogen. Keine Renditeversprechen oder erfundenen Live-Marktwerte.

## Pipeline und Formate

```text
Quellen + Lizenz-/Provenienzprüfung
        ↓
Content Engine: Kampagnenplan + Universe-Art-Direction
        ↓
Copy / Artikel / Bild / SVG / Video / Podcast-Cover
        ↓
Renderer mit sieben kanonischen Farben und eigenen Sci-Fi-Motiven
        ↓
CADS, Quellen-/Medienrechte, Alt-Text, Kontrast, Mobile-Crop
        ↓
DRAFT_ONLY / redaktionelle Freigabe über bestehende Publisher-Grenze
```

Aktuelle deterministische Ausgaben: 1280×720, 1080×1080, 1080×1920 und Szenenbilder 1080×1920. Andere Plattformzuschnitte erfordern eigene Layout-Abnahme, nicht blindes Strecken. Für jedes Bild: themenbezogener deutscher Alt-Text; in Diagrammen Werte/Quellen auch textuell. Bei Animationen `prefers-reduced-motion` berücksichtigen und eine statische Alternative erhalten. Lesbarkeit, WCAG-Kontrast, korrekte Daten/Quellen und Rechtsnachweise haben Vorrang vor Effekten.

## Technische Integration

- `src/contracts/contentEngine.ts`: `visualIdentity` auf jedem geplanten Kampagnenentwurf; keine eigene Publikationsberechtigung.
- `public/branding/asset-pack/meta/social-render-tokens.json`: `color.universe` mit exakt sieben Farbfamilien.
- `scripts/media/capital_ai_media.py`: reproduzierbarer Stern-/Orbital-HUD, siebenteilige Spektralleiste und farbiges Netzwerkemblem in Bildern und Video-Frames; unvollständige Token-Datei wird abgelehnt.
- `scripts/growth/social-pipeline-graphic.mjs`: siebenfarbige Social-Pipeline-Infografik ohne externe Bildressourcen.
- `scripts/media/test_universe_branding.py` und `scripts/growth/universe-brand.test.mjs`: Pixel-/Token- und Negativtests; bestehende Social-Renderer-Workflow-Evidence führt sie aus.

## Grenzen und Abnahme

Keine Neugenerierung oder Rückwirkung auf bereits veröffentlichte Inhalte ohne gesonderte, quellen-/lizenzgeprüfte Migration. Keine Veröffentlichung, Secret-Änderung oder kostenpflichtige Modellaktivierung durch das Branding. Das erstmalige Vorliegen der Vertragsdaten beweist nicht, dass alle unabhängigen Legacy-Renderer bereits migriert sind; solche Generatoren sind separat gegen den Token-Vertrag zu inventarisieren.

**Fertig für einen Release-Slice**, wenn die bestehenden relevanten CI-Gates inklusive Docker Security Gate und Domain Governance am aktuellen Head grün sind und die Renderer-Snapshots visuell (Mobile/Desktop, Alt-Text und Lizenzgrenzen) geprüft wurden.

## Owner-Designentscheidung · 2026-11-25 · BR-02 bis BR-04

Der Owner hat die folgenden **Designanforderungen**, nicht die Freigabe neuer Masterassets oder Nutzungsrechte, bestätigt.

| Paket | Auswahl | Umsetzung |
| --- | --- | --- |
| BR-02 | `extended` | Pro Produkt ein kanonisches statisches Masterlogo, eine davon abgeleitete interaktive 3D-Variante, eine Videoanimation und ein App-Icon. |
| BR-04 | `premium` | Lernzertifikate im Universe-Premium-Design: dunkelblau, Goldakzent, diskrete Siebenfarben-Signatur, Plus Jakarta Sans, kontrastreiche lesbare Felder und druckfähige Fassung. |
| BR-04 | `3d` | Vorhandene Abo- und Rollen-Badges byteidentisch erhalten; ergänzende 3D-Ausführungen als separat versionierte Derivate derselben Identität. |
| BR-03 | keine neue Medienauswahl | Leere Auswahl protokolliert; bestehender Integrationsauftrag bleibt unverändert. Keine zusätzliche Kanal-, Veröffentlichungs- oder Rechtefreigabe. |

### Ableitungs- und Abnahmeanforderungen

- Master-ID, Version, SHA-256 und Rechtebezug bleiben die Identitätsgrundlage. Jede Ableitung erhält eigene Asset-ID, Version und Prüfsumme sowie Referenz auf den unveränderten Master. Keine eigenmächtige Neugenerierung vorhandener Marken.
- 3D und Video: bestehende Renderer wiederverwenden; Pause, Reduced Motion und statischer Fallback. App-Icons: geeigneter Safe Area und Erkennbarkeit in kleinen Größen. Keine neue Abhängigkeit oder Kostenaktivierung allein aufgrund dieser Auswahl.
- Zertifikate: zugänglicher Text, ausstellende Stelle, Lernleistung, Ausstellungsdatum und eindeutige Referenz; nur tatsächlich nachgewiesene Leistungen bescheinigen. Keine erfundenen Qualifikationen oder Akkreditierungen.
- Badge-Derivate sind ausschließlich visuelle Darstellungen, keine Rollen- oder Abo-Berechtigung. Vorhandene serverseitige Berechtigungslogik bleibt unberührt.
- Neue Masterlogos, konkrete Entwürfe und Rechte benötigen persönliche Bestätigung. Produktspezifische Logoformen wurden in dieser Auswahl noch nicht festgelegt. Kundenlogos bleiben vom Corporate-Namensraum getrennt.
- Der private Workspace bleibt bis zur separaten Freigabe und serverseitigen Owner-Isolationsprüfung unveröffentlicht.

**Status:** Designanforderungen bestätigt; konkrete Master, Derivate, Generatorintegration, CI und Produktionswirkung noch nicht nachgewiesen. Keine Änderung der Root-Engineering-Richtlinie oder neuer Required Checks.
