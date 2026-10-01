# AP-SEC-IMAGE — Bild-, Logo- und Branding-Evidence / TRUST-PLATFORM-Handoff

**Prüfstand:** 01.10.2026, Europe/Berlin  
**Primary Domain:** CAPITAL-AI-GROWTH  
**Handoff:** TRUST = Rechtebewertung; PLATFORM = Source-/Asset-Bindung  
**Status:** `PARTIAL_EVIDENCE_REVIEW_OPEN`  
**Production-/Deploy-Freigabe:** unverändert; aus diesem Dokument folgt **keine** Freigabe.

Maschinenlesbare Evidence: [`docs/security/evidence/ap-sec-image-evidence-20261001.json`](evidence/ap-sec-image-evidence-20261001.json).

## 1. Validierung 1 — Current Main und tatsächlich gebundene Assets

Korrelierte Main-Stände:

- `SvenKulessa/Capital-AI@16b9ced4950317bee3efe6bf8d5154d1551e7cc9`
- `SvenKulessa/FRONTEND@9c2e2255a0fca5fe113b7ddf56906889f8ef1186`
- `capital-ai-online/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`

### 1.1 Eigenes CAPITAL-AI-Branding

Die aktuelle Capital-AI-Anwendung verwendet als Raster-Brandingquelle
`public/branding/capital-ai-logo.jpg`. `BrandLogo.tsx` bindet diese Quelle
sowie die daraus erzeugte Vendor-Variante. `index.html` bindet Favicon,
Apple-Touch-Icon, OpenGraph-/X-Social-Card und das Schema.org-Avatar aus dem
gleichen Asset-Pack. Das Manifest führt `publishReady:false`; dieser Wert wird
nicht durch diese Prüfung überschrieben.

Die Derivate stammen laut
`public/branding/asset-pack/meta/ASSET-LICENSE-AND-PROVENANCE.txt` ausschließlich
aus dem first-party Quellbild. Der Generator
`scripts/branding/generate_logo_asset_pack.py` arbeitet mit Pillow; es wurden
keine fremden Logos, Stockgrafiken oder Remote-Bilder in diese Derivate
eingefügt.

| Datei | SHA-256 | Verwendung |
|---|---|---|
| `public/branding/capital-ai-logo.jpg` | `6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3` | BrandLogo-Quellbild; Website-Branding |
| `public/branding/asset-pack/vendor/vendor-app-icon-512x512.png` | `3e5ca03b8770093c3750343bd78793d23739ec6ad4fd36e8a8c7674b69483a0e` | `BrandLogo`-Vendor-Variante |
| `public/branding/asset-pack/favicon/favicon.svg` | `fc2aee485a9380b360fb0602a310ad2f89adca1890331a5e0b95826230b325dc` | primäres SVG-Favicon |
| `public/branding/asset-pack/favicon/favicon-32x32.png` | `8eaf665471ca229587580f60e7da6cd97336af41e18ae79d5367c45024c8f301` | 32×32-Favicon |
| `public/branding/asset-pack/favicon/favicon.ico` | `2eb6531635a010f10e4c22e424fff2dbe8734790e92c096b9e072b4f72030e09` | Shortcut-/ICO-Favicon |
| `public/branding/asset-pack/favicon/apple-touch-icon-180x180.png` | `4c2beef2752ec5695765a167b6e85203acb0c80c9a85dae8710ee2d1bdb08cda` | Apple Touch Icon |
| `public/branding/asset-pack/social/open-graph-1200x630.jpg` | `00609f30f3278edc553a79085b8bcf839747c8e1155407b4af9d3d2cf89fd4b4` | OpenGraph und X/Twitter Social Card |
| `public/branding/asset-pack/avatars/capital-ai-avatar-512x512.png` | `3e5ca03b8770093c3750343bd78793d23739ec6ad4fd36e8a8c7674b69483a0e` | Schema.org-Organisationslogo/Avatar |

Der Ursprung des Masterbilds bleibt so dokumentiert, wie er bereits belegt ist:
am 30.09.2026 vom Projektinhaber als in ChatGPT erzeugtes Logo bereitgestellt
und für CAPITAL-AI-Website-/ZITADEL-Nutzung autorisiert. Ein konkretes
ChatGPT-Modell und der damalige Tarif sind im Repository nicht belegt.

### 1.2 Hero-Erdbild

Aktive Bilddatei:

