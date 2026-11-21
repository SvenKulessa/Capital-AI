# Learning Universe SVG · MediaKit v5 und Catalogue Center

Stand: 2026-11-21. Domain: PRODUCT, GROWTH, TRUST/QUALITY. Nur Root-AGENTS.md autorisiert.

## Umsetzung
- PR #885: zehn eigens erstellte SVG-Motive aus `src/features/learning/LearningUniverseTabScene.tsx` (Git-Blob `e87276f8cd937ceaa3891f2702c2731d6f6ccd2d`).
- Statische 420×260-SVGs unter `public/branding/learning-universe/{tab}.svg` ohne externe Medien/Fonts/Skripte. Verwendet die sieben vorhandenen Universe-Farbfamilien; SVG-Pfade vom Originalmodul abgeleitet.
- Kanonischer Asset-Katalog mit exakten Hashes: `src/platform/SocialMediaEngine/Branding/learningUniverseAssetRegistry.mjs`.
- Der vorhandene `NewsDesignCatalog` zeigt nur die dort als `OWNER_DIRECTED_FIRST_PARTY` vermerkten Vorschauen. Es gibt **keinen** neuen Checkout, Preis, Entitlement oder externen Asset-Endpunkt.
- Die vorhandene Funktion `importMediaKitV5Draft` übernimmt das komplette zehnteilige Set ausschließlich als `DRAFT_ONLY`/offline, mit deaktivierten Preview-Layern, `REVIEW_REQUIRED`, `sourceRights=NOT_PROVEN`, `mediaRights=NOT_PROVEN`, `approvals=[]` und `deliveries=[]`.

## Rechte und Scope

| Thema | Evidence | Status |
| --- | --- | --- |
| Nutzung als CAPITAL-AI-Vorschaudesign | direkter Owner-Auftrag und eigener Projektquellcode | OWNER_DIRECTED_FIRST_PARTY |
| Identität aller zehn SVG-Dateien | SHA-256-Registry und tatsächliche Bytes im Repository; Test in bestehender CI | im CI zu verifizieren |
| Fremde Bitmap-/Stock-Assets und aktive SVG-Inhalte | reine lokale SVG-Geometrie, keine Fremd-Links oder Skripte | Quellcodeprüfung |
| Urheberrechtliche Exklusivität und separate Drittanbieter-Verkaufsrechte | nicht vorgelegt; KI-generierte Ausgabe ist nicht per se exklusives Schutzrecht | NOT_PROVEN |
| MediaKit-Render-/Publishing-Grants | unabhängig zu prüfende Quellen-, Grafik- und Kanalrechte | BLOCKED / REVIEW_REQUIRED |

Der Owner-Auftrag erlaubt ein first-party Designbeispiel **innerhalb von CAPITAL-AI**. Er erteilt weder Endkunden eine zusätzliche Bildlizenz noch eine Freigabe für Drittverkauf oder Social Publishing. Softwareabhängigkeiten/Fonts sind separat zu lizenzieren. Diese technische Evidence ist keine juristische Bestätigung.

## Separates Chat-WebP-Exportpaket

Das lokale Archiv `CAPITAL-AI-Learning-Hub-7-Originalgrafiken.zip` enthält sieben WebP-Bilder mit `PROVENANCE.json`. Im bereitgestellten lokalen Archiv waren SHA-256 und Bytegrößen für alle sieben Bilder konsistent. **Kein WebP wird hier in die kanonische Registry importiert:** Die binären Dateien liegen nicht im GitHub-Repository, ihr Quellimage-Digest und exklusive Vertriebsrechte sind nicht unabhängig verifiziert. Der Export wird nicht als bestehende kommerzielle v5-Asset-Autorität dargestellt.

## Tests / Negative Cases

```bash
npm run test:social-core
npm run test:learning-overview
npm run lint
npm run build
```

Neue Tests prüfen Asset-Digests gegen echte Repo-Bytes, eindeutige Identitäten, erlaubte Akzentfarben, SVG-Inertheit, Katalogprojektion, gefälschte Lizenzen/Publikationsflaggen und den bestehenden MediaKit-v5-Review-Deny. Bestehende Docker Security Gate, Domain Governance, CodeQL und Browser-QA bleiben maßgeblich. Kein Test allein beweist Live-Deployment oder Drittrechte.

Rollback: vollständiger Revert dieser PR-Dateien; keine Server-, Datenbank-, OAuth-, Billing- oder Provideränderung.
