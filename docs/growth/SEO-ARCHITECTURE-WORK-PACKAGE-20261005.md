# CAPITAL-AI SEO-Architektur — kanonisches Arbeitspaket

Stand: 2026-10-05  
Primary Domain: CAPITAL-AI-GROWTH  
Baseline: `SvenKulessa/Capital-AI@c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84`  
Status: `OFFEN` — geplant/teilweise vorhandene Grundlagen; keine Production- oder Ranking-Freigabe.

## 1. Ziel

Dieses Arbeitspaket konsolidiert die bisherigen Roadmap-Punkte `AP-SEO-01`, `AP-SEO-02` und `AP-SEO-03` sowie die Inhalte der SEO-/Podcast-Deep-Dive-Briefs zu einer einzigen ausführbaren SEO-Roadmap.

Zielarchitektur:

```text
GitHub
  ↓
SEO-/Content-Manifest
  ↓
Indexing-/Claim-/License-Policy
  ↓
Metadata + Structured Data + interne Links
  ↓
Build + SEO-CI
  ↓
Website
  ↓
Sitemap / RSS / OpenAPI / Social Cards
  ↓
Google / Bing / Social Distribution / AI Search
  ↓
Search + Analytics Evidence
  ↓
SEO-Backlog / GitHub Issue / nächster PR
```

SEO wird als **SEO-as-Code**, **Content-as-Code** und evidenzgebundener GROWTH-Prozess behandelt. Rankings, Traffic, Rich Results, AI-Zitationen oder Conversion-Uplifts dürfen nicht erfunden oder als garantiert dargestellt werden.

## 2. Verifizierter CURRENT_MAIN-Ausgangsstand

| Bereich | Stand auf Baseline | Einordnung |
|---|---|---|
| Runtime/Web | Vite + React + TypeScript; Node/Express liefert statische App | VERIFIED |
| Basis-Metadaten | Title, Description, Canonical, OpenGraph, Twitter/X in `index.html` | VERIFIED |
| Basis-JSON-LD | `WebApplication` + `Project` in `index.html` | VERIFIED |
| Vocabulary SEO | dynamische Titles, Descriptions, Canonicals sowie `DefinedTerm`/`DefinedTermSet` | VERIFIED |
| robots.txt | wird serverseitig mit Sitemap-Hinweis ausgeliefert | VERIFIED |
| sitemap.xml | Basisrouten + öffentliche Vocabulary-Routen | VERIFIED, Scope begrenzt |
| SEO-Datenmodell | `seo_keywords`, `seo_rank_snapshots`, `seo_content_inventory`; RLS deny-by-default | VERIFIED |
| Search Console | read-only GSC-MCP ist für `sc-domain:capital-ai.online` admitted; Sitemap-Write bewusst ausgeschlossen | VERIFIED |
| GA4 | kein gleichwertig abgenommener Adapter | OFFEN |
| Bing Webmaster | kein kanonischer Adapter/Readback nachgewiesen | OFFEN |
| SEO-Crawler/CI | kein kanonischer repo-weiter Crawl-/Broken-Link-/Schema-/Metadata-Gate als eigener SEO-Check | OFFEN |
| Content-Manifest | kein zentrales `seo-manifest` mit search/social/AI eligibility nachgewiesen | OFFEN |
| Social Engine | Migrations-/Auditplan vorhanden; vollständiger produktiver Publisher-/UGC-Pfad nicht abgenommen | OFFEN/GEHALTEN je Teilpfad |
| AI Search | keine garantierbare Aufnahme; maschinenlesbare Basis nur teilweise vorhanden | OFFEN |

## 3. Leitplanken