- `src/assets/images/glowing_earth_nodes_1789997454893.jpg`
- SHA-256: `aae548443cb6ec1be4c7d9f9389c52cc1e01b28df28fbc4e985750dd424bb671`
- Capital-AI-Bindung: `src/components/Hero.tsx`
- Finance-Bindung: `src/features/public/ui/frontend-port/components/Hero.tsx`
- Finance Source-Lock: Git-Blob
  `9bd051fcbbf1bf30d38a98795638c7cf80c84ac4`, Modus `EXACT_GIT_BLOB`

FRONTEND bindet das Erdbild ebenfalls in `src/components/Hero.tsx`.
Damit ist die Verwendung über drei Repository-Sichten nachvollziehbar; dies
belegt jedoch nicht den ursprünglichen Generierungslauf.

### 1.3 Fremde Marken / erkennbare Drittkennzeichen

`src/components/AssetLogo.tsx` enthält inline gezeichnete, teilweise klar
erkennbare Symbol-/Logo-Nachbildungen für Krypto-Projekte, Unternehmen und
Indizes. SHA-256:
`b2c1401e6c39116aa81c0d426d5403134fcb2b36b8729ab5e5fd976c01d7213f`.

Die Komponente ist unter anderem aus `MarketOverview.tsx`,
`AllMarketsModal.tsx`, `SubclassDetailModal.tsx`,
`PriceAlertsModal.tsx` und `PriceAlertToast.tsx` eingebunden.

Dieser Bestand ist **separat** von eigenem CAPITAL-AI-Branding und vom
Hero-Erdbild zu bewerten. Die vorhandene npm-/Source-Lizenz oder eine
systemgenerierte Projekturkunde erteilt keine Markenfreigabe. Zeichnungsherkunft,
Markenrichtlinien und zulässiger Verwendungsumfang je erkennbarem
Drittkennzeichen bleiben TRUST-seitig offen.

## 2. Validierung 2 — vorhandene Nachweise erhalten

Folgende vorhandene Nachweise wurden gelesen und inhaltlich erhalten:

- FRONTEND: `DESIGN_AND_IMAGE_LICENSE.md`
- FRONTEND: `DESIGN_AND_ASSET_LICENSE.md`
- Capital-AI: `public/branding/asset-pack/meta/ASSET-LICENSE-AND-PROVENANCE.txt`
- Capital-AI: `public/branding/asset-pack/meta/asset-manifest.json`
- Capital-AI: `docs/security/LICENSE-RIGHTS.md`
- Capital-AI: `docs/security/evidence/asset-mockup-history-review.json`
- ergänzend: `docs/security/evidence/license-rights-review.json` und
  `docs/licenses/Capital-AI-BRANDING.md`

Korrekturprinzip: bereits belegte Herkunft wird nicht erneut als „unbekannt“
markiert. Die beiden FRONTEND-Dokumente `DESIGN_AND_*.md` sind jedoch
system-/repositoryseitig erzeugte Urkunden. Ihre Aussagen wie „Produktiv
Freigegeben“, „royalty-free“ oder „frei von Rechten Dritter“ werden **nicht**
als Drittanbieter-Erlaubnis oder unabhängige TRUST-Freigabe gewertet.

## 3. Validierung 3 — Finance-/FRONTEND-Historie des Erdbilds

### 3.1 Frühester belegter Repository-Zustand

Das Erdbild wurde bereits im ersten FRONTEND-Commit
`7416cd383001cbc68aa580ae971773bb35ff6f03` am
**21.09.2026 13:56:09 UTC** zusammen mit der initialen Projektstruktur
eingecheckt.

Der Dateiname enthält den Wert `1789997454893`. Als Unix-Epoch in
Millisekunden entspricht dies:

- **UTC:** 21.09.2026 13:30:54.893
- **Europe/Berlin:** 21.09.2026 15:30:54.893 CEST

Das ist eine **aus dem Dateinamen abgeleitete Zeitangabe**, kein EXIF- oder
Provider-Run-Log. Sie begrenzt den wahrscheinlichen Erstellungs-/Speicherzeitpunkt,
beweist aber weder Generator noch Tarif.

### 3.2 Vorgegebene Finance-Ausgangspunkte

- `071cf5964f847cb00cdedc9861c009715b76b547`,
  21.09.2026 15:09:39 UTC:
  Import des gepinnten FRONTEND-Designs einschließlich Erdbild als
  byte-identisches Asset in den Finance-`frontend-port`.
