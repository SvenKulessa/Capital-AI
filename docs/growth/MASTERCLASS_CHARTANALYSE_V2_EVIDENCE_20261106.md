# CAPITAL-AI GROWTH — Chartanalyse Masterclass v2 (2026-11-06)

**Produktstatus:** DRIVE_EXPORT_VERIFIED, LOCAL_VIDEO_QA_PASS, AUDIO_LISTENING_REVIEW_REQUIRED, COMMERCIAL_RIGHTS_REVIEW_REQUIRED, SOCIAL_PUBLISHING_BLOCKED.

**Main-Abgleich:** Begonnen auf dem zum Branch-Erstellungszeitpunkt aktuellen `main`. Autorität: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`. Produktive Freigaben werden durch diese Datei nicht geändert.

## Scope / Design

Vier Kapitel im Look von Kapitel 1: 1600×900 (16:9), Navy `#02050E`, AIF-Gold `#F9BF21`, Cyan `#22D3EE`, Violett `#A855F7`, gleiche Gold-Titel/Seitenbereich mit JaJa, URL `https://capital-ai.online`, wiederholbarer 9-Sekunden-Intro- und 6-Sekunden-Outro-Baustein. Fachliche Quellslides und Tonspuren im Hauptteil erhalten; keine realen Marktdaten oder Performanceaussagen ergänzt.

**Repository-native Wiederverwendung:** `src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts` enthält `CAPITAL_AI_MASTERCLASS_EPISODES` und `createCapitalAiMasterclassChapterIntroProject`, nutzt `MediaProjectV2`, den bestehenden `MEDIA_PROJECT_BRAND_TOKEN_SOURCE`, Offline-`media-project-v2-preview`, `publishReady:false`. `scripts/media/masterclass-design-system-v2.json` hält die Version, Titel und Rechte-/QA-Grenzen fest. `scripts/masterclass-templates.test.mjs` prüft alle vier Entwürfe und Negativfall. Kein neuer Provider oder TTS-Dienst aktiviert.

Die vier lokalen Langfassungsexporte wurden mit einem offline FFmpeg/Pillow-Adapter nach dem vorhandenen Social-Renderer-Branding-Contract erzeugt. Es ist **nicht** bewiesen, dass die produktive SocialMediaEngine-Worker-Runtime diese MP4s erzeugt oder gepostet hat. Verwendete lokale GPL-fähige FFmpeg-Builds sind nicht als kommerzielle Standard-Renderumgebung freigegeben; für den Produktions-Renderer gilt dessen geprüfter Build.

## Verifizierte Assets in Drive

Kanonischer Ordner: `GROWTH/10_Media/20_Exports/Masterclass_Chartanalyse_v2`.
Die ursprünglichen drei Kapitel-Master-IDs sowie die ausgewählte Masterclass-Datei-ID wurden durch Google Drive `files.update` **in-place** aktualisiert und in den kanonischen Ordner verschoben. Drive-Namen/Größen wurden gelesen; anschließend wurden **alle vier vollständigen Zieldateien erneut materialisiert und byteweise per SHA-256 bestätigt**. Keine Duplikate aus Transfer/Staging vorhanden.

| Kapitel | Datei | Laufzeit | SHA-256 | Bytes |
| --- | --- | --- | --- | ---: |
| 01 | `CAPITAL-AI_Masterclass_K01_Grundlagen_16x9_v2.mp4` | 406,521 s | `506e94951c3d36f9e96dc6497e42fadf93ba36793c4b6a7d70e1edb7a0879d46` | 27.680.654 |
| 02 | `CAPITAL-AI_Masterclass_K02_Realitaetscheck_16x9_v2.mp4` | 450,105 s | `3debe03dfb2c7d49a662ab10e47a9041c79c4c180cca1c55306ff8c9b90ca9c9` | 26.121.819 |
| 03 | `CAPITAL-AI_Masterclass_K03_Trend_Volumen_Ausbrueche_16x9_v2.mp4` | 396,105 s | `91b415d6f2ed414bd4a53d9f6d30f3f8c0d38d0a6d93ffdc0b373496c7509abf` | 24.531.222 |
| 04 | `CAPITAL-AI_Masterclass_K04_Zeitrahmen_Zoom_16x9_v2.mp4` | 382,563 s | `81347179f228ddec3958d5a0520ac511659344b4d018257473be5777e558e98a` | 24.182.064 |

Alle Exporte: H.264/1600×900, AAC-Audiospur; 24 FPS, fünf gezielt dekodierte Frames je Video, deutsche Audioeinleitung als Wellenform/RMS nachgewiesen, jeweilige Original-Audiomitte beibehalten. Visuelle Kontaktbögen an Einleitung, Inhaltskapiteln und Outro gesichtet; Fix für überdeckte Titel angewandt. Vollständige Bild-für-Bild- und menschliche Hörprüfung sind **nicht** belegt.

## Dublettenbereinigung

Zwei gleichnamige Ausgangsvideos `Capital AI Chart Analysis Masterclass.mp4` im Growth-Hauptordner hatten **identischen SHA-256** `336c07aa59ecd33aa8107dbfd6fa7062a56e1bc733ab15f17aa0b877eef89700` bei je 26.926.553 Bytes. Die ältere der beiden IDs wurde als Kapitel 04 in place aktualisiert und nach `20_Exports/Masterclass_Chartanalyse_v2` bewegt; die zweite, ausdrücklich als überflüssige Dublette bestätigte ID wurde **erst nach vollständigem Zielhash-Readback gelöscht**. Alle vier temporären Transferkopien wurden danach ebenfalls gelöscht. Keine Löschung anderer Quellmedien, Shorts oder historischer Rechtebelege.