1. **Keine YMYL-/Finanzclaims ohne Evidence.** Keine Rendite-, Erfolgs-, Ranking- oder Performanceversprechen.
2. **Keine falsche Regulatory Authority.** CAPITAL-AI darf nicht durch Schema.org oder Marketing als regulierter `FinancialService` dargestellt werden, solange dies nicht rechtlich und sachlich belegt ist.
3. **Dataset-Markup nur für echte Datasets.**
4. **PRIVATE/NOINDEX bleibt fail-closed.** Login, Konto, API-Interna, Evidence Stores, Security-Interna und personenbezogene Daten werden nicht für SEO geöffnet.
5. **GSC bleibt standardmäßig read-only.** Sitemap-Submission oder andere Write-Scopes sind ein separater Owner-gated Schritt.
6. **Keine Spam-Backlinks, Linkfarmen oder automatisierten Community-Posts.**
7. **Open Source ist Kandidat, nicht automatische Zulassung.** Lizenz, Maintainer-Herkunft, Dependencies, Security, Commercial Use und Betriebsaufwand werden pro Tool verifiziert.
8. **Standard-PR-CI darf automatisch laufen.** Für das öffentliche Repository dürfen vorgesehene GitHub-hosted Required Checks ohne zusätzliche Minutenfreigabe starten; kostenpflichtige Larger Runner, neue Compute-/Storage-Produkte und Production-Mutationen bleiben separat gegatet.

## 4. Zeitliche Umsetzungsreihenfolge

### SEO-00 · Baseline, Inventar und Policy

**Status:** `REPO_IMPLEMENTED / VALIDATION_PENDING` — Policy, Server-Durchsetzung, Sitemap-Kopplung und Regressionstest sind im Branch umgesetzt; ein realer `npm run test:seo`-Lauf konnte in der aktuellen Ausführungsumgebung wegen fehlender DNS-Auflösung zu GitHub nicht gestartet werden.

**Ziel:** Eine eindeutige Quelle für alle indexierbaren Inhalte herstellen.

Aufgaben:
- öffentliche Routen und Seitentypen vollständig inventarisieren;
- jede Route als `INDEX`, `NOINDEX`, `PRIVATE`, `ARCHIVE` oder `BLOCKED` klassifizieren;
- Content-Klassen definieren: Product, Documentation, Research, Methodology, Trust, Provider, Blueprint, Vocabulary;
- vorhandene SEO-Tabellen gegen die tatsächlichen Webrouten korrelieren;
- alte `AP-SEO-01..03` in dieses Arbeitspaket konsolidieren.

Exit-Evidence:
- `docs/growth/SEO-00-INDEXING-POLICY-20261005.md`;
- `shared/seo-indexing-policy.mjs`;
- `server/index.mjs` erzwingt noindex fail-closed und leitet die Sitemap aus der INDEX-Allowlist ab;
- `server/seo-indexing-policy.test.mjs` deckt Klassifikation, Header/Meta-Robots, Canonicals und Sitemap ab;
- statische Branch-Validierung bestätigt vollständige Policy-Coverage der kanonischen/direct App-Routen und syntaktisch kompilierbare geänderte JS/MJS-Dateien;
- realer `npm run test:seo`-Lauf bleibt vor Abschluss von SEO-00 offen.

### SEO-01 · SEO-/Content-Manifest und Provenance

**Status:** `REPO_IMPLEMENTED / VALIDATION_PENDING` — `shared/seo-content-manifest.mjs` enthält 305 eindeutige INDEX-Einträge (11 statisch + 294 Vocabulary), `scripts/seo-content-manifest.test.mjs` prüft Coverage, Eindeutigkeit, Provenance, Lizenzmarker und Eligibility. `/.well-known/security.txt` ist als exakter RFC-9116-Pfad ergänzt; MTA-STS bleibt erhalten. Reale Required-Check-Evidence steht noch aus.

**Ziel:** SEO-Metadaten nicht mehr verteilt/ad-hoc, sondern deklarativ erzeugen.

Minimaler Contract:

```text
slug
title
description
canonical
contentType
domain
language
author
updatedAt
sourceSha
license
robots
structuredDataType
searchEligible
socialEligible
aiSearchEligible
```

Aufgaben:
- kanonisches `seo-manifest` oder gleichwertigen TypeScript-Contract anlegen;
- `sourceSha` und Content-Provenance mitführen;
- duplicate slug/canonical/title deterministisch blockieren;
- Content-Lizenz und öffentliche Claim-Evidence referenzierbar machen.

Exit-Evidence:
- `shared/seo-content-manifest.mjs` mit 305 INDEX-Einträgen;
- `scripts/seo-content-manifest.test.mjs` für 1:1-Coverage sowie duplicate slug/canonical/title;
- `docs/growth/SEO-01-CONTENT-MANIFEST-20261005.md`;
- `server/well-known.mjs` + `server/well-known.test.mjs`;
- `docs/security/BUILD-DOMEXCEPTION-REVIEW-20261005.md` für den nicht-blockierenden Render-Buildbefund;
- Docker-Build führt Well-Known-/Manifest-Tests offline aus;
- keine dynamische Veröffentlichung ohne gültigen Manifest-Eintrag.

