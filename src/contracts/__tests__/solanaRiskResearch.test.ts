import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoringEngineService } from '../../services/scoringEngine';
import { SolanaRiskResearchInputSchema } from '../solanaRiskResearch';

const base = () => ({
  schemaVersion: 'CAPITAL_AI_SOLANA_RISK_RESEARCH@1' as const,
  synthetic: true as const,
  tokenMint: 'synthetic-mint-not-chain-address',
  observedAt: 1000, evaluatedAt: 1000,
  totalSupply: 1_000_000_000,
  creatorFirstSlotPurchased: 20_000_000,
  creatorRemainingTokens: 10_000_000,
  creatorHistoricalLaunches: 4,
  creatorHistoricalIncidents: 0,
  mintAuthorityRevoked: true,
  freezeAuthorityRevoked: true,
  holderGroupTokens: 100_000,
  poolTokenReserve: 1_000_000,
  evidenceReferences: ['synthetic-fixture-v1'],
});

test('research-only safe synthetic sample is non-actionable', () => {
  const result = ScoringEngineService.inspectSolanaRiskResearch(base());
  assert.equal(result.state, 'RESEARCH_ONLY');
  assert.deepEqual(result.reasonCodes, []);
  assert.ok(Math.abs(result.groupMarginalPriceImpact! - (1 - 1 / 1.1 ** 2)) < 1e-12);
  for (const field of ['scoreEligible','rankEligible','alertEligible','decisionEligible','productionEligible'] as const)
    assert.equal(result[field], false);
});

test('creator first-slot concentration and dangerous marginal impact are flagged independently', () => {
  const result = ScoringEngineService.inspectSolanaRiskResearch({
    ...base(), creatorFirstSlotPurchased: 320_000_000,
    holderGroupTokens: 500_000, poolTokenReserve: 1_000_000,
  });
  assert.equal(result.developerRiskFlag, true);
  assert.equal(result.liquidityDangerFlag, true);
  assert.ok(result.groupMarginalPriceImpact! > .55);
  assert.ok(result.reasonCodes.includes('GROUP_LIQUIDITY_STRESS'));
  assert.ok(result.reasonCodes.includes('CREATOR_FIRST_SLOT_CONCENTRATION'));
  assert.equal(result.alertEligible, false);
});

test('unknown developer authority or missing history blocks even when stress is low', () => {
  const result = ScoringEngineService.inspectSolanaRiskResearch({
    ...base(), mintAuthorityRevoked: null, creatorHistoricalLaunches: 0,
  });
  assert.equal(result.state, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('MINT_AUTHORITY_UNKNOWN'));
  assert.ok(result.reasonCodes.includes('CREATOR_HISTORY_UNAVAILABLE'));
});

test('negative cases reject invalid, future, duplicated and non-synthetic evidence', () => {
  const cases: unknown[] = [
    {...base(), synthetic: false},
    {...base(), observedAt: 1001},
    {...base(), totalSupply: 0},
    {...base(), poolTokenReserve: 0},
    {...base(), holderGroupTokens: 1_000_000_001},
    {...base(), creatorFirstSlotPurchased: 1_000_000_001},
    {...base(), creatorHistoricalIncidents: 5},
    {...base(), evidenceReferences: ['dup','dup']},
    {...base(), extraUnknownField: 'not admitted'},
    {...base(), holderGroupTokens: Number.NaN},
    {...base(), holderGroupTokens: Number.POSITIVE_INFINITY},
  ];
  for (const item of cases) assert.equal(SolanaRiskResearchInputSchema.safeParse(item).success, false);
});
