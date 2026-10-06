# CAPITAL-AI — Current Architecture Evidence Baseline

Stand: 2026-10-06
Primary Domain: TRUST
Cross-Domain: PRODUCT / PLATFORM / MARKET
Baseline: main@4fa3e3f92547cd6356f46490a38e9b7515f69a6d

## Zweck

Dieses Dokument beschreibt die aktuell implementierte Architektur anhand konkreter Code-Evidence. Es ist die verbindliche technische Ausgangsbasis für die nächste Stufe: eine offene, providerneutrale Multi-Agent-/GraphRAG-Orchestrierung. Ein vorhandener Codepfad oder grüner Test ist keine Production-, Lizenz- oder Security-Freigabe.

## 1. Frontend / Product Surface

Runtime:
- React 19 + Vite
- vier Hauptbereiche: Market Screener, Studio Hub, Learning Portal, Control Center
- Account-Bereich mit Profil, Security und Key Vault
- Control Center ist serverseitig Owner-IAM-gated

Evidence:
- `src/app/routing/AppRoutes.tsx`
- `src/components/Header.tsx`
- `src/components/ControlCenterPage.tsx`
- `src/features/account/AccountPageShell.tsx`
- `src/components/KeyVaultPage.tsx`

Security boundary:
- Clientseitige Sichtbarkeit ist nur UX-Projektion.
- Owner-only-Routen werden zusätzlich im Node-Server durch `auth.authorizeIamRole(..., 'owner')` geschützt.
- Secrets, Service-Role-Keys und Observability-Tokens gehören nie in den Browser.

## 2. Node BFF / HTTP Boundary

Der produktive Webservice nutzt `server/index.mjs` als BFF- und Runtime-Grenze.

Aufgaben:
- Supabase Auth / Session / MFA
- serverseitiger Key-Vault-Zugriff
- private Provider Queries
- Market API
- Stripe Checkout / Subscription
- CADS Commerce / Benchmark APIs
- Security Header / SEO / Well-Known
- Runtime Observability

Evidence:
- `server/index.mjs`
- `server/auth.mjs`
- `server/auth-security.mjs`
- `server/http-security.mjs`
- `server/observability.mjs`

## 3. Identity / Auth

Authority: Supabase Auth.

Implementiert:
- E-Mail/Passwort
- E-Mail-Verifikation
- Google OAuth mit PKCE
- Session-Cookies serverseitig signiert
- TOTP Enrollment/Challenge/Verify
- WebAuthn-/Passkey-Codepfad vorhanden, providerseitige Freischaltung getrennt

Evidence:
- `src/features/auth/LoginPage.tsx`
- `src/features/auth/AuthSecuritySettings.tsx`
- `src/features/auth/webauthn.ts`
- `server/auth.mjs`
- `server/auth-security.mjs`

Aktuelle Production-Evidence vom 2026-10-06:
- gültiger Supabase Signup: HTTP 200
- Weak-Password-Rejection: HTTP 422 / `weak_password`
- TOTP Factor Enrollment: HTTP 200
- beobachteter Faktor blieb `unverified` und wurde anschließend entfernt

Offen:
- Browser-E2E vom QR/Secret bis Challenge/Verify/AAL2 muss real belegt werden.

## 4. Datenbank / Vault

Authority: Supabase Postgres + Supabase Vault.

Trust model:
- Browser: publishable key + RLS
- privilegierter Backend-Pfad: `service_role`
- `private.*` und `vault.*`: kein `anon`-/`authenticated`-Zugriff
- Vault-Secretwerte werden nicht an den Browser zurückgegeben
- Website projiziert ausschließlich Fingerprint, Capability-/Verifikationsstatus und den Hinweis auf verschlüsselte Speicherung

Evidence:
- `supabase/migrations/20261004022309_capital_ai_user_provider_vault_20261004.sql`
- `supabase/migrations/20261006131500_enable_binance_user_provider_vault.sql`
- `supabase/migrations/20261006203618_trust_vault_rls_pgaudit_hardening_20261006.sql`
- `supabase/migrations/20261006203656_trust_pgaudit_extension_schema_hardening_20261006.sql`
- `server/user-provider-vault.mjs`
- `src/components/KeyVaultPage.tsx`

Vault guarantee:
- Supabase Vault speichert Secretwerte authentifiziert verschlüsselt at rest.
- Die Anwendung liest Klartext ausschließlich serverseitig für zugelassene Provider-Operationen.
- Das Frontend erhält keinen Klartext und keinen Ciphertext-Blob.

## 5. Market Event Backbone

Broker:
- NATS JetStream: Events / Request-Reply / Replay
- Valkey: Cache / Fan-out / künftig zentrale Rate-/Replay-/High-Cost-State-Grenze

Evidence:
- `deploy/nats-server.conf`
- `deploy/nats-entrypoint.sh`
- `server/infrastructure.mjs`
- `server/private-provider-query.mjs`
- `contracts/private-provider-query-operations.json`

