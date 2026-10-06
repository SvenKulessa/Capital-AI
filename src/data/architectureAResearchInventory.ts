import { ZERO_COST_API_THRESHOLD_POLICY_VERSION, ZERO_COST_API_THRESHOLDS } from '../contracts/zeroCostApiThresholds';
import { TOKENOMICS_RESEARCH_REPORT_VERSION, TOKENOMICS_RESEARCH_REPORT } from './tokenomicsResearchReport';

export function buildArchitectureAResearchInventory() {
  const apiServices = Object.values(ZERO_COST_API_THRESHOLDS).map(policy => ({
    id: policy.service,
    domain: policy.domain,
    commercialUseState: policy.commercialUseState,
    defaultEnabled: policy.defaultEnabled,
    automaticPaidEscalation: policy.automaticPaidEscalation,
    thresholdKeys: Object.keys(policy.thresholds).sort(),
  }));
  const blockchainCandidates = TOKENOMICS_RESEARCH_REPORT.blockchainDataComparison.map(candidate => ({
    id: candidate.candidate,
    commercialLane: candidate.commercialLane,
    targetRole: candidate.targetRole,
  }));
  return {
    generatedFrom: [ZERO_COST_API_THRESHOLD_POLICY_VERSION, TOKENOMICS_RESEARCH_REPORT_VERSION] as const,
    generatedAt: 'BUILD_TIME',
    apiServices,
    blockchainCandidates,
  };
}
