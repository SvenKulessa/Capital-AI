> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**
> Diese Datei bleibt als historische oder fachliche Dokumentation erhalten. Sie erzeugt keine zusätzlichen Repository-Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Autoritativ ist ausschließlich `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`. Konkrete gesetzliche, regulatorische, Security- oder Provider-/Lizenzpflichten bleiben davon unberührt.

# SEO-00 — Route-/Content-Inventar und Indexing-Policy

Stand: 2026-10-05
Primary Domain: CAPITAL-AI-GROWTH
Baseline: `SvenKulessa/Capital-AI@c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84`
Policy-Quelle: `shared/seo-indexing-policy.mjs`

## Ziel

SEO-00 legt für jede bekannte kanonische Webroute eine explizite Search-Klassifikation fest und verhindert, dass neue oder ungeklärte SPA-Pfade durch den globalen `index, follow`-Fallback unbeabsichtigt indexierbar werden.

Zulässige Zustände:

- `INDEX` — darf in Sitemap/Search erscheinen.
- `NOINDEX` — öffentlich erreichbar, aber aktuell keine Search-Landingpage.
- `PRIVATE` — Konto-, Management- oder API-Inhalt; Search ausgeschlossen. Diese Kennzeichnung ersetzt keine Auth-/Autorisierungskontrolle.
- `ARCHIVE` — historischer öffentlicher Inhalt; aktuell nicht belegt verwendet.
- `BLOCKED` — Search-Promotion ist wegen ungeklärter Claims, Rechte, Semantik oder fehlender Inventarisierung fail-closed gesperrt.

## Aktuelle INDEX-Allowlist

| Route | Typ | Begründung |
|---|---|---|
| `/` | Landing | kanonischer Marken-/Produkteinstieg |
| `/learning` | Learning | öffentlicher Lernbereich mit crawlbarem Fallback |
| `/vocabulary` | Vocabulary | kanonische Vocabulary-Landingpage |
| `/vocabulary/:term` | Vocabulary Detail | nur reale öffentliche Terme; unbekannte Terme bleiben 404 |
| `/faq` | Trust | öffentliche FAQ/Hilfe |
| `/forschung` | Research | öffentliche Forschungsdarstellung |
| `/lizenz` | Trust | Asset-/Design-Lizenzinformation |
| `/datenprovider-lizenzen` | Trust | Provider-/Datenrechteinformation |
| `/opensource-lizenzen` | Trust | OSS-Lizenzinventar |
| `/impressum` | Legal | Anbieterkennzeichnung |
| `/datenschutz` | Legal | Datenschutzerklärung |
| `/agb` | Legal | Nutzungsbedingungen |

Die Sitemap wird aus dieser statischen Allowlist plus den real vorhandenen öffentlichen Vocabulary-Termpfaden erzeugt.

## NOINDEX

| Route | Grund / Promotion Gate |
|---|---|
| `/login` | Auth-Einstieg ohne eigenständigen Search-Wert |
| `/architecture` | erst nach SEO-Manifest, Claim-/Content-Review und crawlbarer Metadata |
| `/provider-status` | operative Statusansicht |
| `/pipeline-builder` | interaktives Tool; State/Claims vor Search-Promotion prüfen |
| `/studio` | interaktiver Studio-Hub; kein freigegebener Landingpage-Contract |
| `/marketscreener` | Screener erst nach Datenrechte-, Fallback- und Metadata-Abnahme |
| `/marketscreener/dokumentation` | Blueprint-Dokumentation erst nach SEO-02/03 + Claim-/License-Review |
| `/dokumentation` | Dokumentations-Hub erst nach eigenständiger Metadata-/Canonical-Abnahme |
| `/pricing` | derzeit Produkt-/UI-State statt eigenständiger serverseitiger Landingpage |
| `/.well-known/security.txt` | operativer RFC-9116-Vulnerability-Disclosure-Endpunkt; keine Search-Landingpage |
| `/.well-known/mta-sts.txt` | operativer MTA-STS-Endpunkt; keine Search-Landingpage |
| `/documentation/byok.html` | statische Präsentation, noch nicht im kanonischen SEO-Contract |
| `/documentation/pipeline-architectures.html` | statische Präsentation, noch nicht im kanonischen SEO-Contract |
| `/documentation/pricing-models.html` | Preis-/Claim-Drift zuerst gegen Preisautorität prüfen |
| `/documentation/domains.html` | statische Präsentation, noch nicht im kanonischen SEO-Contract |

