# PLATFORM Production-Handoff Readback — 2026-10-04

Status: **BLOCKED**

Root-Contract: `AGENTS.md@currentmain`  
CURRENT_MAIN: `8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f`

## Zweck

Dieser Nachweis korreliert den aktuellen Repository-, CI-, GHCR-, Render-, Lizenz- und MARKET-Stand für den Production-Handoff. Er führt keinen Build, Publish, Deploy, Restart, Secret-/Auth-/DB- oder Broker-Eingriff aus.

## 1. Source und Governance

- Aktueller `main`: `8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f`.
- Der zuvor übergebene Stand `de4c268311c42877f8a7e1361e7de986ffb096cb` ist nicht mehr CURRENT_MAIN.
- PR #154 ist gemergt; Merge-SHA entspricht CURRENT_MAIN.
- Offener PR zum Snapshot: #155 (TRUST / LEGAL_POLICY).
- `POST_MERGE_CORRELATION@2` bleibt verbindlich; ein neuer Repository-HEAD allein ist kein Deploy- oder NATS-Redeploy-Signal.

## 2. Required-/Security-Checks

Für PR #154 / Head `41904cf5d46097046d6931e2bddac5c93ed500ea`:

- Docker Build Sicherheit Run `37217811644`: success.
- Job `Docker Security Gate`: success.
- Build, Source-/Secret-/Config-Scan, Image-Build, Runtime-Regressionen, Image-Scan, SBOM und Runtime-Lizenzinventar wurden ausgeführt.
- `publish_candidate`: skipped.
- `Production Handoff Gate`: skipped.
- Domain Governance Run `37217811639`: success.
- Post-Merge Correlation Run `37228026979`: success.
- Für den Merge-SHA selbst liefert der verfügbare Combined-Status-Readback keine Legacy-Status-Einträge; daraus wird kein zusätzlicher PASS abgeleitet.

Damit existiert für CURRENT_MAIN kein veröffentlichter, attestierter GHCR-Kandidat.

## 3. Historischer GHCR-Kandidat

Historisch verifizierter Candidate:

- Source-SHA: `4fbd1373b07092ed8ef550f60e9cf60f1f3f526d`
- OCI-Index: `sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`
- linux/amd64-Manifest: `sha256:3abee0293d0273fa0858e4bbdce00aca8d0f5060f9b9f64ee2c67f9dc6530a3e`
- Image-Config: `sha256:c161621d58ea32230750e95adf6551bb6f3c3ac697bfa048b0cf5393cd6356d3`
- Unveränderliche Referenz: `ghcr.io/svenkulessa/capital-ai@sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`
- Historischer Publish-Run: `36765644507`.

SBOM und Provenance sind historisch an diesen Source-SHA und OCI-Index gebunden. Dieser Kandidat ist älter als CURRENT_MAIN und darf nicht als aktuelles Production-Artefakt ausgegeben oder ohne Neubuild auf CURRENT_MAIN umetikettiert werden.

## 4. Render-Readback

Service:

- Workspace: `tea-d90o4rj7uimc739i86ug`
- Service: `Capital-AI`
- Service-ID: `srv-dau1rp893c1s73cdhm1g`
- Region: Frankfurt
- Auto-Deploy: aus
- Aktuelle Runtime: Docker / Git-backed
- Repository: `https://github.com/SvenKulessa/Capital-AI`
- Branch: `main`
- Dockerfile: `./Dockerfile`
- Registry Credential vorhanden: `ghcr-capital-ai` (Wert nicht gelesen)

Aktiver Deploy:

- Deploy-ID: `dep-db1ap9hsrm7s73arldtg`
- Status: `live`
- Source-Commit: `8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f`
- Trigger: API

Der vorherige Deploy `dep-db0ouns9v7es73cdig60` ist `deactivated`.

Wichtig: Der aktive Service ist weiterhin Git-/Docker-build-basiert. Es liegt im aktuellen Provider-Readback keine image-backed `ghcr.io/...@sha256:...`-Quelle vor. Deshalb sind `RENDER_IMAGE_SOURCE` und `RUNTIME_DIGEST` für den Zielzustand nicht erfüllt.

## 5. Runtime-Identität

Der zuletzt übergebene Health-Stand mit `buildIdentity.bound=false` / `sourceSha=null` darf nicht als Digest-/Build-Identität verwendet werden.

Für den aktuellen Git-basierten Deploy ist die Verfügbarkeit separat vom Ziel-Handoff zu betrachten. Solange kein attestierter CURRENT_MAIN-Kandidat als immutable GHCR-Digest deployed und anschließend über Provider-Readback plus Health-/Evidence-Contract korreliert wurde, bleibt die Zielidentität offen.