## Audio- und Rechtegrenzen

Einleitungs-Text ca. sieben Sekunden je Video, **offline mit installierter eSpeak-de-Stimme synthetisiert**; dies ist nur eine vorläufige Sprecherfassung. Der historische GROWTH-Review nennt schlechte eSpeak-Stimmqualität; deshalb **AUDIO_QUALITY: REVIEW_REQUIRED**. Vor öffentlicher/kommerzieller Veröffentlichung muss der Owner das gesamte Audio anhören und ggf. eine nach geprüften Kosten-/Providerrechten erzeugte natürlichere Sprachfassung ersetzen. Google Neural2 bleibt `IMPLEMENTED_DISABLED`, wurde nicht angerufen oder zur Abrechnung aktiviert. Keine automatische Veröffentlichung.

Das entfernte Notebook-Endlogo belegt keine Rechtsfreigabe für Quellvideo, ursprüngliche KI-Folien, Stimme, Musik oder Marken. Insbesondere in Kapitel 04 wurden die ersten/letzten Abschnitte getrimmt sowie äußerer Quellrand konservativ beschnitten, um ein auffälliges Notebook-Abspannbild und untere/rechte Legacy-Marken zu vermeiden; ein vollständiger Negativnachweis für alle Einzelbilder bleibt **NOT_PROVEN**. Quellen sind owner-gebundene Drive-Dateien. Siehe `docs/licenses/CHARTANALYSE-LEARNING-MEDIA-RIGHTS-20261014.md` und `docs/licenses/CAPITAL-AI-UNIVERSE-HERO-20261015.md`.

## Reproduzierbarkeit / Rollback

Die Styles, Titel, Ton-Manuskripte, Datenfelder und Offline-Render-Contracts stehen im Repository. Der Videorender wurde im isolierten Arbeitscontainer durchgeführt; **sein privates Eingangsmaterial und lokale WAVs gehören nicht in den öffentlichen Repo-Commit**. Zur Wiederholung privaten Masterclass-Quellenzugriff in autorisierter Umgebung herstellen und die vorhandenen Media-Engine-/FFmpeg-Render-Bausteine verwenden. Keine neuen Lizenzschlüssel, Secret-Umgebung oder bezahlte Anbieter.

Ein Commit-Rollback betrifft nur die zusätzlichen Template-/Test-/Dokudefinitionen; eine Wiederherstellung alter Drive-Bytes wäre ggf. von Drive-Versionshistorie abhängig und ist daher nicht zugesagt. Sicherheits-/Lizenzregeln für Social Publishing und Google OAuth gelten unverändert.

## PR/CI Evidence

Der zugehörige GROWTH-PR ist erst nach angepassten Tests, TypeScript-/Media-Projekt-Validierung, Docker Security Gate und Domain Governance mergebar. GitHub-Checks und Production-Deployment sind unabhängig vom erfolgreichen Drive-Readback zu behandeln.

## Owner-requested audio restoration (2026-11-06; current Drive deliverables)

**CURRENT: ORIGINAL_AUDIO_RESTORED / ESPEAK_INTRO_REMOVED / HUMAN_AUDIO_LISTENING_NOT_PROVEN.** The preceding v2 table and local eSpeak introduction describe **historical masters only**. On owner request, the exact nine-second eSpeak-generated introductory video/audio segment was removed from each master. The original audio embedded in the teaching body was preserved by stream copy; the branded teaching-frame and closing outro remain. This restoration is not a claim that the source speaker is human rather than originally generated.

| Chapter | Current Drive filename | Duration | Verified SHA-256 |
| --- | --- | --- | --- |
| 01 | `CAPITAL-AI_Masterclass_K01_Grundlagen_Originalstimme_v3.mp4` | 397.519 s | `cdb8269584161f562a8464beef56705fb116e99b3b9cb62409cf5526ebce1351` |
| 02 | `CAPITAL-AI_Masterclass_K02_Realitaetscheck_Originalstimme_v3.mp4` | 441.105 s | `500180f59459863cb1cd0d1f0129a363e907d2117fe644aadedfad98dd313f42` |
| 03 | `CAPITAL-AI_Masterclass_K03_Trend_Volumen_Ausbrueche_Originalstimme_v3.mp4` | 387.105 s | `7ace0f8ede13959ef1e42499c6656facfdde614211866c154cad48cd537fe33c` |
| 04 | `CAPITAL-AI_Masterclass_K04_Zeitrahmen_Zoom_Originalstimme_v3.mp4` | 373.563 s | `1c5ab39ff7190411eb51ea527460d2337a5ba7bf53053f922c556e17d544213d` |

The previous four Drive file IDs are retained; full re-materialization of all four Drive MP4s followed by local SHA-256 confirmed the updated bytes. Audio comparison between each restored intro boundary and the previous v2 teaching audio, with codec-delay compensation, had normalized one-second correlation above 0.9999. Exact original-source voice is *preserved within the teaching body*, not re-synthesized. The four temporary video upload files were deleted after verified replacement. Drive manifest `MASTERCLASS_DELIVERY_MANIFEST.json` was updated **in place** at its previous file ID with v3 bytes, hash, version history and the audio provenance. The manifest's temporary upload copy was also deleted.

**Publication stays blocked** until full human listening and copyright/third-party source rights review. Original visual 9-second intro is omitted from v3; a voice-free branded intro could be reintroduced only after separate owner design review and sync QA. This audio correction is not a grant to publish or alter OAuth status.
