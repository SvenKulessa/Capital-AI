# Control Center: Repository Tool & Application Catalog

**Scope:** PRODUCT UI with read-only GitHub provenance across PRODUCT, MARKET, PLATFORM, TRUST and GROWTH.

## Navigation

Owner login → Control Center → **Tools & Anwendungen** (deep link: /control-center?tab=tools).

The existing **Komponenten & CADS** panel remains a separate curated assessment. No CADS score or runtime admission is inferred by the new catalog.

## Read-only data contract

- GET /api/internal/repository-tools: owner-only, same authorizeIamRole owner control as the existing Control Center observability API.
- CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1: repository, branch, sourceSha, deployedSha, observedAt, freshness, total, entries.
- Backend reads only fixed URLs for SvenKulessa/Capital-AI via the public GitHub API and exact-SHA raw manifests, not arbitrary client-supplied URLs.
- The current main commit SHA is fetched once, then all catalog data is read against **that same immutable SHA**. No repository data is written.
- In-process refresh TTL: five minutes. Concurrent requests coalesce. When GitHub fails after a successful read, previous data is marked **STALE**, not silently presented as live. Without cache: HTTP 503.
- Server-side requests have timeouts, byte ceilings, a bounded row count, and fail on a truncated Git tree. No token or provider credential is sent to the browser.
- No additional secret or database migration is needed for the public repository; a private-repository migration would require a separately reviewed read-only GitHub credential integration.

## Catalog sources and version semantics

| Item type | Version evidence | Meaning |
|---|---|---|
| Capital AI application | package.json | Web application release version |
| Direct npm package | package-lock.json package resolution; declaration fallback | Exact locked version vs. explicit unresolved range |
| Isolierte npm Runtime- und Build-Patch-Dependencies | deploy/runtime und deploy/npm-security-patches package.json/-lock.json | Individuell gelockte Deployment-Boundary und npm Security-Patches |
| Rust bridge + direct crates | services/provider-bridge-rs/Cargo.toml | Declared crate versions; not a compiled-binary attestation |
| Rust/Android Build-Toolchain | rust-toolchain.toml und mobile/android-private/build.gradle | Pinned Build-Version, kein Runtime-Proof |
| Android Private App | mobile/android-private/app/build.gradle | Private App-Version, getrennt von der Web-Distribution |
| Python / FFmpeg Social Renderer | renderer-requirements.txt und ffmpeg-build-profile.json | Hash-pinned Pillow und FFmpeg-Source-Policy; FFmpeg weiterhin nicht produktiv freigegeben |
| npm CLI | Dockerfile | Build-Pin; explizit nicht Bestandteil der Web-Runtime |
| OCI base images | Dockerfile, deploy/Dockerfile* | Image tag plus pinned digest, not live Render image |
| Internal UI/API/service modules | Actual GitHub file tree + web app version | Inherited app version, not an independent module version |
| Scripts and GitHub workflows | Actual GitHub file tree + web app version | Source-controlled tool/automation, inherited release only |
| External providers/managed tools | config/tool-catalog-integrations.json with existing source path | Presence of a repository binding or documented integration; live version **unknown** |

Transitive dependencies are **not** marketed as individually deployed applications: their exhaustive dependency closure belongs in package locks, Cargo.lock and SBOM. Versions of managed services cannot be verified from repository manifests alone. A live Render/Supabase/NATS/Valkey version requires provider/runtime readback with timestamp and immutable identity evidence. A current GitHub main SHA must not be mistaken for the currently deployed web SHA.

## Kontinuierlicher Update-Abgleich (ab diesem PR)

Der bestehende geschützte Repository-Katalog liest GitHub-main weiterhin als zusammenhängenden, unveränderlichen Commit-Snapshot; 5-Minuten-Backend-TTL. Die geöffnete Control-Center-Seite fordert nun alle **10 Minuten** und bei erneuter Sichtbarkeit aktuelle Daten an. Der Katalog enthält auch tatsächlich in Workflows verwendete **full-length GitHub-Action-Commit-SHAs**, soweit die Workflow-Quellen lesbar sind, außerdem Git-Blob-SHAs aus dem Repository-Tree und npm-Lockfile-SHA-512-Integrities. Diese Belege sind **verschiedene Dinge** (Commit-Pin vs. Datei-Blob vs. Paketarchiv) und ersetzen keinen Review.

