/**
 * CAPITAL AI — CONTRACT-FIRST ARCHITECTURE (AP-001)
 * Multi-Tier Pipeline Persistence, Local Storage, URL Share & Remote Sync Adapter
 */

import {
  PipelineDefinition,
  PipelineDefinitionSchema,
  createPipelineNode,
  validatePipelineGraph,
  PipelineValidationResult,
} from '../contracts';

const STORAGE_KEY_PREFIX = 'capital_ai_pipelines_v1';
const ACTIVE_PIPELINE_ID_KEY = 'capital_ai_active_pipeline_id';

const MAX_PIPELINE_BYTES = 262144;
const MAX_STORAGE_BYTES = 2 * 1024 * 1024;
const MAX_PIPELINES = 50;
function parseBoundedPipeline(value: unknown): PipelineDefinition {
  const input = value as Record<string, unknown>;
  if (!input || !Array.isArray(input.nodes) || input.nodes.length > 200 || !Array.isArray(input.edges) || input.edges.length > 400) throw new Error('Pipeline-Grenzen überschritten.');
  if (JSON.stringify(value).length > MAX_PIPELINE_BYTES) throw new Error('Pipeline zu groß.');
  return PipelineDefinitionSchema.parse(value);
}

// =============================================================================
// PRESET & SEED TEMPLATES
// =============================================================================

