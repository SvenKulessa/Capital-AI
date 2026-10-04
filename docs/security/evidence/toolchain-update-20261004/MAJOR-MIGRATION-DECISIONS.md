# Major-Migrationsentscheidungen — 2026-10-04

Primary Domain: CAPITAL-AI-TRUST  
Cross-Domain: PLATFORM / PRODUCT  
Routine-PR: #159 / capital-ai-trust/toolchain-update-20261004

Diese Entscheidungen sind bewusst **nicht** Bestandteil der Routine-Dependency-Capsule.

## A — TypeScript 6.0.3 → 7.0.2

**Entscheidung:** SEPARATE_MIGRATION_APPROVED_IN_PRINCIPLE / NOT_IN_ROUTINE_PR

Begründung:
- TypeScript 7 ist die neue native Go-Portierung des Compilers und kein gewöhnliches Patch-/Minor-Upgrade.
- Upstream beschreibt strukturelle Kompatibilität zu TypeScript 6, entfernt aber in 6.0 nur noch geduldete deprecated Optionen/Verhalten.
- CAPITAL-AI nutzt `tsc --noEmit` als Lint-/Type-Gate, `tsx` für Tests/Skripte und Vite/Rolldown für den Build.
- `tsconfig.json` setzt bereits explizit `target`, `module`, `moduleResolution` und enthält aktuell kein `ignoreDeprecations`.

Migrations-Gates:
1. eigener Branch `capital-ai-trust/typescript-7-migration-YYYYMMDD`
2. Registry integrity + npm provenance/lockfile readback
3. `tsc --noEmit` 6.0.3 vs 7.0.2 Ergebnisvergleich
4. `npm test`, `npm run build`, Browser-/Bundle-Gate
5. TypeScript-7-Go-Binary weiterhin durch vorhandene govulncheck-Reachability prüfen
6. Rollback auf 6.0.3-Lockfile

## B — Android Gradle Plugin 8.13.2 → 9.4.x

**Entscheidung:** SEPARATE_PLATFORM_MIGRATION_REQUIRED

Aktueller Stand:
- AGP 8.13.2
- Gradle 8.13 wird im Workflow explizit bereitgestellt
- Temurin JDK 17
- compileSdk/targetSdk 36
- kein repository-eigener Gradle Wrapper vorhanden

Offizielle AGP-9.4-Kompatibilität:
- Gradle mindestens/default 9.6.0
- JDK 17
- SDK Build Tools 36.0.0
- max API Level 37

Damit ist ein AGP-Upgrade zwingend gekoppelt an den Gradle-8.13→9.6-Wechsel. JDK 17 ist bereits kompatibel.

Migrations-Gates:
1. eigener PLATFORM-Branch
2. AGP-Release + Gradle-Distribution-Checksum verifizieren
3. Workflow auf Gradle 9.6 pinnen oder geprüften Wrapper einführen
4. assembleDebug / assembleRelease / bundleRelease
5. APK/AAB SHA256, Signatur-/Packaging-Regressions
6. Android API-/Variant-API-Kompatibilität
7. Rollback auf AGP 8.13.2 + Gradle 8.13

## C — Go Security Runtime 1.26.8 → 1.27.1

**Entscheidung:** SEPARATE_TRUST_MIGRATION_RECOMMENDED

Der Go-Container ist ausschließlich Security-Analyse-Laufzeit für `govulncheck`; er ist nicht Teil der CAPITAL-AI-Web-Runtime.

Go 1.27 hält die Go-1-Kompatibilitätszusage, enthält aber relevante Toolchain-/Standardbibliotheksänderungen, unter anderem zusätzliche Vet-Prüfungen sowie die neue `encoding/json`-Implementierungsbasis. Daher kein stiller Digest-Austausch.

Migrations-Gates:
1. offizielles `golang:1.27.1-alpine` Image + Registry-Digest verifizieren
2. govulncheck v1.8.0 unverändert halten
3. NATS-Binary-Reachability zweimal reproduzierbar ausführen
4. TypeScript-7-Binary-Reachability weiter prüfen, falls TS7-Migration parallel existiert
5. Evidence-Diff 1.26.8 vs 1.27.1
6. Rollback auf vorhandenen 1.26.8-Digest

## D — Motion 13.4.5 → 14.0.0

**Entscheidung:** SEPARATE_PRODUCT_MIGRATION_REQUIRED

Die npm Registry meldete in der Update Capsule am 2026-10-04 `latest=14.0.0`.
Damit ist die ursprünglich gewünschte `motion stable dist-tag`-Aktualisierung ein Major-Upgrade.

Besondere CAPITAL-AI-Relevanz:
- `vite.config.ts` enthält explizite Schutzlogik gegen zyklische Motion-/Vendor-Chunk-Aufteilung.
- Deshalb darf Motion 14 nicht gemeinsam mit Redis/Lucide als Routine-Update übernommen werden.

Migrations-Gates:
1. eigener PRODUCT-Branch
2. Motion 14 + framer-motion 14 Integrity/License/Dependency-Diff
3. Build + chunk-cycle-guard
4. relevante UI-/Animation-Smokes
5. Bundle-Größe gegen 500-kB-Gate
6. Rollback auf Motion 13.4.5

## Nichtentscheidung: CodeQL Default Setup Runner

Repository-Workflows sind bereits vollständig auf `ubuntu-26.04` festgelegt.
Die verbleibende `ubuntu-latest`-Meldung stammt aus GitHub CodeQL Default Setup.

Eine explizite Runner-Umstellung in GitHub Security Settings bleibt eine **separate Security-Control-Mutation** und ist nicht Teil von PR #159.
