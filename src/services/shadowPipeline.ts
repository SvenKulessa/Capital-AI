import { PipelineSnapshotSchema, ShadowPipelineConfigSchema,
  type PipelineSnapshot, type ShadowPipelineConfig, type ShadowScoreResult } from '../contracts/pipelineExecution';
import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { EvidenceEngineService } from './evidenceEngine';
import { ScoringEngineService } from './scoringEngine';
import { ShadowComponentRunnerRegistry } from './componentRunner';

export interface ReplayEvidenceStore {
  /** Implementations must be append-only and reject different content for the same ID. */
  putImmutable(evidenceId: string, canonicalBody: string): Promise<void>;
  get(evidenceId: string): Promise<string | null>;
}
export interface ShadowEvidenceBundle {
  schemaVersion: 1; registryFingerprint: string; config: ShadowPipelineConfig; snapshot: PipelineSnapshot; result: ShadowScoreResult;
}
export interface ShadowPipelineRun { evidenceId: string; result: ShadowScoreResult; }
export interface ShadowStageTelemetry {
  scope: 'offline_shadow'; stageId: 'stage_03_validation' | 'stage_05_scoring' | 'stage_07_evidence';
  durationMs: number; outcome: 'ok' | 'error';
}

/** Offline orchestration only: no provider calls, delivery, ranking, alerts or production admission. */
export class ShadowPipelineService {
  constructor(private store: ReplayEvidenceStore,
    private runners = new ShadowComponentRunnerRegistry(),
    private observe?: (event: ShadowStageTelemetry) => void) {}

  private async measured<T>(stageId: ShadowStageTelemetry['stageId'], work: () => T | Promise<T>): Promise<T> {
    const start = performance.now(); let outcome: ShadowStageTelemetry['outcome'] = 'error';
    try { const result = await work(); outcome = 'ok'; return result; }
    finally { this.observe?.({ scope: 'offline_shadow', stageId, durationMs: performance.now() - start, outcome }); }
  }

  private async evaluate(input: unknown, policy: unknown): Promise<ShadowEvidenceBundle> {
    const { snapshot, config } = await this.measured('stage_03_validation', () => ({
      snapshot: PipelineSnapshotSchema.parse(input), config: ShadowPipelineConfigSchema.parse(policy),
    }));
    const known = new Set(CANONICAL_50_COMPONENTS.map(c => c.componentId));
    if (config.componentIds.some(id => !known.has(id))) throw new Error('COMPONENT_UNREGISTERED');
    // Collections with set semantics have a stable ordering before hashing and evaluation.
    snapshot.features.sort((a, b) => a.featureId.localeCompare(b.featureId) || a.provenance.providerId.localeCompare(b.provenance.providerId));
    snapshot.rights.sort((a, b) => a.providerId.localeCompare(b.providerId));
    snapshot.rawInputReferences.sort();
    if (new Set(snapshot.rights.map(r => r.providerId)).size !== snapshot.rights.length) throw new Error('DUPLICATE_RIGHTS_PROVIDER');
    const result = await this.measured('stage_05_scoring', async () => {
      const score = ScoringEngineService.computeShadowScore(snapshot, config);
      for (const id of [...config.componentIds].sort()) score.components.push(await this.runners.run(id, snapshot));
      return score;
    });
    if (result.components.some(c => c.status === 'blocked')) {
      result.candidateScore = null;
      result.reasonCodes.push('COMPONENT_COHORT_BLOCKED');
    }
    result.reasonCodes.sort();
    return { schemaVersion: 1, registryFingerprint: await EvidenceEngineService.fingerprint(CANONICAL_50_COMPONENTS), config, snapshot, result };
  }
  async run(input: unknown, policy: unknown): Promise<ShadowPipelineRun> {
    const bundle = await this.evaluate(input, policy);
    const canonicalBody = EvidenceEngineService.canonicalJson(bundle);
    const evidenceId = `EVD-${await EvidenceEngineService.sha256(canonicalBody)}`;
    await this.measured('stage_07_evidence', async () => {
      await this.store.putImmutable(evidenceId, canonicalBody);
      // No result is returned until the storage round-trip and complete digest match.
      if (await this.store.get(evidenceId) !== canonicalBody) throw new Error('EVIDENCE_READBACK_FAILED');
    });
    return { evidenceId, result: structuredClone(bundle.result) };
  }
  async replay(evidenceId: string): Promise<ShadowPipelineRun> {
    if (!/^EVD-[a-f0-9]{64}$/.test(evidenceId)) throw new Error('EVIDENCE_ID_INVALID');
    const body = await this.store.get(evidenceId);
    if (!body) throw new Error('EVIDENCE_UNAVAILABLE');
    if (`EVD-${await EvidenceEngineService.sha256(body)}` !== evidenceId) throw new Error('EVIDENCE_HASH_MISMATCH');
    const stored = JSON.parse(body) as ShadowEvidenceBundle;
    if (stored.schemaVersion !== 1) throw new Error('EVIDENCE_SCHEMA_UNSUPPORTED');
    const replayed = await this.evaluate(stored.snapshot, stored.config);
    if (EvidenceEngineService.canonicalJson(replayed) !== body) throw new Error('REPLAY_DIVERGENCE');
    return { evidenceId, result: structuredClone(replayed.result) };
  }
}
