# Production-Handoff Readback — 2026-10-04

Status: **BLOCKED**

Diese Evidence erweitert ausschließlich die bestehende kanonische Security-/Production-Handoff-Struktur. Sie erzeugt keine neue Authority und autorisiert weder Deployment noch Datenpfad, Supabase-DDL, NATS-Redeploy oder Provider-Aktivierung.

## 1. Source und Governance

- CURRENT_MAIN: `de4c268311c42877f8a7e1361e7de986ffb096cb`
- Offene Pull Requests beim letzten Readback: `0`
- PR #127, #128 und #129: gemergt.
- PR #129 Head: `3255cf09a193774ad409ff8f10583264c23d99c0`
- PR-Test-Merge-SHA: `87824514fb137557cd5d14393792c5c72820c4b5`
- Docker Security Gate: PASS, Run `37161642895`, Job `111316128339`
- Domain Governance: PASS, Run `37161642871`
- Post-Merge Correlation: PASS, Run `37161796854`
- Candidate-Publishing: SKIPPED
- Production-Handoff-Gate: SKIPPED
- Exakter source-bound CodeQL-Readback für den Squash-Main `de4c268…`: in dieser Session nicht positiv belegt. Kein PASS erfinden.

Der Docker-Security-Run bindet PR-Head, Base und getesteten Merge-SHA explizit. Sein lokales Image besitzt die Config-ID `sha256:b6344f086764a38baaa63c53542c20b92a9f7981fec9bc539cd65bee377a974c`; OCI-Index-/Plattform-/Registry-Digests sind dort null, weil der Publish-Schritt übersprungen wurde.

## 2. Candidate-/GHCR-Identität

Für CURRENT_MAIN existiert im verifizierten Readback **kein veröffentlichter Candidate**.

Historische, attestierte Kette:
- Source C: `4fbd1373b07092ed8ef550f60e9cf60f1f3f526d`
- OCI Index I: `sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`
- linux/amd64 Manifest P: `sha256:3abee0293d0273fa0858e4bbdce00aca8d0f5060f9b9f64ee2c67f9dc6530a3e`
- Image Config K: `sha256:c161621d58ea32230750e95adf6551bb6f3c3ac697bfa048b0cf5393cd6356d3`
- Attestation-/Publish-Run: `36765644507`

Diese Kette darf nicht für den aktuellen Main ausgegeben werden. Vergleich C → CURRENT_MAIN: 117 Commits voraus, 300 geänderte Dateien, 23.778 Additions / 84 Deletions; darunter `Dockerfile`, Security-Workflow und Runtime-/Contract-Dateien. Das ist kein dokumentarischer Null-Drift.

## 3. Render Provider-Readback

Service `Capital-AI`:
- Workspace: `tea-d90o4rj7uimc739i86ug`
- Service: `srv-dau1rp893c1s73cdhm1g`
- Deploy: `dep-db0ouns9v7es73cdig60`
- Status: `live`
- Source-Commit: `de4c268311c42877f8a7e1361e7de986ffb096cb`
- Quelle: Git-Repository `SvenKulessa/Capital-AI`, Branch `main`, `./Dockerfile`
- Auto-Deploy: aus

Der Provider-Buildlog zeigt einen erneuten Docker-Build inklusive Tests und Frontend-Build. Der aktuelle Live-Zustand ist deshalb **Git-built**, nicht durch unveränderlichen GHCR-Digest promoted. `build once / promote many` ist für den aktuellen Deploy nicht erfüllt.

Render-Logs nach dem Deploy zeigen erfolgreiche NATS-JetStream-`quote.publish_ack`, Valkey-`quote.atomic_set_publish` und Replay-Ereignisse. Das belegt Transport/Delivery, nicht Datenrechte, reale Instrument-Coverage oder Production-Latenz.

Letzter übergebener Health-Readback bleibt:
`status=ok`, `ingress=fail_closed`, `buildIdentity.bound=false`, `buildIdentity.sourceSha=null`.
Der öffentliche Health-Body konnte in dieser Session nicht erneut direkt abgeholt werden; daher wird dieser Teil als Übergabe-Readback, nicht als neuer Providerbeweis geführt.

## 4. Security-/Lizenz-/MARKET-Gates

- `LICENSE_REDISTRIBUTION_REVIEW`: weiterhin `REVIEW_OPEN`.
- Commercial-MARKET-Review: `PARTIAL_REVIEW_NOT_PRODUCTION_AUTHORIZATION`; `commercialProductionAllowed=false`.
- Default-Instrumente im Runtime-Code: `BTCUSDT,BTCUSD,AAPL`.
- Kanonisches Mindestgate bleibt mindestens 100 Krypto + 100 Aktien; der 1300-Basisasset-Plan (500/300/100/100/300) ist Benchmark-/Plan-Evidence, keine reale Coverage.
- Synthetische Kapazitätsbenchmarks werden nicht als Instrumentmanifest oder Live-Latenz gewertet.
- MARKET muss reale Quellenzulassung, Dataset-/Use-Case-Rechte, Eligibility und Instrumentmanifest separat schließen.

