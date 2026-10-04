/**
 * CAPITAL AI — ENTERPRISE PIPELINE CONFIGURATOR (PART 2)
 * Manages the 8 pipeline stages, dynamic provider routing, shadow mode benchmarks,
 * feature family assignments, and version-controlled configuration changes.
 */

import { ShadowPipelineConfigSchema, type ShadowPipelineConfig } from '../contracts/pipelineExecution';
import { EvidenceEngineService } from './evidenceEngine';

export type ExecutionEnvironment = 'active_production' | 'shadow_canary' | 'sandbox_demo';

export interface StageConfig {
  stageId: string;
  stageName: string;
  isEnabled: boolean;
  timeoutMs: number;
  retryCount: number;
  circuitBreakerThresholdPct: number;
}

export interface ConfigurationRevision { fingerprint: string; config: ShadowPipelineConfig; }
/** Immutable, content-addressed shadow revisions. No production activation method. */
export class ShadowConfigurationHistory {
  private revisions: ConfigurationRevision[] = [];
  async append(input: unknown): Promise<ConfigurationRevision> {
    const config = ShadowPipelineConfigSchema.parse(input);
    const fingerprint = await EvidenceEngineService.fingerprint(config);
    const existing = this.revisions.find(r => r.config.configId === config.configId && r.config.version === config.version);
    if (existing && existing.fingerprint !== fingerprint) throw new Error('CONFIG_VERSION_REUSE');
    if (!existing) this.revisions.push(structuredClone({ fingerprint, config }));
    return structuredClone({ fingerprint, config });
  }
  history(): ConfigurationRevision[] { return structuredClone(this.revisions); }
  diff(left: ConfigurationRevision, right: ConfigurationRevision): string[] {
    return (Object.keys(right.config) as (keyof ShadowPipelineConfig)[]).sort().filter(k => EvidenceEngineService.canonicalJson(left.config[k]) !==
      EvidenceEngineService.canonicalJson(right.config[k]));
  }
}

export interface PipelineConfigModel {
  configId: string;
  version: string;
  environment: ExecutionEnvironment;
  lastModifiedAt: number;
  modifiedBy: string;
  isApprovedForProduction: boolean;

  // 1. Stage Configurations (All 8 Stages)
  stages: Record<string, StageConfig>;

  // 2. Provider Routing & Feature Family Assignments
  activeProviders: string[];
  providerFeatureAssignments: Record<string, string[]>; // featureFamily -> providerIds

  // 3. Asset Class Route Settings
  assetClassRoutes: Record<
    string,
    {
      primaryProvider: string;
      fallbackProvider: string;
      maxStalenessSeconds: number;
      minQualityScore: number;
    }
  >;

  // 4. Shadow Mode Benchmarking Settings
  shadowSettings: {
    runShadowInParallel: boolean;
    sampleRatePercent: number;
    benchmarkLatencyComparison: boolean;
  };
}

export class PipelineConfiguratorService {
  private currentConfig: PipelineConfigModel;
  private shadowConfig: PipelineConfigModel;
  private revisionHistory: PipelineConfigModel[] = [];

  constructor() {
    this.currentConfig = this.buildDefaultProductionConfig();
    this.shadowConfig = this.buildDefaultShadowConfig();
    this.revisionHistory.push(structuredClone(this.currentConfig));
  }

  public getActiveConfig(): PipelineConfigModel {
    return structuredClone(this.currentConfig);
  }

  public getShadowConfig(): PipelineConfigModel {
    return structuredClone(this.shadowConfig);
  }

  public getRevisionHistory(): PipelineConfigModel[] {
    return structuredClone(this.revisionHistory);
  }

  public updateActiveConfig(updated: Partial<PipelineConfigModel>, user: string): PipelineConfigModel {
    const nextConfig: PipelineConfigModel = {
      ...this.currentConfig,
      ...structuredClone(updated),
      version: this.incrementPatchVersion(this.currentConfig.version),
      lastModifiedAt: Date.now(),
      modifiedBy: user,
      isApprovedForProduction: false,
    };
    this.revisionHistory.push(structuredClone(nextConfig));
    this.currentConfig = nextConfig;
    return structuredClone(this.currentConfig);
  }