Production rule:
- Ein neuer Repository-HEAD ist kein NATS-Redeploy-Signal.

## 6. Private Provider Boundary

Node:
- authentifiziert User und Request
- löst Vault-Credentials nur serverseitig auf
- begrenzt Parameter / TTL / Requestgröße
- erzeugt den privaten Request-Envelope

Rust:
- eigenständige Bridge validiert Envelope und Allowlist erneut
- Secret-Material im NATS-Payload wird explizit abgewiesen
- Read-only-Operationen werden an einen getrennten Executor-Subject weitergereicht
- kein Trading-/Mutation-Authority-Gewinn durch die Bridge

Evidence:
- `server/private-provider-query.mjs`
- `server/user-provider-vault.mjs`
- `services/provider-bridge-rs/src/main.rs`
- `services/provider-bridge-rs/Cargo.toml`

Offen:
- dediziertes immutable Rust-Container-Image
- Cargo.lock / --locked Evidence
- separater Render Private Service
- kontrolliertes Credential-Handoff für `NATS_BRIDGE_USER/PASSWORD`
- Executor-Runtime und zentralisierter Rate/Replay/High-Cost-State

## 7. Billing

Authority:
- Website: Stripe
- GitHub Marketplace: separate CADS Entitlement Authority

Evidence:
- `server/subscription-checkout.mjs`
- `server/vocabulary-checkout.mjs`
- `server/cads-commerce.mjs`
- CADS Marketplace PR #220

Beobachteter Frontend-Stand:
- Stripe Checkout-Seite wird nach Klick auf ein Abo korrekt geladen.

## 8. Observability / Telemetry

Bestehend:
- strukturierte redigierte Runtime-Logs
- W3C Trace Context
- Prometheus-Projektion
- CADS p50/p95/p99
- geschützte `/metrics`-Route
- geschützte `/api/internal/cads`-Route

Neu in diesem Slice:
- Owner-authentifizierte `/api/internal/observability`-Projektion
- Control-Center-Dashboard ohne Prometheus-Token im Browser
- Requests, 5xx, Latenz, RSS, Uptime, Redaction-Zähler und CADS-Metriken

Evidence:
- `server/observability.mjs`
- `server/cads-observability.mjs`
- `src/components/ObservabilityDashboard.tsx`
- `src/components/ControlCenterPage.tsx`

## 9. AI / Research Baseline

Aktuelle Runtime:
- kein LangGraph-Runtime-Authority
- Microsoft GraphRAG ist als isolierter Research-/Evidence-Layer geplant, nicht als privilegierter Executor
- Qwen/Chatterbox bleiben nach Owner-Entscheidung HOLD; keine weitere Promotion ohne erneuten Benchmark auf stärkerer CPU/GPU und nur falls Google-Podcast-Lösung nicht genügt

Evidence:
- `src/contracts/researchArchitecture.ts`
- PR #214
- PR #221

## 10. Zielarchitektur: Open Multi-Agent + GraphRAG

Die nächste Schicht wird **oberhalb** der bestehenden Trust-/Auth-/Event-/Vault-Grenzen aufgebaut:

1. `CAPITAL_AI_AGENT_STATE@1`
2. `CAPITAL_AI_AGENT_TRAJECTORY@1`
3. LangGraph als providerneutraler Orchestrierungskern
4. Microsoft GraphRAG als isolierter Evidence-/Knowledge-Node
5. vorhandene Tools als capability-gated Nodes
6. Checkpoint / Resume / Retry / deterministischer Replay
7. bestehende W3C Trace-/Runtime-Evidence weiterverwenden
8. Approval-, Truth-, Risk- und Data-Rights-Gates bleiben außerhalb der Graph-Routing-Authority

Agenten dürfen:
- recherchieren
- analysieren
- planen
- Tools innerhalb erteilter Capability nutzen
- Evidence verknüpfen

Agenten dürfen nicht automatisch:
- Trading ausführen
- rechtliche Entscheidungen treffen
- Secrets lesen oder weiterreichen
- Publikationen freigeben
- kostenpflichtige Ressourcen aktivieren
- Production-/Security-Gates umgehen

## 11. Sicherheitsinvarianten

- `anon` / `authenticated` erhalten keinen direkten Vault-/private-Schema-Zugriff.
- `service_role` wird nie in Browser-Bundles oder Client-Konfiguration übernommen.
- BYPASSRLS wird nicht für Anwendungsrollen vergeben; Supabase-Systemrollen bleiben providerseitige Infrastruktur.
- Secretwerte werden aus Telemetrie redigiert.
- Provider-Credentials überschreiten die NATS-Grenze nicht.
- Control Center und Observability bleiben Owner-only.
- Ein erfolgreicher Test ersetzt keine Production-, Lizenz- oder Security-Freigabe.
