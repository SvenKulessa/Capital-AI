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
