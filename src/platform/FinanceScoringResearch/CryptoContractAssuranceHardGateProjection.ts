import type { CryptoContractAssuranceEvaluation } from './CryptoContractAssuranceEvidence';
import type { CryptoResearchGateEvidence } from './CryptoResearchGateEvidence';

export const CRYPTO_CONTRACT_ASSURANCE_HARD_GATE_PROJECTION_VERSION =
  'crypto-contract-assurance-hard-gate-projection/0.1.0' as const;

export function projectDefiContractAssuranceHardGate(
  assurance: CryptoContractAssuranceEvaluation | null | undefined,
): CryptoResearchGateEvidence {
  if (
    !assurance ||
    assurance.state === 'NOT_COMPUTABLE' ||
    assurance.smartContractEvidenceVerified === null
  ) {
    return Object.freeze({
      key: 'smartContractEvidenceVerified',
      state: 'NOT_COMPUTABLE',
      reason: assurance?.reason ?? 'Contract-Assurance-Evidence fehlt.',
      sourcePath: 'contractAssurance.smartContractEvidenceVerified',
    });
  }

  if (assurance.state === 'BLOCKED' || !assurance.smartContractEvidenceVerified) {
    return Object.freeze({
      key: 'smartContractEvidenceVerified',
      state: 'BLOCKED',
      reason: assurance.reason,
      sourcePath: 'contractAssurance.smartContractEvidenceVerified',
    });
  }

  return Object.freeze({
    key: 'smartContractEvidenceVerified',
    state: 'PASS',
    reason: assurance.reason,
    sourcePath: 'contractAssurance.smartContractEvidenceVerified',
  });
}
