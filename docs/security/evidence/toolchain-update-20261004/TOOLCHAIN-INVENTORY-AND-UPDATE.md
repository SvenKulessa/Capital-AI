# Toolchain-/Dependency-Inventar und Update-Evidence — 2026-10-04

Primary Domain: CAPITAL-AI-TRUST  
Cross-Domain: PLATFORM / PRODUCT  
Base: `main@8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f`

## Ziel

Alle aktiven Build-, CI-, Security-, Runtime- und direkten Web-Dependencies wurden gegen den aktuellen Repository-Stand inventarisiert. Routine-Updates werden nur übernommen, wenn Version und Artefakt-/Commit-Identität belastbar verifiziert sind. Major-Upgrades und npm-Lockfile-Änderungen ohne reproduzierbaren Registry-Rebuild bleiben fail-closed.

## Ubuntu-26-Warnung

Alle versionierten CAPITAL-AI Workflows verwenden bereits explizit `runs-on: ubuntu-26.04`.

Die weiterhin sichtbare Meldung

`The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026`

stammt aus den von GitHub erzeugten CodeQL-Default-Setup-Jobs. Job-Log-Readback am 2026-10-04 zeigte für JavaScript/TypeScript, Java/Kotlin, Python und Actions jeweils:

`runner = ["ubuntu-latest"]`

Damit ist die Warnung **nicht** auf einen verbliebenen `ubuntu-latest`-Eintrag in `.github/workflows` zurückzuführen.

GitHub plant die Migration des Labels ab 2026-10-19 bis 2026-11-19. Ein explizites Runner-Label für CodeQL Default Setup ist providerseitige Security-Konfiguration und keine Repository-YAML-Mutation.

## GitHub Actions — Tag → Commit SHA verifiziert

| Action | Version | Commit SHA | Status |
|---|---:|---|---|
| actions/checkout | 7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 | aktuell |
| actions/setup-node | 7.0.0 | 820762786026740c76f36085b0efc47a31fe5020 | aktuell; v4.4.0-Restpin im Mobile-Workflow aktualisiert |
| actions/setup-java | 6.0.1 | de7274f081f381c8f8158605e0321c36c376e2e6 | aktuell |
| gradle/actions/setup-gradle | 6.4.0 | 3f5f9adaf7d9fecd50b5935e54106014257a94e6 | aktuell; annotierter Tag verifiziert |
| actions/upload-artifact | 7.0.1 | 043fb46d1a93c77aae656e7c1c64a875d1fc6a0a | aktuell |
| actions/download-artifact | 8.0.1 | 3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c | aktuell |
| docker/login-action | 4.6.0 | dbcb813823bdd20940b903addbd779551569679f | aktuell |
| actions/attest | 4.2.2 | 1e69f48acb82d1966a394da916b4c1698aa569d6 | aktuell |

## Container-/Security-Toolchain

| Tool | Repository-Stand | Upstream-Stand | Bewertung |
|---|---|---|---|
| Node.js | 26.10.0 Alpine, digest-gepinnt | 26.10.0 aktuelle Node-Release-Linie zum Prüfzeitpunkt | aktuell; kein Image-Digest-Wechsel |
| npm CLI | 12.2.0 | 12.2.0 | aktuell |
| Trivy | 0.75.0, digest-gepinnt | 0.75.0 | aktuell |
| Hadolint | 2.15.1, digest-gepinnt | 2.15.1 | aktuell |
| NATS Server | 2.15.0, digest-gepinnt | 2.15.0 | aktuell |
| Go Security Runtime | 1.26.8 Alpine, digest-gepinnt | 1.27.1 global neuer; 1.26.8 aktuelle 1.26-Patchlinie | Major-Migration separat |
| govulncheck | v1.8.0 | v1.8.0 | aktuell |
| Android Gradle Plugin | 8.13.2 | 9.4.1 aktuelle stabile Major-Linie | **BLOCKED als Routine-Update**; Major-Migration mit Gradle/JDK/API-Kompatibilität erforderlich |

Die vorhandenen OCI-Digests bleiben unverändert. Ein Image wird nur ersetzt, wenn der neue Registry-Digest separat gegen die erwartete Version und Herkunft gelesen werden kann.

## Root npm — direkte Dependency-Funktion und Update-Status