  public toggleProvider(providerId: string, enabled: boolean): boolean {
    if (enabled) throw new Error(`OPEN_SOURCE_OPEN_DATA_ADMISSION_REQUIRED:${providerId}`);
    const activeProviders = this.currentConfig.activeProviders.filter((p) => p !== providerId);
    this.updateActiveConfig({ activeProviders }, 'provider-toggle');
    return true;
  }

  private buildDefaultProductionConfig(): PipelineConfigModel {
    return {
      configId: 'cfg_prod_canonical_v2',
      version: '2.5.0',
      environment: 'active_production',
      lastModifiedAt: Date.now() - 86400000,
      modifiedBy: 'Enterprise Architecture Lead',
      isApprovedForProduction: false,
      stages: {
        stage_01_ingestion: {
          stageId: 'stage_01_ingestion',
          stageName: '1. Ingestion & Raw Capture',
          isEnabled: true,
          timeoutMs: 1500,
          retryCount: 3,
          circuitBreakerThresholdPct: 5,
        },
        stage_02_normalization: {
          stageId: 'stage_02_normalization',
          stageName: '2. Normalization & Identity Mapping',
          isEnabled: true,
          timeoutMs: 800,
          retryCount: 2,
          circuitBreakerThresholdPct: 2,
        },
        stage_03_validation: {
          stageId: 'stage_03_validation',
          stageName: '3. Data Quality & Plausibility Validation',
          isEnabled: true,
          timeoutMs: 1000,
          retryCount: 1,
          circuitBreakerThresholdPct: 3,
        },
        stage_04_feature_engineering: {
          stageId: 'stage_04_feature_engineering',
          stageName: '4. Feature Engineering (7 Families)',
          isEnabled: true,
          timeoutMs: 2500,
          retryCount: 2,
          circuitBreakerThresholdPct: 4,
        },
        stage_05_scoring: {
          stageId: 'stage_05_scoring',
          stageName: '5. Scoring & Gate Evaluation (50 Components)',
          isEnabled: true,
          timeoutMs: 1800,
          retryCount: 1,
          circuitBreakerThresholdPct: 2,
        },
        stage_06_ranking: {
          stageId: 'stage_06_ranking',
          stageName: '6. Cross-Sectional Ranking & Diffusion',
          isEnabled: true,
          timeoutMs: 1200,
          retryCount: 1,
          circuitBreakerThresholdPct: 2,
        },
        stage_07_evidence: {
          stageId: 'stage_07_evidence',
          stageName: '7. SHA-256 Evidence & Audit Stamping',
          isEnabled: true,
          timeoutMs: 800,
          retryCount: 2,
          circuitBreakerThresholdPct: 1,
        },
        stage_08_delivery: {
          stageId: 'stage_08_delivery',
          stageName: '8. UI Delivery, Screeners & Alert Dispatch',
          isEnabled: true,
          timeoutMs: 600,
          retryCount: 1,
          circuitBreakerThresholdPct: 2,
        },
      },
      activeProviders: [],
      providerFeatureAssignments: {
        technical: [],
        fundamental: [],
        sentiment: [],
        macro: [],
        orderflow: [],
      },
      assetClassRoutes: {
        crypto: {
          primaryProvider: 'OPEN_DATA_NOT_ADMITTED',
          fallbackProvider: 'OPEN_DATA_NOT_ADMITTED',
          maxStalenessSeconds: 15,
          minQualityScore: 85,
        },
        equity_us: {
          primaryProvider: 'OPEN_DATA_NOT_ADMITTED',
          fallbackProvider: 'OPEN_DATA_NOT_ADMITTED',
          maxStalenessSeconds: 60,
          minQualityScore: 90,
        },
      },
      shadowSettings: {
        runShadowInParallel: true,
        sampleRatePercent: 10,
        benchmarkLatencyComparison: true,
      },
    };
  }

  private buildDefaultShadowConfig(): PipelineConfigModel {
    const prod = this.buildDefaultProductionConfig();
    return {
      ...prod,
      configId: 'cfg_shadow_experimental_v3',
      version: '2.6.0-shadow',
      environment: 'shadow_canary',
      isApprovedForProduction: false,
      modifiedBy: 'Experimental ML Quant Lab',
    };
  }

  private incrementPatchVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length === 3) {
      const patch = parseInt(parts[2], 10) + 1;
      return `${parts[0]}.${parts[1]}.${patch}`;
    }
    return `${version}-rev`;
  }
}
