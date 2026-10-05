# CAPITAL-AI Roadmap-Domain-Badges — Lizenz & Provenienz

**Stand:** 2026-10-04  
**Ziel-Repository:** `SvenKulessa/Capital-AI`  
**Ausgangsbaseline:** `main@984a374910a8065ef6580c90441e0b63e8fecbd8`  
**Finance-Referenz:** `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`

## Zweck

Die fünf primären CAPITAL-AI-Domains erhalten je ein eigenes, skalierbares Branding-Badge direkt im jeweiligen Domain-Ordner. Die Roadmap verwendet diese Assets als sichtbare Domain-Labels auf Desktop und Mobile.

## Social-Media-Engine-Korrelation

Die Gestaltung und Einbindung ist gegen die aktuelle Finance-SocialMediaEngine-Baseline korreliert. Relevante Flächen:

- `src/platform/SocialMediaEngine/Contracts/MediaProject.ts`
- `src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts`
- `src/platform/SocialMediaEngine/Visualization/PlanningVisual.ts`
- `src/platform/SocialMediaEngine/Visualization/D3PlanningVisualAdapter.ts`
- `docs/frontend/design-tokens.json`

Die Finance-Engine fordert für Brand-/Planning-Visuals deterministische Brand-Token-Herkunft, Offline-/lokale Renderbarkeit und getrennte Publishing-Authority. Die neuen SVGs folgen diesem Modell: keine Netzwerkabhängigkeit, keine extern eingebetteten Assets, keine Publishing-Authority.

## Assets

| Domain | Asset | SHA-256 | Lizenzdatei |
| --- | --- | --- | --- |
| PRODUCT | `CAPITAL-AI-PRODUCT/badge.svg` | `fc343ec0fc91d6da1e335be7d72bbaeea988f6dead418dbb5ea03105d47432ce` | `CAPITAL-AI-PRODUCT/produkt.LICENSE.md` |
| TRUST | `CAPITAL-AI-TRUST/badge.svg` | `2b037fd897c592931c94fcee8781af398d2ac6564e3575d4cf3ee62c770e7dad` | `CAPITAL-AI-TRUST/trust.LICENSE.md` |
| MARKET | `CAPITAL-AI-MARKET/badge.svg` | `22655ab6a7f19e5d100832dd39126ea661f41abe5609dca6db58b00fd1462c13` | `CAPITAL-AI-MARKET/market.LICENSE.md` |
| GROWTH | `CAPITAL-AI-GROWTH/badge.svg` | `9020b03cb8cc8c82c715d566c0065b8725647c06f0340615c825b221a563c76f` | `CAPITAL-AI-GROWTH/growth.LICENSE.md` |
| PLATFORM | `CAPITAL-AI-PLATFORM/badge.svg` | `2e4807c864195781f314452f4aa5f285e0feb71c408f467d3610a20d5b7292f0` | `CAPITAL-AI-PLATFORM/plattform.LICENSE.md` |

## Rechteklassifizierung

Die SVGs sind owner-directed, AI-assisted und als neue, generische Vektorgrafiken für CAPITAL-AI erstellt. Es wurden keine Drittanbieter-Icondateien, Stockgrafiken, Rasterbilder, Markenlogos oder Fontdateien eingebettet. Die im SVG genannten Fontfamilien sind reine Rendering-Fallbacks und verteilen keine Fontsoftware.

Die Asset-Lizenz folgt der jeweiligen Domain-Lizenzdatei und der Repository-Lizenz. Die Badges dürfen nicht als Beleg einer externen Partnerschaft, Zertifizierung oder Markenfreigabe interpretiert werden.

## Verifikation und Freigabe-Evidence

- Domain-Identität und Pfad müssen mit den fünf kanonischen Roadmap-Domains übereinstimmen.
- SHA-256 bindet das ausgelieferte SVG an dieses Manifest.
- Roadmap-Integration verwendet ausschließlich registrierte Assets.
- Brand-/Provenienz- und Lizenz-/Fremdmaterial-Evidence bleibt erforderlich.
- UI-/Accessibility-Evidence muss das zusätzliche Text-Label belegen.
- Build-, TypeScript-, Navigation- und Roadmap-Tests werden als konkrete PR-Evidence ausgewertet.
- Ein Asset- oder Test-PASS autorisiert keinen Merge und ersetzt keine sonstigen technischen Gates.