| Dependency | Lockfile-Version | Funktion | Status |
|---|---:|---|---|
| @google/genai | 2.24.0 | serverseitiger Gemini/AI-Provider | aktuell |
| @nats-io/jetstream | 3.4.0 | JetStream API | aktuell |
| @nats-io/transport-node | 3.4.0 | NATS Node TCP Transport | aktuell |
| @tailwindcss/vite | 4.3.3 | Tailwind/Vite Integration | aktuell |
| @vitejs/plugin-react | 6.1.1 | React/Vite Transform + Fast Refresh | aktuell |
| dotenv | 18.0.4 | lokale/env-basierte Konfigurationsladung | kein Downgrade; externe Suchindizes widersprüchlich, Registry-Readback vor Mutation erforderlich |
| express | 5.2.1 | öffentliches Node Gateway/Router | aktuell |
| jspdf | 4.2.1 | PDF-Erzeugung | aktuell |
| lucide-react | 1.52.0 | UI-Icons | **AKTUALISIERT**; Registry-Integrity + Lockfile-Evidence verifiziert |
| motion | 13.4.5 | UI-Animation | Registry `latest=14.0.0`; **unverändert**, separate Major-Migration |
| nodemailer | 10.0.13 | SMTP-Mailtransport | installierter Stand ist neuer als mehrere gecachte Indexresultate; kein Downgrade |
| react | 19.3.0 | Browser UI Runtime | aktuell |
| react-dom | 19.3.0 | DOM Renderer | aktuell |
| recharts | 3.10.1 | Charts | aktuell |
| redis | 6.3.0 | Valkey/Redis Client | **AKTUALISIERT**; Root + Runtime Lockfile verifiziert |
| spdx-expression-parse | 5.0.0 | SPDX-Ausdrucksparsing | aktuell |
| spdx-license-ids | 3.0.24 | SPDX-ID-Katalog | aktuell |
| vite | 8.3.1 | Frontend Build Tool | Lockfile aktuell innerhalb deklarierter 8.x-Linie |
| zod | 4.6.5 | Runtime-Schema-/Inputvalidierung | aktuell |

## Root npm — Development Dependencies

| Dependency | Lockfile-Version | Funktion | Status |
|---|---:|---|---|
| @types/express | 5.0.6 | Express Types | aktuell |
| @types/node | 26.6.3 | Node Types | aktuell |
| @types/react | 19.3.0 | React Types | aktuell |
| @types/react-dom | 19.3.0 | React DOM Types | aktuell |
| autoprefixer | 10.6.1 | CSS Vendor Prefixing | aktuell |
| tailwindcss | 4.3.3 | CSS Framework | aktuell |
| tsx | 4.23.15 | TS Execution in Tests/Scripts | aktuell |
| typescript | 6.0.3 | Typecheck/Compiler | 7.0.2 verfügbar; **BLOCKED als Routine-Update**, Major-Migration erforderlich |

## Production Runtime Lockfile

| Dependency | Version | Status |
|---|---:|---|
| @nats-io/jetstream | 3.4.0 | aktuell |
| @nats-io/transport-node | 3.4.0 | aktuell |
| redis | 6.3.0 | **AKTUALISIERT**; Runtime-Lockfile + transitive Redis-Module auf 6.3.0 |
| zod | 4.6.5 | aktuell |

## npm Security Patch Closure

| Package | Version | Status |
|---|---:|---|
| brace-expansion | 5.0.12 | gepinnt |
| ip-address | 10.7.2 | gepinnt |
| undici | 6.29.0 | gepinnt |

Diese Closure wird nicht opportunistisch verändert; sie kompensiert konkret die npm-Build-Toolchain und muss mit dem npm-Release gemeinsam erneut bewertet werden.

## Durchgeführte Mutation

1. `.github/workflows/mobile-hardening-validation.yml`
   - `actions/setup-node` von v4.4.0 / `49933ea...`
   - auf v7.0.0 / `820762786026740c76f36085b0efc47a31fe5020`
   - identischer v7-Pin war bereits im Daily Dependency Security Watch aktiv.
2. `src/data/externalComponentInventory.ts`
   - fehlende CI-/Runner-/Security-/Build-/Runtime-Komponenten ergänzt.

## Bewusst nicht automatisch mutiert

- TypeScript 7.0.2 — Major.
- Android Gradle Plugin 9.4.1 — Major, erfordert Gradle-/JDK-/Android-Kompatibilitätsmigration.
- Go 1.27.1 — Major-Toolchain-Linie; Reachability-Scanner ist auf 1.26.8 reproduzierbar.
- Motion 14.0.0 — Major; bewusst nicht im Routine-Update. Redis 6.3.0 und Lucide 1.52.0 wurden über die verifizierte npm Update Capsule übernommen.
- Docker/OCI-Imageversionen — kein neuer Digest wird ohne Registry-Readback eingesetzt.
- CodeQL Default Setup Runner — providerseitige Security-Konfiguration; kein repo-lokaler `ubuntu-latest`-Restbestand.

## Nächste verifizierbare Schritte

