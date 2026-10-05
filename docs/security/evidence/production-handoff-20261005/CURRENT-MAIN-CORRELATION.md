# TRUST/PLATFORM Current-Main Production-Handoff Korrelation

Stand: 2026-10-05. Ergebnis: **BLOCKED**, `deployEligible:false`.

Diese Evidence ersetzt keine historische Evidence. Sie supersediert deren Autorisierung für den aktuellen Release-Stand und korreliert ausschließlich den beobachteten Zustand gegen `CURRENT_MAIN`.

## Authority und Source

- `CURRENT_MAIN=caa2c14fb4b317529f7a05385ca11eb7016b7f8a`
- Root-Policy: `AGENTS.md@currentmain`, Blob `465ade060896732b00c41df1bac06dbe00bc73e5`
- Merge-Reihenfolge seit 8045c789: #161 LEGAL_POLICY, #162 Chat-Status, #163 MARKET Quellenzulassung, #166 NATS scoped Credentials/kanonische Asset-Werte.
- Offene PRs beim Readback: keine.

## Required Analysis auf exakt CURRENT_MAIN

Check-Run-Readback für `caa2c14...`:

- Docker Security Gate: **SUCCESS**, Job `111566224170`, Run `37246817255`
- CodeQL Analyze (actions): **SUCCESS**, Job `111566225609`
- CodeQL Analyze (java-kotlin): **SUCCESS**, Job `111566225351`
- CodeQL Analyze (python): **SUCCESS**, Job `111566225317`
- CodeQL Analyze (javascript-typescript): **SUCCESS**, Job `111566225159`
- Supabase Preview: skipped
- `publish_candidate`: skipped
- Production Handoff Gate: skipped

Ein erfolgreicher Scan ist keine Lizenz-, Security- oder Production-Freigabe.

## Render Source-/Runtime-Korrelation

Capital-AI Webservice:

- Service: `srv-dau1rp893c1s73cdhm1g`
- Live Deploy: `dep-db1epvgu01pc73e4ad6g`
- Provider Commit: exakt `caa2c14...`
- Trigger: API
- Quelle bleibt Git/main/Dockerfile; immutable GHCR-Image-Quelle ist nicht nachgewiesen.

NATS/Market-Events:

- Service: `srv-dauhcoojo6nc738eedjg`
- Live Deploy: `dep-db1epuegekts73dg9f0g`
- Provider Commit: exakt `caa2c14...`
- scoped Credentials / JetStream-Rechte und kanonische Asset-Werte sind Bestandteil von #166.
- Die Release-Freigabe des Gesamtprodukts folgt daraus nicht.

Damit ist der frühere Source-Drift zwischen Repository-Main und Render geschlossen. Die unveränderliche Container-Identitätskette bleibt offen.

## Container / Candidate

Der Config-Digest-Fix aus #157 ist in main. `build-security.yml` hasht die exportierten Config-Bytes und korreliert Index, linux/amd64 Manifest und Config.

Für `caa2c14...` liegt im beobachteten Push-Lauf jedoch **kein veröffentlichter Candidate** vor:
- `publish_candidate=SKIPPED`
- Production Handoff Gate = `SKIPPED`
- kein neuer GHCR OCI Index/Manifest/Config-Digest für diesen SHA
- keine an diesen neuen Digest gebundene SBOM-/Provenance-Attestation
- kein neuer immutable Rollback-Digest

## MARKET

#163 und #166 sind in CURRENT_MAIN. Die kanonische Policy bleibt `OPEN_SOURCE_AND_OPEN_DATA_ONLY`.

Aktuell admitted:
- Wikidata Reference Metadata: `OPEN_SOURCE_OPEN_DATA_ADMITTED`, aber nur `REFERENCE_METADATA_ONLY`
- `marketQuotes=false`
- `scoringPriceInput=false`

Daher bleiben produktive Quote-/Scoring-Gates fail-closed. NATS-/Replay-Transport-Evidence darf nicht als Datenrechte- oder Score-Admission umgedeutet werden.

## Lizenz / Redistribution

Die bestehende License/Rights-Evidence bleibt für die Gesamt-Production-Freigabe nicht ausreichend. Proprietäre Datenproviderpfade bleiben BLOCK/REVIEW_REQUIRED; MARKET-Open-Data-Zulassung muss capability- und instrumentspezifisch erfolgen. LEGAL_POLICY aus #161 ist Bestandteil von main, ersetzt aber keine produktspezifische Rechtefreigabe.

## Auth

Keine neue reale Registration/Login/Google-PKCE/Session/Refresh/Logout-E2E-Evidence wurde in diesem Readback nachgewiesen. Auth bleibt deshalb für Production-Abnahme offen. Keine Secret-Rotation oder Auth-Konfigurationsmutation wurde in dieser Korrelation ausgeführt.

## Rollback

Ein geeigneter, attestierter immutable Production-Rollback-Digest für den heutigen App-Stand ist nicht nachgewiesen. Historische Candidate-Digests werden nicht als known-good Rollback umetikettiert.

## 3 VALIDATE

1. Source/Governance/Render-Commit-Korrelation: **PASS**
2. Container-/Candidate-/Attestation-Kette: **BLOCKED**
3. Production Auth/MARKET/Rollback/E2E: **BLOCKED**

Positive unabhängige vollständige Zyklen: `0/3`. Self-Healing bleibt `OBSERVE_ONLY`.

## 5 APPROVE

- TRUST: **BLOCKED**
- MARKET: **BLOCKED**
- PLATFORM: **BLOCKED** bis immutable Candidate + Rollback + Render-Digest-Korrelation
- Runtime Evidence: **BLOCKED**
- Owner: bestehende Gate-first-Freigabe ist konditional; keine Gate-Umgehung

**Endzustand: BLOCKED.**

Kleinster nächster Schritt: einmaliger `workflow_dispatch` von `.github/workflows/build-security.yml` auf exakt `main@caa2c14...` mit `publish_candidate=true` und zunächst `verify_production_handoff=false`. Danach Registry-Index, Plattformmanifest, Config, SBOM und Provenance aus dem erzeugten Candidate-Artefakt korrelieren.