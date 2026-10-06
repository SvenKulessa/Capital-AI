# Provider-Bridge Runtime Handoff

Stand: 2026-10-06
Primary Domain: TRUST
Cross-Domain: PLATFORM / MARKET

## Freigabegrenze

Dieses Dokument definiert ausschließlich den Secret- und Runtime-Handoff. Es enthält keine Secret-Werte und ist keine Production-, Provider- oder Trading-Freigabe.

## Identitäten

| Runtime | Variable | Wertklasse | Ablage |
|---|---|---|---|
| NATS Broker | `NATS_BRIDGE_USER` | nicht geheim; `capital-ai-provider-bridge` | Render Env |
| NATS Broker | `NATS_BRIDGE_PASSWORD` | Secret, >= 24 Zeichen | Render Secret Env |
| Provider-Bridge Worker | `NATS_BRIDGE_USER` | identisch zum Broker-Benutzer | Render Env |
| Provider-Bridge Worker | `NATS_BRIDGE_PASSWORD` | identisch zum Broker-Secret | Render Secret Env |
| NATS Broker | `NATS_EXECUTOR_USER` | nicht geheim; `capital-ai-provider-executor` | Render Env |
| NATS Broker | `NATS_EXECUTOR_PASSWORD` | Secret, >= 24 Zeichen | Render Secret Env |
| Capital-AI Web Runtime | `NATS_EXECUTOR_USER` | identisch zum Broker-Benutzer | Render Env |
| Capital-AI Web Runtime | `NATS_EXECUTOR_PASSWORD` | identisch zum Broker-Secret | Render Secret Env |

`NATS_URL` wird für Web Runtime und Provider-Bridge ausschließlich auf die private Render-NATS-Verbindung gesetzt.

## Reihenfolge

1. Worker-Image und CI-Evidence müssen PASS sein.
2. Broker- und Consumer-Seiten erhalten jeweils dasselbe scoped Credential-Paar; Werte werden niemals in Git, PR-Text, CI-Ausgabe oder NATS-Payload geschrieben.
3. `PRIVATE_PROVIDER_BRIDGE_ENABLED` bleibt auf der Web Runtime `false`, bis Broker und Worker erfolgreich verbunden sind.
4. NATS wird kontrolliert mit der Drei-Rollen-Konfiguration deployt.
5. Worker wird provisioniert und gestartet.
6. Erst nach Bridge-Health, Queue-Subscription und Executor-Request/Reply darf `PRIVATE_PROVIDER_BRIDGE_ENABLED=true` gesetzt werden.
7. Private Query-/Result-Subjects bleiben Core NATS; JetStream-Persistenz ist verboten.
8. Mutierende Provider-Operationen, Trading, Withdrawals und Transfers bleiben unabhängig davon gesperrt.

## Runtime-Evidence

Erforderlich:
- Worker verbindet sich mit NATS und meldet `provider-bridge ready`.
- Queue `capital-private-provider-bridge` ist aktiv.
- Request/Reply App -> Bridge -> Executor -> App ist erfolgreich.
- Payload-Inspektion enthält keine API Keys, Secrets, Passwords, Tokens oder Private Keys.
- Kein JetStream-Stream enthält `capital.private.provider.query.v1` oder `capital.private.provider.execute.v1`.
- Binance/Kraken-Operationen bleiben auf dem versionierten Read-only-Contract begrenzt.