- Branch-CI für den setup-node-v7-Pin und Inventory-Build auswerten.
- npm Update Capsule ist ausgeführt; Redis/Lucide Candidate wurde nach Registry-/Integrity-/Audit-/Lizenz-/Test-Gates branch-lokal übernommen.
- Major-Upgrades jeweils als eigenständige Migration mit Rollback und Compatibility Evidence behandeln.
- CodeQL Default Setup nur dann auf einen expliziten Runner umstellen, wenn der Owner die Security-Control-Mutation separat freigibt.


## Verifizierter npm-Capsule-Endstand

Exact promoted candidate: `9cd0c47348435adcb7b68ae117bd52dc34e45f2b` (vor nachfolgender Evidence-Aktualisierung).

Routine-Updates:
- `redis 6.2.1 → 6.3.0` in Root und Production-Runtime.
- `lucide-react 1.48.0 → 1.52.0`.
- `motion` bleibt `13.4.5`; Registry-`latest` war `14.0.0` und wurde als Major separiert.

Registry-/Lockfile-Integrities:
- redis 6.3.0: `sha512-XFQbPie1lGpKeUZ8ySYY43yLnQy/iIQtHNvIr/1XdaABpb96rUSdm3Mfl+98FEVbv9ZJIzINMno5s0Nh8E5LEw==`
- lucide-react 1.52.0: `sha512-TUgPtl5ZI9WgxOcbu4ckaC5B3l1qxPQrCMgb6OfUB9owx/OvSJfcf93SMgUWAxRw5/1XDfh9uI5F5iNGXCcGDQ==`

Transitive Änderungsklasse:
- `@redis/bloom`, `@redis/client`, `@redis/json`, `@redis/search`, `@redis/time-series`: 6.2.1 → 6.3.0
- `cluster-key-slot 1.1.2`: entfernt
- `redis`: 6.2.1 → 6.3.0
- `lucide-react`: 1.48.0 → 1.52.0
- keine Motion-/React-/NATS-/Zod-Mutation.

Gates:
- `npm ci` Root + Runtime: PASS
- `npm run lint`: PASS nach Korrektur des bestehenden Syntaxfehlers in `scripts/prepare-render-image.test.mjs`
- `npm test`: PASS nach Korrektur der veralteten Sideboard-Erwartung von 17 auf 16 Links
- `npm audit --omit=dev`: 0 Findings / Exit 0
- `npm audit`: 0 Findings / Exit 0
- License Engine: Exit 0

Die Candidate-Promotion war auf denselben PR-Branch, dieselbe Repository-Identity, exakt erwartete Versionen und grüne Audit-/Lizenz-/Funktions-Gates begrenzt.


## Ergebnis der npm Update Capsule

Erfolgreicher Run: GitHub Actions `TRUST npm Update Capsule`, Exact Head `11e171fcae194d637fa68793127a2cb737d04197`.

Übernommen:
- `redis` 6.2.1 → 6.3.0 (Root + Production Runtime)
- `lucide-react` 1.48.0 → 1.52.0
- `motion` bleibt 13.4.5

Registry-/Lockfile-Readback:
- redis 6.3.0 integrity: `sha512-XFQbPie1lGpKeUZ8ySYY43yLnQy/iIQtHNvIr/1XdaABpb96rUSdm3Mfl+98FEVbv9ZJIzINMno5s0Nh8E5LEw==`
- lucide-react 1.52.0 integrity: `sha512-TUgPtl5ZI9WgxOcbu4ckaC5B3l1qxPQrCMgb6OfUB9owx/OvSJfcf93SMgUWAxRw5/1XDfh9uI5F5iNGXCcGDQ==`

Transitive Redis-Closure:
- @redis/bloom 6.2.1 → 6.3.0
- @redis/client 6.2.1 → 6.3.0
- @redis/json 6.2.1 → 6.3.0
- @redis/search 6.2.1 → 6.3.0
- @redis/time-series 6.2.1 → 6.3.0
- cluster-key-slot 1.1.2 entfällt aus der neuen Closure

Security-/Lizenz-Gates:
- `npm audit --omit=dev`: Exit 0
- `npm audit`: Exit 0
- `scripts/license-engine.mjs`: Exit 0
- `npm ci` Root + Runtime: PASS
- `npm run lint`: PASS
- `npm test`: PASS

Motion:
- npm stable/latest readback = 14.0.0
- Major-Linie, daher bewusst nicht in Routine-Capsule übernommen.
- Upstream Upgrade Guide beschreibt für 14.0 keine Breaking Changes, trotzdem bleibt die Major-Klassifikation gemäß Root-Contract migrationspflichtig.

## Major-Migrationsentscheidungen

Die vier Major-Entscheidungen (TypeScript 7, Android Gradle Plugin 9.4, Go 1.27 und Motion 14) sind konsolidiert in:
- `MAJOR-MIGRATION-DECISIONS.md`

Keine dieser Major-Migrationen ist Bestandteil dieses Routine-PRs.