- `b3c6d0989c3f18957441790d40b7f938741ee15c`,
  21.09.2026 21:47:01 UTC:
  spätere archivierte Upstream-Quellkopie unter
  `docs/frontend/upstream-source/SvenKulessa-FRONTEND/`.

Beide Commits belegen **Übernahme/Archivierung**, nicht die ursprüngliche
Generierung.

Das separate Mobile-Mockup
`public/brand/hero/capital-ai-mobile-landing.jpg`, eingeführt mit
`e23939293386cc58e743529838c575d46a0aa1ca`, bleibt ein separates Asset.
Der abweichende Git-Blob und die Owner-Provenienz aus PR #1195 reichen nicht
aus, es als Quelle des Erdbilds gleichzusetzen.

### 3.3 Social-Media-Engine versus Generierung

Der bereits vorhandene History-Review bleibt gültig:

- Finance enthält Pillow-/FFmpeg-Renderer, Offline-MediaProject-Vorlagen und
  Visualisierungswerkzeuge.
- In den geprüften Quellen wurde **kein** konkretes Render-/KI-Manifest mit
  Prompt, Provider-Run-ID sowie Input-/Output-Hash zum Erdbild gefunden.
- Die Owner-Aussage „created/used through Finance Social Media Engine in website
  mockup; embedded by Gemini“ bleibt erhalten.
- Installierte oder vorhandene Tools sind für sich allein kein Nachweis, dass
  genau dieses Bild damit generiert wurde.

### 3.4 Bildinterne C2PA-/SynthID-Evidence

Der byte-identische Hero-Git-Blob wurde zusätzlich auf eingebettete JPEG-
Metadaten geprüft. Im APP11/JUMBF-Bereich liegt ein C2PA-Manifest mit
Google-bezogenen Zertifikatsketten-Bezeichnern. Lesbar sind unter anderem:

- Claim Generator: `Google C2PA Core Generator Library`;
- Aktion `c2pa.created`: `Created by Google Generative AI.`;
- Digital Source Type: `trainedAlgorithmicMedia`;
- Aktion `c2pa.edited`: `Applied imperceptible SynthID watermark.`;
- Zertifikatsketten-Bezeichner `Google C2PA Media Services 1P ICA G3` und
  `Google C2PA Root CA G3`.

Damit ist die **Provider-Provenienz Google Generative AI direkt im Asset
eingebettet** und deutlich stärker als eine reine Tool-Inventur. In diesem
Review wurde die C2PA-Signatur/Trust-Chain jedoch nicht kryptografisch
validiert. Das Manifest nennt kein konkretes Bildmodell und keinen
Account-/Billing-Tarif.

## 4. Validierung 4 — Dienst, Tarif und damals geltende Bedingungen

### 4.1 Google AI Studio / Gemini — Hero-Erdbild

Der FRONTEND-Bestand korreliert stark mit einer Google-AI-Studio-Build-Umgebung:

- `.env.example` beschreibt AI-Studio-Runtime-Injection;
- `vite.config.ts` enthält AI-Studio-spezifische Runtime-/HMR-Behandlung;
- `metadata.json` führt `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`;
- `src/services/geminiAdvisorBackend.ts` verwendet `@google/genai` und
  den User-Agent `aistudio-build`.

Zusammen mit der Owner-Aussage belegt dies **Gemini/AI Studio als
Projekt-/Einbettungsumgebung**. Zusätzlich nennt das im JPEG eingebettete
C2PA-Manifest **Google Generative AI** als Erzeugungsquelle und dokumentiert
eine nachgelagerte SynthID-Markierung. Damit ist der Provider wesentlich
stärker gebunden als zuvor.

Weiterhin offen bleiben jedoch die konkrete Google-Produktoberfläche des
Bildlaufs, das ausgeführte Bildgenerierungsmodell/der Endpoint, ein separat
archivierter Prompt-/Run-Datensatz und der tatsächliche Account-/Billing-Tarif
zum Erstellungszeitpunkt. Die eingebettete C2PA-Signatur wurde in diesem
Review nicht kryptografisch validiert.

Für den 21.09.2026 ist als gefundene offizielle Fassung zugeordnet:

