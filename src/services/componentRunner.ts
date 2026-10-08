import { z } from 'zod';
import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../contracts/analysisComponentRegistryValidator';
import { FeatureValueSchema } from '../contracts/canonicalContracts';
import { PipelineSnapshotSchema, type ComponentExecutionResult, type PipelineSnapshot } from '../contracts/pipelineExecution';

export interface ComponentRunner {
  readonly componentId: string;
  readonly calculationVersion: string;
  execute(snapshot: Readonly<PipelineSnapshot>): Promise<ComponentExecutionResult>;
}
export const ComponentExecutionResultSchema = z.strictObject({
  componentId: z.string().min(1), calculationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.enum(['shadow_computed', 'blocked']), score: z.number().finite().min(0).max(100).nullable(),
  reasonCodes: z.array(z.string()), inputFeatureIds: z.array(z.string()),
}).refine(r => r.status === 'blocked' ? r.score === null : r.score !== null, 'COMPONENT_STATUS_SCORE_MISMATCH');

/** Exact registry identity only. Planned entries do not become executable from a flag. */
export class ShadowComponentRunnerRegistry {
  private runners = new Map<string, ComponentRunner>();
  private readonly implementedFeatures: ReadonlyMap<string, string>;

  /** Code-owned, versioned feature implementations only. Never derive this map from a snapshot or flag. */
  constructor(implementedFeatures: ReadonlyMap<string, string> = new Map()) {
    const known = new Set(CANONICAL_50_COMPONENTS.flatMap(entry => entry.featureDependencies));
    for (const [id, version] of implementedFeatures) {
      if (!known.has(id) || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('FEATURE_IMPLEMENTATION_IDENTITY_INVALID');
    }
    this.implementedFeatures = new Map(implementedFeatures);
  }

  private validation() {
    return validateAnalysisComponentRegistry(CANONICAL_50_COMPONENTS, new Set(this.implementedFeatures.keys()));
  }
  /** Read-only admission evidence; registration alone never promotes registry lifecycle. */
  admissionReport() {
    const validation = this.validation();
    return CANONICAL_50_COMPONENTS.map(entry => {
      const implementationRegistered = this.runners.has(entry.componentId);
      const reasons = validation.issues.filter(issue => issue.componentId === entry.componentId || issue.componentId === 'registry')
        .map(issue => issue.code);
      if (!implementationRegistered) reasons.push('COMPONENT_IMPLEMENTATION_MISSING');
      if (!['shadow', 'active'].includes(entry.status)) reasons.push('COMPONENT_NOT_SHADOW_ADMITTED');
      return { componentId: entry.componentId, calculationVersion: entry.calculationVersion,
        lifecycle: entry.status, implementationRegistered, admissionAllowed: reasons.length === 0,
        reasonCodes: [...new Set(reasons)] };
    });
  }
  register(runner: ComponentRunner) {
    const entry = CANONICAL_50_COMPONENTS.find(c => c.componentId === runner.componentId);
    if (!entry || entry.calculationVersion !== runner.calculationVersion) throw new Error('RUNNER_IDENTITY_MISMATCH');
    if (this.runners.has(runner.componentId)) throw new Error('RUNNER_ALREADY_REGISTERED');
    this.runners.set(runner.componentId, runner);
  }
  async run(componentId: string, snapshot: PipelineSnapshot): Promise<ComponentExecutionResult> {
    const entry = CANONICAL_50_COMPONENTS.find(c => c.componentId === componentId);
    if (!entry) throw new Error('COMPONENT_UNREGISTERED');
    snapshot = PipelineSnapshotSchema.parse(snapshot);
    const reasons: string[] = [];
    const runner = this.runners.get(componentId);
    if (!runner) reasons.push('COMPONENT_IMPLEMENTATION_MISSING');
    if (!['shadow', 'active'].includes(entry.status)) reasons.push('COMPONENT_NOT_SHADOW_ADMITTED');
    reasons.push(...this.validation().issues.filter(i => i.componentId === componentId || i.componentId === 'registry').map(i => i.code));
    if (!entry.assetClassScope.includes(snapshot.asset.assetClass)) reasons.push('COMPONENT_ASSET_SCOPE_MISMATCH');
    const valid = snapshot.features.filter(f => FeatureValueSchema.safeParse(f).success && f.assetId === snapshot.asset.assetId);
    for (const id of entry.featureDependencies) {
      const values = valid.filter(f => f.featureId === id);
      if (!values.length) reasons.push(`COMPONENT_INPUT_MISSING:${id}`);
      if (this.implementedFeatures.has(id) && values.some(f => f.calculationVersion !== this.implementedFeatures.get(id)))
        reasons.push(`COMPONENT_FEATURE_VERSION_MISMATCH:${id}`);
    }
    for (const f of valid) {
      const p = f.provenance;
      if ([f.observedAt, p.observedAt, p.receivedAt, p.publishedAt].some(t => t > snapshot.evaluatedAt) ||
          p.receivedAt < p.observedAt || p.publishedAt < p.receivedAt || p.latencyMs !== p.receivedAt - p.observedAt)
        reasons.push('COMPONENT_INPUT_TIMESTAMP_INVALID');
    }
    if (reasons.length) return { componentId, status: 'blocked', score: null, reasonCodes: reasons,
      calculationVersion: entry.calculationVersion, inputFeatureIds: [...entry.featureDependencies] };
    const result = ComponentExecutionResultSchema.parse(await runner!.execute(structuredClone(snapshot)));
    if (result.componentId !== componentId || result.calculationVersion !== entry.calculationVersion ||
        result.inputFeatureIds.some(id => !entry.featureDependencies.includes(id))) throw new Error('COMPONENT_OUTPUT_IDENTITY_MISMATCH');
    return result;
  }
}
