# SEO-02 — Metadata-as-Code, Structured Data und Well-Known Account Discovery

Stand: 2026-10-05  
Primary Domain: CAPITAL-AI-GROWTH  
Baseline: `SvenKulessa/Capital-AI@9c5fc40318cf538308724c2efb18441185e8cbae`  
Branch: `capital-ai-growth/seo-02-metadata-20261005`  
Status: `REPO_IMPLEMENTED / VALIDATION_PENDING`

## Ziel

SEO-02 macht das in SEO-01 eingeführte Content-Manifest zur kanonischen Quelle für öffentliche HTML-Metadaten und strukturierte Daten.

Der Flow lautet:

```text
SEO_CONTENT_MANIFEST
→ seoMetadataForPath()
→ Server HTML Injection
→ Title / Description / Canonical / robots
→ OpenGraph / Twitter-X
→ JSON-LD
```

## Kanonische Projection

`shared/seo-metadata.mjs` erzeugt pro zugelassenem INDEX-Pfad:

- Title
- Description
- Canonical
- robots
- Sprache
- OpenGraph Type / Site / Locale / Image
- Twitter/X Card / Site / Image
- genau einen JSON-LD-Graph.

Schema-Graph:

```text
WebSite
+ Project
+ Primary Entity
```

Die Primary Entity ist abhängig vom Content-Manifest:

- `WebApplication`
- `WebPage`
- `DefinedTermSet`
- `DefinedTerm`

`FinancialService` wird nicht pauschal verwendet. Ein synthetischer `Offer price=0`-Claim wurde aus dem statischen Basis-JSON-LD entfernt.

## NOINDEX / PRIVATE / BLOCKED

Für nicht indexierbare HTML-Routen setzt der Server weiterhin `noindex, nofollow`.

SEO-02 entfernt dort zusätzlich:

- `rel=canonical`
- `og:url`
- JSON-LD

Damit tragen private oder ungeklärte SPA-Zustände nicht länger versehentlich die Homepage-Canonical oder Homepage-Schema-Claims.

Der CURRENT_MAIN-Abgleich nach PR #182 ergab zwei neue Konto-Routen. Sie sind nun explizit klassifiziert:

- `/profile/security` → `PRIVATE`
- `/profile/key-vault` → `PRIVATE`

## /.well-known

Bereits auf Main vorhanden:

- `/.well-known/mta-sts.txt`
- `/.well-known/security.txt`

SEO-02 ergänzt:

- `/.well-known/change-password`

Der Endpoint liefert für GET/HEAD einen temporären HTTP-302-Redirect auf `/profile/security`. Er hostet dort selbst keine Passwortseite und bleibt `NOINDEX`.

Nicht freigegeben bleiben insbesondere:

- `/.well-known/assetlinks.json`
- `/.well-known/apple-app-site-association`

weil weiterhin keine verifizierte Signing-Fingerprint-/Universal-Link-Bindung vorliegt.

## Tests

`npm run test:seo` umfasst jetzt zusätzlich `scripts/seo-metadata.test.mjs`.

Geprüft werden:

- vollständige Metadata-Projection für alle Manifest-Einträge;
- Canonical-/Title-/Description-Parität;
- claimsafe JSON-LD-Graphs;
- kein `FinancialService`;
- keine synthetischen `offers`;
- Vocabulary-`DefinedTerm` inklusive Thesaurus;
- keine SEO-Metadata für nicht zugelassene Routen;
- reales Server-Rendering der FAQ-Metadata;
- Entfernen von Canonical/JSON-LD auf NOINDEX-Routen;
- `/.well-known/change-password` Redirect- und Methodenvertrag.

Der Docker-Build kopiert und startet den neuen Metadata-Test mit `--network=none`.

## Render / DOMException

Die Render-Warnung `node-domexception@1.0.0` ist separat in
`docs/security/BUILD-DOMEXCEPTION-REVIEW-20261005.md` bewertet.

Sie ist kein SEO-02-Blocker: der letzte geprüfte Render-Build war erfolgreich. Ein unsicherer Major-Override wird nicht eingeführt.

## Exit-Kriterien

SEO-02 gilt erst als validiert, wenn:

1. `npm run test:seo` real grün läuft;
2. Docker Security Gate für den Branch/PR grün ist;
3. keine neue Metadata-/Schema-Regression entsteht;
4. Required Checks terminal erfolgreich sind.

Production-Deploy und Search-Engine-Readback sind separate Grenzen.
