# integration-engineering — Interfaces

## Domain Ownership
- Domain Owner: PLATFORM
- Escalation Owner: CAPITAL-AI-PLATFORM
- Governance Owner: CAPITAL-AI-TRUST

## Dependencies
Registry skillGovernance.integration-engineering, skillSourceInventory und Root-AGENTS.md.

## Security Boundary
Identität und Mandant serverseitig ableiten. Webhook-Signaturen, Idempotenz und Widerruf prüfen. Bei MCP und A2A die verhandelte Version sowie den zulässigen Scope prüfen.

## Input contract
Protokollversion, Tenant-Grenze, erlaubte Scopes, Widerrufspfad und erwartete Fehler.

## Output contract
Adaptermatrix mit Schnittstellenversion, Sandbox-Readback, Fehlerpfad und Rückbau.
