import type {
  DefiResearchScoringInput,
  MemeResearchScoringInput,
} from './CryptoCategoryResearchScoring';

export const CRYPTO_RESEARCH_GATE_EVIDENCE_VERSION = 'crypto-research-gate-evidence/1.0.0' as const;

export type CryptoResearchGateState = 'PASS' | 'BLOCKED' | 'NOT_COMPUTABLE';

export interface CryptoResearchGateEvidence {
  readonly key: string;
  readonly state: CryptoResearchGateState;
  readonly reason: string;
  readonly sourcePath: string;
}

function gate(key: string, state: CryptoResearchGateState, reason: string, sourcePath: string): CryptoResearchGateEvidence {
  return Object.freeze({ key, state, reason, sourcePath });
}

export function projectMemeResearchHardGates(input: MemeResearchScoringInput | null | undefined): readonly CryptoResearchGateEvidence[] {
  if (!input) {
    return Object.freeze([
      gate('buySimulationSuccess', 'NOT_COMPUTABLE', 'Keine attestierte BUY-Simulation im Research-Input.', 'hardGates.buySimulationSuccess'),
      gate('sellSimulationSuccess', 'NOT_COMPUTABLE', 'Keine attestierte SELL-Simulation im Research-Input.', 'hardGates.sellSimulationSuccess'),
      gate('liquidityLockWithinPolicy', 'NOT_COMPUTABLE', 'Keine attestierte Liquidity-Lock-Policy-Evidence.', 'hardGates.liquidityLockWithinPolicy'),
      gate('transferTaxWithinPolicy', 'NOT_COMPUTABLE', 'Keine attestierte Transfer-Tax-Policy-Evidence.', 'hardGates.transferTaxWithinPolicy'),
      gate('contractIntegrityVerified', 'NOT_COMPUTABLE', 'Keine attestierte Contract-Integrity-Evidence.', 'hardGates.contractIntegrityVerified'),
      gate('manipulationEvidenceWithinPolicy', 'NOT_COMPUTABLE', 'Keine attestierte Manipulations-Evidence.', 'hardGates.manipulationEvidenceWithinPolicy'),
      gate('independentMarketConfirmations', 'NOT_COMPUTABLE', 'Mindestens zwei unabhängige Marktbestätigungen müssen backendseitig belegt sein.', 'social.marketConfirmations'),
    ]);
  }

  return Object.freeze([
    gate('buySimulationSuccess', input.hardGates.buySimulationSuccess ? 'PASS' : 'BLOCKED', input.hardGates.buySimulationSuccess ? 'BUY-Simulation erfolgreich attestiert.' : 'BUY-Simulation blockiert oder fehlgeschlagen.', 'hardGates.buySimulationSuccess'),
    gate('sellSimulationSuccess', input.hardGates.sellSimulationSuccess ? 'PASS' : 'BLOCKED', input.hardGates.sellSimulationSuccess ? 'SELL-Simulation erfolgreich attestiert.' : 'SELL-Simulation blockiert oder fehlgeschlagen.', 'hardGates.sellSimulationSuccess'),
    gate('liquidityLockWithinPolicy', input.hardGates.liquidityLockWithinPolicy ? 'PASS' : 'BLOCKED', input.hardGates.liquidityLockWithinPolicy ? 'Liquidity-Lock liegt innerhalb der Policy.' : 'Liquidity-Lock liegt außerhalb der Policy.', 'hardGates.liquidityLockWithinPolicy'),
    gate('transferTaxWithinPolicy', input.hardGates.transferTaxWithinPolicy ? 'PASS' : 'BLOCKED', input.hardGates.transferTaxWithinPolicy ? 'Transfer Tax liegt innerhalb der Policy.' : 'Transfer Tax liegt außerhalb der Policy.', 'hardGates.transferTaxWithinPolicy'),
    gate('contractIntegrityVerified', input.hardGates.contractIntegrityVerified ? 'PASS' : 'BLOCKED', input.hardGates.contractIntegrityVerified ? 'Contract-Integrity ist attestiert.' : 'Contract-Integrity ist nicht verifiziert.', 'hardGates.contractIntegrityVerified'),
    gate('manipulationEvidenceWithinPolicy', input.hardGates.manipulationEvidenceWithinPolicy ? 'PASS' : 'BLOCKED', input.hardGates.manipulationEvidenceWithinPolicy ? 'Manipulations-Evidence liegt innerhalb der Policy.' : 'Manipulations-Evidence liegt außerhalb der Policy.', 'hardGates.manipulationEvidenceWithinPolicy'),
    gate('independentMarketConfirmations', input.social.marketConfirmations >= 2 ? 'PASS' : 'NOT_COMPUTABLE', input.social.marketConfirmations >= 2 ? `${input.social.marketConfirmations} unabhängige Marktbestätigungen attestiert.` : 'Weniger als zwei unabhängige Marktbestätigungen; Research Score bleibt NOT_COMPUTABLE.', 'social.marketConfirmations'),
  ]);
}

