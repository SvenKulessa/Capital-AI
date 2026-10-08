import type { CryptoOracleEvidenceEvaluation } from './CryptoOracleEvidence';
import type { CryptoResearchGateEvidence } from './CryptoResearchGateEvidence';

export const CRYPTO_ORACLE_HARD_GATE_PROJECTION_VERSION =
  'crypto-oracle-hard-gate-projection/0.1.0' as const;

export function projectDefiOracleRiskHardGate(
  oracle: CryptoOracleEvidenceEvaluation | null | undefined,
): CryptoResearchGateEvidence {
  if (!oracle || oracle.state === 'NOT_COMPUTABLE' || oracle.oracleRiskWithinPolicy === null) {
    return Object.freeze({
      key: 'oracleRiskWithinPolicy',
      state: 'NOT_COMPUTABLE',
      reason: oracle?.reason ?? 'Oracle-Integrity-/Liveness-/Deviation-Evidence fehlt.',
      sourcePath: 'oracleEvidence.oracleRiskWithinPolicy',
    });
  }

  if (oracle.state === 'BLOCKED' || !oracle.oracleRiskWithinPolicy) {
    return Object.freeze({
      key: 'oracleRiskWithinPolicy',
      state: 'BLOCKED',
      reason: oracle.reason,
      sourcePath: 'oracleEvidence.oracleRiskWithinPolicy',
    });
  }

  return Object.freeze({
    key: 'oracleRiskWithinPolicy',
    state: 'PASS',
    reason: oracle.reason,
    sourcePath: 'oracleEvidence.oracleRiskWithinPolicy',
  });
}
