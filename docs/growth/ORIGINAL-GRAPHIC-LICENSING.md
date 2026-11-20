# Eigene Grafiken in Content Engine und Social Media Engine

Der Owner hat am 20. November 2026 die moderne Darstellung des Akash-Eintrags sowie die Lizenzierung der eigenen Grafik und deren Integration in die Engine beauftragt. Die Umsetzung verwendet das bestehende proprietäre CAPITAL-AI-Assetmodell unter LicenseRef-CapitalAI-Owned.

## Normaler Wirkungspfad

1. planContentCampaign erhält den normalen Kampagnenbrief und optional originalGraphics sowie eine separat aus vertrauenswürdiger Owner-Evidence geladene graphicOwnerGrants-Liste.
2. Der Offline-Renderer erzeugt die eigene Gestaltung mit lokalen Universe-Farben und der vorhandenen OFL-Schrift. SVG-Texte werden escaped und anhand tatsächlicher Schriftgeometrie eingepasst. Die PNG-Bytes erhalten SHA-256-Identitäten.
3. OriginalGraphicAsset bindet Datei, MIME, Renderer-Version, Quellcommit, Quellsnapshot und Inhaltsdigest. Der Inhaltsdigest des Akash-Renderauftrags enthält den früher geprüften Textdigest und alle neuen Bildbeschriftungen.
4. Ein passender, getrennter Owner-Grant erlaubt nur die eigene Grafiknutzung in benannten Kanälen. Geänderte Bytes, Inhalt, Quelle, Renderer oder KI-Kennzeichnung, Widerruf und mehrdeutige Grants schließen die Nutzung.
5. buildDraftContentSocialPackage erhält originalGraphic als Teil der Asset-Identität. Die MediaProject-Bridge erhält diese Herkunft. findContentSocialApproval, Non-Audio-Review und der bestehende Publisher-Handoff prüfen eigene Grafikrechte vor der separaten Publikationsfreigabe.

Bestehende Aufrufer ohne neue Grafikmetadaten behalten ihre bisherigen Verträge. Neue Grafikmetadaten dürfen nicht aus bestehenden Assets entfernt werden, um sie als Legacy-Assets auszugeben. Ein OWNER-Feld in Kandidaten-JSON ist kein Identitätsnachweis. Der Aufrufer muss die gesonderte Grant-Liste aus dem authentifizierten oder ownerkontrollierten Kontext beziehen. Das reine Schema kann keine menschliche Identität kryptographisch bestätigen. Der Renderer ruft keine Provider auf und erfindet keine Rechte an Drittmedien.

## Akash-Eintrag erzeugen

Vom Repository-Root aus ausführen.

```bash
node --import tsx scripts/media/render-akash-editorial.mts
```

Die feste Akash-Rezeptur erzeugt Desktop-PNG 1440×960 und Portrait-PNG 1080×1350, jeweilige Vektorquellen, einen manifestierten Engine-/Social-Paket-Entwurf und eine eigenständige responsive HTML-Vorschau unter docs/growth/drafts/akash-20261120. Der Generator bindet den expliziten aktuellen Owner-Auftrag aus dem Lizenzdokument an die tatsächlichen Dateihashes. Dieser Pfad ist auf die beauftragte Akash-Grafik beschränkt. Er akzeptiert keine fremden Assets oder frei übergebenen Owner-Autorisierungen. Allgemeine Aufrufer des Grafikvertrags benötigen ihre eigene gültige Grant-Evidence.

Das Manifest erhält den separaten Graphic-Grant. Seine kommerzielle Nutzung umfasst ausschließlich den autorisierten CAPITAL-AI-Kontext und die dokumentierten Kanäle. Quellenrechte und redaktionelle Abnahme bleiben REVIEW_REQUIRED beziehungsweise NOT_PROVEN. Die bestehende Homepage-Edition und deren unabhängiges Rechteverzeichnis werden durch die Grafiklizenz nicht freigegeben. Das Social-Paket enthält keine Publikationsapprovals und keine Auslieferungsaufträge.

## Tests und Rücknahme

Die vorhandene npm-test-Pipeline enthält Vertrags- und Entry-Point-Negativtests sowie deterministische Rendererprüfungen für PNG-Dimensionen, wiederholbare Bytes und eingeschleuste SVG-Tags. Keine zusätzlichen Scheduler oder Pflichtchecks werden angelegt.

Rücknahme erfolgt über einen Revert dieses Code-/Asset-Slices. Für einzelne Grafik-Grants wird der ownerkontrollierte Datensatz auf REVOKED gesetzt. Mehrdeutige aktive/widerrufene Grants zu derselben assetId werden geschlossen behandelt. Eine Lizenz gewährt keine neue Provider-, Datenbank- oder Publishing-Berechtigung.
