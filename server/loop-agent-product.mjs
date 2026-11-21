/** CAPITAL-AI commercial Loop control-plane: server-only, opt-in adapters, no provider calls. */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const LOOP_AGENT_PRODUCT = Object.freeze({
  contract: 'LOOP_AGENT_PRODUCT@1',
  tiers: Object.freeze(['FREE', 'PRO', 'TEAM', 'ENTERPRISE']),
  commercialAuthority: 'explicit server-side mapped Stripe Price and processed event',
  actionAuthority: 'independent repository policy, capability grant, TRUST, QUALITY and provider readback',
  productionMutationFromPayment: false,
});
export const GROWTH_EVENTS = Object.freeze([
  'PRODUCT_VIEWED', 'PRICING_VIEWED', 'CHECKOUT_STARTED', 'SUBSCRIPTION_ACTIVATED',
  'REPOSITORY_CONNECTED', 'FIRST_LOOP_STARTED', 'FIRST_LOOP_VERIFIED', 'LOOP_SUCCEEDED',
  'LOOP_FAILED', 'HUMAN_INTERVENTION', 'LIMIT_REACHED', 'SUBSCRIPTION_CANCELED',
]);
const TIERS = new Set(LOOP_AGENT_PRODUCT.tiers);
const CAPS = ['observe','advisor','repair','createPullRequest','autonomousConvergence','productionMutation'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[a-zA-Z0-9][\w.:-]{0,119}$/;
const STRIPE = /^(?:price|prod|sub|cus|evt)_[A-Za-z0-9]{6,120}$/;
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
const fail = () => { throw new Error('LOOP_AGENT_ADMISSION_DENIED'); };
const canonical = x => Array.isArray(x) ? x.map(canonical) : object(x) ?
  Object.fromEntries(Object.keys(x).sort().map(k=>[k, canonical(x[k])])) : x;
export const loopDigest = x => createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const positive = x => Number.isSafeInteger(x) && x >= 0;
const timestamp = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x) && Number.isFinite(Date.parse(x));

/** Verify raw Stripe bytes before parsing; replay and out-of-order handling require persistent inbox. */
export function verifyLoopStripeEvent({ rawBody, signature, secret, nowSeconds, toleranceSeconds = 300 }) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length < 8 || rawBody.length > 1024*256 ||
      typeof signature !== 'string' || signature.length > 4096 || typeof secret !== 'string' || !secret.startsWith('whsec_') ||
      !positive(nowSeconds) || !positive(toleranceSeconds) || toleranceSeconds > 300) fail();
  const ts = /^t=(\d{9,12})(?:,|$)/.exec(signature)?.[1];
  const sigs = [...signature.matchAll(/(?:^|,)v1=([a-f0-9]{64})(?=,|$)/g)].map(x=>x[1]);
  if (!ts || !sigs.length || Math.abs(nowSeconds - Number(ts)) > toleranceSeconds) fail();
  const expected = createHmac('sha256', secret).update(ts+'.').update(rawBody).digest();
  if (!sigs.some(x=> timingSafeEqual(Buffer.from(x,'hex'),expected))) fail();
  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); } catch { fail(); }
  if (!object(event) || !STRIPE.test(event.id) || !event.id.startsWith('evt_') ||
      !['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type) ||
      !object(event.data?.object) || !STRIPE.test(event.data.object.id) ||
      !event.data.object.id.startsWith('sub_') || !Number.isSafeInteger(event.created) ||
      typeof event.livemode !== 'boolean') fail();
  return { id: event.id, type: event.type, created: event.created,
    subscriptionId: event.data.object.id, livemode: event.livemode,
    payloadSha256: createHash('sha256').update(rawBody).digest('hex') };
}

/** Mapping must be an explicit server-approved list, never Stripe metadata or browser input. */
export function mapLoopPrice({ price, product, mapping, mode }) {
  if (!object(price) || !object(product) || !Array.isArray(mapping) ||
      !['test','live'].includes(mode)) fail();
  const matches = mapping.filter(x => x.priceId === price.id && x.productId === product.id &&
    x.mode === mode && x.approved === true && TIERS.has(x.tier));
  if (matches.length !== 1 || !STRIPE.test(price.id) || !STRIPE.test(product.id) ||
      price.product !== product.id || price.active !== true || product.active !== true ||
      price.livemode !== (mode === 'live') || product.livemode !== (mode === 'live') ||
      price.currency !== 'eur' || !['month','year'].includes(price.recurring?.interval) ||
      price.recurring?.interval_count !== 1 || !positive(price.unit_amount)) fail();
  return matches[0].tier;
}

