# PLATFORM Digest-Korrelation und Promotion-Preflight

Stand: 04.10.2026. Ergebnis: **BLOCKED**, `deployEligible:false`.
Root-Policy: AGENTS.md@8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f; bestehende Production-/Domain-/POST_MERGE_CORRELATION@2-Gates unverändert.
Maschinenlesbarer Readback: [digest-correlation.json](digest-correlation.json).
Diese Evidence ergänzt den bestehenden Handoff; die älteren Snapshot-Abschnitte bleiben historisch und sind keine aktuelle Freigabe.

## Source, Required Checks und Scope

CURRENT_MAIN: `8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f`. #127, #128, #129 frisch als gemergt bestätigt.
Offen: #155, Head `10a80801b99b8407e06593912294e1574a0143eb`; isolierte LEGAL_POLICY-App, keine Lizenzfreigabe des App-Images.
Docker Security Gate: success auf exakt Main, Run 37228026891 / Job 111511633913.
Vier CodeQL Analyze-Jobs: success auf exakt Main, Run 37228026761. Kein findingsfreies oder rechtlich freigegebenes Release daraus ableiten.
Domain Governance: success auf PR-154-Head `41904cf5d46097046d6931e2bddac5c93ed500ea`, nicht als Main-Check umetikettieren.
Aktives Ruleset 24259174: PR-Pflicht, strikte Docker-/Domain-Checks, Delete-/Non-fast-forward-Schutz, lineare History, keine Bypass-Akteure; zusätzlich code_scanning und code_quality.
Source-bound Code-Quality-Abnahme fehlt. Der Handoff-Workflow schreibt derzeit `analysis-results.json=[]`; dieser Platzhalter erfüllt die aktiven Analyse-Gates nicht.
Keine Schutzregel geändert, keine kostenpflichtige Security-Funktion aktiviert.

## Artefakte und konkreter Fehler

Current-Main Evidence-ZIP: Artefakt 11312334188; SHA-256 `d4297352484796e6300b28c309161b613f4d726b80039b2f5a0ae87cd21fca69` lokal gegen Provider bestätigt.
Dies ist kein OCI-Digest. Publizierung und Handoff sind skipped; kein Current-Main-Candidate, kein zurückbehaltener Candidate-Tar in dieser Artefaktliste.
Die als Config klassifizierte Docker-inspect-ID `sha256:86a7dd5126aea2e6d57e0be35e30f7f475db5ba45a7e3c3caaaa8d1c76fff363` wird ohne exakte Config-Bytes nicht als geprüfter Config-Digest übernommen.
CI-Smoke bindet Main im Image; Production tut dies nicht.

Neuester in den 37 manuellen Runs gefundener veröffentlichter Candidate: Run 36991527731, Source `b60367e8e54b190a83e2e8d6556eb59ded699434`.
Artefakt 11219842820; ZIP-SHA-256 `9a6f92da2c62d381366bc677fccec684bbfbc12d837239bca1e5b7d6532ac4f3` bestätigt.

| Identität | Frischer GHCR-Readback |
| --- | --- |
| OCI Index | `sha256:abdee6d0d67f00dcc64aca94471291af845a9e48ea70b3780aee46359f255fbb` |
| linux/amd64 Manifest | `sha256:10238fc57cbf75774fafda7597cb0575b218bbe24ddcbad5fadc6b610e143652` |
| Image Config | `sha256:f64fdd55bad0999d86eedf719c79de2bd69dde28e0681f0c4e0341f1933ef78f` |

Alle drei Registry-Objekte wurden per Digest gelesen und ihre Rohbytes SHA-256-geprüft.
Candidate-Evidence nennt fälschlich den Index auch als Config/localImageId. Der Registry-Scanner bestätigt dagegen `f64fdd…`.
Die historischen Provenance-/SBOM-Verifikationsberichte nennen denselben Index als subject, b60367e… als source und den erwarteten GitHub-hosted Workflow.
Das ist verifizierte historische CI-Evidence; keine erneute lokale Sigstore-Signaturprüfung behaupten. Keine Attestation für heutigen Main.

Main liegt 34 Commits voraus. Vollständiger Blob-/Pfadvergleich beider nicht abgeschnittener Git-Bäume: 394 Änderungen (255 neu, 7 entfernt, 132 verändert), komplett in JSON.
Der Compare-Endpunkt liefert nur 300 Dateien; dessen Dateiliste wurde nicht als vollständig behandelt.
Betroffen sind unter anderem Dockerfile, build-security.yml, Auth, Market-Policy, Runtime, Provider-/Scoring-Contracts und Migrationen. Damit kein dokumentarischer Null-Drift und keine Identitätsgleichheit.
Die semantische Freigabe sämtlicher Änderungen wird nicht behauptet. Der historische Candidate wird ausgeschlossen.

