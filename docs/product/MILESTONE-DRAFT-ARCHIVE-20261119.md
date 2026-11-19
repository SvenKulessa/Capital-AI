# CAPITAL-AI – historische Milestone-Entwürfe (Stand 2026-11-19)

Status: **ARCHIVIERTE PR-ENTWÜRFE / NICHT VERÖFFENTLICHT**. Dieses Verzeichnis ist ein schlanker Quellenindex, kein neuer Gate, kein Production-Readback und keine Autorisierung zur Veröffentlichung.

## Konsolidierungsentscheidung

Der aktuelle Hauptbranch `bd1106b0582f8518a0d730d5db3d01e76c4f11ea` enthält die Quell-PRs #761, #772, #791 und #800 bereits. Die nachgelagerten Entwürfe sind abweichende **zeitpunktbezogene** News-/Roadmap-Snapshots. Ihre jeweils generierte `src/data/roadmapMergeReconciliation.json` darf nicht ungeprüft über die neuere Momentaufnahme geschrieben werden. Das neueste Paket wird in PR #801 weitergeführt; frühere Snapshots bleiben über die jeweiligen PR-Dateidiffs erhalten und werden nicht als aktuelle Live-Evidence ausgegeben.

| Historischer Entwurf | Quell-PR (bereits gemergt) | Gesicherte Einordnung | Datei-Evidence |
| --- | --- | --- | --- |
| [#765](https://github.com/SvenKulessa/Capital-AI/pull/765) | [#761](https://github.com/SvenKulessa/Capital-AI/pull/761) | Roadmap-Snapshot bis 761, `mergeCount=610`; keine Runtime-Verifikation | [PR-Diff](https://github.com/SvenKulessa/Capital-AI/pull/765/files) |
| [#781](https://github.com/SvenKulessa/Capital-AI/pull/781) | [#772](https://github.com/SvenKulessa/Capital-AI/pull/772) | Historischer News- und Roadmap-Entwurf bis 772, `mergeCount=620`; nicht veröffentlicht | [PR-Diff](https://github.com/SvenKulessa/Capital-AI/pull/781/files) |
| [#792](https://github.com/SvenKulessa/Capital-AI/pull/792) | [#791](https://github.com/SvenKulessa/Capital-AI/pull/791) | Roadmap-Snapshot bis 791, `mergeCount=630`; keine Runtime-Verifikation | [PR-Diff](https://github.com/SvenKulessa/Capital-AI/pull/792/files) |
| [#801](https://github.com/SvenKulessa/Capital-AI/pull/801) | [#800](https://github.com/SvenKulessa/Capital-AI/pull/800) | Neuer News-/Roadmap-Entwurf bis 800, `mergeCount=640`; **DRAFT_NOT_PUBLISHED** | [PR-Diff](https://github.com/SvenKulessa/Capital-AI/pull/801/files) |

Diese historische Aufstellung bedeutet **nicht**, dass die Entwurfsartikel aus #765/#781/#792 im laufenden News-Archiv veröffentlicht oder technisch migriert wurden. Für die spätere redaktionelle Nutzung einzelner Texte sind Provenance, Quellen- und Medienrechte sowie die geltende Freigabe separat zu prüfen. Bis dahin gilt **NOT_PROVEN**.

## Sicherheits- und Merge-Grenzen

- Die Übernahme des neuesten Pakets #801 setzt normale aktuelle CI-, Security-, Domain-Governance- und Mergeprüfungen voraus.
- Kein Verändern produktiver Datenbanken, OAuth-Berechtigungen oder Secrets; keine Veröffentlichung durch diesen Index.
- Historische PR-/CI-Evidence nicht als Nachweis aktueller Runtime-Wirkung behandeln.
