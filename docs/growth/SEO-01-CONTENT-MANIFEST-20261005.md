# SEO-01 — Content-Manifest, Provenance und /.well-known

Stand: 2026-10-05  
Primary Domain: CAPITAL-AI-GROWTH  
Baseline: `SvenKulessa/Capital-AI@c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84`  
Status: `REPO_IMPLEMENTED / VALIDATION_PENDING`

## Ziel

SEO-01 führt eine kanonische, maschinenlesbare Content-Quelle für alle aktuell indexierbaren Inhalte ein. Die Indexing-Entscheidung bleibt in `shared/seo-indexing-policy.mjs`; das Content-Manifest beschreibt ausschließlich Inhalte, die dort bereits als `INDEX` zugelassen sind.

## Manifest

Kanonische Quelle:

`shared/seo-content-manifest.mjs`

Aktueller Umfang:

- 11 statische INDEX-Routen
- 294 öffentliche Vocabulary-Terme
- insgesamt 305 Manifest-Einträge

Jeder Eintrag enthält:

- `path`
- `slug`
- `title`
- `description`
- `canonical`
- `contentType`
- `domain`
- `language`
- `author`
- `updatedAt`
- `sourceSha`
- `license`
- `robots`
- `structuredDataType`
- `searchEligible`
- `socialEligible`
- `aiSearchEligible`
- `sourceRefs`

`sourceSha` ist für diesen Slice an den gelesenen Main-Stand `c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84` gebunden. Die spätere Build-/Release-Provenance darf diesen Content-Snapshot ergänzen, aber nicht still überschreiben.

## Validierungsregeln

`scripts/seo-content-manifest.test.mjs` und `validateSeoContentManifest()` prüfen:

- vollständige 1:1-Abdeckung aller INDEX-Routen;
- keine NOINDEX/PRIVATE/BLOCKED-Route im Manifest;
- eindeutige Slugs;
- eindeutige Canonicals;
- eindeutige Titles;
- gültige 40-stellige Source-SHA;
- zulässige Domain-Kennung;
- explizite Search-/Social-/AI-Eligibility;
- vorhandene Source-Referenzen;
- kein pauschales `FinancialService`-Schema.

Der Content-Lizenzmarker ist aktuell bewusst `PROPRIETARY`. Er behauptet keine Open-Source-Freigabe und ersetzt keine route-/asset-spezifische Rechteprüfung.

## /.well-known

CAPITAL-AI exponiert nur explizit zugelassene Well-Known-Ressourcen:

- `/.well-known/mta-sts.txt` — bereits vorhandene MTA-STS-Policy
- `/.well-known/security.txt` — Vulnerability-Disclosure-Kontakt nach RFC 9116

`security.txt` enthält:

- `Contact: mailto:support@capital-ai.online`
- ein befristetes `Expires`
- `Preferred-Languages: de, en`
- die kanonische HTTPS-URL

Andere Pfade unter `/.well-known/*` werden nicht automatisch freigegeben. Insbesondere werden derzeit kein `assetlinks.json` und keine Apple-App-Site-Association veröffentlicht, weil keine verifizierte App-Link-/Signing-Fingerprint-Bindung vorliegt.

Die Well-Known-Ressourcen sind operativ öffentlich, aber `NOINDEX`.

## Abgrenzung zu SEO-02

SEO-01 erzeugt den Contract und die Provenance. Der Server verwendet das Manifest noch nicht als zentrale Quelle für alle HTML-Metadaten.

SEO-02 übernimmt anschließend:

- Title/Description aus dem Manifest;
- Canonical;
- OpenGraph;
- Twitter/X;
- robots;
- strukturierte Daten;
- einheitliche serverseitige Injection.

Damit wird die bestehende getrennte Vocabulary-/Research-Metadata-Logik schrittweise in einen zentralen Generator überführt.

## Tests

```sh
npm run test:seo
```

Der Docker-Build führt zusätzlich die isolierten Well-Known- und Manifest-Tests offline aus.

## Exit-Kriterien

SEO-01 ist repositoryseitig umgesetzt, wenn:

1. jedes INDEX-Dokument genau einen Manifest-Eintrag besitzt;
2. Slug, Canonical und Title eindeutig sind;
3. Provenance und Lizenzmarker explizit sind;
4. Search/Social/AI-Eligibility explizit sind;
5. `/.well-known/security.txt` exakt und fail-closed ausgeliefert wird;
6. ein realer Test-/CI-Lauf grün ist.

Bis Punkt 6 vorliegt bleibt der Status `VALIDATION_PENDING`.