### SEO-02 · Metadata, Canonicals, Structured Data und Social Cards

**Ziel:** Einheitliche Metadaten aus dem Manifest.

Aufgaben:
- zentralen Metadata-Generator bauen;
- Title, Description, Canonical, robots, OpenGraph und Twitter/X pro Route erzeugen;
- bestehende Vocabulary-Injection in denselben Contract überführen oder damit korrelieren;
- JSON-LD zentralisieren.

Zulässige Schema-Kandidaten je nach realem Inhalt:
- `Organization` oder `Project`;
- `WebSite`;
- `SoftwareApplication`/`WebApplication`;
- `TechArticle`/`Article`;
- `BreadcrumbList`;
- `DefinedTerm`/`DefinedTermSet`;
- `Dataset` nur bei echtem Dataset.

Nicht pauschal zulassen:
- `FinancialService`;
- Reviews/Ratings ohne echte Quelle;
- erfundene Preise, Nutzerzahlen oder Performancewerte.

Exit-Evidence:
- deterministische Metadata-/JSON-LD-Tests;
- kein Canonical-Duplikat;
- Social-Preview-Assets lizenz- und hashgebunden.

### SEO-03 · Crawlability, Sitemap, Robots, Rendering und Performance

**Ziel:** Crawlbarkeit und öffentliche Erreichbarkeit technisch nachweisen.

Aufgaben:
- Sitemap aus der Indexing-Policy/Manifest-Quelle generieren;
- Sitemap-Index bei wachsendem Umfang vorsehen;
- `robots.txt` aus einer expliziten Bot-/Route-Policy erzeugen;
- 200/301/404-Semantik für öffentliche SEO-Routen testen;
- JS-unabhängigen sinnvollen Fallback für wichtige Landing-/Dokumentationsseiten erhalten;
- Broken Links, Redirect Chains und Orphan Pages prüfen;
- Lighthouse/Core-Web-Vitals-Regression als Evidence erfassen, ohne einen Score von 100 als Produktziel zu erzwingen.

Exit-Evidence:
- statischer Crawl ohne kritische Fehler;
- Sitemap enthält nur INDEX-Routen;
- private/API-Routen fehlen in Sitemap;
- Canonical/HTTP-Status stimmen mit Routing überein.

### SEO-04 · Content-Architektur und Keyword-/Entity-Modell

**Ziel:** CAPITAL-AI als fachlichen Knowledge Hub strukturieren.

Priorisierte Cluster:
1. Market Screener / Multi-Asset Market Intelligence
2. Open Financial Data / Provider-Abstraction
3. Market-Data-Pipelines / NATS JetStream / Replay
4. Explainable Multi-Asset Scoring
5. BYOK
6. Open-Source FinTech Architecture
7. Security, Governance und Licensing
8. Blueprints und technische Dokumentation
9. Research und Benchmarks

Aufgaben:
- Pillar Pages und Cluster Content definieren;
- interne Verlinkung zwischen Produkt, Dokumentation, Research und Methodik herstellen;
- Head Keywords nicht vor Long-Tail-/Expertise-Inhalten priorisieren;
- Entity-Namen repositoryweit konsistent halten;
- Thin Content und massenhaft programmatic erzeugte Seiten verhindern.

Exit-Evidence:
- Content Map mit Parent/Child-/Related-Beziehungen;
- jede indexierbare Seite hat eigenständigen Mehrwert;
- Search Intent und Zielgruppe dokumentiert.

### SEO-05 · Developer SEO und GitHub → Website Content Flow

**Ziel:** Repository-Arbeit als öffentliches, belegbares Fachwissen nutzbar machen.

Aufgaben:
- README, Architekturdocs, Blueprints, Research und OpenAPI als Developer-Acquisition-Kanäle strukturieren;
- kanonischen Website-Artikel als Hauptquelle definieren;
- GitHub-Dokumente mit Website-Canonicals/Quellenbezug korrelieren;
- Diagramme und Codebeispiele barrierearm und textuell verständlich halten.