## 6. Lizenz-/Redistribution-Gate

`docs/security/evidence/license-rights-review.json` bleibt nicht freigegeben. Offene Punkte umfassen insbesondere:

- vollständige Source-/Delivery-Pflichten für ausgelieferte OS-Binaries,
- exakte Base-Binary-/Source-Provenance und Notice-Packaging,
- offene Nutzungs-/Herkunftsnachweise einzelner Assets,
- Provider-Vertrags-/Display-/Redistribution-/Derived-Data-/Retention-/Export-Scope,
- finale Font-/OFL-Bindung an das tatsächlich veröffentlichte Image.

Kein `APPROVED`, kein `deployEligible:true` für CURRENT_MAIN.

## 7. MARKET-Gate

Aktuelle kanonische MARKET-Evidence:

- Policy: `OPEN_SOURCE_AND_OPEN_DATA_ONLY`.
- Öffentliche Krypto-Score-Darstellung: blockiert.
- Zugelassene `scoringPriceInput`-Quellen: 0.
- Wikidata ist nur als CC0-Referenzmetadatenquelle zugelassen.
- Instrumentmanifest: 3 Referenzobjekte, 0 quote-eligible Instrumente.
- Synthetische Capacity-Evidence ist kein Ersatz für reale Instrument-Coverage, Datenrechte oder produktive Pipeline-Latenz.

MARKET bleibt damit für produktive Datenpfade separat BLOCKED.

## 8. GO-2026-5932

`GO-2026-5932` bleibt sichtbar. Historische bzw. CI-bezogene Reachability-/VEX-Nachweise dürfen nur für das exakt geprüfte Binary/Artefakt verwendet werden. Für ein anderes oder providerseitig neu gebautes Runtime-Artefakt wird kein `NOT_AFFECTED` übertragen. NATS wird durch diesen App-Handoff nicht neu deployed.

## 9. Supabase-Grenze

AIFINANCIAL (`ryzywoktpmyhwzxmstyu`) bleibt außerhalb dieses Container-Handoffs.

PR #154 hat Migrationsversions-Parität dokumentiert, aber keine DB-Härtung angewendet. Kein `migration repair`, kein `db push`, keine Retention-Löschung, keine Auth-/Tarifmutation und kein PostgreSQL-Upgrade werden durch diesen Nachweis autorisiert.

## 10. Rollback-Referenz

Der aktuelle Render-Service bleibt vor einer Digest-Migration unverändert Git-backed. Ein späterer Digest-Cutover benötigt vor Ausführung:

1. attestierten CURRENT_MAIN-Kandidaten,
2. positive Lizenz-/Security-Gates,
3. immutable GHCR-Referenz,
4. bestätigten geeigneten vorherigen Digest als Rollback-Ziel,
5. providerseitigen Readback nach Mutation.

Der historische Digest `sha256:53c47463...` ist technisch identifiziert, aber wegen Source-Drift und offener Freigaben **nicht automatisch als Rollback-Freigabe** klassifiziert.

## 11. 3 Validate / 5 Approve

### 3 Validate

1. Source/Governance/Render-Readback: **PASS**.
2. Historische GHCR-Identität und Drift-Trennung: **PASS**.
3. Aktueller attestierter Candidate + immutable Render-Runtime-Identität: **BLOCKED**.

### 5 Approve

1. PLATFORM: **BLOCKED** — kein CURRENT_MAIN-GHCR-Candidate, Render nicht image-backed.
2. TRUST: **BLOCKED** — Lizenz-/Redistribution-Gate offen.
3. MARKET: **BLOCKED** — 0 zugelassene scoringPriceInput-Instrumente.
4. Runtime Evidence: **BLOCKED** — Ziel-Digest/Runtime-Korrelation fehlt.
5. Owner: **PENDING** — Build/Publish sowie Production-Mutation separat freizugeben.

## Kleinster verifizierbarer nächster Schritt

Keinen alten Digest promoten. Zuerst CURRENT_MAIN erneut lesen und dann — nur innerhalb der Owner-Freigabe für kostenrelevante Workflows — genau einen Candidate-Publish über den bestehenden `build-security.yml`-Pfad auf `main` ausführen. Danach Candidate-SHA, OCI-Index, Plattformmanifest, Config-Digest, SBOM und Provenance gegen den veröffentlichten Digest verifizieren.

Erst nach positiven TRUST-/MARKET-Gates die Render-Migration auf den immutable Digest durchführen; kein Rebuild zwischen Prüfung und Promotion.

**Endstatus dieses Snapshots: BLOCKED.**
