# Multi-Agent Orchestration Decision — 2026-10-06

Status: OWNER_DECIDED_OPTION_A / BENCHMARK_REQUIRED  
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

## Owner-Entscheidung — 2026-10-06

Der Owner hat das Zielbild auf eine **Open-Source Multi-Agent-LangGraph-Architektur** mit autonom planbaren Agentenpfaden sowie verpflichtender Telemetrie und Observability festgelegt.

Damit ist **Option A verbindliches Zielbild**:

- LangGraph wird als isolierter, providerneutraler Orchestrierungskern eingeführt.
- Bestehende CAPITAL-AI Authorities bleiben maßgeblich; Graph-Routing erteilt keine eigene Write-, Trading-, Publication- oder Legal-Authority.
- `CAPITAL_AI_AGENT_TRAJECTORY@1` wird vor Runtime-Promotion als kanonischer Pfad-/Trace-Contract definiert.
- Die bestehende W3C-/JSON-/Prometheus-Observability wird zuerst weiterverwendet.
- Ein eigener OTLP Collector / persistentes Trace-Backend bleibt ein nachgelagerter PLATFORM-Benchmark und wird nicht allein durch diese Architekturentscheidung promoted.
- Einführung bleibt fail-closed bis LangGraph-Version, Lizenz, Supply Chain, Security, CADS-Workload und Replay-/Checkpoint-Semantik reproduzierbar geprüft sind.

## Bewertete Architekturvarianten

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

## Verbindlicher nächster Architekturpfad

**Gewählt: A — LangGraph Adapter + bestehende Observability zuerst.**

Die nächsten Gates sind in dieser Reihenfolge zu schließen:

1. `CAPITAL_AI_AGENT_STATE@1` und `CAPITAL_AI_AGENT_TRAJECTORY@1` definieren.
2. LangGraph gegen denselben CAPITAL-AI Agent-Workload reproduzierbar benchmarken.
3. Exakte stabile LangGraph-/Python-Version, Lizenz, Provenance, Advisories und transitive Supply Chain prüfen.
4. Supervisor-/Router-, Research-, MARKET-, Portfolio- und Truth-Nodes zunächst Shadow/Proposal-only anbinden.
5. Checkpoint/Resume, Retry, deterministischen Replay und Policy-/Approval-Korrelation testen.
6. Agent Path Control Center auf serverseitiger Trace-/Audit-Evidence aufbauen.
7. Erst danach OTLP Collector / persistentes Trace-Backend separat benchmarken und gegebenenfalls über PLATFORM promoten.

Bis zu diesen Gates bleibt die Runtime-Promotion **BLOCKED**; die Architekturentscheidung allein ist keine Production-Freigabe.