function tierPolicy(policy, tier) {
  const row = policy?.[tier];
  if (!object(row) || !object(row.capabilities) || !object(row.limits) ||
      Object.keys(row.capabilities).length !== CAPS.length ||
      CAPS.some(k => typeof row.capabilities[k] !== 'boolean') ||
      row.capabilities.productionMutation !== false ||
      !positive(row.limits.repositories) || !positive(row.limits.loopRuns)) fail();
  return row;
}

/** Only invoke with server-resolved identity, customer binding and provider readback. */
export function projectLoopEntitlement({ principal, binding, subscription, price, product,
  mapping, policy, event, nowMs, allowTrial = false }) {
  if (!object(principal) || !object(binding) || !object(subscription) ||
      !object(event) || !positive(nowMs) || !UUID.test(principal.tenantId) ||
      !UUID.test(principal.subjectId) || binding.tenantId !== principal.tenantId ||
      binding.subjectId !== principal.subjectId || binding.customerId !== subscription.customer ||
      !STRIPE.test(subscription.customer) || !STRIPE.test(subscription.id) ||
      event.subscriptionId !== subscription.id || event.livemode !== subscription.livemode ||
      !STRIPE.test(event.id) || !SHA.test(event.payloadSha256) ||
      !Array.isArray(subscription.items?.data) || subscription.items.data.length !== 1) fail();
  const item = subscription.items.data[0];
  if ((typeof item.price === 'string' ? item.price : item.price?.id) !== price?.id ||
      item.quantity !== 1) fail();
  const mode = subscription.livemode === true ? 'live' : 'test';
  const tier = mapLoopPrice({ price, product, mapping, mode });
  const selected = tierPolicy(policy, tier);
  const end = subscription.current_period_end;
  const validTime = Number.isSafeInteger(end) && end*1000 > nowMs;
  const active = subscription.status === 'active' ||
    (subscription.status === 'trialing' && allowTrial === true);
  const granted = active && validTime;
  const data = {
    contract: 'LOOP_AGENT_ENTITLEMENT@1',
    entitlementId: loopDigest({ tenantId: principal.tenantId, subjectId: principal.subjectId,
      subscriptionId: subscription.id, eventId: event.id }),
    tenantId: principal.tenantId, subjectId: principal.subjectId,
    tier: granted ? tier : 'FREE',
    status: granted ? 'ACTIVE' : 'BLOCKED',
    capabilities: granted ? { ...selected.capabilities } : Object.fromEntries(CAPS.map(k=>[k,false])),
    limits: granted ? { ...selected.limits } : { repositories: 0, loopRuns: 0 },
    periodEnd: validTime ? new Date(end*1000).toISOString() : null,
    evidence: { stripeCustomer: subscription.customer, subscription: subscription.id,
      price: price.id, event: event.id, payloadSha256: event.payloadSha256, mode },
  };
  return { ...data, integritySha256: loopDigest(data) };
}

/** Binds Stripe signature + existing processed inbox + provider readback + atomic server store.
 * The injected adapters are the existing CAPITAL-AI Stripe sync / subscription / ledger
 * infrastructure. No in-memory production store, endpoint or credentials are created here.
 */
export function createLoopSubscriptionEventAdapter(deps) {
  const names = ['readProcessedInbox','readProviderSubscription','readCustomerBinding',
    'readPriceAndProduct','readPriceMapping','readTierPolicy','atomicProject','readBack'];
  if (!object(deps) || names.some(k=>typeof deps[k] !== 'function') ||
      typeof deps.signingSecret !== 'string' || typeof deps.now !== 'function') fail();
  return Object.freeze({
    async process(rawBody, signature) {
      const nowMs = deps.now();
      const verified = verifyLoopStripeEvent({ rawBody, signature, secret:deps.signingSecret,
        nowSeconds:Math.floor(nowMs/1000) });
      const inbox = await deps.readProcessedInbox(verified.id);
      if (!object(inbox) || inbox.status !== 'processed' || inbox.id !== verified.id ||
          inbox.payloadSha256 !== verified.payloadSha256 || inbox.livemode !== verified.livemode) fail();
      const subscription = await deps.readProviderSubscription(verified.subscriptionId,verified.livemode);
      if (!object(subscription) || subscription.id !== verified.subscriptionId ||
          subscription.livemode !== verified.livemode) fail();
      const binding = await deps.readCustomerBinding(subscription.customer);
      if (!object(binding) || !UUID.test(binding.tenantId) || !UUID.test(binding.subjectId)) fail();
      const principal = {tenantId:binding.tenantId,subjectId:binding.subjectId};
      const catalog = await deps.readPriceAndProduct(subscription.items?.data?.[0]?.price, verified.livemode);
      const mapping = await deps.readPriceMapping(verified.livemode);
      const policy = await deps.readTierPolicy(binding.tenantId);
      const entitlement = projectLoopEntitlement({ principal, binding, subscription,
        price:catalog?.price, product:catalog?.product, mapping, policy,
        event:verified, nowMs, allowTrial:policy?.allowTrial === true });
      // Existing DB transaction MUST uniquely key event ID and reject stale event ordering.
      const saved = await deps.atomicProject({ eventId:verified.id, eventCreated:verified.created,
        payloadSha256:verified.payloadSha256, tenantId:principal.tenantId,
        subjectId:principal.subjectId, subscriptionId:subscription.id, entitlement });
      if (!object(saved) || !['created','replayed'].includes(saved.state) ||
          saved.integritySha256 !== entitlement.integritySha256) fail();
      const readback = await deps.readBack({ tenantId:principal.tenantId,
        subjectId:principal.subjectId, subscriptionId:subscription.id });
      if (!object(readback) || readback.integritySha256 !== entitlement.integritySha256 ||
          readback.tenantId !== principal.tenantId || readback.subjectId !== principal.subjectId) fail();
      return { status:saved.state === 'created' ? 'SOURCE_IMPLEMENTED' : 'REPLAY_IGNORED',
        entitlementId:entitlement.entitlementId, tier:entitlement.tier,
        authorization:'SEPARATE_RUNTIME_GATE_REQUIRED' };
    },
  });
}

