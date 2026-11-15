# CAPITAL-AI Social Media MediaKit v5 – Draft-Import

Stand: 2026-11-15 · Domain: GROWTH · Status: DRAFT_ONLY / SOURCE_ASSETS_NOT_PROVEN

## Autorität und Grenzen

Die kanonische Editor-/Render-Repräsentation ist MediaProjectV2 (src/platform/SocialMediaEngine/Contracts/MediaProject.ts und media-project-v2.schema.json).
Die auslieferbare Asset-/Approval-Identität verbleibt im bestehenden CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1. Die Schnittstelle darf aus beliebigen MediaKit-Metadaten keine Approvals generieren. Publishing-Authority bleibt ausschließlich die Social Media Engine. Es werden keine neuen Provider-, Lizenz-, OAuth- oder Publish-Gates/Workflows erzeugt.

Der Adapter src/platform/SocialMediaEngine/Editing/MediaKitV5Import.ts nimmt ein strukturelles Intake-Manifest entgegen und erzeugt ausschließlich einen offline-fähigen, editierbaren Quarantäne-Entwurf:

- Schema: CAPITAL_AI_MEDIAKIT_V5_DRAFT_INTAKE@1
- Project: MediaProjectV2; renderRecipe.publishReady=false; networkPolicy=offline
- publicationState=DRAFT_ONLY, publicationApproval=false, publicPublishAllowed=false, approvals=[], deliveries=[]
- reviewAssets mit Asset-ID, vorgegebenem SHA-256, Medienart, Quelle, Provenance-Origin und Evidence, getrenntem Quellenrechts- und Medienrechtsstatus sowie gemeldetem Reviewstatus
- Bilder, Videos und Audio werden nur als Medienreferenzen registriert; Bild-Preview-Layer sind deaktiviert
- PDFs und Textdateien werden als REVIEW_ONLY geführt, nicht in Render-/Publisher-Pfade eingebracht

**Untrusted claims:** Die importseitige Angabe VERIFIED wird nicht als unabhängiger Rechte- oder Datei-Nachweis gewertet: sourceRights.assessed=NOT_PROVEN, mediaRights.assessed=NOT_PROVEN, identityStatus=NOT_PROVEN, bis eine Prüfung der Originalbelege und Bytes vorliegt. Ein gemeldetes BLOCKED bleibt BLOCKED. Ein im Manifest gemeldetes APPROVED führt nicht zur Freigabe, sondern zu reviewStatus=REVIEW_REQUIRED.

Unbekannte Rechte-Enums, Publishing-Schalter, Traversal- und URL-Dateireferenzen, fehlende Digests, Duplikate und MIME-Mismatches werden abgewiesen.

## Feldzuordnung

| v5 Intake | Bestandssystem | Sicherheitsregel |
| --- | --- | --- |
| kitId, manifestRef, manifestSha256 | project.metadata.kitId, project.source | SHA ist nur behauptete Identität bis zum Hash der Bytes |
| contentId | project.contentPackageId | Kein erfundener Git-/Source-SHA |
| assetId, reference, kind, sha256, mimeType | project.assets | Relative/opaque Referenz, kein Remote-Fetch |
| provenance.origin/sourceRef/evidenceRef | Asset-Metadaten und reviewAssets | Herkunft dokumentiert, noch nicht attestiert |
| sourceRights.status/evidenceRef | reviewAssets.sourceRights | Vertrags- und Quellenrecht unabhängig prüfen |
| mediaRights.status/evidenceRef | reviewAssets.mediaRights | Bild, Musik, Stimme, Fonts und Weitergabe separat prüfen |
| reviewStatus | reviewAssets.reportedReviewStatus | Review bleibt REVIEW_REQUIRED |
| PDF, Markdown, Plaintext | REVIEW_ONLY | Kein Publisher-Medium |
| Bild, Video, Audio | MediaProjectV2.assets | Kein Byte- oder Render-Nachweis |

## Noch fehlende Input-Evidence

Die vollständigen Inhalte von CAPITAL-AI-SOCIAL-MEDIA-MEDIAKIT-v5 inklusive Binärassets und prüfbaren SHA-256-Manifesten waren bei Implementierung nicht verfügbar. Deshalb wurden keine tatsächlichen v5-Medien importiert und keine Datei-, Rechte- oder kommerziellen Nutzungsnachweise als VERIFIED behauptet. Die Tests verwenden ausdrücklich synthetische Referenzen und Digests.

Die technische Abnahme der tatsächlichen Assets erfordert:

1. Eindeutig lokalisierte v5-Manifest-Datei samt zugehörigen Medienbytes, kontrollierter Offline-Readback, Größen-/MIME- und SHA-256-Prüfung.
2. Rechtebelege pro Asset für Ursprungstexte, Daten, Bild/Illustration, Fonts, Musik, Video und Stimme, inklusive kommerzieller Nutzung und Weitergabe.
3. Redaktionsreview je Asset einschließlich Claims und Barrierefreiheit. Ein technischer CADS-Status ist kein Ersatz für Rechtebelege.

Erst danach darf der bestehende freigabe- und hashgebundene Content-Social-Package-/Publisher-Workflow separat verwendet werden. Dieser Adapter erzeugt nie Approval oder Delivery.

## Tests und Rollback

Bestehende CI: npm run test:social-core. Die zusätzlichen Tests stehen unter src/platform/SocialMediaEngine/__tests__/mediaKitV5Import.test.ts und prüfen Draft-Struktur, MediaProjectV2-Validierung, Rechte-/Review-Fail-Closed, Traversal, Approval-Injection, MIME, Hash, Dubletten und Versionswechsel.

Rollback: Adapter und Tests entfernen sowie den test:social-core-Eintrag zurücknehmen. Keine Datenbankmigration, kein Secret, kein Providercall, keine Publisher-Flags oder Deploy-Skripte.
