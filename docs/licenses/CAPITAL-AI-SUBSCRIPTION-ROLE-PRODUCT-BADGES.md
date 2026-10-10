# CAPITAL-AI quadratische Account-, Abonnement- und Produkt-Badges

**Stand:** 2026-10-05  
**Ziel-Repository:** `SvenKulessa/Capital-AI`  
**Baseline:** `main@f1abdd932036aefd4c1c139534bd31ddcebb8a31`  
**Finance-Referenz:** `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`  
**Rechteinhaber:** **Sven Michael Kulessa**  
**Lizenz:** `LicenseRef-CAPITAL-AI-PROPRIETARY-BADGE-1.0`

## Format

Die Badges werden als **kleine quadratische SVG-Vektorgrafiken** gespeichert:

- feste Präsentationsgröße: **256 × 256 px**
- `viewBox="0 0 256 256"`
- abgerundete dunkle Roadmap-Kachel
- zentrales leuchtendes Vektor-Symbol
- Textlabel im unteren Bereich
- keine externen Rasterbilder oder Netzressourcen
- skalierbar ohne Qualitätsverlust

## Assets

| Badge | Datei | SHA-256 |
| --- | --- | --- |
| STARTER | `public/branding/badges/starter.svg` | `9d6752801145b198e2d699a45041383291b90387b07fd74643f23112b5fa922e` |
| PRO | `public/branding/badges/pro.svg` | `78aa98c4f59f4e2d4c6082a72f5add37191bf61dc0cfce5b75dcb30fe8489447` |
| ENTERPRISE | `public/branding/badges/enterprise.svg` | `44b298177852d190f91e3fa464ca21764b7aef550a6db5a361294c246436c9f6` |
| VOCABULARY | `public/branding/badges/vocabulary.svg` | `853f090eebba6ca849e53a0d6260eada68c8081f562463a3d890ecd0b097dc33` |
| LEARNING MASTERMIND | `public/branding/badges/learning-mastermind.svg` | `505f577e208be3d0660561166f7dbe98a4d7834c91d3f2a6b849cd4e77a58323` |
| FREE USER | `public/branding/badges/free-user.svg` | `e3412aac88c73cf685be9417c5e2d38c2dd76ea85e650c2f2f50276762ba9fc5` |
| VAULT | `public/branding/badges/vault.svg` | `7393a44552d7c1091ce21f1fcaca150a36277447242f641bc90f1851dd2d1d49` |
| OWNER | `public/branding/badges/owner.svg` | `57ffcee1bbc9d968c2025ab4f10fd7ccc79c63cb622030aa6afaea57ecc1dcb3` |
| DATA PIPELINE BLUEPRINT | `public/branding/badges/data-pipeline-blueprint.svg` | `eef4c155f023930a7b729077e9eec98444a7ad4e819e33c51db1468940d2181d` |

## SocialMediaEngine-Korrelation

Die Visualisierung folgt den technischen Invarianten der Finance SocialMediaEngine auf `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`: deterministische Brand-Token-Herkunft, lokale/offline renderbare Assets, keine externe Publishing-Authority und hashgebundene Provenienz. Es wird kein Finance-Runtime-Code kopiert.

## Risikobasierte Freigabe-Gates

- **Asset Identity / Provenance:** SHA-256 je SVG im Manifest.
- **License / Third-party material:** proprietäre CAPITAL-AI-Lizenz; keine eingebetteten Drittassets.
- **Accessibility:** `title`, `desc` und sichtbares Label je SVG.
- **Build / CI:** Required Checks des PR müssen terminal PASS sein.
- **Merge:** bleibt eine separate Owner-Entscheidung.


## Data Pipeline Blueprint Badge

Der zusätzliche Blueprint-Badge folgt dem cyanfarbenen Studio-Hub-Kontext. Seine Provenienz und künftige Käuferlizenz sind separat in `docs/licenses/CAPITAL-AI-DATA-PIPELINE-BLUEPRINT-BADGE.md` dokumentiert. Die Finance SocialMediaEngine wurde nur als deterministische Prozessreferenz verwendet; kein Finance-Bildasset oder Runtime-Code wurde übernommen.

## Learning Mastermind Badge (2026-10-10)

Produktbezogenes, eigenständig gestaltetes 256×256-SVG. Der Profil-Badge erscheint nur nach positivem, serverseitig geprüftem Learning-Portal-Zugriff und verleiht keine extern akkreditierte Qualifikation. Keine externen Medien, Netzwerkladepfade oder fremden Marken im SVG. Der Asset-Hash ist im Manifest gebunden. Die Finance SocialMediaEngine dient als Gestaltungs-/Provenienz-Referenz, ohne eine autonome Veröffentlichung auszulösen.