export function getPresetPipelines(): PipelineDefinition[] {
  const now = new Date().toISOString();

  // 1. Open-Data Authority Template — intentionally not source-admitted.
  const nodeIngestWss = createPipelineNode('provider_websocket', { x: 50, y: 120 });
  const nodeEvidence = createPipelineNode('evidence_writer', { x: 340, y: 120 }, {
    hashAlgorithm: 'sha256',
    merkleTreeDepth: 16,
  });
  const nodeConsensus = createPipelineNode('provider_consensus', { x: 630, y: 120 }, {
    minRequiredProviders: 3,
    aggregationMethod: 'median',
  });
  const nodeNormalizer = createPipelineNode('canonical_normalizer', { x: 920, y: 120 });
  const nodeTradingView = createPipelineNode('target_adapter_tradingview', { x: 1210, y: 120 });

  const pipeline1: PipelineDefinition = {
    id: 'e1111111-1111-4111-8111-111111111111',
    name: 'Open-Data Authority Template',
    description: 'Fail-closed Pipeline-Vorlage. Eine reale Quelle muss Open-Source/Open-Data-admitted sein.',
    version: '1.2.0',
    lifecycle: 'draft',
    executionMode: 'research',
    targetAssetClasses: ['crypto', 'equity_us'],
    nodes: [nodeIngestWss, nodeEvidence, nodeConsensus, nodeNormalizer, nodeTradingView],
    edges: [
      {
        id: 'e1',
        sourceNodeId: nodeIngestWss.id,
        sourcePortId: 'ticks_out',
        targetNodeId: nodeEvidence.id,
        targetPortId: 'in_ticks',
        dataType: 'tick_stream',
      },
      {
        id: 'e2',
        sourceNodeId: nodeEvidence.id,
        sourcePortId: 'out_evidence',
        targetNodeId: nodeConsensus.id,
        targetPortId: 'in_raw_ticks',
        dataType: 'tick_stream',
      },
      {
        id: 'e3',
        sourceNodeId: nodeConsensus.id,
        sourcePortId: 'out_consensus_ticks',
        targetNodeId: nodeNormalizer.id,
        targetPortId: 'in_raw',
        dataType: 'tick_stream',
      },
      {
        id: 'e4',
        sourceNodeId: nodeNormalizer.id,
        sourcePortId: 'out_normalized',
        targetNodeId: nodeTradingView.id,
        targetPortId: 'in_scores',
        dataType: 'score_metric',
      },
    ],
    metadata: {
      tags: ['open_data', 'authority', 'tradingview', 'sha256'],
      evidenceState: 'NOT_MEASURED',
    },
    createdAt: now,
    updatedAt: now,
  };

  // 2. High-Frequency Arrow Flight Quant Pipeline
  const nodeRest = createPipelineNode('provider_rest', { x: 50, y: 120 });
  const nodeBudget = createPipelineNode('rate_limit_budget', { x: 340, y: 120 }, {
    monthlyBudgetCapEur: 35.0,
  });
  const nodeDqs = createPipelineNode('data_quality_gate', { x: 630, y: 120 }, {
    minPassingDqsScore: 98.5,
  });
  const nodeFeatures = createPipelineNode('feature_builder', { x: 920, y: 120 });
  const nodeArrow = createPipelineNode('target_adapter_python_arrow', { x: 1210, y: 120 });

  const pipeline2: PipelineDefinition = {
    id: 'e2222222-2222-4222-8222-222222222222',
    name: 'Open-Data Arrow Flight Template',
    description: 'Research-Vorlage ohne zugelassene Datenquelle; keine Performance- oder Produktionsbehauptung.',
    version: '2.0.0',
    lifecycle: 'draft',
    executionMode: 'research',
    targetAssetClasses: ['equity_us'],
    nodes: [nodeRest, nodeBudget, nodeDqs, nodeFeatures, nodeArrow],
    edges: [
      {
        id: 'e5',
        sourceNodeId: nodeRest.id,
        sourcePortId: 'quotes_out',
        targetNodeId: nodeBudget.id,
        targetPortId: 'in_requests',
        dataType: 'tick_stream',
      },
      {
        id: 'e6',
        sourceNodeId: nodeBudget.id,
        sourcePortId: 'out_governed',
        targetNodeId: nodeDqs.id,
        targetPortId: 'in_data',
        dataType: 'tick_stream',
      },
      {
        id: 'e7',
        sourceNodeId: nodeDqs.id,
        sourcePortId: 'out_passed',
        targetNodeId: nodeFeatures.id,
        targetPortId: 'in_candles',
        dataType: 'ohlcv_candle',
      },
      {
        id: 'e8',
        sourceNodeId: nodeFeatures.id,
        sourcePortId: 'out_features',
        targetNodeId: nodeArrow.id,
        targetPortId: 'in_ticks',
        dataType: 'tick_stream',
      },
    ],
    metadata: {
      tags: ['open_data', 'quant', 'arrow_flight', 'polars'],
      evidenceState: 'NOT_MEASURED',
    },
    createdAt: now,
    updatedAt: now,
  };

  // 3. Paper-First Trading & Risk Guardrail Pipeline (AP-005)
  const nodeWssCrypto = createPipelineNode('provider_websocket', { x: 50, y: 120 });
  const nodeEvidencePaper = createPipelineNode('evidence_writer', { x: 340, y: 120 });
  const nodeOrderflow = createPipelineNode('orderflow_delta', { x: 630, y: 120 });
  const nodeApproval = createPipelineNode('human_approval_gate', { x: 920, y: 120 });
  const nodePaperBroker = createPipelineNode('paper_broker_adapter', { x: 1210, y: 120 });
  const nodePdfReport = createPipelineNode('report_pdf_generator', { x: 1500, y: 120 });

  const pipeline3: PipelineDefinition = {
    id: 'e3333333-3333-4333-8333-333333333333',
    name: 'Open-Data Risk Gate Template',
    description: 'Research-Vorlage mit Evidence- und Human-Gate; Source Admission ist noch offen.',
    version: '1.0.0',
    lifecycle: 'draft',
    executionMode: 'research',
    targetAssetClasses: ['crypto'],
    nodes: [nodeWssCrypto, nodeEvidencePaper, nodeOrderflow, nodeApproval, nodePaperBroker, nodePdfReport],
    edges: [
      {
        id: 'e9',
        sourceNodeId: nodeWssCrypto.id,
        sourcePortId: 'ticks_out',
        targetNodeId: nodeEvidencePaper.id,
        targetPortId: 'in_ticks',
        dataType: 'tick_stream',
      },
      {
        id: 'e10',
        sourceNodeId: nodeEvidencePaper.id,
        sourcePortId: 'out_evidence',
        targetNodeId: nodeOrderflow.id,
        targetPortId: 'in_depth',
        dataType: 'orderbook_l2',
      },
      {
        id: 'e11',
        sourceNodeId: nodeOrderflow.id,
        sourcePortId: 'out_delta',
        targetNodeId: nodeApproval.id,
        targetPortId: 'in_candidate_signal',
        dataType: 'signal_event',
      },
      {
        id: 'e12',
        sourceNodeId: nodeApproval.id,
        sourcePortId: 'out_approved_order',
        targetNodeId: nodePaperBroker.id,
        targetPortId: 'in_orders',
        dataType: 'paper_order',
      },
      {
        id: 'e13',
        sourceNodeId: nodePaperBroker.id,
        sourcePortId: 'out_reports',
        targetNodeId: nodePdfReport.id,
        targetPortId: 'in_scores',
        dataType: 'score_metric',
      },
    ],
    metadata: {
      tags: ['open_data', 'risk_gate', 'human_in_the_loop'],
      evidenceState: 'NOT_MEASURED',
    },
    createdAt: now,
    updatedAt: now,
  };

  return [pipeline1, pipeline2, pipeline3];
}

// =============================================================================
// STORAGE ADAPTER CLASS (OFFLINE-FIRST + URL SYNC)
// =============================================================================