## PRIVATE

| Route / Familie | Grund |
|---|---|
| `/profile` | personenbezogener Konto-/Vault-Bereich |
| `/control-center` | Management-, Evidence- und Control-Center-Inhalte |
| `/api/*` | APIs sind keine indexierbaren Webinhalte |

`PRIVATE` ist ausschließlich eine SEO-Klassifikation. Sie ist keine Aussage, dass ein Endpoint allein durch diese Policy technisch geschützt ist. Auth-/Autorisierungsgrenzen bleiben TRUST-/PRODUCT-/PLATFORM-Verträge.

## BLOCKED

| Route / Familie | Grund |
|---|---|
| `/tokenomics` | Token-/Finanzclaims benötigen explizite Rechts-/Evidence-Prüfung |
| `/whale-radar` | Signal-/Marktdatenclaims benötigen Datenrechte-, Claim- und Produktfreigabe |
| unbekannte/nicht inventarisierte SPA-Pfade | fail-closed; keine automatische Search-Promotion |

## Aliase

`src/utils/appNavigation.ts` enthält zahlreiche Nutzer-/Legacy-Aliase wie `/research`, `/oss`, `/glossar`, `/screener`, `/docs`, `/roadmap` oder `/account`.

SEO-00 behandelt Aliase **nicht** als eigenständige INDEX-Seiten. Ohne serverseitigen Redirect auf die kanonische Route fallen sie fail-closed auf `BLOCKED`/noindex. Server-seitige 301-/Canonical-Normalisierung ist ein Folgepunkt von SEO-03.

## Technische Durchsetzung

`server/index.mjs` verwendet die Policy für:

1. die statische Sitemap-Allowlist;
2. Meta-Robots auf ausgelieferten HTML-Seiten;
3. `X-Robots-Tag: noindex, nofollow` für nicht indexierbare Pfade;
4. `X-Robots-Tag` für JSON/API-Antworten;
5. Self-Canonicals/`og:url` für INDEX-Routen.

Damit wird der bisherige globale `index, follow`-Fallback nicht mehr auf ungeklärte SPA-Routen übertragen.

## Bewusst nicht in SEO-00 gelöst

- unbekannte SPA-Pfade liefern weiterhin den App-Shell-HTTP-Status 200; die Soft-404-/Redirect-Semantik folgt in SEO-03;
- eigene Titles/Descriptions für alle INDEX-Routen folgen in SEO-02;
- Dokumentations-, Architecture- und Screener-Seiten werden erst nach Content-/Claim-/License-Abnahme zu `INDEX` promoted;
- Alias-301-Redirects folgen in SEO-03;
- `robots.txt` bleibt crawler-neutral; Search-Freigabe wird über Indexing-Policy, Sitemap, Meta-Robots und X-Robots gesteuert;
- `llms.txt` oder AI-spezifische Crawler-Policy gehören zu SEO-08;
- `/.well-known/*` wird nicht als Verzeichnis freigegeben: nur explizit behandelte Standards wie `security.txt` und `mta-sts.txt` sind erreichbar.

## Tests

`server/seo-indexing-policy.test.mjs` prüft:

- nur bekannte Klassifikationswerte;
- exakte INDEX-Allowlist;
- PRIVATE/BLOCKED/NOINDEX-Fälle;
- unbekannte Route fail-closed;
- Server-Header und Meta-Robots;
- Self-Canonical und `og:url` für INDEX;
- Sitemap enthält keine NOINDEX/PRIVATE/BLOCKED-Routen.

Ausführung:

```sh
npm run test:seo
```

## Exit-Kriterien SEO-00

SEO-00 ist repositoryseitig abgeschlossen, wenn:

- jede bekannte kanonische Webroute eine explizite Policy besitzt;
- unbekannte Routen fail-closed sind;
- die Sitemap ausschließlich `INDEX` enthält;
- API/private/claim-sensitive Routen Search-seitig noindex sind;
- Policy und Serververhalten regressiv getestet sind;
- ein grüner Testlauf dokumentiert ist.

Ein grüner Test ist keine Production-, Search-Console-, Security-, Lizenz- oder Claim-Freigabe.