export async function authorizeLoopAction({ entitlement, principal, repositoryId, capability, runId, idempotencyKey,
  authority, nowMs, atomicAdmission, readPersistedEntitlement }) {
  if (!object(entitlement) || !object(principal) || !object(authority) || !positive(nowMs) ||
      !UUID.test(principal.tenantId) || !UUID.test(principal.subjectId) ||
      entitlement.contract !== 'LOOP_AGENT_ENTITLEMENT@1' ||
      entitlement.tenantId !== principal.tenantId || entitlement.subjectId !== principal.subjectId ||
      entitlement.status !== 'ACTIVE' || !timestamp(entitlement.periodEnd) ||
      Date.parse(entitlement.periodEnd) <= nowMs || !TIERS.has(entitlement.tier) ||
      !CAPS.includes(capability) || capability === 'productionMutation' ||
      !UUID.test(runId) || !/^[A-Za-z0-9_-]{12,64}$/.test(idempotencyKey || '') ||
      !ID.test(repositoryId) || !object(entitlement.capabilities) ||
      entitlement.capabilities[capability] !== true || !positive(entitlement.limits?.loopRuns) ||
      entitlement.limits.loopRuns === 0 ||
      !SHA.test(entitlement.integritySha256) ||
      loopDigest(Object.fromEntries(Object.entries(entitlement).filter(([key])=>key!=='integritySha256'))) !== entitlement.integritySha256 ||
      authority.repositoryId !== repositoryId || authority.tenantId !== principal.tenantId ||
      authority.subjectId !== principal.subjectId ||
      !['repositoryPolicy','capabilityGrant','trust','quality','providerEvidence','membership'].every(k=>authority[k]===true) ||
      typeof atomicAdmission !== 'function' || typeof readPersistedEntitlement !== 'function') fail();
  // Never treat a digest supplied by the caller as a signature or as server-side
  // persistence. Re-read the entitlement through the existing trusted store.
  const persisted = await readPersistedEntitlement({
    tenantId:principal.tenantId, subjectId:principal.subjectId,
    entitlementId:entitlement.entitlementId,
  });
  if (!object(persisted) || persisted.integritySha256 !== entitlement.integritySha256 ||
      persisted.entitlementId !== entitlement.entitlementId ||
      loopDigest(Object.fromEntries(Object.entries(persisted).filter(([k])=>k!=='integritySha256'))) !== persisted.integritySha256 ||
      loopDigest(persisted) !== loopDigest(entitlement)) fail();
  // Existing SQL/RPC ledger must atomically enforce quota, run idempotency and concurrency.
  const admitted = await atomicAdmission({ tenantId: principal.tenantId, subjectId: principal.subjectId,
    entitlementId: entitlement.entitlementId, repositoryId, capability,
    runId, idempotencyKey, limit: entitlement.limits.loopRuns });
  if (!object(admitted) || admitted.state !== 'created' || admitted.runId !== runId ||
      admitted.idempotencyKey !== idempotencyKey || admitted.tenantId !== principal.tenantId ||
      admitted.entitlementId !== entitlement.entitlementId || admitted.repositoryId !== repositoryId) fail();
  return { status:'ADMITTED_NON_PRODUCTION', runId, entitlementId:entitlement.entitlementId };
}

