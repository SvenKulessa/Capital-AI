/**
 * Static MARKET component readiness inventory.
 *
 * This is a repository declaration audit, NOT runtime health, rights admission,
 * model validation, market-data evidence or authority to publish a score.
 * No provider I/O, secrets, feature execution, registry mutation or side effects.
 */
import {
  CANONICAL_50_COMPONENTS,
  CanonicalDomainSchema,
  ComponentLifecycleStatusSchema,
  DataProvenanceModeSchema,
  type ComponentLifecycleStatus,
  type DataProvenanceMode,
} from '../contracts/analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../contracts/analysisComponentRegistryValidator';

export interface MarketComponentReadiness {
  componentId: string;
  domain: string;
  lifecycle: ComponentLifecycleStatus;
  dataMode: DataProvenanceMode;
  calculationVersion: string;
  lastValidatedAt: string | null;
  declaredProviders: string[];
  declaredFeatures: string[];
  issueCodes: string[];
  runtimeVerified: false;
  productionEligible: false;
}

export interface StaticMarketReadinessReport {
  schemaVersion: 'CAPITAL_AI_STATIC_MARKET_INTELLIGENCE_READINESS@1';
  scope: 'REPOSITORY_STATIC_ONLY';
  runtimeEvidence: 'NOT_PROVEN';
  publicScoringEligible: false;
  publicRankingEligible: false;
  registrySchemaValid: boolean;
  registryCount: number;
  expectedRegistryCount: 50;
  domains: readonly string[];
  lifecycleCounts: Record<ComponentLifecycleStatus, number>;
  provenanceCounts: Record<DataProvenanceMode, number>;
  unresolvedReferenceCount: number;
  components: MarketComponentReadiness[];
}

/**
 * A declared `active` status, a feature flag or a registry-valid source is
 * insufficient to prove runtime admission; this method never makes that claim.
 */
export function buildStaticMarketReadinessReport(): StaticMarketReadinessReport {
  const report = validateAnalysisComponentRegistry();
  const lifecycleCounts = Object.fromEntries(
    ComponentLifecycleStatusSchema.options.map(value => [value, 0]),
  ) as Record<ComponentLifecycleStatus, number>;
  const provenanceCounts = Object.fromEntries(
    DataProvenanceModeSchema.options.map(value => [value, 0]),
  ) as Record<DataProvenanceMode, number>;

  const components: MarketComponentReadiness[] = CANONICAL_50_COMPONENTS.map(component => {
    lifecycleCounts[component.status]++;
    provenanceCounts[component.provenanceMode]++;
    const issueCodes = new Set(
      report.issues.filter(issue => issue.componentId === component.componentId || issue.componentId === 'registry')
        .map(issue => issue.code),
    );
    if (component.status !== 'active') issueCodes.add('COMPONENT_NOT_ACTIVE');
    if (!component.lastValidatedAt) issueCodes.add('COMPONENT_VALIDATION_NOT_PROVEN');
    if (!['live', 'delayed', 'cached'].includes(component.provenanceMode)) {
      issueCodes.add('PRODUCTION_DATA_MODE_UNAVAILABLE');
    }
    issueCodes.add('RUNTIME_EVIDENCE_NOT_PROVEN');
    return {
      componentId: component.componentId,
      domain: component.domain,
      lifecycle: component.status,
      dataMode: component.provenanceMode,
      calculationVersion: component.calculationVersion,
      lastValidatedAt: component.lastValidatedAt,
      declaredProviders: [...component.providerDependencies],
      declaredFeatures: [...component.featureDependencies],
      issueCodes: [...issueCodes].sort(),
      runtimeVerified: false,
      productionEligible: false,
    };
  });

  return {
    schemaVersion: 'CAPITAL_AI_STATIC_MARKET_INTELLIGENCE_READINESS@1',
    scope: 'REPOSITORY_STATIC_ONLY',
    runtimeEvidence: 'NOT_PROVEN',
    publicScoringEligible: false,
    publicRankingEligible: false,
    registrySchemaValid: report.schemaValid,
    registryCount: components.length,
    expectedRegistryCount: 50,
    domains: [...CanonicalDomainSchema.options],
    lifecycleCounts,
    provenanceCounts,
    unresolvedReferenceCount: report.issues.filter(issue => issue.code.endsWith('_UNRESOLVED')).length,
    components,
  };
}