## Enger Fix und Prüfung

`scripts/docker-archive-config.mjs` hasht die echten Config-Bytes aus dem exportierten und gescannten Image.
Es akzeptiert klassische und containerd-Archivpfade, prüft deren Digest und linux/amd64, und blockiert mehrdeutige/manipulierte Exporte.
Der Workflow vergleicht nach Load den erneut exportierten Config-Digest; Registry-Config kommt aus dem gehashten Plattformmanifest; nach Pull wird erneut der Archiv-Config-Digest verglichen.
Kein Anwendungs-Rebuild zwischen Prüfung und Veröffentlichung. Keine Gate-Abschwächung, keine historischen Candidate-Dokumente umgeschrieben.
30 lokale Tests PASS: Archiv-Fixtures und Negativfälle, Container-Identität, Production-Handoff und Ruleset-Regressionssuite. Workflow-YAML parsebar.
Grenze: echte Docker-Build-/Load-/Push-/Pull-Kette und neue CI auf dem vorgeschlagenen Head noch nicht durchgeführt.
CI bleibt mit `[skip ci]` zurückgehalten. Kein automatischer Candidate-Publish.

## Provider und Runtime

Capital-AI / srv-dau1rp893c1s73cdhm1g / Workspace tea-d90o4rj7uimc739i86ug:
live `dep-db1ap9hsrm7s73arldtg`, Provider-Commit exakt CURRENT_MAIN.
Quelle weiterhin Git/main/Dockerfile; Auto-Deploy off; kein imagePath oder Provider-Image-Digest.
Beide Health-URLs frisch HTTP 200, status=ok, ingress=fail_closed; Redis/NATS/PubSub/Subscriber connected.
verifiedDeliveries=0 in diesen Snapshots; frühere Transportlogs werden nicht als frischer Delivery-Test ausgegeben.
buildIdentity.bound=false, sourceSha=null; quotesEnabled=false, scoreDisplayEnabled=false.
Auth-Session HTTP 200, configured=false; reale Login-/Session-/Refresh-/Logout-Abnahme offen.
Keine Secrets, Runtime-Env-Identitätsbehauptungen oder internen Zugangsdaten veröffentlicht.

## TRUST und MARKET

Lizenz-/Redistribution: REVIEW_OPEN, deployEligible=false, legalApproval=null; Evidence ist weiterhin an ed594ef… statt Main gebunden.
OS-Binary-/Corresponding-Source-/NOTICE-Pflichten, Asset-Nutzungsbedingungen/Trademark-Scope, tatsächlich genutzte Provider-Rechte und Font-Packaging offen.
Kein APPROVED aus Produkt-/Preisseiten, Provider-Auswahl oder monetarisierten Entitlements abgeleitet.

OPEN_SOURCE_AND_OPEN_DATA_ONLY: Wikidata ausschließlich Referenzmetadata; 0 zugelassene Quote- und Scoring-Quellen.
Reales Katalogmanifest: 100 Instrumente, 20 je Klasse; Rohstoffe nur 8 kanonische Basisassets. Status CATALOG_EVIDENCE_NOT_RIGHTS_ADMISSION.
Kanonisches Mindestgate im mandatory-review: 100 Krypto + 100 Aktien. Erweiterter isolierter Benchmarkplan: 500/300/100/100/300 = 1300, nicht ausgeführt/nicht produktiv.
Synthetische 600-Asset-Kapazität ist weder Coverage noch produktive Pipeline-Latenz. Rechte/Eligibility/Manifest bleiben separat bei MARKET; keine Datenpfad-Aktivierung.

GO-2026-5932 bleibt im Rohbefund sichtbar: x/crypto v0.57.0 / UNKNOWN.
CI-Binary SHA-256 `387ce54e7a0a249d877a579ed641d715bab047d7e061bfa42b4d07f6a0401341`: symbolbasierte Reachability/VEX NOT_AFFECTED, vulnerable_code_not_present, keine Suppression.
Production-NATS-Binary-/Digest-Bindung fehlt: Runtime-Klassifikation weiterhin UNKNOWN. Kein NATS-Redeploy.

## Supabase-Grenze: Übergabestand korrigiert