- Google, **Gemini API Additional Terms of Service**
- wirksam ab **23.03.2026**, Seite zuletzt aktualisiert **28.04.2026**
- <https://ai.google.dev/gemini-api/terms>

Relevante Zuordnung:

- Google AI Studio/Gemini API sind für professionelle bzw. geschäftliche
  Nutzung vorgesehen.
- Google beansprucht kein Eigentum an generiertem Originalinhalt.
- Der Nutzer bleibt für die Nutzung und Weitergabe generierten Inhalts
  verantwortlich.
- Anwendbares Recht kann Attribution verlangen, insbesondere bei als Teil
  eines API-Aufrufs zurückgegebenem Inhalt.
- Für API-Clients, die Nutzern im EWR/Schweiz/UK bereitgestellt werden, nennen
  die Bedingungen eine Paid-Services-Anforderung.

**Grenze:** Diese Terms-Fassung beschreibt Rechte/Pflichten des Dienstes. Sie
beweist nicht, dass genau dieser Dienst/dieses Bildmodell den JPEG-Output
erzeugt hat, und sie ist keine Freistellung für fremde Urheber-/Markenrechte.

### 4.2 OpenAI / ChatGPT — aktuelles CAPITAL-AI-Logo

Das bereits vorhandene
`docs/licenses/Capital-AI-BRANDING.md` ordnet dem am 30.09.2026
bereitgestellten ChatGPT-Logo die OpenAI Europe Terms of Use zu:

- **Updated 16.01.2026**
- <https://openai.com/policies/eu-terms-of-use/>

Danach liegen zwischen Nutzer und OpenAI die Outputrechte – soweit rechtlich
zulässig – beim Nutzer; Output kann nicht einzigartig sein und der Nutzer ist
für Rechtmäßigkeit und Prüfung vor Nutzung/Weitergabe verantwortlich. Das
belegt keine Schutzfähigkeit und keine Freigabe kollidierender Drittmarken.

Ein konkretes ChatGPT-Modell und der verwendete Free-/Go-/Plus-/Pro-/Business-
oder sonstige Tarif sind aus den Repository-Belegen **nicht** bestimmbar und
werden nicht erfunden.

### 4.3 Historische drei `capital_ai_`-JPEGs

Die drei historischen Dateien sind in CAPITAL-AI aus dem aktuellen Tree
entfernt. FRONTEND hält sie weiterhin als Dateien; in der aktuellen
Komponentensuche wurde kein Bildimport dieser drei Dateien gefunden. Finance
hält exakte Source-Lock-/Snapshot-Kopien, ohne dass daraus ein aktueller
Runtime-Render folgt.

Die Owner-Aussage nennt eine fortlaufende Bearbeitung mit Microsoft Copilot,
Leonardo AI, ChatGPT und Gemini. Da Reihenfolge, einzelne Bearbeitungsschritte,
Modelle und Tarife nicht rekonstruiert sind, wird **keine** einzelne
Provider-Terms-Fassung pauschal als Rechtegrundlage für diese drei Dateien
behauptet.

## 5. Evidence-Tabelle

