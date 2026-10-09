import {
  ShadowPipelineService,
  type ReplayEvidenceStore,
} from '../../services/shadowPipeline';
import { ShadowConfigurationHistory } from '../../services/pipelineConfigurator';
/** Browser memory only. No localStorage, provider calls, shared cache or durable audit claims. */
export class AnalysisShadowSession implements ReplayEvidenceStore {
  private records = new Map<string, string>();
  readonly history = new ShadowConfigurationHistory();
  readonly pipeline = new ShadowPipelineService(this);
  async putImmutable(id: string, body: string) {
    const previous = this.records.get(id);
    if (previous !== undefined && previous !== body)
      throw new Error('EVIDENCE_ID_REUSE');
    if (previous === undefined && this.records.size >= 50)
      throw new Error('SESSION_EVIDENCE_LIMIT');
    this.records.set(id, body);
  }
  async get(id: string) {
    return this.records.get(id) ?? null;
  }
}