/** Immutable usage projection only; storage and readback must be done by existing ledger adapter. */
export function loopUsageReceipt(input) {
  if (!object(input) || !UUID.test(input.tenantId) || !UUID.test(input.runId) ||
      !ID.test(input.repositoryId) || !SHA.test(input.entitlementId) || !TIERS.has(input.tier) ||
      !timestamp(input.startedAt) || !timestamp(input.completedAt) ||
      Date.parse(input.completedAt) < Date.parse(input.startedAt) || !['SYNTHETIC_TEST','VERIFIED_PROVIDER'].includes(input.provenance) ||
      !['SUCCEEDED','FAILED','HUMAN_INTERVENTION'].includes(input.outcome) ||
      !Array.isArray(input.evidenceRefs) || input.evidenceRefs.length === 0 ||
      input.evidenceRefs.some(x=>typeof x !== 'string' || x.length > 160 || x.length === 0) ||
      !['modelCalls','providerCostMinor','computeCostMinor','toolCalls','ciCycles','repairCycles'].every(k=>positive(input[k])) ||
      typeof input.humanIntervention !== 'boolean') fail();
  const data = { contract:'LOOP_AGENT_USAGE_RECEIPT@1', runId:input.runId,
    tenantId:input.tenantId, repositoryId:input.repositoryId,
    entitlementId:input.entitlementId, tier:input.tier,
    startedAt:input.startedAt, completedAt:input.completedAt,
    modelCalls:input.modelCalls, providerCost:{currency:'EUR',minor:input.providerCostMinor},
    computeCost:{currency:'EUR',minor:input.computeCostMinor}, toolCalls:input.toolCalls,
    ciCycles:input.ciCycles, repairCycles:input.repairCycles,
    humanIntervention:input.humanIntervention, outcome:input.outcome,
    evidenceRefs:[...input.evidenceRefs].sort(), provenance:input.provenance };
  return { ...data, receiptSha256:loopDigest(data) };
}

/** No marketing/revenue claims from synthetic receipts; only verified upstream readback. */
export function loopGrowthProjection(receipt, { providerReadbackVerified = false } = {}) {
  if (!object(receipt) || receipt.contract !== 'LOOP_AGENT_USAGE_RECEIPT@1' ||
      !SHA.test(receipt.receiptSha256) ||
      loopDigest(Object.fromEntries(Object.entries(receipt).filter(([k])=>k!=='receiptSha256'))) !== receipt.receiptSha256) fail();
  if (receipt.provenance !== 'VERIFIED_PROVIDER' || !providerReadbackVerified) {
    return { status:'NOT_PROVEN', events:[], sourceRun:receipt.runId };
  }
  return { status:'SOURCE_IMPLEMENTED', evidenceStatus:'NOT_PROVEN', sourceRun:receipt.runId,
    events:[{ type:receipt.outcome === 'SUCCEEDED' ? 'LOOP_SUCCEEDED' : 'LOOP_FAILED',
      sourceReceiptSha256:receipt.receiptSha256 }] };
}

export function calculateLoopKpis(values) {
  if (!object(values) || !['viewed','activated','verifiedFirst','eligibleRuns','successfulRuns',
    'humanInterventions','receiptCoveredRuns','totalRuns','totalCostMinor','netRevenueMinor',
    'payingCustomers'].every(k=>positive(values[k])) ||
    values.verifiedFirst > values.activated || values.activated > values.viewed ||
    values.successfulRuns > values.totalRuns || values.eligibleRuns > values.totalRuns ||
    values.humanInterventions > values.eligibleRuns || values.receiptCoveredRuns > values.totalRuns) fail();
  const ratio=(n,d)=>d===0?null:n/d;
  return { status:'COMPUTED_FROM_SUPPLIED_INPUT_NOT_PROVIDER_VERIFIED',
    activationRate:ratio(values.verifiedFirst,values.viewed),
    firstVerifiedLoopRate:ratio(values.verifiedFirst,values.activated),
    successfulLoopRate:ratio(values.successfulRuns,values.totalRuns),
    humanInterventionRate:ratio(values.humanInterventions,values.eligibleRuns),
    autonomyRate:values.eligibleRuns===0?null:1-ratio(values.humanInterventions,values.eligibleRuns),
    evidenceCoverage:ratio(values.receiptCoveredRuns,values.totalRuns),
    costPerLoopMinor:ratio(values.totalCostMinor,values.totalRuns),
    costPerSuccessfulOutcomeMinor:ratio(values.totalCostMinor,values.successfulRuns),
    revenuePerCustomerMinor:ratio(values.netRevenueMinor,values.payingCustomers),
    grossMargin:values.netRevenueMinor===0?null:(values.netRevenueMinor-values.totalCostMinor)/values.netRevenueMinor,
  };
}
