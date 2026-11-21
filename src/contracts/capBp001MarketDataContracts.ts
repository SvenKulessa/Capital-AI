/**
 * CAP-BP-001 provider-neutral candidate data contracts.
 * Strict offline schemas are NOT live provider admission, evidence authenticity,
 * historical replay verification, or a component activation authority.
 * Deliberately not added to analysisComponentRegistryValidator's live contract map.
 */
import { z } from 'zod';
import { AssetIdentitySchema, DataProvenanceSchema } from './canonicalContracts';

const time = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const identifier = z.string().trim().min(1).max(256);
const base = {
  schemaVersion: z.literal('CAP_BP_001_MARKET_DATA@1'),
  asset: AssetIdentitySchema,
  provenance: DataProvenanceSchema,
  sourceDigestSha256: digest,
  // This is a claimed input hash, not independent immutable storage evidence.
  sourceReference: identifier,
} as const;
const checkProvenance = (p: z.infer<typeof DataProvenanceSchema>, ctx: z.RefinementCtx) => {
  if (p.observedAt > p.receivedAt || p.receivedAt > p.publishedAt ||
      p.latencyMs !== p.receivedAt - p.observedAt) {
    ctx.addIssue({ code: 'custom', message: 'PIT_PROVENANCE_CLOCK_INVALID' });
  }
};

export const RawTickStreamContractSchema = z.strictObject({
  ...base,
  kind: z.literal('raw_tick_stream'),
  ticks: z.array(z.strictObject({
    sequence: z.number().int().nonnegative(),
    observedAt: time,
    bid: z.number().finite().positive(),
    ask: z.number().finite().positive(),
  })).min(2).max(10000),
}).superRefine((v, ctx) => {
  checkProvenance(v.provenance, ctx);
  if (v.provenance.observedAt !== v.ticks[v.ticks.length - 1]?.observedAt) {
    ctx.addIssue({ code: 'custom', message: 'LATEST_TICK_PROVENANCE_MISMATCH' });
  }
  for (let i = 0; i < v.ticks.length; i++) {
    const tick = v.ticks[i];
    if (!tick) continue;
    if (tick.bid > tick.ask) ctx.addIssue({ code: 'custom', message: 'CROSSED_BOOK' });
    if (i === 0) continue;
    const prev = v.ticks[i - 1];
    if (!prev) continue;
    if (tick.sequence !== prev.sequence + 1) ctx.addIssue({ code: 'custom', message: 'TICK_SEQUENCE_NOT_CONTIGUOUS' });
    if (tick.observedAt <= prev.observedAt) ctx.addIssue({ code: 'custom', message: 'TICK_TIME_NOT_MONOTONIC' });
  }
});
export type RawTickStreamContract = z.infer<typeof RawTickStreamContractSchema>;

export const ExchangeStatusContractSchema = z.strictObject({
  ...base,
  kind: z.literal('exchange_status'),
  status: z.enum(['open', 'halted', 'closed', 'unknown']),
  effectiveAt: time,
}).superRefine((v, ctx) => {
  checkProvenance(v.provenance, ctx);
  if (v.effectiveAt > v.provenance.publishedAt) {
    ctx.addIssue({ code: 'custom', message: 'EXCHANGE_STATUS_FUTURE_EFFECTIVE' });
  }
});
export type ExchangeStatusContract = z.infer<typeof ExchangeStatusContractSchema>;

export const IntegrityStatusContractSchema = z.strictObject({
  schemaVersion: z.literal('CAP_BP_001_INTEGRITY_STATUS@1'),
  componentId: z.literal('market_integrity_gate'),
  assetId: identifier,
  evaluatedAt: time,
  inputTickDigestSha256: digest,
  inputExchangeDigestSha256: digest,
  state: z.enum(['BLOCKED', 'NOT_PROVEN']),
  reasonCodes: z.array(identifier).min(1),
  immutableReplayVerified: z.literal(false),
  productionEligible: z.literal(false),
  scoreEligible: z.literal(false),
  decisionEligible: z.literal(false),
  publishable: z.literal(false),
});
export type IntegrityStatusContract = z.infer<typeof IntegrityStatusContractSchema>;

/** Candidate-only PIT join. Passing does not authenticate either source. */
export function inspectCapBp001PointInTimePair(
  ticks: unknown, exchange: unknown, decisionAt: number,
): { state: 'BLOCKED'; candidateConsistent: boolean; reasonCodes: string[] } {
  const t = RawTickStreamContractSchema.safeParse(ticks);
  const e = ExchangeStatusContractSchema.safeParse(exchange);
  const reasons: string[] = [];
  if (!t.success) reasons.push('CAP_BP_001_RAW_TICK_CONTRACT_INVALID');
  if (!e.success) reasons.push('CAP_BP_001_EXCHANGE_STATUS_CONTRACT_INVALID');
  if (!Number.isSafeInteger(decisionAt) || decisionAt <= 0) reasons.push('CAP_BP_001_DECISION_TIME_INVALID');
  if (t.success && e.success && Number.isSafeInteger(decisionAt) && decisionAt > 0) {
    if (t.data.asset.assetId !== e.data.asset.assetId ||
        t.data.asset.venue !== e.data.asset.venue ||
        t.data.provenance.providerId !== e.data.provenance.providerId) {
      reasons.push('CAP_BP_001_PAIR_IDENTITY_MISMATCH');
    }
    if (t.data.provenance.publishedAt > decisionAt ||
        e.data.provenance.publishedAt > decisionAt ||
        e.data.effectiveAt > decisionAt) {
      reasons.push('CAP_BP_001_PAIR_LOOKAHEAD');
    }
    if (e.data.status !== 'open') reasons.push('CAP_BP_001_EXCHANGE_NOT_OPEN');
  }
  return {
    state: 'BLOCKED',
    candidateConsistent: reasons.length === 0,
    reasonCodes: [...reasons, 'CAP_BP_001_RIGHTS_AND_REPLAY_NOT_INDEPENDENTLY_VERIFIED'].sort(),
  };
}
