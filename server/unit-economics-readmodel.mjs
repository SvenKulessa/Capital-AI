/**
 * CAPITAL-AI Unit Economics: source-only, server-side offline read model.
 * No database writes, provider calls, payment effects or production KPI authority.
 * Monetary inputs and outputs use EUR cents represented as safe integers.
 */
export const UNIT_ECONOMICS_SCHEMA = 'capital-ai.unit-economics-snapshot/v1';
const COST_NAMES = Object.freeze(['paymentFees', 'directData', 'inference', 'tools', 'support', 'delivery', 'acquisition']);
const SOURCE_NAMES = Object.freeze(['revenue', ...COST_NAMES, 'visitors', 'leads', 'offers', 'subscriptions', 'agentRuns']);
const STATUS = Object.freeze({ computed: 'COMPUTED_FROM_SUPPLIED_INPUT', incomplete: 'INCOMPLETE' });

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(name + ': object required');
  return value;
}
function nonNegativeInt(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(name + ': nonnegative safe integer required');
  return value;
}
function sumMoney(values, name) {
  return values.reduce((total, value) => {
    const next = total + value;
    if (!Number.isSafeInteger(next)) throw new RangeError(name + ': integer overflow');
    return next;
  }, 0);
}
function proof(value, name) {
  requireObject(value, 'coverage.' + name);
  if (typeof value.complete !== 'boolean') throw new TypeError('coverage.' + name + '.complete: boolean required');
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.some(ref =>
    typeof ref !== 'string' || ref.length === 0 || ref.length > 500)) {
    throw new TypeError('coverage.' + name + '.evidenceRefs: bounded strings required');
  }
  if (value.complete && value.evidenceRefs.length === 0) {
    throw new Error('coverage.' + name + ': cannot be complete without provenance');
  }
  if (name === 'offers' && value.complete && value.evidenceClass !== 'A') {
    throw new TypeError('coverage.offers: realized acceptance requires class A evidence');
  }
  return value.complete;
}
function metric(value, required, coverage) {
  const missing = required.filter(key => !coverage[key]);
  return missing.length
    ? { status: STATUS.incomplete, value: null, missing }
    : { status: STATUS.computed, value, missing: [] };
}
function fraction(numerator, denominator, name) {
  if (denominator === 0) return null;
  const ratio = numerator / denominator;
  if (!Number.isFinite(ratio)) throw new RangeError(name + ': overflow');
  return ratio;
}
function safeDifference(start, deductions, name) {
  const result = BigInt(start) - deductions.reduce((total, value) => total + BigInt(value), 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(name + ': integer overflow');
  }
  return Number(result);
}
function readCounts(raw, names, name) {
  requireObject(raw, name);
  return Object.fromEntries(names.map(key => [key, nonNegativeInt(raw[key], name + '.' + key)]));
}
function normalizedUtcDate(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().replace('.000Z', 'Z') === value;
}

/**
 * Projection from caller-supplied, already reconciled per-product/per-period aggregates.
 * A "complete" flag is merely an unverified caller assertion; the output NEVER
 * claims authoritative production evidence. Never expose this as a public KPI endpoint.
 *
 * recognizedNetRevenueMinor MUST already be net of VAT, refunds, credits and
 * chargebacks. Subtracting those amounts a second time would be incorrect.
 */