Exit-Evidence:
- mindestens ein vollständiger Flow `Repo-Dokument → Website-Pillar/Artikel → interne Links`;
- keine Veröffentlichung interner Security-/Operations-Evidence.

### SEO-06 · Social-Flywheel mit vorhandener Social-Media-Engine

**Ziel:** Ein ContentFact wird kanalabhängig weiterverwendet, ohne Fakten zu erfinden.

Flow:

```text
Repository Source
→ ContentFact
→ Website Canonical
→ Social Draft
→ Brand/License/Claim Review
→ Owner Approval
→ Publication Queue
```

Aufgaben:
- SEO-Manifest mit `socialEligible` und Social-Engine-Contracts verbinden;
- ContentFact mit Source-SHA, Claims, Citations und License etablieren;
- LinkedIn/Mastodon/Reddit/Podcast/Video nicht als identische Kopien erzeugen;
- Publisher erst nach den bestehenden Social-Migration-/Rights-Gates aktivieren;
- keine automatische öffentliche Veröffentlichung sensibler Finanzclaims.

Exit-Evidence:
- draft-only E2E-Pilot;
- kanonische URL bleibt primäre Quelle;
- immutable Asset-/Claim-Bindung vor Publish.

### SEO-07 · Google, Bing und Search Evidence

**Ziel:** Search-Performance read-only messen und Indexprobleme reproduzierbar zurückführen.

Aufgaben:
- vorhandenen GSC-read-only-Adapter operational verifizieren;
- Search Analytics, URL Inspection und Sitemap-Readback in ein Growth-Evidence-Schema normalisieren;
- Bing Webmaster Tools zunächst read-only evaluieren;
- GA4/alternatives Analytics separat behandeln, nicht mit Search-Index-Evidence vermischen;
- Search-Daten nach canonical URL korrelieren.

Exit-Evidence:
- GSC Property Readback für `sc-domain:capital-ai.online`;
- keine Credentials im Repo/Client;
- GSC- und Analytics-Metriken semantisch getrennt.

### SEO-08 · AI-Search-Readiness und Maschinenlesbarkeit

**Ziel:** Inhalte für Web-Retrieval und Answer Engines eindeutig maschinenlesbar machen, ohne Aufnahmegarantien zu behaupten.

Aufgaben:
- semantisches HTML, konsistente Entity-Namen, Quellen, Autoren-/Projektidentität verbessern;
- Sitemap, RSS/Atom und OpenAPI als etablierte maschinenlesbare Flächen nutzen;
- `llms.txt` nur als experimentellen, nicht standardgarantierten Zusatz evaluieren;
- AI-Crawler-Regeln explizit dokumentieren statt einzelne Bots unreflektiert freizuschalten;
- `aiSearchEligible` getrennt von klassischem `searchEligible` führen.

Exit-Evidence:
- Machine-readability-Audit;
- experimentelle Mechanismen klar gekennzeichnet;
- keine Aussage „für Modelltraining aufgenommen“ ohne Beleg.

### SEO-09 · SEO-CI, Observability und Dashboard

**Ziel:** SEO wie ein Produktionssystem messbar machen.

Leichte PR-/lokale Checks:
- Manifest-Schema;
- duplicate title/canonical;
- missing title/description/H1;
- internal broken links;
- JSON-LD-Syntax/Contract;
- Sitemap/robots consistency.

Post-Deploy/read-only:
- HTTP/Canonical Smoke;
- GSC Index State;
- Search Impressions/Clicks/CTR;
- 404/5xx;
- Core Web Vitals;
- Referral Traffic.

Open-Source-Kandidaten zur separaten Admission:
- Lighthouse/Lighthouse CI;
- SiteOne Crawler oder eigener Scrapy-/Node-Crawler;
- Umami oder Matomo für self-hosted Analytics;
- Grafana/Prometheus für technische SEO-/HTTP-Metriken.

Exit-Evidence:
- reproduzierbarer SEO-Report;
- Toollizenzen/Dependencies einzeln admitted;
- kein kostenintensiver Docker-Lauf nur wegen reiner Copy-/Metadata-Änderung, sofern Governance keinen solchen Gate zwingend verlangt.