export class PipelineStorageService {
  /**
   * Load all saved pipelines from localStorage, seeding presets if empty
   */
  static listPipelines(): PipelineDefinition[] {
    if (typeof window === 'undefined') return getPresetPipelines();

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX);
      if (!raw) {
        const presets = getPresetPipelines();
        this.saveAllPipelines(presets);
        return presets;
      }

      if (raw.length > MAX_STORAGE_BYTES) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const presets = getPresetPipelines();
        this.saveAllPipelines(presets);
        return presets;
      }

      if (parsed.length > MAX_PIPELINES) return [];
      return parsed.flatMap((item) => {
        try { return [parseBoundedPipeline(item)]; }
        catch { return []; }
      });
    } catch {
      return getPresetPipelines();
    }
  }

  /**
   * Save array of pipelines to localStorage
   */
  static saveAllPipelines(pipelines: PipelineDefinition[]): void {
    if (typeof window === 'undefined') return;
    try {
      if (pipelines.length > MAX_PIPELINES) throw new Error('Zu viele Pipelines.');
      const validated = pipelines.map(parseBoundedPipeline);
      const json = JSON.stringify(validated);
      if (json.length > MAX_STORAGE_BYTES) throw new Error('Pipeline-Speicher zu groß.');
      localStorage.setItem(STORAGE_KEY_PREFIX, json);
    } catch {
      throw new Error('Pipeline konnte nicht sicher gespeichert werden.');
    }
  }

  /**
   * Get single pipeline by ID
   */
  static getPipelineById(id: string): PipelineDefinition | null {
    const list = this.listPipelines();
    return list.find((p) => p.id === id) || null;
  }

  /**
   * Save or Update a single pipeline
   */
  static savePipeline(pipeline: PipelineDefinition): PipelineValidationResult {
    pipeline = parseBoundedPipeline(pipeline);
    // Validate with graph compliance engine
    const validation = validatePipelineGraph(pipeline);

    const list = this.listPipelines();
    const index = list.findIndex((p) => p.id === pipeline.id);

    const updated = {
      ...pipeline,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }

    if (list.length > MAX_PIPELINES || JSON.stringify(list).length > MAX_STORAGE_BYTES) throw new Error('Pipeline-Speicher voll.');
    this.saveAllPipelines(list);
    this.setActivePipelineId(updated.id);

    return validation;
  }

  /**
   * Delete pipeline
   */
  static deletePipeline(id: string): boolean {
    const list = this.listPipelines();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) return false;

    this.saveAllPipelines(filtered);
    if (this.getActivePipelineId() === id) {
      this.setActivePipelineId(filtered[0]?.id || null);
    }
    return true;
  }

  /**
   * Active Pipeline Selection
   */
  static getActivePipelineId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_PIPELINE_ID_KEY);
  }

  static setActivePipelineId(id: string | null): void {
    if (typeof window === 'undefined') return;
    if (id) {
      localStorage.setItem(ACTIVE_PIPELINE_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PIPELINE_ID_KEY);
    }
  }

  /**
   * URL Serialization: Encode pipeline definition into shareable URL fragment
   */
  static encodePipelineToUrlHash(pipeline: PipelineDefinition): string {
    try {
      const json = JSON.stringify(pipeline);
      // UTF-8 safe base64 encoding
      const encoded = btoa(encodeURIComponent(json));
      return encoded;
    } catch {
      return '';
    }
  }

  /**
   * URL Deserialization: Decode pipeline from URL fragment or query string
   */
  static decodePipelineFromUrl(urlHashOrQuery: string): PipelineDefinition | null {
    try {
      if (!urlHashOrQuery || urlHashOrQuery.length > MAX_PIPELINE_BYTES * 4) return null;
      const clean = urlHashOrQuery.replace(/^[#?]/, '').trim();
      const decodedJson = decodeURIComponent(atob(clean));
      const parsed = JSON.parse(decodedJson);
      return parseBoundedPipeline(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Export pipeline as JSON string for file download
   */
  static exportToJson(pipeline: PipelineDefinition): string {
    return JSON.stringify(pipeline, null, 2);
  }

  /**
   * Import pipeline from uploaded JSON string with schema validation
   */
  static importFromJson(jsonString: string): { success: boolean; pipeline?: PipelineDefinition; error?: string } {
    try {
      if (jsonString.length > MAX_PIPELINE_BYTES) throw new Error('Pipeline zu groß.');
      const parsed = JSON.parse(jsonString);
      const validated = parseBoundedPipeline(parsed);
      // Give it a fresh unique ID to prevent overwriting existing ID unintentionally
      const freshPipeline: PipelineDefinition = {
        ...validated,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      this.savePipeline(freshPipeline);
      return { success: true, pipeline: freshPipeline };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ungültiges Pipeline-JSON Format.' };
    }
  }
}