| Asset | Hash | Erstellung / Commit | Dienst / Tarif | Bedingungen / Version | erlaubte Nutzung aus belegter Quelle | Restlücke | Status |
|---|---|---|---|---|---|---|---|
| `public/branding/capital-ai-logo.jpg` | `62446290…43e3` | Owner-Bereitstellung 30.09.2026 | ChatGPT; Modell/Tarif offen | OpenAI Europe Terms, 16.01.2026 | Outputrechte zwischen Nutzer/OpenAI beim Nutzer; Projektverwendung owner-autorisiert | Modell/Tarif; Drittmarken-/Schutzfähigkeitsprüfung | **PARTIAL / PROJECT_USE_AUTHORIZED** |
| `asset-pack/vendor/vendor-app-icon-512x512.png` | `3e5ca03b…3a0e` | deterministisch aus Logo | lokales Pillow; kein externer Tarif | Rechtebasis des Quelllogos | CAPITAL-AI-Projektbranding gemäß Quellautorisierung | keine allgemeine Drittlizenz; Manifest `publishReady:false` | **SOURCE_BOUND** |
| `asset-pack/favicon/favicon.svg` | `fc2aee48…325dc` | deterministisch aus Logo | lokales Pillow/Wrapper | Rechtebasis des Quelllogos | Favicon im Projekt | wie Quelllogo | **SOURCE_BOUND** |
| `asset-pack/favicon/favicon-32x32.png` | `8eaf6654…8f301` | deterministisch aus Logo | lokales Pillow | Rechtebasis des Quelllogos | Favicon im Projekt | wie Quelllogo | **SOURCE_BOUND** |
| `asset-pack/favicon/favicon.ico` | `2eb65316…0e09` | deterministisch aus Logo | lokales Pillow | Rechtebasis des Quelllogos | Favicon im Projekt | wie Quelllogo | **SOURCE_BOUND** |
| `asset-pack/favicon/apple-touch-icon-180x180.png` | `4c2beef2…08cda` | deterministisch aus Logo | lokales Pillow | Rechtebasis des Quelllogos | Touch-Icon im Projekt | wie Quelllogo | **SOURCE_BOUND** |
| `asset-pack/social/open-graph-1200x630.jpg` | `00609f30…d4b4` | deterministisch aus Logo | lokales Pillow | Rechtebasis des Quelllogos | OG-/X-Preview im Projekt | wie Quelllogo; Publish-Gate bleibt separat | **SOURCE_BOUND** |
| `asset-pack/avatars/capital-ai-avatar-512x512.png` | `3e5ca03b…3a0e` | deterministisch aus Logo | lokales Pillow | Rechtebasis des Quelllogos | Schema.org-/Avatar-Nutzung im Projekt | wie Quelllogo | **SOURCE_BOUND** |
| `glowing_earth_nodes_1789997454893.jpg` | `aae54844…bb671` | Dateiname → 21.09.2026 15:30:54.893 CEST; erster FRONTEND-Commit `7416cd3…`; Finance Import `071cf59…`; eingebettetes C2PA | **Google Generative AI laut C2PA**; AI-Studio-Umgebung korreliert; Gemini-Einbettung laut Owner; Modell/konkrete Oberfläche/Tarif offen | Google Gemini Additional Terms, wirksam 23.03.2026 / Update 28.04.2026, soweit die AI-Studio/Gemini-Dienstbindung zutrifft | geschäftliche Nutzung des Dienstes vorgesehen; Google beansprucht kein Eigentum; Weitergabe in Nutzerverantwortung | C2PA-Signaturvalidierung, konkretes Bildmodell/Endpoint, separater Prompt/Run, Tarif | **PARTIAL / STRONG_PROVIDER_PROVENANCE** |
| `src/components/AssetLogo.tsx` | `b2c1401e…7213f` | aktueller Capital-AI-Bestand | Code/Inline-SVG; N/A | keine pauschale Markenlizenz | generische Ticker-/Fallbackdarstellung ist technisch implementiert | Herkunft/Markenrichtlinie je erkennbarem Fremdlogo | **TRUST_REVIEW_OPEN** |
| historisch `capital_ai_brand_emblem_1789997857835.jpg` | `7aa20801…97bf` | Dateiname → 21.09.2026 15:37:37.835 CEST; erster FRONTEND-Commit `7416cd3…` | Owner: Copilot/Leonardo/ChatGPT/Gemini; Reihenfolge/Modelle/Tarife offen | nicht eindeutig einem Providerlauf zuordenbar | keine neue Freigabe aus diesem Review | vollständige Edit-Chain und Terms je Schritt | **HISTORICAL / NOT CAPITAL-AI RUNTIME** |
| historisch `capital_ai_full_logo_1789997869885.jpg` | `06b9d534…35bf7` | Dateiname → 21.09.2026 15:37:49.885 CEST; erster FRONTEND-Commit `7416cd3…` | wie vor | nicht eindeutig zuordenbar | keine neue Freigabe | vollständige Edit-Chain und Terms je Schritt | **HISTORICAL / NOT CAPITAL-AI RUNTIME** |
| historisch `capital_ai_wide_banner_1789999064950.jpg` | `a243e50e…a6c7` | Dateiname → 21.09.2026 15:57:44.950 CEST; FRONTEND `03e05fc…` | wie vor | nicht eindeutig zuordenbar | keine neue Freigabe | vollständige Edit-Chain und Terms je Schritt | **HISTORICAL / NOT CAPITAL-AI RUNTIME** |

## TRUST-Handoff — Rechtebewertung

TRUST kann auf folgenden bestätigten Punkten aufbauen:

1. Das aktuelle CAPITAL-AI-Logo und seine technischen Derivate besitzen eine
   eindeutige first-party Source-/Hash-Kette.
