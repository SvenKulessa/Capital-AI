/**
 * CAPITAL_AI_PRODUCT_OPPORTUNITY@1 - draft-only, deterministic product evaluation.
 * Issue #874. No provider calls, persistence, publication, billing or new authority.
 * External evidence statuses in input are claims to be checked, not trusted attestations.
 */
export const PRODUCT_OPPORTUNITY_VERSION = 'CAPITAL_AI_PRODUCT_OPPORTUNITY@1';
export const PRODUCT_OPPORTUNITY_LIMITS = Object.freeze({
  scenarios: 6, competitors: 12, capabilities: 20, audience: 6,
});

function fail(code) { throw new Error('PRODUCT_OPPORTUNITY_' + code); }
function record(value, fields, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(code + '_OBJECT');
  for (const key of Object.keys(value)) if (!fields.includes(key)) fail(code + '_UNKNOWN_FIELD');
  return value;
}
function safeText(value, code, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max ||
      /[\u0000-\u001f\u007f]/u.test(value)) fail(code + '_TEXT');
  // DLP is intentionally conservative and incomplete; further review remains required.
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/iu.test(value) ||
      /(?:github_pat_|gh[pousr]_|sk-(?:proj-)?|xox[baprs]-|AIza|AKIA)[a-z0-9_-]{8,}/iu.test(value) ||
      /\b(?:bearer|password|api[_-]?key|refresh[_-]?token)\s*[:=]\s*\S+/iu.test(value)) {
    fail(code + '_SENSITIVE_DATA');
  }
  return value.trim();
}
function finite(value, code, limit = 1_000_000_000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > limit) {
    fail(code + '_NUMBER');
  }
  return value;
}
function integer(value, code, maximum) {
  finite(value, code, maximum);
  if (!Number.isInteger(value)) fail(code + '_INTEGER');
  return value;
}
function sha(value, code) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/u.test(value)) fail(code + '_SHA');
  return value;
}
function https(value, code) {
  if (safeText(value, code + '_URL', 2048) !== value) fail(code + '_URL');
  let parsed, decoded;
  try {
    parsed = new URL(value);
    decoded = decodeURIComponent(value);
  } catch { fail(code + '_URL'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password ||
      parsed.href !== value || /[?#]/u.test(value)) {
    fail(code + '_URL');
  }
  safeText(decoded, code + '_URL', 2048);
}
function list(value, code, max, min = 1) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(code + '_COUNT');
  return value;
}
function uniqueIds(values, field, code) {
  const seen = new Set();
  for (const item of values) {
    if (seen.has(item[field])) fail(code + '_DUPLICATE');
    seen.add(item[field]);
  }
}
function source(input, productSha, code) {
  const doc = record(input, ['sourceSha', 'sourceUrl', 'evidenceRef', 'observedAt', 'status'], code);
  if (sha(doc.sourceSha, code) !== productSha) fail(code + '_SOURCE_BINDING');
  https(doc.sourceUrl, code);
  safeText(doc.evidenceRef, code + '_REF', 160);
  if (typeof doc.observedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(doc.observedAt) ||
      !Number.isFinite(Date.parse(doc.observedAt + 'T00:00:00Z')) ||
      new Date(doc.observedAt + 'T00:00:00Z').toISOString().slice(0, 10) !== doc.observedAt) {
    fail(code + '_DATE');
  }
  if (!['SOURCE_RECORDED', 'NOT_PROVEN'].includes(doc.status)) fail(code + '_STATUS');
  return doc;
}
const BLOCKED_CLAIMS = /(?:\b100\s*%|\b100\s*prozent\b|\b(?:guaranteed|garantiert|echtzeit[- ]?schutz|realtime protection|real.time antivirus|virusfrei|malwarefrei|nachgewiesene erkennung|roi (?:ist|beträgt)|roi von|sichere rendite)\b)/iu;
function claimText(value, code) {
  const text = safeText(value, code, 360);
  if (BLOCKED_CLAIMS.test(text)) fail(code + '_UNSUPPORTED_PROTECTION_OR_ROI');
  return text;
}

export function identifyProductSignal(task) {
  if (typeof task !== 'string' || !task.trim() || task.length > 3000) return null;
  // Only product or monetization tasks. Routine chat/CI/security audits are not a product signal.
  const normalized = task.toLowerCase();
  if (!/\b(?:produktidee|produktchance|produktkonzept|vermarkt|monetaris|rentabilit|pricing|preisstrategie|produktgeschäft|product opportunity|go.to.market|saas|vertrieb)\w*/u.test(normalized)) return null;
  if (!/\b(?:produkt|app|anwendung|service|dienst|plattform|tool|saas|startup|devicecare|device care)\w*/u.test(normalized)) return null;
  return Object.freeze({ state: 'REVIEW_CANDIDATE', routingDomain: 'GROWTH', requiresEvidence: true });
}

export function validateProductOpportunity(input) {
  const data = record(input, [
    'contractVersion', 'productId', 'sourceSha', 'campaignId', 'canonicalUrl',
    'problem', 'valueProposition', 'audience', 'capabilities', 'competitors',
    'scenarios', 'scores', 'rights', 'estimatedDeliveryHours', 'marketSizing',
  ], 'INPUT');
  if (data.contractVersion !== PRODUCT_OPPORTUNITY_VERSION) fail('VERSION');
  if (typeof data.productId !== 'string' || !/^[a-z][a-z0-9-]{2,80}$/u.test(data.productId)) fail('PRODUCT_ID');
  sha(data.sourceSha, 'PRODUCT');
  if (typeof data.campaignId !== 'string' || !/^[a-z0-9][a-z0-9-]{2,100}$/u.test(data.campaignId)) fail('CAMPAIGN_ID');
  https(data.canonicalUrl, 'CANONICAL');
  claimText(data.problem, 'PROBLEM');
  claimText(data.valueProposition, 'VALUE');
  list(data.audience, 'AUDIENCE', PRODUCT_OPPORTUNITY_LIMITS.audience);
  data.audience.forEach((value) => safeText(value, 'AUDIENCE', 120));
  list(data.capabilities, 'CAPABILITIES', PRODUCT_OPPORTUNITY_LIMITS.capabilities);
  for (const c of data.capabilities) {
    record(c, ['id', 'claim', 'evidence'], 'CAPABILITY');
    if (!/^[a-z0-9-]{2,80}$/u.test(c.id)) fail('CAPABILITY_ID');
    claimText(c.claim, 'CAPABILITY_CLAIM');
    source(c.evidence, data.sourceSha, 'CAPABILITY');
  }
  uniqueIds(data.capabilities, 'id', 'CAPABILITY');
  list(data.competitors, 'COMPETITORS', PRODUCT_OPPORTUNITY_LIMITS.competitors, 0);
  for (const c of data.competitors) {
    record(c, ['name', 'differentiator', 'evidence'], 'COMPETITOR');
    safeText(c.name, 'COMPETITOR_NAME', 100);
    claimText(c.differentiator, 'COMPETITOR_DIFFERENTIATOR');
    source(c.evidence, data.sourceSha, 'COMPETITOR');
  }
  const sizing = record(data.marketSizing,
    ['method', 'addressableCustomers', 'penetrationPercent', 'period', 'basis', 'evidenceRef'],
    'MARKET_SIZING');
  if (!['UNKNOWN', 'BOTTOM_UP', 'TOP_DOWN'].includes(sizing.method) ||
      sizing.period !== '12_MONTHS' || sizing.basis !== 'ASSUMPTION') {
    fail('MARKET_SIZING_ASSUMPTION_REQUIRED');
  }
  if (sizing.method === 'UNKNOWN') {
    if (sizing.addressableCustomers !== null ||
        sizing.penetrationPercent !== null || sizing.evidenceRef !== null) {
      fail('MARKET_SIZING_UNKNOWN_MUST_BE_EMPTY');
    }
  } else {
    integer(sizing.addressableCustomers, 'MARKET_ADDRESSABLE_CUSTOMERS', 100_000_000);
    if (sizing.addressableCustomers < 1) fail('MARKET_ADDRESSABLE_CUSTOMERS_ZERO');
    finite(sizing.penetrationPercent, 'MARKET_PENETRATION', 100);
    safeText(sizing.evidenceRef, 'MARKET_SIZING_EVIDENCE_REF', 160);
  }
  list(data.scenarios, 'SCENARIOS', PRODUCT_OPPORTUNITY_LIMITS.scenarios);
  for (const s of data.scenarios) {
    record(s, ['id', 'paidUsers', 'monthlyNetArpuEur', 'monthlyVariableCostEur',
      'monthlyFixedCostEur', 'cacEur', 'newPaidCustomers', 'developerHours',
      'developerHourlyEur', 'horizonMonths', 'basis'], 'SCENARIO');
    if (!/^[a-z0-9-]{2,60}$/u.test(s.id)) fail('SCENARIO_ID');
    for (const field of ['paidUsers', 'monthlyNetArpuEur', 'monthlyVariableCostEur',
      'monthlyFixedCostEur', 'cacEur', 'newPaidCustomers', 'developerHours',
      'developerHourlyEur']) finite(s[field], 'SCENARIO_' + field);
    integer(s.paidUsers, 'PAID_USERS', 10_000_000);
    integer(s.newPaidCustomers, 'NEW_PAID_CUSTOMERS', 10_000_000);
    integer(s.horizonMonths, 'HORIZON', 60);
    if (s.horizonMonths < 1 || s.newPaidCustomers > s.paidUsers) fail('SCENARIO_COHORT');
    // No invented verified ROI from input: every scenario remains a labelled hypothesis.
    if (s.basis !== 'ASSUMPTION') fail('SCENARIO_EVIDENCE_UNVERIFIED');
  }
  uniqueIds(data.scenarios, 'id', 'SCENARIO');
  record(data.scores, ['market', 'product', 'economics', 'growth', 'trust'], 'SCORES');
  for (const key of ['market', 'product', 'economics', 'growth', 'trust']) {
    finite(data.scores[key], 'SCORE_' + key, 5);
  }
  record(data.rights, ['status', 'evidenceRef'], 'RIGHTS');
  if (!['NOT_PROVEN', 'SOURCE_RECORDED'].includes(data.rights.status)) fail('RIGHTS_STATUS');
  if (data.rights.status === 'SOURCE_RECORDED') safeText(data.rights.evidenceRef, 'RIGHTS_REF', 160);
  else if (data.rights.evidenceRef !== null) fail('RIGHTS_EVIDENCE');
  finite(data.estimatedDeliveryHours, 'DELIVERY_HOURS', 100_000);
  return data;
}

function round2(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

export function calculateOpportunityScenario(scenario) {
  const s = scenario;
  const months = s.horizonMonths;
  const revenueEur = s.paidUsers * s.monthlyNetArpuEur * months;
  const operatingEur = (s.paidUsers * s.monthlyVariableCostEur + s.monthlyFixedCostEur) * months;
  const acquisitionEur = s.cacEur * s.newPaidCustomers;
  const developmentEur = s.developerHours * s.developerHourlyEur;
  const costsEur = operatingEur + acquisitionEur + developmentEur;
  const profitEur = revenueEur - costsEur;
  // Large hypothetical amounts exceed useful precision long before JS overflows.
  if (![revenueEur, operatingEur, acquisitionEur, developmentEur, costsEur, profitEur]
    .every(value => Number.isFinite(value) && Math.abs(value) <= 1_000_000_000_000)) {
    fail('SCENARIO_SCALE_UNSUPPORTED');
  }
  const contributionPerUserEur = s.monthlyNetArpuEur - s.monthlyVariableCostEur;
  const breakEvenPaidUsers = contributionPerUserEur > 0 ?
    Math.ceil((s.monthlyFixedCostEur + (acquisitionEur + developmentEur) / months) /
      contributionPerUserEur) : null;
  const roiPercent = costsEur > 0 ? round2(profitEur / costsEur * 100) : null;
  if ((breakEvenPaidUsers !== null && !Number.isSafeInteger(breakEvenPaidUsers)) ||
      (roiPercent !== null && (!Number.isFinite(roiPercent) || Math.abs(roiPercent) > 1_000_000_000_000))) {
    fail('SCENARIO_SCALE_UNSUPPORTED');
  }
  return Object.freeze({
    scenarioId: s.id, evidenceStatus: 'HYPOTHESIS_NOT_VERIFIED',
    horizonMonths: months, revenueEur: round2(revenueEur), operatingEur: round2(operatingEur),
    acquisitionEur: round2(acquisitionEur), developmentEur: round2(developmentEur),
    totalCostsEur: round2(costsEur), profitEur: round2(profitEur),
    contributionPerUserEur: round2(contributionPerUserEur),
    breakEvenPaidUsers, roiPercent,
  });
}

export function evaluateProductOpportunity(input) {
  const p = validateProductOpportunity(input);
  const scenarios = p.scenarios.map(calculateOpportunityScenario);
  const weights = { market: 25, product: 25, economics: 20, growth: 15, trust: 15 };
  const score = round2(Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + p.scores[key] * weight / 5, 0));
  const boundCapabilities = p.capabilities.filter(c => c.evidence.status === 'SOURCE_RECORDED');
  const evidenceGaps = [
    ...p.capabilities.filter(c => c.evidence.status !== 'SOURCE_RECORDED').map(c => 'CAPABILITY:' + c.id),
    ...p.competitors.filter(c => c.evidence.status !== 'SOURCE_RECORDED').map(c => 'COMPETITOR:' + c.name),
    ...(p.rights.status !== 'SOURCE_RECORDED' ? ['RIGHTS'] : []),
    ...(p.marketSizing.method === 'UNKNOWN' ? ['MARKET_SIZING_METHOD_MISSING'] : []),
    'INDEPENDENT_EVIDENCE_REVIEW_REQUIRED',
    'CUSTOMER_DEMAND_NOT_PROVEN',
  ];
  const viable = scenarios.some(s => s.contributionPerUserEur > 0);
  const decision = !viable || p.scores.trust < 2 ? 'HOLD' :
    score < 20 ? 'REJECT' : 'VALIDATE';
  // No self-authorized GO: an independent, authenticated evidence admission is not in this contract.
  return Object.freeze({
    contractVersion: PRODUCT_OPPORTUNITY_VERSION,
    productId: p.productId, sourceSha: p.sourceSha, campaignId: p.campaignId,
    score, decision, confidence: 'HYPOTHESIS', evidenceGaps,
    scenarioResults: scenarios, competitorCount: p.competitors.length,
    estimatedDeliveryHours: p.estimatedDeliveryHours,
    marketSizing: {
      method: p.marketSizing.method,
      period: p.marketSizing.period,
      evidenceStatus: 'HYPOTHESIS_NOT_VERIFIED',
      estimatedReachableCustomers: p.marketSizing.method === 'UNKNOWN'
        ? null : round2(p.marketSizing.addressableCustomers * p.marketSizing.penetrationPercent / 100),
    },
    supportedDraftClaims: boundCapabilities.map(c => c.id),
    agents: ['MARKET', 'PRODUCT', 'FINANCE', 'GROWTH', 'TRUST', 'QUALITY'],
    quality: { review: 'INDEPENDENT_REVIEW_REQUIRED', verdict: 'NOT_PROVEN' },
    permissions: { publication: false, spend: false, deployment: false, billing: false },
  });
}

export function buildOpportunityDraftCampaign(input, claimId) {
  const p = validateProductOpportunity(input);
  const claim = p.capabilities.find(c => c.id === claimId);
  if (!claim || claim.evidence.status !== 'SOURCE_RECORDED') fail('CLAIM_SOURCE_REQUIRED');
  // Repo source is only recorded provenance; an independent check is still required.
  const brief = {
    campaignId: p.campaignId, productId: p.productId, sourceSha: p.sourceSha,
    canonicalUrl: p.canonicalUrl, locale: 'de-DE', objective: claim.claim,
    audience: [...p.audience], channels: ['WEBSITE', 'LINKEDIN'],
    outputs: ['TEXT', 'ANALYTICS'], sourceUrls: [p.canonicalUrl],
  };
  return Object.freeze({
    contractVersion: PRODUCT_OPPORTUNITY_VERSION,
    mode: 'DRAFT_ONLY',
    brief,
    approvedClaimStatus: 'SOURCE_RECORDED_NOT_INDEPENDENTLY_VERIFIED',
    contentEngineContract: 'CAPITAL_AI_CONTENT_ENGINE@1',
    publicationAdapter: 'SOCIAL_MEDIA_ENGINE',
    cadsReview: 'REQUIRED',
    originalGraphicRights: 'NOT_PROVEN',
    publisherReady: false,
    n8n: { orchestration: 'EVALUATION_ONLY', enabled: false },
    ownerApproval: false, publishAllowed: false, paidMediaAllowed: false,
  });
}

export function evaluateProductPortfolio(opportunities) {
  list(opportunities, 'PORTFOLIO', 40);
  const parsed = opportunities.map(validateProductOpportunity);
  uniqueIds(parsed, 'campaignId', 'CAMPAIGN');
  return parsed.map(evaluateProductOpportunity);
}
