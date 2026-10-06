# Multi-Agent Orchestration Decision — 2026-10-06

Status: OWNER_DECISION_REQUIRED  
CURRENT_MAIN: `824d42913bbeccb68366c2ae70714ccb960717e5`  
Primary Domain: CAPITAL-AI-PRODUCT  
Cross-Domain: PLATFORM / TRUST / MARKET

## Ziel

CAPITAL-AI soll zu einer offenen, providerneutralen Multi-Agent-Architektur reifen, in der Agenten Research-, Analyse-, Tool- und Workflow-Pfade autonom planen können. Jeder tatsächlich ausgeführte Agentenweg muss jedoch nachvollziehbar, korrelierbar und revisionsfähig bleiben.

Die neue Orchestrierung darf bestehende Authorities nicht ersetzen:

- GraphRAG bleibt Knowledge-/Evidence-Layer, keine Rechts-, Trading- oder Publication-Authority.
- `capability_grants` bleiben explizite Capability-Authority.
- `agent_action_approvals` bleiben single-use, plan-hash-bound Approval-Authority für governte Write-Actions.
- Truth Authority / Public Authority Gate bleibt Freigabegrenze für Claims und strategische Informationen.
- Operational Telemetry und Security Audit bleiben getrennte Kanäle.
- MARKET Facts, Provider Rights, Scoring Eligibility und Trading Authority bleiben eigenständige Gates.

## CURRENT_MAIN-Korrelation

Bereits vorhanden:

- `GRAPHRAG_RESEARCH_ARCHITECTURE@1`
- `TRUTH_AUTHORITY_GATE@1`
- `capability_grants`
- `agent_action_approvals`
- Agent Evaluation Runs
- `server/observability.mjs`
- W3C Trace Context / strukturierte Logs / geschützte Prometheus-Metriken als Observability-Ziel
- `CA-PLATFORM-OTEL-COLLECTOR` als noch zu benchmarkender Export-Layer
- `CA-TRUST-AUTONOMOUS-RESEARCH-GOVERNANCE`
- offener PR #213 mit JaJa Buddy, lokalem Finanzgraph und GraphRagAdapter
- offener PR #212 mit read-only Provider-Query-Bridge; keine Trading-Authority

## Architekturvarianten

### Option A — LangGraph als Orchestrierungskern, bestehende CAPITAL-AI Authorities bleiben maßgeblich

Grundidee:

```text
Agent Client
  → CAPITAL-AI Agent Gateway
    → LangGraph StateGraph
      → Supervisor / Router
      → Research Agent
      → Market Agent
      → Portfolio Analysis Agent
      → Compliance/Truth Agent
      → Tool Nodes
    → GraphRAG Evidence Layer
    → capability_grants / agent_action_approvals
    → existing Observability + Agent Trajectory Evidence
```

Vorteile:

- Open-Source-LangGraph ist als zustandsbehafteter Multi-Actor-/Agent-Graph geeignet.
- Checkpoint-/Resume-Modell passt zu nachvollziehbaren, unterbrechbaren Agentenwegen.
- GraphRAG kann als klar begrenzter Retrieval-/Evidence-Node eingebunden werden.
- Existing CAPITAL-AI Approval-/Capability-Gates können als Nodes/Edges erhalten bleiben.
- Inkrementelle Migration statt Big-Bang-Rewrite.

Risiken / Trade-offs:

- neue Python-/LangGraph-Dependency-Surface,
- zusätzliche Graph-/Checkpoint-Semantik muss mit Supabase/NATS/Node-Grenzen harmonisiert werden,
- LangGraph-Security-Advisories und exakte Version müssen vor Runtime-Promotion geprüft werden,
- Framework-Graph darf niemals selbst Authority aus seiner Routingentscheidung ableiten.

Security / Operations:

- kein Secret im Graph-State,
- Tool-Nodes erhalten scoped Capability Grants,
- mutierende Nodes benötigen Approval Artifact,
- Read/Research dürfen autonom sein, Write/Trade/Publish bleiben governed,
- Rollback: LangGraph-Adapter deaktivieren; bestehende Agent-/API-Pfade bleiben Authority.