2. Das Erdbild besitzt eine eindeutige aktuelle Runtime-Bindung und eine
   nachvollziehbare Copy-History bis zum ersten FRONTEND-Commit.
3. Das Hero-JPEG enthält eingebettete C2PA-Evidence für **Google Generative
   AI** und SynthID; die Google-AI-Studio-Umgebung ist repositoryseitig
   korreliert. C2PA-Signaturvalidierung, konkretes Bildmodell und Tarif sind
   **nicht** abgeschlossen.
4. Die systemgenerierten `DESIGN_AND_*.md`-Urkunden sind keine
   Drittanbieter-Erlaubnisse.
5. Die Inline-Fremdmarken in `AssetLogo.tsx` benötigen eine eigenständige
   Marken-/Logo-Prüfung; sie werden nicht durch die CAPITAL-AI-Brandingrechte
   abgedeckt.

**TRUST-Restlücken:** kryptografische C2PA-Validierung sowie Modell/Endpoint/Tarif und separater Provider-Run für das Hero-Bild; konkrete
Markenrichtlinien/Zeichnungsherkunft je erkennbarem Fremdkennzeichen;
gegebenenfalls rechtliche Bewertung der Schutzfähigkeit und Kollisionen. Diese
Prüfung setzt **kein** Gate automatisch auf APPROVED.

## PLATFORM-Handoff — Source-/Asset-Bindung

PLATFORM erhält folgende technische Bindung:

- Capital-AI Main: `16b9ced4950317bee3efe6bf8d5154d1551e7cc9`
- FRONTEND Main: `9c2e2255a0fca5fe113b7ddf56906889f8ef1186`
- Finance Main: `dcef421fe6e350a3a2ade61d0299aad9ecca213c`
- Logo-Source: `public/branding/capital-ai-logo.jpg` →
  SHA-256 `6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3`
- Hero-Source: `src/assets/images/glowing_earth_nodes_1789997454893.jpg` →
  SHA-256 `aae548443cb6ec1be4c7d9f9389c52cc1e01b28df28fbc4e985750dd424bb671`
- Finance-Hero-Git-Blob:
  `9bd051fcbbf1bf30d38a98795638c7cf80c84ac4`
- Finance Source-Lock: `src/features/public/ui/frontend-port/source-lock.json`,
  Source `SvenKulessa/FRONTEND@cbc558019ae6785f44079fe6fca3403460774df3`
- Erstimport Finance: `071cf5964f847cb00cdedc9861c009715b76b547`
- Archivkopie Finance: `b3c6d0989c3f18957441790d40b7f938741ee15c`

Diese Bindung eignet sich für spätere Hash-/Drift-Prüfung. Sie ist keine
Rechtefreigabe.

## Self-Healing-Grenze

Es wird **keine dauerhafte Self-Healing-Regel** mit diesem PR verankert.
Insbesondere fehlen für das Erdbild drei unabhängige positive Validierungen von
Generator/Modell/Tarif und für die Fremdmarken drei unabhängige positive
Rechtevalidierungen.

Als nicht-aktivierter Kandidat kann später nach Erreichen dieser Schwelle
verwendet werden:

`DETECT asset hash/path drift → CORRELATE source-lock + provenance manifest → CLASSIFY first-party/AI/third-party mark → REMEDIATE documentation only when evidence is stronger → VERIFY three independent positive validations`.

Jede autonome Regel muss fail-closed bleiben und darf weder Assets ersetzen
noch Provider buchen, veröffentlichen, deployen, DNS ändern oder Production-
Gates auf APPROVED setzen.

## Ergebnis der fünf Validierungsschritte

1. **Current Main / ausgelieferte Bindung:** bestanden, Rechtefragen separat offen.
2. **Bestehende Evidence:** bestanden; vorhandene Herkunft erhalten.
3. **History / Mockup-Korrelation:** Import-/Archivpfad bewiesen; Generierungslauf nur teilweise rekonstruierbar.
4. **Dienst / Tarif / Bedingungen:** eingebettetes C2PA bindet Google Generative AI; offizielle Terms zugeordnet; C2PA-Signaturvalidierung, exaktes Modell/Endpoint und Tarif bleiben offen.
5. **Evidence / Handoff:** erstellt; TRUST und PLATFORM getrennt adressiert, ohne Release-/Deploy-Mutation.