`GET /api/internal/repository-tool-updates` ist ausschließlich für authentifizierte Owner erreichbar. Sein read-only Backend gleicht den aktuellen Katalog gegen offizielle npm-Registry-/GitHub-Releases-Schnittstellen ab:

- **npm:** fest kodierter Registry-Host; `/latest` pro direkter Runtime-/Dev-/isolierter npm-Dependency. Ein Update wird nur als Kandidat ausgewiesen, wenn **Paketname**, semantisch neuere stabile Version und die veröffentlichten Felder **SHA-1 (`dist.shasum`) plus SHA-512 (`dist.integrity`)** übereinstimmen. Diese sind zunächst **Metadaten**, keine lokal heruntergeladenen und verifizierten Tarballs.
- **GitHub Actions:** Ermittlung der SHA-Pins aus den tatsächlichen Workflow-Dateien; Releases nur im jeweiligen Originalrepository lesen; Tag-Ref bei annotated tags bis zum Commit auflösen und denselben Commit über GitHub verifizieren. Ein abweichender oder unklarer Tag ist `REVIEW_REQUIRED`, niemals blind einsetzbar.
- **Grenzen und Quota:** höchstens **48** nach Runtime-Priorität ausgewählte npm-Direktabhängigkeiten und **8** Actions pro Abgleich, begrenzte parallele HTTP-Reads, einstündige Server-Caches und explizite `checked/total`-Abdeckung. Diese Stichprobe **ersetzt nicht** den bestehenden täglichen vollständigen `npm outdated`- und CVE-Watch. Ungelesene, nicht auflösbare, nicht stabile oder fehlerhafte Quellen bleiben `NOT_PROVEN`.
- **Keine automatische Mutation:** Weder Frontend noch Backend installieren Packages, aktualisieren Locks, schreiben GitHub Actions, erstellen PRs oder erteilen Security-, Lizenz- oder Produktionsfreigaben. Kandidaten bedürfen einer separaten überprüfbaren Umsetzung mit CI, Kompatibilitäts- und CVE-Prüfung.
- **Kosten:** ausschließlich existierende Render-Ausführungszeit, öffentliche GitHub-/npm-Metadatenabrufe, Netzwerktraffic und GitHub-Actions-Kontingente. Rate-Limits/Provider-Quoten bleiben `NOT_PROVEN`; keine kostenpflichtige Ressource aktiviert.

Owner-Zugriffe auf beide API-Routen nutzen denselben serverseitigen `authorizeIamRole(..., 'owner')`-Pfad. Bei fehlendem GitHub-/npm-Zugriff wird kein Erfolg erfunden; eine nicht verfügbare Kandidatensuche liefert `NOT_PROVEN` bzw. einen klaren 503-Fehler. Die bereits gelockte Version wird niemals eigenmächtig verändert.

## Lizenz-, Kosten-, Nutzung- und Alternativenmatrix (TRUST-Erweiterung 2026-10-11)

Die neue Owner-Ansicht zeigt für **jede** vom bestehenden Katalog inventarisierte Zeile die Kategorien `Stand (main)`, `verifizierte Latest-Metadaten`, `Update-Grund`, `Einsatz/Evidence`, `Ist-Aufrufe pro Tag`, `deklarierte Lizenz`, `kommerzielle Weitergabe`, `Preis-/Free-Tier/Bezahlmodell` sowie `Alternativen`. Eine vollständig gefilterte CSV ist direkt aus der Owner-Ansicht exportierbar; der Export neutralisiert Spreadsheet-Formeln aus untrusted Registry-/Inventartext.

### Echte Abdeckung und Herkunft

