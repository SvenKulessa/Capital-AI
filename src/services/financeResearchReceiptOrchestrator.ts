// MARKET: internal-only bridge from the canonical Finance evaluator to the receipt sink.
// No endpoint, user-provided admission or independent scoring dispatcher.
import { createHash } from 'node:crypto';
import { ScoringEngineService } from './scoringEngine.ts';
import type { FinanceResearchModelEvaluationRequest } from '../platform/FinanceScoringResearch/FinanceResearchModelEvaluation.ts';
import { PipelineSnapshotSchema } from '../contracts/pipelineExecution.ts';
import { FinanceValidatedDataInputSchema } from '../platform/FinanceScoringResearch/FinanceValidatedDataHandoff.ts';
import { evaluateMarketDataRights } from '../contracts/marketDataRightsEligibility.ts';
import { MARKET_SOURCE_POLICY } from '../../server/open-source-market-policy.mjs';

const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const blocked = (reasonCodes: string[]) => Object.freeze({
  state: 'BLOCKED' as const, reasonCodes, scoreEligible: false as const,
  rankEligible: false as const, decisionEligible: false as const,
  productionEligible: false as const,
});

export async function evaluateFinanceResearchForReceipt(
  request: FinanceResearchModelEvaluationRequest,
  sink: (evaluation: ReturnType<typeof ScoringEngineService.inspectFinanceModelResearch>,
    context: {assetClass:string; instrumentFingerprint:string; rightsEvidenceFingerprint:string;
      sourceScope:'NON_PRIVATE_OPEN_DATA';rightsDecision:'OPEN_SOURCE_OPEN_DATA_ADMITTED';
      evaluatedAt:number}) => Promise<unknown>,
  now = Date.now(),
) {
  const snapshot = PipelineSnapshotSchema.parse(request.snapshot);
  const source = FinanceValidatedDataInputSchema.safeParse(request.validatedData);
  if (!source.success) return blocked(['VALIDATED_DATA_INVALID']);
  if (snapshot.isDemo || snapshot.evaluatedAt > now)
    return blocked(['DEMO_OR_FUTURE_DATA_BLOCKED']);

  const rightsEvidence = [];
  const providers = [...new Set(source.data.observations.map(o => o.provenance.providerId))].sort();
  for (const providerId of providers) {
    const admission = MARKET_SOURCE_POLICY.admittedSources.find(s =>
      s.providerId === providerId && s.eligible && s.capabilities.scoringPriceInput);
    const sourceRights = MARKET_SOURCE_POLICY.rightsAdmittedSources.find(s =>
      s.providerId === providerId && s.eligible &&
      s.capabilities.scoringPriceInput &&
      s.capabilities.scoringAssetClasses.includes(snapshot.asset.assetClass));
    if (!admission || !sourceRights) return blocked(['PROVIDER_NOT_ADMITTED']);
    if (sourceRights.obligations.length) return blocked(['RIGHTS_OBLIGATIONS_UNIMPLEMENTED']);
    const rights = snapshot.rights.find(r => r.providerId === providerId);
    if (!rights) return blocked(['RIGHTS_MISSING']);
    const decision = evaluateMarketDataRights(rights,
      ['internal_analysis','derived_scoring_research','cache_retention'],
      new Date(snapshot.evaluatedAt));
    if (!decision.eligible || decision.obligations.length ||
        !rights.reviewedAt || Date.parse(rights.reviewedAt) > snapshot.evaluatedAt)
      return blocked(['RIGHTS_UNVERIFIED']);
    for (const o of source.data.observations.filter(o => o.provenance.providerId === providerId)) {
      const feed = o.provenance.providerDataset + ':' + snapshot.asset.symbol + ':' + snapshot.asset.venue;
      if (!rights.feedsSymbolsAndVenues?.includes(feed)) return blocked(['FEED_SCOPE_MISMATCH']);
    }
    rightsEvidence.push(rights);
  }
  const evaluation = ScoringEngineService.inspectFinanceModelResearch(request);
  if (evaluation.state !== 'RESEARCH_EVALUATED' || !evaluation.researchReplayFingerprint ||
      evaluation.scoreEligible !== false || evaluation.productionEligible !== false)
    return blocked(evaluation.reasons.length ? [...evaluation.reasons] : ['RESEARCH_BLOCKED']);
  const context = {
    assetClass:snapshot.asset.assetClass,
    instrumentFingerprint:sha([snapshot.asset.assetId,snapshot.asset.symbol,
      snapshot.asset.venue,snapshot.asset.assetClass,snapshot.horizon,snapshot.regime]),
    rightsEvidenceFingerprint:sha(rightsEvidence),
    sourceScope:'NON_PRIVATE_OPEN_DATA' as const,
    rightsDecision:'OPEN_SOURCE_OPEN_DATA_ADMITTED' as const,
    evaluatedAt:snapshot.evaluatedAt,
  };
  const receipt = await sink(evaluation,context);
  return Object.freeze({state:'RESEARCH_RECEIPT_DURABLE' as const,receipt,
    scoreEligible:false as const,rankEligible:false as const,
    decisionEligible:false as const,productionEligible:false as const});
}
