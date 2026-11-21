import {
  SolanaRiskResearchInputSchema, SolanaRiskResearchResultSchema,
  type SolanaRiskResearchInput, type SolanaRiskResearchResult,
} from '../contracts/solanaRiskResearch';

/** Deterministic research-only calculation; no provider reads, ordering or execution. */
export function computeSolanaRiskResearch(input: SolanaRiskResearchInput): SolanaRiskResearchResult {
  const data = SolanaRiskResearchInputSchema.parse(input);
  const firstSlot = data.creatorFirstSlotPurchased / data.totalSupply;
  const remaining = data.creatorRemainingTokens / data.totalSupply;
  const x = data.holderGroupTokens / data.poolTokenReserve;
  // Marginal spot-price change in a fee-free constant-product pool, NOT average execution slippage.
  const impact = 1 - 1 / ((1 + x) ** 2);
  const reasons: string[] = [];
  if (data.mintAuthorityRevoked !== true) reasons.push(data.mintAuthorityRevoked === null ? 'MINT_AUTHORITY_UNKNOWN' : 'MINT_AUTHORITY_ACTIVE');
  if (data.freezeAuthorityRevoked !== true) reasons.push(data.freezeAuthorityRevoked === null ? 'FREEZE_AUTHORITY_UNKNOWN' : 'FREEZE_AUTHORITY_ACTIVE');
  if (data.creatorHistoricalIncidents > 0) reasons.push('CREATOR_HISTORY_INCIDENT');
  if (firstSlot >= 0.30) reasons.push('CREATOR_FIRST_SLOT_CONCENTRATION');
  if (remaining >= 0.20) reasons.push('CREATOR_REMAINING_CONCENTRATION');
  if (impact >= 0.50) reasons.push('GROUP_LIQUIDITY_STRESS');
  if (data.creatorHistoricalLaunches === 0) reasons.push('CREATOR_HISTORY_UNAVAILABLE');
  const blocked = data.mintAuthorityRevoked !== true || data.freezeAuthorityRevoked !== true ||
    data.creatorHistoricalLaunches === 0;
  return SolanaRiskResearchResultSchema.parse({
    schemaVersion: 'CAPITAL_AI_SOLANA_RISK_RESEARCH_RESULT@1',
    state: blocked ? 'BLOCKED' : 'RESEARCH_ONLY',
    reasonCodes: reasons,
    firstSlotConcentration: firstSlot,
    remainingCreatorConcentration: remaining,
    groupMarginalPriceImpact: impact,
    developerRiskFlag: data.creatorHistoricalIncidents > 0 || firstSlot >= 0.30 || remaining >= 0.20 ||
      data.mintAuthorityRevoked !== true || data.freezeAuthorityRevoked !== true,
    liquidityDangerFlag: impact >= 0.50,
    scoreEligible: false, rankEligible: false, alertEligible: false,
    decisionEligible: false, productionEligible: false, synthetic: true,
  });
}