export function projectDefiResearchHardGates(input: DefiResearchScoringInput | null | undefined): readonly CryptoResearchGateEvidence[] {
  if (!input) {
    return Object.freeze([
      gate('smartContractEvidenceVerified', 'NOT_COMPUTABLE', 'Keine attestierte Smart-Contract-Evidence.', 'hardGates.smartContractEvidenceVerified'),
      gate('oracleRiskWithinPolicy', 'NOT_COMPUTABLE', 'Keine attestierte Oracle-Risk-Evidence.', 'hardGates.oracleRiskWithinPolicy'),
      gate('unknownAdminCanMint', 'NOT_COMPUTABLE', 'Admin-/Mint-Capability nicht attestiert.', 'hardGates.unknownAdminCanMint'),
      gate('unrestrictedPauseFunction', 'NOT_COMPUTABLE', 'Pause-Capability nicht attestiert.', 'hardGates.unrestrictedPauseFunction'),
      gate('upgradeAuthoritySingleWallet', 'NOT_COMPUTABLE', 'Upgrade-Authority nicht attestiert.', 'hardGates.upgradeAuthoritySingleWallet'),
      gate('exploitUnresolved', 'NOT_COMPUTABLE', 'Exploit-Lifecycle nicht attestiert.', 'hardGates.exploitUnresolved'),
    ]);
  }

  return Object.freeze([
    gate('smartContractEvidenceVerified', input.hardGates.smartContractEvidenceVerified ? 'PASS' : 'BLOCKED', input.hardGates.smartContractEvidenceVerified ? 'Smart-Contract-Evidence verifiziert.' : 'Smart-Contract-Evidence nicht verifiziert.', 'hardGates.smartContractEvidenceVerified'),
    gate('oracleRiskWithinPolicy', input.hardGates.oracleRiskWithinPolicy ? 'PASS' : 'BLOCKED', input.hardGates.oracleRiskWithinPolicy ? 'Oracle-Risiko liegt innerhalb der Policy.' : 'Oracle-Risiko liegt außerhalb der Policy.', 'hardGates.oracleRiskWithinPolicy'),
    gate('unknownAdminCanMint', input.hardGates.unknownAdminCanMint ? 'BLOCKED' : 'PASS', input.hardGates.unknownAdminCanMint ? 'Unbekannter Admin kann minten.' : 'Keine unbekannte Mint-Capability attestiert.', 'hardGates.unknownAdminCanMint'),
    gate('unrestrictedPauseFunction', input.hardGates.unrestrictedPauseFunction ? 'BLOCKED' : 'PASS', input.hardGates.unrestrictedPauseFunction ? 'Unbeschränkte Pause-Funktion attestiert.' : 'Keine unbeschränkte Pause-Funktion attestiert.', 'hardGates.unrestrictedPauseFunction'),
    gate('upgradeAuthoritySingleWallet', input.hardGates.upgradeAuthoritySingleWallet ? 'BLOCKED' : 'PASS', input.hardGates.upgradeAuthoritySingleWallet ? 'Upgrade-Authority liegt bei einer einzelnen Wallet.' : 'Keine Single-Wallet-Upgrade-Authority attestiert.', 'hardGates.upgradeAuthoritySingleWallet'),
    gate('exploitUnresolved', input.hardGates.exploitUnresolved ? 'BLOCKED' : 'PASS', input.hardGates.exploitUnresolved ? 'Ungeklärter Exploit blockiert Research.' : 'Kein ungeklärter Exploit im attestierten Input.', 'hardGates.exploitUnresolved'),
  ]);
}
