# CAPITAL-AI Universe – Cross-Media-Slice und responsiver QA-Nachweis

**Stand:** 2026-11-15 · **Primary Domain:** GROWTH · **Vertrag:** `CAPITAL_AI_UNIVERSE@1` · **Governance:** Root-`AGENTS.md`

## Zweck und Quellenautorität

Aufbauend auf dem abgeschlossenen PR #740 vereinheitlicht dieser Slice bereits vorhandene Offline-Renderer, SocialMediaEngine-Vorlagen und Artikelprojektionen. Das kanonische Farbspektrum bleibt `shared/hub-branding.mjs` + `public/branding/asset-pack/meta/social-render-tokens.json`. Gold, Cyan, Violett, Pink, Rosé, Blau und Grün sind **dekorativ**: Keine Risiken, Renditen, Zustände oder Barrierefreiheitsinformationen ausschließlich durch Farbe ausdrücken.

## Genaue Implementierung

| Ausgabe | Änderungen | Grenzen |
| --- | --- | --- |
| Bild / Lernatlas | `scripts/media/render_chart_learning.py` ergänzt 7-Punkt-Signatur außerhalb synthetischer Datendiagramme | Fachliche Chart-Farben und numerische Daten bleiben unverändert, keine erfundenen Kurse |
| Badges / SVG | `ScreenerBlueprintBadgeRenderer.mjs` bindet sieben Farben fail-closed ein; drei lokale SVGs und Manifest-SHA-256 aktualisiert | Weiterhin `publishReady:false`, keine neuen fremden Assets |
| Artikel / Homepage | `presentBlogArticle` liefert Universe-Identität und sieben deklarierte Farbfamilien; bestehende siebenfarbige `homeEditorialNews.css` durch Tests nachgewiesen | Keine automatische Quelle-/Bildrechte- oder Freigabeentscheidung; Live-Artikel unverändert |
| Video / Tour | `MediaStudioTemplates.ts` trägt Universe-Art-Direction und siebenfarbige Kapiteltexte; Tour erbt Brand-Metadaten | Hero/BrandGlobe nicht verändert, keine Voiceover-Behauptung |
| Podcast / Masterclass | `podcastCoverRenderer` verweist auf den deterministischen siebenfarbigen `render_brand_card`; Cover-Entwürfe verwenden vorhandene Palette | Reine Audiodaten haben keine Pixelfarbe; TTS-/Musikrechte und Audio-Review bleiben getrennt |

## Regression und CADS

- `scripts/growth/universe-media-contract.test.mjs`: Content-Engine-Draft, Homepage-Artikel, Medienprojekt-Templates, siebenfarbige SVGs, fehlende Publisher-Berechtigung und CADS.
- `scripts/media/screener-blueprint-badges.test.mjs`: deterministische gerenderte Bytes gegen GitHub-Dateien und Manifest-Hashes; ungültige, doppelte und fehlende Farbwerte verweigern den Output.
- `scripts/media/test_universe_branding.py`: exakte Farb-Pixel in Lerncharts, 1280x720, 1080x1080, 1080x1920 und Video-Frames; vorhandene Renderer-Worker-CI.
- `scripts/qa/universe-content-studio-browser.mjs`: echte Chromium-Screenshots bei **320 / 390 / 1440 CSS-Pixeln**, erwartete Farbfelder, DOM-Bounds, Seitenbreite, reduzierte Bewegung und JSON-/SHA-256-Evidence im vorhandenen Browser-Workflow.
- `.github/workflows/financial-learning-browser.yml` nutzt unverändert die bestehende Chromium-/npm-Installation und upload-artifact; keine neuen Required Checks, Publisher, Secrets oder bezahlten Provider.

## Freigabegrenzen

Automatisierte DOM-/Farbtests und Screenshot-Artefakte ergeben **TARGETED_PASS**, falls erfolgreich. Sie belegen **keine vollständige WCAG-Abnahme oder menschliche Screenshot-Review**. Vom Reviewer nicht geprüfte Screenshots bleiben `NOT_PROVEN`; `CADS technicalStatus:PASS` bedeutet keine Lizenz-, Sicherheits- oder Veröffentlichungsfreigabe.

Bestehende Produktions-Assets werden **nicht automatisch neu gerendert**. Ein zukünftiger Produktionsschnitt erfordert den gesonderten Vergleich von visuellen Änderungen, Rechten, Attribution, Alt-Text und ApprovalRefs gegen die exakt neuen Asset-Hashes. Für automatische Artikel-Neuerstellung bleiben die bisherigen fail-closed Lizenzgrenzen bestehen.

## Rücknahme

Revert nur des P1-PRs; die P0-Universe-Tokens aus #740, bestehende Hero-Animation und Publikationsschutz bleiben bestehen. Die neuen drei SVGs und das Manifest müssen konsistent gemeinsam zurückgenommen werden. Keine Live-DB-, Render- oder OAuth-Aktion.
