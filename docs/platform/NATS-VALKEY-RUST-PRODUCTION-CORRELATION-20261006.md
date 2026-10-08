# PLATFORM · NATS / Valkey / Rust Provider-Bridge Production Correlation

Stand: 2026-10-06
CURRENT_MAIN: `4fa3e3f92547cd6356f46490a38e9b7515f69a6d`

## Live Runtime

### Valkey

`capital-ai-market-cache` ist als Render Key Value in Frankfurt verfügbar.

Produktiver Vertrag:
- Valkey 8.1.10
- persistence: `off`
- eviction: `allkeys_lru`
- Verwendung ausschließlich als regenerierbarer Hot-State/Cache
- keine kanonische Evidence-Authority

Nach dem App-Deploy auf CURRENT_MAIN meldet die Runtime einen erfolgreichen Valkey-Connect.

### NATS JetStream

`capital-ai-market-events` wurde wegen eines realen NATS-Control-Plane-Diffs auf CURRENT_MAIN deployed. Dies war **kein** Head-only-Redeploy.

Produktiver Vertrag:
- NATS 2.15.0
- JetStream File Store
- getrennte Principals für App, Rust Bridge und Node Executor
- Private Provider Queries verwenden Core-NATS Request/Reply und werden nicht in JetStream persistiert
- NATS App/Bridge/Executor Credentials liegen nur als Render Secrets vor

Nach dem Deploy wurde `CAPITAL_FACTS` erfolgreich wiederhergestellt; der Broker meldet `Server is ready`.

Offener Hardening-Befund:
- NATS warnt bei plaintext password credentials in der generierten Runtime-Konfiguration.
- Langfristiges Ziel: NKeys/JWT oder gebcryptete Passwörter.
- Wiederholte localhost authentication errors bleiben Probe-Noise; keine Lockerung der ACLs wird dafür vorgenommen.

### Capital-AI Node Runtime

Die Web-Runtime läuft auf CURRENT_MAIN und verbindet sich erfolgreich mit Valkey und NATS.

Konfiguriert:
- scoped NATS App Identity bleibt unverändert
- NATS Executor Identity ist gesetzt
- Private-Provider HMAC Signing Secret ist gesetzt
- `PRIVATE_PROVIDER_BRIDGE_ENABLED=false`

Der Schalter bleibt absichtlich aus, bis der dedizierte Rust Worker live und positiv geprüft ist.

## Rust Provider Bridge

Die bereits verifizierte Rust-Fortsetzung wurde auf
`capital-ai-platform/provider-bridge-production-20261006`
gegen CURRENT_MAIN rekonstruiert.

Verifizierte Vor-Evidence:
- Rust 1.99.0
- `Cargo.lock` v4
- `cargo test --locked`: 7/7 PASS
- `cargo clippy --locked --all-targets -- -D warnings`: PASS
- `cargo audit 0.22.2`: PASS
- `cargo deny 0.20.2`: advisories/licenses/bans/sources OK
- Release-Binary wurde erfolgreich gebaut und SHA-256 gebunden

Produktions-Artefakte im Branch:
- `services/provider-bridge-rs/Cargo.lock`
- korrigierter NATS Healthcheck in `src/main.rs`
- `deploy/Dockerfile.provider-bridge`
- `deploy/render-provider-bridge.yaml`
- aktualisierte `deploy/render-nats.yaml`
- aktualisierte `render.yaml`
- path-scoped `PLATFORM Provider Bridge Security` Workflow
- Deployment-Contract-Regression

## Produktionsgrenze

Die Rust Bridge ist ein NATS-only Background Worker ohne Inbound-Port.

Sie darf **nicht** als öffentlicher Render Web Service modelliert werden.

Finale Aktivierungsreihenfolge:
1. Provider-Bridge OCI Security Gate PASS.
2. Branch gegen CURRENT_MAIN synchron halten und PR/Required Checks abschließen.
3. Worker als Render Background Worker in Frankfurt provisionieren.
4. exakt dieselben `NATS_BRIDGE_*` Secrets binden, die serverseitig im Broker zugelassen sind.
5. Worker-`--healthcheck` gegen NATS PASS.
6. Query→Bridge→Executor Roundtrip ohne Provider-Secret in NATS belegen.
7. erst danach `PRIVATE_PROVIDER_BRIDGE_ENABLED=true` in der App setzen.
8. App erneut deployen und negativen Mutations-/Secret-Leak-Test wiederholen.

Bis Schritt 6 bleibt der private Provider Endpoint fail-closed.
## Runtime Update 2026-10-07 — Provider Bridge

Runtime-Stand: `acb328b5dc4d0892335735f4467f6ff8717a3626`

### PROVIDER_BRIDGE_RUNTIME = PROVEN

Der dedizierte Render Background Worker `capital-ai-provider-bridge` ist in Frankfurt live und verwendet `deploy/Dockerfile.provider-bridge` mit Auto Deploy `off`.

Live-Evidence:
- Render Service: `srv-db3d8mui0phs739mfq20`
- Render Deploy: `dep-db3dds5chlcc73e9r7kg`
- Deploy-Status: `live`
- Commit: `acb328b5dc4d0892335735f4467f6ff8717a3626`
- Dockerfile: `deploy/Dockerfile.provider-bridge`
- Runtime: Docker Background Worker, Frankfurt, 1 Instance
- Auto Deploy: `off`
- Build: Rust Provider Bridge 0.1.0
- Container-Buildtests: 7/7 PASS
- Runtime-Log: `provider-bridge ready subject=capital.private.provider.query.v1`

Die Ready-Meldung wird im Rust-Code erst nach erfolgreichem `connect_bridge()` und erfolgreichem `queue_subscribe()` auf `capital.private.provider.query.v1` ausgegeben. Damit sind für diesen exakten Runtime-Stand NATS-Erreichbarkeit, Bridge-Credential-Akzeptanz und die Query-Subscription live belegt.

Die Bridge bleibt auf ihren schmalen Vertrag begrenzt:
- nur read-only admitted operations aus dem eingebetteten Contract
- Secret-Material in Requests wird abgewiesen
- mutierende Operationen werden abgewiesen
- maximal 64 KiB Request / 256 KiB Response
- maximal 30 s TTL
- Executor-Request ist auf 8 s begrenzt
- kein Provider-Secret liegt im Bridge-Worker

### Weiterhin NOT_PROVEN

Der Bridge-Runtime-Nachweis ist ausdrücklich keine End-to-End-Providerfreigabe. Weiterhin nicht als produktiv bewiesen gelten:
- `capital.private.provider.execute.v1` Node-Executor als laufende Runtime
- service-role Supabase Guard aus dem tatsächlich deployten Executor
- Query → Bridge → Executor → Supabase Guard Roundtrip
- Vault-Handoff
- realer Provider-I/O
- End-to-End-Latenz und Retry-/Timeout-Verhalten der vollständigen Kette

`PRIVATE_PROVIDER_BRIDGE_ENABLED` bleibt deshalb `false`. Ein erfolgreicher Bridge-Runtime-Test allein erteilt keine Provider-, Vault-, Lizenz- oder Production-Authority für den vollständigen privaten Providerpfad.

Maschinenlesbare Evidence: `docs/security/evidence/provider-bridge-runtime-20261007.json`.