`GO-2026-5932` bleibt sichtbar. Der Rohbefund im NATS-Image nennt `golang.org/x/crypto v0.57.0`, Severity `UNKNOWN`. Vorhandene CI-Reachability-/VEX-Evidence wird nicht auf das aktuell von Render gebaute NATS-Artefakt übertragen. Production-Klassifikation bleibt deshalb `UNKNOWN`; keine Scanner-Suppression.

## 5. Supabase-Grenze

AIFINANCIAL `ryzywoktpmyhwzxmstyu` ist `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.127`.

Frischer Advisor-/Katalog-Readback:
- 1 Funktion mit mutable `search_path`
- 4 unindizierte Fremdschlüssel
- 4 `auth_rls_initplan`-Warnungen
- Passwort-Leak-Schutz deaktiviert
- 110 als ungenutzt gemeldete Indizes
- 89 Remote-Migrationen
- 4 lokale Migrationsdateien gefunden; 3 Versionen korrelieren, `20260926000000` ist lokal-only
- damit weiterhin 86 Remote-Migrationen ohne lokale Entsprechung
- Cron: 94.258 Rows, 65.536.000 Bytes, ältester Start 2026-07-30, 0 non-succeeded

Keine vorgeschlagene SQL, Migration-Repair-, Retention-, Auth-, Tarif- oder Upgrade-Mutation wurde ausgeführt.

## 6. Rollback

Historischer unveränderlicher Image-Ref:
`ghcr.io/svenkulessa/capital-ai@sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`

Klassifikation: **technisch korreliert historisch, aber nicht Production-approved**. Nicht als „known-good Production Release“ bezeichnen.

## 7. Entscheidungsstatus

**BLOCKED**

Hauptgründe:
1. Kein veröffentlichter/attestierter GHCR-Candidate für CURRENT_MAIN.
2. Render läuft als Git-basierter Docker-Rebuild und nicht per immutable Digest.
3. Runtime-Build-Identity ist nicht gebunden.
4. Lizenz-/Redistribution- und MARKET-Datenrechte sind nicht freigegeben.
5. GO-2026-5932 besitzt keinen übertragbaren exakten Production-Artefakt-Nachweis.
6. Exakter current-main CodeQL-/Rule-Readback ist in dieser Session nicht vollständig positiv belegt.

Die Umstellung des bestehenden Render-Services von Git-Build auf GHCR-Digest ist eine wesentliche Production-Mutation und benötigt vor Ausführung eine Owner-Entscheidung. NATS wird aufgrund dieses Handoffs nicht neu deployed.

## 8. Owner-Freigabe und Gate-Hold

Owner-Freigabe vom 2026-10-04: **Option A – Gate-first, danach Digest-Promotion**.

Aktueller CURRENT_MAIN nach Merge von #132: `5d0a7b5bf13977c68cd74ddd65fd092961dc8d15`.

Die Freigabe ist ausdrücklich an die bestehenden Gates gebunden. Sie autorisiert **keine** Umgehung von TRUST-, MARKET-, Security- oder Identity-Gates. Der aktuelle MARKET-Stand auf Main bleibt fail-closed:

- `OSS_SOURCE_ADMISSION=FAIL`
- `MULTI_ASSET_LIVE_UNIVERSE=FAIL`
- keine admitted Source
- Open-Data-only ist für Mobile dokumentiert; proprietäre Verträge allein schließen das Mobile-Gate nicht
- Twelve Data, Massive und FinancialData.Net: Anfragen versendet, keine belastbare schriftliche Rechtefreigabe beobachtet
- Kraken: Zusatzangaben beantwortet; schriftliche kommerzielle Market-Data-Freigabe weiterhin ausstehend

Folge für PLATFORM: **kein Candidate-Publish, kein Render-Quellenwechsel und kein NATS-Redeploy**, solange diese Gates nicht geschlossen sind.

Nächster zulässiger Übergang:
1. TRUST/MARKET schließen Source-/Rights-/Coverage-Gates.
2. CURRENT_MAIN erneut lesen.
3. Exakten Main einmalig bauen und als GHCR-Candidate veröffentlichen.
4. OCI Index, Plattformmanifest, Config-Digest, SBOM und Provenance verifizieren.
5. Ohne Rebuild denselben Digest auf Render promoten.
6. Provider- und Runtime-Identity erneut readbacken.

## Frischer PLATFORM-Readback nach Main 8e34c7a…

Die älteren Snapshot-Angaben oben bleiben historische Evidence. Aktueller Ergänzungsstand: [Digest-Korrelation und Promotion-Preflight](DIGEST-CORRELATION.md), [vollständiger maschinenlesbarer Readback](digest-correlation.json). Ergebnis weiterhin BLOCKED; insbesondere neuerer historischer Candidate, Config-Digest-Konflikt und geänderter Supabase-Katalogstand berücksichtigen. Keine zusätzliche Authority oder Freigabe.

