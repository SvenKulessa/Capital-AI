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

## NotebookLM-Video und Infografik: assetbezogene Review-Metadaten (2026-11-25)

Optionales `assets[].notebookLmReview` am bestehenden Intake; Altmanifeste bleiben kompatibel. Nur `GOOGLE_NOTEBOOKLM` + GENERATED + VIDEO_OVERVIEW/VIDEO oder INFOGRAPHIC/IMAGE. Der übergebene Asset-Hash muss exakt dem Asset-Hash entsprechen. Das beweist die strukturelle Zuordnung, nicht die Identität tatsächlicher Bytes. Keine zusätzliche Publish-Authority.

| Feld | Inhalt / Nachweis |
| --- | --- |
| assetSha256 | Bindung an die vorhandene Asset-ID und den Digest; finalen Export offline hashen |
| sourceSnapshotSha256 | Digest des Quelleninventars inklusive je Quelle Herkunft, Lizenz, Version, erlaubter Nutzung, Laufzeit und Attribution |
| promptSha256 | Digest des tatsächlich verwendeten Prompt-/Konfigurationsstands |
| generationEvidenceRef | Opaque/repository-relative Referenz auf Erstellungsdatum, Anbieter, verwendeten Tarif/Modell soweit belegt, Ausgabeformat, redigierte Generierungsbelege und menschliche Bearbeitung |
| sourceRights / mediaRights | Bestehende unabhängige Quellen- und Medienrechte; Bild, Video, Stimme, Musik, Fonts, Marke, Daten und Weitergabe gesondert prüfen |
| providerTerms / commercialUse | Nachweis der tatsächlich geltenden Anbieterbedingungen und des beabsichtigten kommerziellen Nutzungsumfangs |
| channelReviews | WEBSITE, YOUTUBE, INSTAGRAM, X, LINKEDIN oder TIKTOK; eindeutige Kanalzuordnung, je Kanal platformTerms, aiDisclosure, editorialReview, releaseReview |
| aiDisclosure | REQUIRED / NOT_REQUIRED / UNDETERMINED als gemeldete Entscheidung mit Evidence; unabhängig beurteilte Entscheidung bleibt UNDETERMINED |

Die Intake-Schicht speichert ausschließlich untrusted Review-Daten in `reviewAssets`. Jeder gemeldete VERIFIED-Rechtestatus wird wie im vorhandenen Vertrag zu NOT_PROVEN herabgestuft; BLOCKED bleibt BLOCKED. Keine Approvals, Deliveries, Public-Publish-Flags oder Renderer-Aktivierung aus diesen Angaben. Auch eine gemeldete Nicht-Kennzeichnung oder Freigabe ist keine attestierte Entscheidung. Die bestehende Content-Social-Package-/Publisher-Grenze mit separat geprüften Bytes, Rechten und channel-spezifischer Freigabe bleibt die einzige Veröffentlichungsautorität. Keine zusätzlichen repositoryweiten Gates, keine Provider-Calls, kein Secret, keine DB- oder Kostenaktivierung.

### Quellenbasis und redaktionelle Anwendung

Abruf 25.11.2026:
- OpenAI EU Terms: https://openai.com/policies/eu-terms-of-use/ — Output-Zuordnung soweit rechtlich zulässig; keine pauschale Exklusivität.
- Google Terms: https://policies.google.com/terms und Gemini Notebook Hilfe: https://support.google.com/gemininotebook/answer/17004255 — Google erhebt keinen Eigentumsanspruch an generierten Originalinhalten; Drittquellen, Dienst-/Tarifbedingungen und beabsichtigte Weitergabe einzeln prüfen.
- YouTube: https://support.google.com/youtube/answer/14328491 — tatsächliche KI-Offenlegung je Inhalt prüfen; realistische bzw. bedeutend veränderte Inhalte entsprechend kennzeichnen.
- Meta: https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/ — AI-Info/Disclosure und aktuelles Posting-UI je Asset beachten.
- X: https://help.x.com/de/rules-and-policies/authenticity — keine irreführenden manipulierten Medien; aktuelle Kanalbedingungen dokumentieren. Für weitere Kanäle gelten deren eigene aktuelle Bedingungen.
- Art. 50 EU AI Act: https://eur-lex.europa.eu/eli/reg/2024/1689 — insbesondere Deepfakes und ggf. KI-generierte Texte von öffentlichem Interesse unter Berücksichtigung gesetzlicher Ausnahmen prüfen; Anbieter- und Betreiberpflichten unterscheiden. § 2 Abs. 2 UrhG: https://www.gesetze-im-internet.de/urhg/__2.html — persönliche geistige Schöpfung als Voraussetzung für Werkschutz.
- First-party branding: docs/licenses/Capital-AI-BRANDING.md und docs/licenses/CAPITAL-AI-UNIVERSE-HERO-20261015.md. Keine neue Logo-/Hero-/Badge-/Reseller-Freigabe. KI-Herkunft und Hinweise als konservative redaktionelle Praxis sichtbar erhalten; keine Behauptung, dass jedes nichtrealistische Asset zwingend gesetzlich kennzeichnungspflichtig sei.

Der separat freizugebende Export muss die Quellen-, Rechte-, Kennzeichnungs- und kanalbezogenen Belege an den finalen Asset-SHA binden. Kein realer NotebookLM-Export wurde durch diese Codeänderung geprüft. Die sechs Prompt-PDFs sind Arbeitsanweisungen, keine freigegebenen Videos/Infografiken. Die neu ergänzten Tests verwenden ausschließlich synthetische Digests und behauptete Rechte. Rollback: normaler Revert des PR; keine Datenmigration.
