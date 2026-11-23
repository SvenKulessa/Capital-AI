import { z } from 'zod';

/**
 * CAPITAL_AI_SOLANA_RISK_RESEARCH@1
 * Independently authored, synthetic/offline research contracts.
 * These inputs are assertions, not verified chain facts. No production eligibility.
 */
const Amount = z.number().finite().nonnegative();
const Fraction = z.number().finite().min(0).max(1);
export const SolanaRiskResearchInputSchema = z.object({
  schemaVersion: z.literal('CAPITAL_AI_SOLANA_RISK_RESEARCH@1'),
  synthetic: z.literal(true),
  tokenMint: z.string().min(1).max(128),
  observedAt: z.number().int().nonnegative(),
  evaluatedAt: z.number().int().nonnegative(),
  totalSupply: Amount.positive(),
  creatorFirstSlotPurchased: Amount,
  creatorRemainingTokens: Amount,
  creatorHistoricalLaunches: z.number().int().nonnegative(),
  creatorHistoricalIncidents: z.number().int().nonnegative(),
  mintAuthorityRevoked: z.boolean().nullable(),
  freezeAuthorityRevoked: z.boolean().nullable(),
  holderGroupTokens: Amount,
  poolTokenReserve: Amount.positive(),
  evidenceReferences: z.array(z.string().min(1).max(256)).min(1).max(64),
}).strict().superRefine((v, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (v.observedAt > v.evaluatedAt) error('FUTURE_OBSERVATION');
  if (v.creatorFirstSlotPurchased > v.totalSupply || v.creatorRemainingTokens > v.totalSupply ||
    v.holderGroupTokens > v.totalSupply) error('TOKEN_AMOUNT_EXCEEDS_SUPPLY');
  if (v.creatorHistoricalIncidents > v.creatorHistoricalLaunches) error('INCIDENTS_EXCEED_LAUNCHES');
  if (new Set(v.evidenceReferences).size !== v.evidenceReferences.length) error('DUPLICATE_EVIDENCE_REFERENCE');
});
export type SolanaRiskResearchInput = z.infer<typeof SolanaRiskResearchInputSchema>;

export const SolanaRiskResearchResultSchema = z.object({
  schemaVersion: z.literal('CAPITAL_AI_SOLANA_RISK_RESEARCH_RESULT@1'),
  state: z.enum(['RESEARCH_ONLY', 'BLOCKED']),
  reasonCodes: z.array(z.string()),
  firstSlotConcentration: Fraction.nullable(),
  remainingCreatorConcentration: Fraction.nullable(),
  groupMarginalPriceImpact: Fraction.nullable(),
  developerRiskFlag: z.boolean(),
  liquidityDangerFlag: z.boolean(),
  scoreEligible: z.literal(false),
  rankEligible: z.literal(false),
  alertEligible: z.literal(false),
  decisionEligible: z.literal(false),
  productionEligible: z.literal(false),
  synthetic: z.literal(true),
}).strict();
export type SolanaRiskResearchResult = z.infer<typeof SolanaRiskResearchResultSchema>;