export function calculateUnitEconomics(input) {
  requireObject(input, 'input');
  if (input.schemaVersion !== UNIT_ECONOMICS_SCHEMA) throw new TypeError('unknown schemaVersion');
  if (input.currency !== 'EUR') throw new TypeError('currency: only EUR supported; no implicit FX');
  if (!['SYNTHETIC', 'UNVERIFIED_INPUT'].includes(input.provenanceKind)) {
    throw new TypeError('unverified provenanceKind');
  }
  if (typeof input.product !== 'string' || !/^[a-z][a-z0-9_-]{1,63}$/.test(input.product)) {
    throw new TypeError('invalid product');
  }
  if (!normalizedUtcDate(input.periodStart) || !normalizedUtcDate(input.periodEnd) ||
      Date.parse(input.periodStart) >= Date.parse(input.periodEnd)) {
    throw new TypeError('invalid UTC period');
  }

  const c = requireObject(input.coverage, 'coverage');
  const coverage = Object.fromEntries(SOURCE_NAMES.map(name => [name, proof(c[name], name)]));
  const f = requireObject(input.financial, 'financial');
  const revenue = nonNegativeInt(f.recognizedNetRevenueMinor, 'financial.recognizedNetRevenueMinor');
  const costs = Object.fromEntries(COST_NAMES.map(name =>
    [name, nonNegativeInt(f[name + 'Minor'], 'financial.' + name + 'Minor')]));
  const funnel = readCounts(input.funnel,
    ['eligibleConsentedVisitors', 'qualifiedLeads', 'newPaidCustomers', 'validOffers', 'acceptedOffers'], 'funnel');
  const subs = readCounts(input.subscriptions,
    ['openingCustomers', 'lostCustomers', 'openingMrrMinor', 'lostMrrMinor', 'downgradeMrrMinor', 'expansionMrrMinor'], 'subscriptions');
  const runs = readCounts(input.agentRuns, ['successfulRuns', 'failedRuns'], 'agentRuns');
  const mrrLosses = sumMoney([subs.lostMrrMinor, subs.downgradeMrrMinor], 'MRR losses');

  if (funnel.newPaidCustomers > funnel.qualifiedLeads ||
      funnel.acceptedOffers > funnel.validOffers ||
      subs.lostCustomers > subs.openingCustomers ||
      mrrLosses > subs.openingMrrMinor) {
    throw new RangeError('contradictory cohort/subscription count');
  }

  const dbICosts = ['revenue', 'paymentFees', 'directData', 'inference', 'tools'];
  const dbI = safeDifference(revenue, [costs.paymentFees, costs.directData, costs.inference, costs.tools], 'DB_I');
  const dbII = safeDifference(dbI, [costs.support, costs.delivery], 'DB_II');
  const dbIII = safeDifference(dbII, [costs.acquisition], 'DB_III');
  const runCost = sumMoney([costs.inference, costs.tools], 'agentRunCost');

  return {
    schemaVersion: UNIT_ECONOMICS_SCHEMA,
    provenanceKind: input.provenanceKind,
    qualification: 'SOURCE_PROOFS_NOT_INDEPENDENTLY_VERIFIED',
    product: input.product,
    currency: 'EUR',
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    indicators: {
      leadToPaid: metric(fraction(funnel.newPaidCustomers, funnel.qualifiedLeads, 'leadToPaid'), ['leads'], coverage),
      realizedOfferAcceptance: metric(fraction(funnel.acceptedOffers, funnel.validOffers, 'offerAcceptance'), ['offers'], coverage),
      inferenceAndToolCostMinor: metric(runCost, ['inference', 'tools'], coverage),
      costPerSuccessfulRunMinor: metric(
        runs.successfulRuns > 0 ? Math.ceil(runCost / runs.successfulRuns) : null,
        ['agentRuns', 'inference', 'tools'], coverage),
      supportCostMinor: metric(costs.support, ['support'], coverage),
      logoChurn: metric(fraction(subs.lostCustomers, subs.openingCustomers, 'logoChurn'), ['subscriptions'], coverage),
      grossRevenueChurn: metric(fraction(mrrLosses, subs.openingMrrMinor, 'grossChurn'), ['subscriptions'], coverage),
      netRevenueRetention: metric(
        fraction(safeDifference(sumMoney([subs.openingMrrMinor, subs.expansionMrrMinor], 'MRR total'),
          [subs.lostMrrMinor, subs.downgradeMrrMinor], 'NRR amount'), subs.openingMrrMinor, 'nrr'),
        ['subscriptions'], coverage),
      dbIminor: metric(dbI, dbICosts, coverage),
      dbIIminor: metric(dbII, [...dbICosts, 'support', 'delivery'], coverage),
      dbIIIminor: metric(dbIII, [...dbICosts, 'support', 'delivery', 'acquisition'], coverage),
      dbIImargin: metric(fraction(dbII, revenue, 'dbIImargin'),
        [...dbICosts, 'support', 'delivery'], coverage),
    },
  };
}