- `config/tool-catalog-integrations.json`: 42 **deklarierte** externe Integrationen (14 PLATFORM / 10 TRUST / 7 MARKET / 6 GROWTH / 5 PRODUCT). Ein deklarierter Dienst bedeutet **nicht** 42 aktiv genutzte Runtime-Provider.
- `src/data/externalComponentInventory.ts`: 32 kuratierte, teilweise historische Komponenten-Einträge mit `license`, `lifecycle`, `activeVersion` und `alternatives`. Die Versionen werden ausschließlich als *historische Inventaraussage, nicht aktueller Runtime-Readback* angezeigt. Tool-Aliase führen auf diese Quelle, erfinden aber keine Lizenz-/Deploy-Evidence.
- `package.json`, `package-lock.json`, isolierte `deploy/runtime`- und `deploy/npm-security-patches`-Manifeste sowie die Workflows liefern feste Versionen, Paketlizenzdeklarationen und geprüfte Source-/Commit-Hashes. **Lockfile-SPDX-Metadaten sind nicht der vollständige Lizenztext und kein kommerzielles Freigabe-Attest**.
- `server/tool-catalog-assessment.mjs`: rein deterministische, bounded Projektion auf Basis der bereits zu einem einzigen `main@SHA` geladenen Quellen. Keine Credential-Freigabe, keine neuen Drittanbieter-SDKs, keine Lizenz- oder Kostenentscheidungen und kein Secret-Zugriff.
- `server/tool-update-discovery.mjs`: offizieller npm-/GitHub-Release-Abgleich **nur im bisherigen limitierten Umfang**. `latestVersion` wird bei belegter Version ausgegeben; SHA-1/SHA-512 bzw. Commit-Pins bleiben separate Metadaten (Tarball/Binary-Codeprüfung `NOT_PROVEN`). Für die vom selben `main@SHA` geladene TypeScript-7.0.2-Evidence wird der Kandidat **BLOCKED** mit einem eindeutigen Grund, nicht als freigegebene Installation angezeigt.

### Rechtliche und kommerzielle Semantik

Die Felder `commercial`, `redistribution`, `commercialServiceRights`, `freeTier` und `paidTier` sind getrennt. Exakt deklarierte MIT/Apache-2.0/BSD/ISC- oder ähnliche permissive **Softwarelizenzen** sprechen grundsätzlich für kommerziell zulässige Nutzung unter Notice-/Lizenzbedingungen, **keinesfalls** automatisch für eine kommerzielle SaaS-, API-, Marktdaten-Redistributions- oder Markenlizenz. `Apache-2.0 core` betrifft nur den OSS-Kern eines Providers; Cloud-Angebote können eigene Verträge haben. Copyleft-/schwierig lesbare Lizenzen erhalten `REVIEW_REQUIRED`. Unklare, nicht verfügbare oder nur vom Provider vertraglich festgelegte Preise, kostenlose Kontingente, Mindestumsätze und Quotas bleiben `NOT_PROVEN`. Die Registry-/Inventarlizenz ist lediglich eine Deklaration.

### Bedeutung der täglichen Nutzung

- `actualCallsPerDay=null` = **NOT_PROVEN**, nicht null Aufrufe. Es besteht keine pauschale Quelle für tenant- und providerübergreifende tägliche Request-Anzahlen. Mit reinem Source-Scan lassen sich keine produktiven API-Aufrufe ermitteln; das wäre eine erfundene Zahl.
- `scheduledRunsPerDay`: Nur bei einfachen GitHub-Workflow-Cron-Schedules (täglich oder stündlich) deterministisch ermittelte **geplante** Läufe. Workflow-Dispatch, Wochenregeln, ausgefallene GitHub-Runs und reale Ausführung bleiben separat. Cron zählt **keine** API-Aufrufe oder erfolgreiche Ausführungen.
- Ein externes Tool mit einer Repo-Binding-Quelle wird als `REPO_BINDING_ONLY` oder `DECLARED_ACTIVE_NOT_RUNTIME_VERIFIED` gekennzeichnet. NPM-Entwicklungswerkzeuge sind zunächst Build-/CI-Abhängigkeiten. Der `sourceSha`-Beleg ist keine Zusicherung der aktuell aktiven Render-, Supabase- oder Provider-Runtime.
- Eine nachträgliche belastbare Nutzungszählung erfordert vorhandene **autorisierte, datensparsame** Owner-Metriken mit Aggregation pro UTC-Tag, Provider, Anwendung, Beweiszeit und ggf. Denominator; eine neue Telemetrieintegration mit Tenant-IDs oder Preisdaten wird durch diesen PR **nicht** aktiviert.