AIFINANCIAL ryzywoktpmyhwzxmstyu frisch ACTIVE_HEALTHY, PostgreSQL 17.6 / Provider 17.6.1.127.
touch_social_media_accounts_updated_at hat search_path=pg_catalog; alle vier vorgeschlagenen FK-Indizes vorhanden.
Vier service_role_full_access-Policies inzwischen TO service_role, USING true / WITH CHECK true.
Damit ist der frühere „nicht ausgeführt“-Katalogstand überholt; diese Session hat nichts angewandt und bestimmt nicht den Urheber früherer Mutationen.
Isolierte Trigger-/RLS-Zugriffstests bleiben unbestätigt.
94 lokale und 94 Remote-Versionen stimmen mengenmäßig überein; vollständige Statement-Parität/Empty-DB-Replay nicht verifiziert.
Advisor: Leak-Schutz deaktiviert, fünf RLS-ohne-Policy INFO, 115 ungenutzte Indizes INFO. Keine Indexlöschung daraus abgeleitet.
Cron: 95500 Rows, 66404352 Bytes, ältester Start 30.07.2026; 30-Tage-Retention nur Empfehlung, nicht ausgeführt.
Upgrade-Angebot, Backup-/Restore-Nachweis, Wartungsfenster und Tarifprüfung bleiben separate offene Aufgaben.
Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
Keine DDL-/migration-repair-/Retention-/Auth-/Tarifmutation.

## Konkreter Promotion- und Rollback-Plan: gesperrt

Vor Candidate-Build: TRUST/MARKET-Gates und freigegebenen CI-Scope schließen, Fix reviewen, aktuellen Main erneut korrelieren.
Dann einmaliger existing build-security.yml-Dispatch mit publish_candidate=true / verify_production_handoff=false auf exakt diesem Main.
Dasselbe exportierte Image laden/publishen; I/P/K-Digests, Scan, SBOM und Provenance gegen Digest prüfen. candidate.json bleibt deployEligible=false.
Source-bound Required-/CodeQL-/Code-Quality-Evidence ergänzen; [] darf nicht zu PASS umgedeutet werden.
Vor Provider-Mutation: geeigneten vorher attestierten Rollback-Digest einschließlich kompatiblem Auth-/Schema-/Runtime-Scope nachweisen.
Ein solcher Digest ist aktuell nicht nachgewiesen. Weder b60367e… noch 4fbd137… sind known-good Production-Rollback.
Aktueller Git-Deploy ist eine Betriebsreferenz, kein immutable Image-Rollback.

Owner-Optionen erst mit geeignetem Candidate/Rollback zur Ausführung:
A — bestehenden Service auf geprüften ghcr.io/svenkulessa/capital-ai@sha256:<I> umstellen; empfohlen nach allen Vorbedingungen, keine zusätzliche Instanz.
B — Git-Quelle unverändert halten, bis alle Vorbedingungen samt Rollback nachgewiesen sind; aktueller sicherer Hold.
Konkreten echten Digest einsetzen, Registry-Credential auf read:packages begrenzen, bestehenden Plan/Region/Domains/Secrets/Healthcheck bewahren.
Nach Freigabe providerseitig Quelle, Deploy-ID, image.ref=I und image.sha=P zurücklesen; Health bound=true und sourceSha=C bestätigen.
Reale Auth-Kette sowie finale bestehenden Handoff-Gates erfüllen. Grüner Healthcheck und live sind keine Release-Freigabe.
Provider-Umstellung ist mit derzeit verfügbarem Render-Connector nicht möglich; bevor Browser-Fallback genutzt wird, dessen Scope gesondert freigeben.
Keine neue kostenpflichtige Instanz, keine Broker-/DB-Mutation.

## 3 Validate / 5 Approve

Validate 1 — Source/Provider/Governance: Readbacks dokumentiert; vollständige Release-Abnahme BLOCKED.
Validate 2 — Archiv-/Registry-/Identity-Regression: lokale Tests PASS; neue reale Candidate-Kette OPEN.
Validate 3 — Production-/Auth-/Rollback-Korrelation: BLOCKED.
Drei unabhängige positive End-to-End-Zyklen: 0/3; keine Self-Healing-Promotion.

DETECT positiv; CORRELATE mit expliziten fehlenden Links; CLASSIFY MANUAL_REVIEW_REQUIRED;
REMEDIATE ausschließlich Entwurfs-Fix; VERIFY lokal positiv, Production BLOCKED.
Bestehende fünf Prozessstufen und Owner-Gates bleiben bestehen. Keine fünf menschlichen Reviews als Repository-Regel erfinden.
Überlieferte Owner-Option A_GATE_FIRST_THEN_DIGEST_PROMOTION bleibt gategebunden, nicht pauschale neue Deployment-/CI-Freigabe.

**Endzustand: überprüfbar BLOCKED.** Keine Production-, Secret-, Supabase-, NATS-, Valkey-, Lizenzfreigabe- oder kostenrelevante Workflow-Mutation.