### SEO-10 · Controlled Self-Healing

**Ziel:** Nur deterministische Low-Risk-Fehler automatisch reparieren.

Zulässige Kandidaten nach Fingerprint-Zulassung:
- interner Broken-Link-Fix;
- deterministische Sitemap-Synchronisierung;
- fehlendes `lastModified`;
- aus Manifest eindeutig ableitbare Metadata-Reparatur.

Nicht automatisch ändern:
- Marketing-/Finanzclaims;
- rechtliche Texte;
- Lizenztexte;
- Security-Aussagen;
- Canonical-Informationsarchitektur;
- Provider-/Datenrechte;
- Public/Private-Klassifikation ohne Review.

Flow:

```text
DETECT
→ CORRELATE
→ CLASSIFY
→ branch-basierter deterministischer Fix
→ Tests
→ PR
→ Human Review
```

### SEO-11 · Öffentlicher Launch und Authority Building

**Ziel:** organische Sichtbarkeit ohne Linkspam aufbauen.

Priorität:
- hochwertige technische Artikel;
- GitHub/Developer Docs;
- Open-Source-Artefakte;
- Research/Benchmarks mit reproduzierbarer Methodik;
- relevante Community-Diskussionen;
- Awesome Lists/Verzeichnisse nur bei echter thematischer Eignung;
- Podcast/Video/Newsletter als Distribution des kanonischen Inhalts.

Verboten:
- gekaufte Backlinks;
- Linkfarmen;
- Massenkommentare;
- automatisch erzeugte Community-Werbung;
- erfundene Testimonials/Performancezahlen.

Exit-Evidence:
- dokumentierte Distribution je Content-Asset;
- Referral-/Search-Evidence statt Vanity Metrics;
- keine Community-Policy-Verstöße.

## 5. KPI-Modell

Technisch:
- indexEligible URLs;
- valide Canonicals;
- Broken Links;
- 404/5xx;
- Schema-/Manifest-Fehler;
- Crawlability;
- Core Web Vitals.

Search:
- Impressions;
- Clicks;
- CTR;
- Average Position mit Kontext;
- Branded vs. Non-Branded;
- indexierte/ausgeschlossene Seiten;
- Search Landing Pages.

Growth:
- GitHub/Docs/Social Referrals;
- Returning Visitors;
- Signup-/Produktinteraktion;
- Content-Cluster-Abdeckung;
- organische Referenzen/Backlinks.

Keine KPI wird als Erfolg gewertet, wenn Security-, Datenrechte-, Lizenz- oder Claim-Gates verletzt werden.

## 6. Abhängigkeiten

- `docs/growth/GSC-GA4-AUTHORITY.md`
- `CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md`
- `src/data/socialContentRoadmap.ts`
- `supabase/migrations/20260815010000_seo_engine.sql`
- `server/index.mjs`
- `index.html`
- Dokumentations-Hub und öffentliche Blueprint-/BYOK-Inhalte auf CURRENT_MAIN
- bestehende Domain-/License-/Security-Gates

## 7. Definition of Done

Das SEO-Arbeitspaket ist erst vollständig abgeschlossen, wenn:

1. alle öffentlichen Routen explizit klassifiziert sind;
2. SEO-/Content-Manifest und Policy deterministisch validiert werden;
3. Metadata/Canonical/JSON-LD aus einer kanonischen Quelle erzeugt werden;
4. Sitemap/robots/Crawl konsistent und getestet sind;
5. Content-Cluster und interne Verlinkung real umgesetzt sind;
6. Social-Flywheel mindestens draft-only mit Claim-/License-Gates funktioniert;
7. GSC read-only erfolgreich gegen die echte Property gelesen wurde;
8. Bing/Analytics entweder admitted oder ausdrücklich als offen dokumentiert sind;
9. AI-Search-Readiness ohne unbelegte Garantien umgesetzt ist;
10. SEO-CI/Observability reale Reports liefert;
11. Self-Healing nur für freigegebene deterministische Fingerprints arbeitet;
12. keine fehlenden oder fehlgeschlagenen Checks als „geschlossen“ gewertet werden.

Merge, Production-Deploy, Search-Console-Write-Scopes und öffentliche Social-Publikation bleiben jeweils separate Freigabegrenzen.