### Update-Entscheidungen

- `BLOCKED`: explizite nachweisbare Sicherheits- oder Fingerprint-Sperre (z.B. `typescript@7.0.2`); keine stille Fristverlängerung.
- `UPDATE_CANDIDATE`: neuer Hash-/Commit-belegter Release **nicht installiert**, bis überprüfter Binary-/CVE-/Kompatibilitäts-/Lizenz-Nachweis vorliegt.
- `CURRENT_OR_NEWER`: keine neuere stabile Version in der geprüften Quelle zum angegebenen Abrufzeitpunkt.
- `REVIEW_REQUIRED`: Versionssortierung, Fingerprint oder Releaseregel nicht hinreichend geklärt.
- `NOT_PROVEN`: Quelle ausgefallen, kein providerfähiger Latest-Endpunkt, Scan-/Quota-Limit erreicht oder Lizenz-/Runtime-/Verbrauchsevidence fehlt. Nicht als `UP_TO_DATE`, `FREE` oder `0 calls` deuten.

### Alternative und Kosten

Bestehende Alternativen werden direkt aus dem kuratierten Komponentenregister übernommen. Eine Alternative ist nur ein fachlicher Kandidat; die Eignung für kommerzielle Weiterverbreitung, Pricing, RLS/Tenant Isolation und Betreiberbedingungen muss für die tatsächliche Funktion separat qualifiziert werden. Eine nicht belegte Alternative bleibt `NOT_PROVEN` statt frei erfunden. Kosten der Implementierung: bestehender Render-CPU-/Speicherverbrauch und der bereits eingesetzten GitHub-/npm-Metadaten-Abfragen; kein neuer Kauf oder weiterer Required Check. Anbieterquoten und Tarifpreise sind ohne Live-Contract-Readback `NOT_PROVEN`.

## Source files

- server/repository-tool-catalog.mjs: server-side bounded GitHub reader, version/provenance projection and cache.
- server/repository-tool-catalog.test.mjs: parsing, lock resolution, stale/fail-closed behavior and immutable SHA tests.
- server/tool-update-discovery.mjs und .test.mjs: begrenzte, SHA-gebundene Registry-/Release-Kandidatenprüfung.
- server/tool-catalog-assessment.mjs und .test.mjs: Commercial-/Lizenz-/Preis-/Nutzungs-/Alternativen-Evidence mit bewusst offener Runtime-Provenance.
- src/components/RepositoryToolCatalogDashboard.tsx: owner dashboard with search, domain/type filter, pagination, SHA and repo links.
- src/components/ControlCenterPage.tsx: new tab only; existing CADS catalog unchanged.
- server/index.mjs: owner-only API route.
- config/tool-catalog-integrations.json: curated cross-domain external tool names, use cases and source paths.

## Acceptance

1. Docker offline Node tests pass and the React TypeScript/Vite build succeeds.
2. Unauthenticated or non-owner requests to /api/internal/repository-tools return 404 and cannot fetch repo contents.
3. Owner request returns a coherent same-SHA snapshot; dependencies resolve against lockfile, with unknown versions explicitly marked.
4. GitHub outage produces 503 or a clearly labeled STALE cached snapshot.
5. The UI displays name, version/version basis, repository path, application area and domain; filtering and pagination work on mobile and desktop.
6. Docker runtime includes the new server module; no NATS or Valkey redeployment is triggered.

**Important:** Before the PR is merged and deployed, the feature exists only on its feature branch; neither the GitHub API's availability nor the productive website integration should be treated as verified runtime behavior.
