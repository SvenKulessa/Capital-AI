import { CANONICAL_50_COMPONENTS } from '../contracts/analysisComponentRegistry';
import { componentActivationReasons } from '../contracts/analysisComponentRegistryValidator';

export const ANALYSIS_COMPONENT_FLAGS_ENV = 'CAPITAL_ANALYSIS_COMPONENTS_ENABLED';

export interface AnalysisComponentFlagConfig {
  requested: string[];
  enabled: string[];
  unknown: string[];
}

/**
 * Parses the opt-in list for analysis components.
 *
 * Fail-closed invariants:
 * - no value means no component is enabled;
 * - wildcard activation is forbidden;
 * - unknown component IDs are reported and ignored;
 * - a feature flag never overrides registry lifecycle, contracts, provider,
 *   feature, evidence or validation gates.
 */
export function parseAnalysisComponentFlags(raw: string | undefined): AnalysisComponentFlagConfig {
  const known = new Set(CANONICAL_50_COMPONENTS.map(component => component.componentId));
  const requested = [...new Set((raw ?? '').split(',').map(value => value.trim()).filter(Boolean))];
  const unknown = requested.filter(value => value === '*' || !known.has(value));
  const enabled = requested.filter(value => known.has(value));
  return { requested, enabled, unknown };
}

export function analysisComponentRuntimeGate(componentId: string, raw: string | undefined) {
  const config = parseAnalysisComponentFlags(raw);
  const reasons: string[] = [];

  if (config.unknown.length) reasons.push(...config.unknown.map(id => `FEATURE_FLAG_UNKNOWN_COMPONENT:${id}`));
  if (!config.enabled.includes(componentId)) reasons.push('FEATURE_FLAG_DISABLED');

  reasons.push(...componentActivationReasons(componentId));

  return {
    componentId,
    flagEnabled: config.enabled.includes(componentId),
    runtimeEligible: reasons.length === 0,
    reasons: [...new Set(reasons)],
  };
}