CADS-Status: **BENCHMARK_REQUIRED**.

### Option B — CAPITAL-AI eigener deterministischer Agent-State-Graph

Grundidee:

Bestehende Node-/Pipeline-/Approval-Verträge werden zu einem eigenen State-Machine-/DAG-Orchestrator erweitert; kein externes Agent-Framework wird Standard.

Vorteile:

- maximale Kontrolle und kleinste externe Agent-Framework-Supply-Chain,
- exakt auf CAPITAL-AI Authority-/Evidence-Semantik zugeschnitten,
- weniger Framework-Lock-in.

Risiken / Trade-offs:

- deutlich höherer Entwicklungs- und Testaufwand,
- Checkpointing, Graph-Recovery, Tool-Routing, human-in-the-loop und Agent-Debugging müssen selbst gebaut werden,
- höheres Risiko eines proprietären Parallelstandards neben bestehenden Pipeline-/Documentary-Contracts.

Security / Operations:

- sehr gut kontrollierbar, aber größere eigene Code-/Maintenance-Oberfläche.

CADS-Status: **BENCHMARK_REQUIRED**.

### Option C — LangGraph + vollständiger OpenTelemetry Collector / Trace-Backend von Beginn an

Grundidee:

Option A plus sofortiger eigener OTLP Collector und persistentes Trace-Backend für Agentenpfade.

Vorteile:

- beste sofortige Trace-/Span-Auswertung,
- standardisierte Cross-Service-Korrelation,
- gute Grundlage für autonome Agenten-Debugging-/SLOs.

Risiken / Trade-offs:

- zusätzliche Runtime-/RAM-/Operations-Kosten,
- neue Retention-/PII-/Prompt-Redaction-Grenze,
- `CA-PLATFORM-OTEL-COLLECTOR` ist aktuell noch nicht benchmarked/promoted,
- unnötige Infrastruktur, solange das interne Event-/Trace-Modell noch nicht stabil ist.

CADS-Status: **BLOCKED_PENDING_OBSERVABILITY_BENCHMARK**.

## Empfehlung

**Option A** als Zielarchitektur, aber in zwei Stufen:

1. LangGraph zunächst als isolierten Orchestrierungsadapter benchmarken; bestehende Observability direkt weiterverwenden.
2. Erst nach stabiler Agent-Trajectory-Semantik den OTel Collector / Trace-Backend separat über den bestehenden Observability-Benchmark entscheiden.

Damit wird die Anwendung agentischer, ohne gleichzeitig eine neue Knowledge-, Security-, Trading-, Publication- oder Telemetry-Authority einzuführen.

## Agent Trajectory Evidence

Jeder Graph-Run soll mindestens korrelieren können:

- `agentRunId`
- `graphRunId`
- `traceId` / `spanId`
- `userIdHash` oder andere datensparsame Actor-Referenz
- `agentId`
- `nodeId`
- `parentNodeId`
- `transitionFrom` / `transitionTo`
- `toolCallId`
- `toolName`
- `capabilityGrantId`
- `approvalId` falls erforderlich
- `modelProvider` / `modelId`
- `inputFingerprint`
- `outputFingerprint`
- `evidenceRefs`
- `startedAt` / `completedAt`
- `durationMs`
- `attempt` / `retryReason`
- `outcome`
- `errorClass`
- `tokenUsage` / `costEvidence` soweit verfügbar
- `checkpointId`
- `policyDecisionIds`

Nicht standardmäßig speichern:

- API-Secrets,
- private Keys,
- vollständige Credential-Payloads,
- unredigierte personenbezogene Prompts,
- komplette Provider-Rohdaten ohne eigene Rights-/Retention-Authority.

## Offene Owner-Entscheidung

- A: LangGraph Adapter + bestehende Observability zuerst **(empfohlen)**
- B: eigener CAPITAL-AI Agent-State-Graph
- C: LangGraph + vollständiger OTel-Stack sofort

Nach Auswahl: CADS-Workload, Security-/License-Gates und exakte Runtime-Topologie festlegen.
