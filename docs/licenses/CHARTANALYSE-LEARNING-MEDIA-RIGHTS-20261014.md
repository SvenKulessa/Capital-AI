# CAPITAL-AI — Chartanalyse Learning Media: Rechte, Provenienz und Auslieferung

Stand: 2026-10-14 · Domain PRODUCT / GROWTH / TRUST  
Status: **REVIEW_REQUIRED** für kommerzielle Veröffentlichung, **ASSET_RENDERED** nur für die lokal erzeugten Entwürfe.  
Autorität: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`. Dieses Dokument erteilt keine zusätzlichen Provider- oder Drittanbieterrechte.

## Herkunft und Identität der drei Quelldateien

Die drei Videodateien wurden vom Owner durch private Google-Drive-Links für die Bearbeitung bereitgestellt. Die Ablage in einem Owner-Konto ist **kein unabhängiger Urheber-, Lizenz- oder kommerzieller Verwertungsnachweis**. Originaldateien wurden nicht verändert.

| Input | Ursprünglicher Dateiname | SHA-256 | Laufzeit |
| --- | --- | --- | --- |
| F01 | `Capital-AI-Learning-Chartanalyse-Kurs_01.mp4` | `3610a3015858183219525b5b78a990f7a75c97e3fb1b8341ab26190255669c46` | 400.92 s |
| F02 | `CAPITAL-AI-Folge-02-Webdesign-Masterclass-DRAFT.mp4` | `6c4c2962cb93a1aab9ecea27477e3a7f76a2bbd8dc672c6208219398a06a2b6c` | 447.04 s |
| F03 | `CAPITAL-AI-Folge-03-Webdesign-Masterclass-DRAFT.mp4` | `8ef0e47e62c9cccb7e868f1cb2bbda42cc839f9b7f5679dddee142c2086bbb10` | 393.17 s |

Keine privaten Drive-IDs oder authentifizierten Download-Links in diesem öffentlichen Repository ablegen.

## Ausgelieferte, getrennte lokale Bearbeitungen

- F01: neue 4-Sekunden-Introkarte im Designsystem aus F02/F03, Hauptvideo unverändert. Erwartetes Produkt `CAPITAL-AI_F01_Chartanalyse_Branded_16x9.mp4`.
- F02/F03: letzte Wiederholungs-/Abspannsekunden durch ein achtsekündiges, auf 1280×720 skaliertes Endbild aus F01 ersetzt. Dateinamen `CAPITAL-AI_F02_Chartanalyse_Branded_16x9.mp4`, `CAPITAL-AI_F03_Chartanalyse_Branded_16x9.mp4`.
- Jeweils drei inhaltliche Ausschnitte aus F02/F03 in 1080×1920 mit Audio der Ursprungsquelle; darunter **ein Smartphone-Mockup pro Folge**. Zusätzliche Veröffentlichung ist nicht erfolgt.
- Kapitel-Cover als `CAPITAL-AI_CH01_Cover_16x9.png` und `CAPITAL-AI_CH01_Cover_9x16.png`; Wallpaper `CAPITAL-AI_OWNER_FOUNDER_Wallpaper_9x16.png`; Intro-Karte `CAPITAL-AI_CH01_Intro_16x9.png`.
- Technischer Render: deterministische Pillow-Kompositionen + lokales FFmpeg. Dies **ist kein bestätigter Ausführungslauf des produktiven Social-Renderer-Workers**; dessen Lizenz-/Runtime- und Publishing-Gates bleiben unverändert.
- Die quellgebundenen Text-Overlays verwenden ausschließlich fiktive/synthetische Candlestick-Illustrationen, keine echten oder lizenzierten Marktdaten. Bildungszweck, keine Anlageberatung.

Die lokale Auslieferung enthält `CAPITAL-AI_2026-10-14_Chartanalyse_Manifest.json` mit SHA-256, Größen und Dauer jeder erzeugten Datei. Der ZIP-Export ist eine Transportkopie, keine zweite kanonische Medienquelle. Für die Social Media Engine sind Hash und Assetreferenz vor späterer Verarbeitung erneut zu verifizieren.

## Inhaber- und Lizenzgrenzen

1. **Bestehende CAPITAL-AI-Marken-/Logo-Nutzung:** Design- und Provenienz-Referenzen `public/branding/asset-pack/meta/social-render-tokens.json`, `docs/branding/LOGO-20260930.md` und `docs/security/evidence/frontend-origin/DESIGN_AND_IMAGE_LICENSE.md`. Der verwendete Logoausschnitt stammt aus dem F01-Endbild (ab ca. 394 s); seine Rasterbytes sind nicht mit der kanonischen Logo-Datei gleichzusetzen.
2. **Neue Layoutkompositionen und Badge-Konzept:** Owner-direktierte neue Bearbeitungen für CAPITAL-AI. Soweit an den konkreten schöpferischen Leistungen Rechte entstehen und dem Owner zustehen, sind diese für CAPITAL-AI zur internen Verwendung, Bearbeitung und vertrags-/rechtekonformen Vermarktung vorgesehen. Eine separate registrierte Marke, behördliche Zertifizierung oder automatische Schutzrechtsübertragung wird dadurch nicht behauptet.
3. **FOUNDER-Entwurf:** `FOUNDER · BADGE CONCEPT · NOT AN ACTIVE LICENSE` ist ausschließlich ein grafischer Entwurf und **kein** aktives Produktentitlement, Partnerstatus, Eigentumsnachweis oder gekaufter Lizenzanspruch. Bestehendes Badgerecht: `docs/licenses/CAPITAL-AI-BADGE-ASSET-LICENSE-1.0.md`.
4. **Drittmaterial:** Ursprüngliche Animationen, Illustrationen, Musik, Stimmen/TTS, Stock-Medien, mögliche Gemini-/Google-Generator-Assets und die genaue Erzeugungsgeschichte wurden nicht einzeln auf kommerzielle Nutzung und Weiterverwertung geprüft. Nachbearbeitung oder Logoersatz schafft keine zusätzlichen Drittanbieterrechte. Herkunft, Nutzungsbedingungen, Einschränkungen, Attribution/NOTICE und bei Audio ggf. Rechte an der Stimme vor Vermarktung klären. Verwechslungsgefahr mit Google/Gemini vermeiden, keine Drittanbieter-Autorisierung suggerieren.
5. **Werkzeuge:** Die neuen Bilder nutzen lokale Rasterisierung und synthetische Formen; verwendete Systemschriften werden nicht als Fontdateien verteilt. Die hier vorliegende lokale FFmpeg-Installation wurde mit GPL-Option gebaut; sie ist nicht automatisch identisch mit dem kommerziell freigegebenen Renderer-Build-Profil. Vgl. `docs/licenses/SOCIAL-MEDIA-ENGINE-PRODUCT-LICENSE.md`.

## Drive-Struktur und Duplikatsregel

Die bestehenden GROWTH-Quellmedien verbleiben unter **derselben Datei-ID**; es wurden keine Dubletten durch Kopieren erzeugt. Kanonische neue Unterordner:

`GROWTH/10_Media/10_Source` · `20_Exports` · `30_Artwork` · `90_Legacy`.

Four neue Artwork-Dateien wurden in `30_Artwork` gespeichert. Die neu gerenderten MP4s liegen als lokale Download-Artefakte vor; ein Drive-Upload der neuen MP4s ist bis zum erfolgreichen Tool-Readback **NOT_PROVEN**. Vermeintlich inhaltlich ähnliche ältere Videofassungen bleiben bis zu einer nachgewiesenen inhaltlichen/Hash-Prüfung erhalten. Kein automatisches Löschen aufgrund identischer Dateinamen, Themen oder ähnlicher Vorschaubilder.


**Ähnlichkeitsbefund aus dem bisherigen GROWTH-Baum:** `Schluss mit Daten-Illusion (1).mp4` und `Schluss mit Daten-Illusion – CAPITAL-AI FINAL.mp4` haben beide 130,83 s bei 1280×720, aber unterschiedliche SHA-256-Dateihashes. Die Korrelation von fünf bei gleichen relativen Zeitpunkten gezogenen Graustufen-Frames liegt zwischen 0,946 und 1,000. Sie sind damit **inhaltlich sehr ähnlich, nicht byte-identisch**. Die als `FINAL` bezeichnete Version ist die einzige aktive Version in `10_Media/20_Exports`; die ältere Fassung bleibt in der historischen Learning-Produktionsablage. Keine Löschung allein aufgrund dieser Stichprobe.

**Namenskonvention für neue Exporte:** `CAPITAL-AI_F<NN>_Short_<NN>_<standard|phone>_9x16.mp4` und `CAPITAL-AI_F<NN>_Chartanalyse_Branded_16x9.mp4`. Historische Namen wurden nicht umbenannt, da diese in vorhandener Provenienz/Evidence referenziert sein können.

## Abnahme, Monetarisierung und Rollback

Technisch geprüft: MP4-Streams und Dimensionen per `ffprobe`; gezieltes Frame-Decoding an Anfang, Übergang und Ende sowie visuelle Kontaktbögen. **Nicht nachgewiesen:** menschliche vollständige Sichtung und Ton-Abnahme jeder Szene, exakte Fade-Überblendungsästhetik, vollständige Entfernung eventueller Drittmarkenzeichen aus dem gesamten Original, Rechtekette aller Audio-/Bildbestandteile, produktive Social Engine, YouTube-Upload und kommerzielle Nutzungserlaubnis.

Vor kommerzieller Publikation: Originalherkunft und Providerterms bestätigen, verbleibende Drittmarken prüfen, Sprecher-/Musikrechte dokumentieren, Social-Publishing-Approvals erteilen, Upload nur nach separater Rechte- und Kontoprüfung. Für Web-/Social-Verkäufe ausschließlich die tatsächlichen CAPITAL-AI-Learning-Entitlements und vorhandenen Rechte nutzen.

Rollback: abgeleitete Dateien können entfernt werden; sämtliche Drive-Quelldateien blieben unangetastet. Verschobene GROWTH-Dateien besitzen unveränderte IDs und lassen sich in den Root-Ordner zurückverschieben.
