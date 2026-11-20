/**
 * Source-only read reconciliation for server-authorized CAPITAL-AI tenants.
 * No network, database, webhook, pricing, entitlement or publishing side effects.
 * The injected readers MUST use independent Stripe/provider readback and scoped
 * server authority. This module cannot independently attest their credentials.
 */
import { createHash } from 'node:crypto';

export const RECONCILIATION_VERSION = 'capital-ai.unit-economics-reconciliation/v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const STRIPE_ID = /^evt_[A-Za-z0-9]{6,100}$/;
const RUN_ID = UUID;
const BILLING_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,119}$/;
const SOURCE_ID = /^(?:in_|cs_(?:live|test)_)[A-Za-z0-9]{6,150}$/;
const PROVIDER_ID = /^[a-z][a-z0-9_-]{1,40}$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const KINDS = Object.freeze({
  PAYMENT: ['charge.succeeded', /^ch_[A-Za-z0-9]{6,100}$/],
  REFUND: ['refund.updated', /^re_[A-Za-z0-9]{6,100}$/],
  DISPUTE: ['charge.dispute.closed', /^dp_[A-Za-z0-9]{6,100}$/],
});

function fail() { throw new Error('UNIT_ECONOMICS_RECONCILIATION_UNAVAILABLE'); }
function record(x, keys) {
  return x && typeof x === 'object' && !Array.isArray(x) &&
    Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x, k));
}
function cents(x) { if (!Number.isSafeInteger(x) || x < 0) fail(); return x; }
function safe(value) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) fail();
  return Number(value);
}
function utc(s) {
  return typeof s === 'string' &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().replace('.000Z','Z') === s;
}
function ids(raw, regex) {
  if (!Array.isArray(raw) || raw.length > 100 || raw.some(x => typeof x !== 'string' || !regex.test(x))) fail();
  return [...new Set(raw)].sort();
}
function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function validScope(row, tenantId, product, timeKey, start, end) {
  if (row.tenantId !== tenantId || row.product !== product || !utc(row[timeKey]) ||
      row[timeKey] < start || row[timeKey] >= end) fail();
}
function checkedStripe(inbox, provider, requestedEventId, tenantId, product, start, end) {
  if (!record(inbox, ['eventId','eventType','status','livemode','payloadSha256']) ||
      !record(provider, ['eventId','eventType','payloadSha256','tenantId','product','occurredAt',
        'currency','livemode','kind','objectId','chargeId','sourceId','grossMinor','taxMinor',
        'feeMinor','balanceTransactionId','objectReadbackSha256','settlementStatus','disputeOutcome'])) fail();
  if (inbox.eventId !== requestedEventId || provider.eventId !== requestedEventId ||
      inbox.eventType !== provider.eventType ||
      inbox.status !== 'processed' || inbox.livemode !== true || provider.livemode !== true ||
      !SHA256.test(inbox.payloadSha256) || inbox.payloadSha256 !== provider.payloadSha256 ||
      !SHA256.test(provider.objectReadbackSha256) || provider.currency !== 'eur' ||
      !Object.hasOwn(KINDS, provider.kind) ||
      provider.eventType !== KINDS[provider.kind][0] ||
      !KINDS[provider.kind][1].test(provider.objectId) ||
      !/^ch_[A-Za-z0-9]{6,100}$/.test(provider.chargeId) ||
      !SOURCE_ID.test(provider.sourceId) || provider.sourceId.startsWith('cs_test_') || !/^txn_[A-Za-z0-9]{6,100}$/.test(provider.balanceTransactionId)) fail();
  if (provider.kind === 'PAYMENT' && provider.objectId !== provider.chargeId) fail();
  // A closed dispute may be WON: never deduct it as a loss. Refunded
  // amounts can be pending at refund.updated; require settled readback.
  if (provider.settlementStatus !== 'SETTLED' ||
      (provider.kind === 'DISPUTE' ? provider.disputeOutcome !== 'LOST' : provider.disputeOutcome !== null)) fail();
  validScope(provider, tenantId, product, 'occurredAt', start, end);
  const gross = cents(provider.grossMinor), tax = cents(provider.taxMinor), fee = cents(provider.feeMinor);
  if (tax > gross || gross === 0) fail();
  // Semantic business object key: multiple webhook deliveries for the same
  // settled payment/refund/dispute cannot multiply revenue or fees.
  return {
    businessKey: provider.kind + ':' + provider.objectId,
    chargeId: provider.chargeId,
    kind: provider.kind, sourceId: provider.sourceId,
    grossMinor: gross, taxMinor: tax, feeMinor: fee,
    evidenceHash: hash([inbox.payloadSha256, provider.objectReadbackSha256]),
  };
}
function checkedRun(run, bill, requestedRunId, tenantId, product, start, end) {
  if (!record(run, ['runId','tenantId','product','completedAt','executionStatus','provider','model',
    'inputTokens','outputTokens','billingLineId','runEvidenceSha256']) ||
      !record(bill, ['billingLineId','runId','tenantId','product','provider','model',
        'currency','billingState','inferenceMinor','toolsMinor','billingEvidenceSha256'])) fail();
  if (run.runId !== requestedRunId || bill.runId !== requestedRunId ||
      bill.tenantId !== tenantId || bill.product !== product ||
      bill.billingLineId !== run.billingLineId || !BILLING_ID.test(run.billingLineId) ||
      bill.provider !== run.provider || bill.model !== run.model ||
      !PROVIDER_ID.test(run.provider) || !MODEL_ID.test(run.model) ||
      bill.currency !== 'EUR' || bill.billingState !== 'SETTLED' ||
      !['SUCCEEDED','FAILED'].includes(run.executionStatus) ||
      !SHA256.test(run.runEvidenceSha256) || !SHA256.test(bill.billingEvidenceSha256)) fail();
  validScope(run, tenantId, product, 'completedAt', start, end);
  const inputTokens=cents(run.inputTokens), outputTokens=cents(run.outputTokens);
  const inferenceMinor=cents(bill.inferenceMinor), toolsMinor=cents(bill.toolsMinor);
  return {
    runId:run.runId, billingLineId:run.billingLineId,
    status:run.executionStatus, provider:run.provider, model:run.model,
    inputTokens, outputTokens, inferenceMinor, toolsMinor,
    totalMinor:safe(BigInt(inferenceMinor)+BigInt(toolsMinor)),
    evidenceHash:hash([run.runEvidenceSha256, bill.billingEvidenceSha256]),
  };
}

/**
 * READ ONLY. resolveTenant is the existing authenticated server-side owner
 * resolver. readStripeInbox must read an immutable, processed ingress receipt,
 * readStripeEvent must independently verify the matching Stripe object and
 * tenant-to-billing mapping. readAgentRun and readProviderCost must verify
 * actual provider-billed usage allocation (not token-price estimates).
 */
export function createUnitEconomicsReconciliation({
  resolveTenant, readStripeInbox, readStripeEvent, readAgentRun, readProviderCost,
} = {}) {
  if ([resolveTenant,readStripeInbox,readStripeEvent,readAgentRun,readProviderCost]
    .some(fn => typeof fn !== 'function')) throw new TypeError('trusted server-side readers required');

  return Object.freeze({
    async reconcile({principal, product, periodStart, periodEnd, stripeEventIds=[], agentRunIds=[]}={}) {
      try {
      const tenantId = await resolveTenant(principal);
      if (typeof tenantId !== 'string' || !UUID.test(tenantId)) fail();
      if (typeof product !== 'string' || !/^[a-z][a-z0-9_-]{1,63}$/.test(product) ||
          !utc(periodStart) || !utc(periodEnd) || periodStart >= periodEnd) fail();
      const stripeIds=ids(stripeEventIds, STRIPE_ID), runIds=ids(agentRunIds, RUN_ID);

      // All sources must resolve and pass identity/provenance checks before
      // returning *any* numbers; no partial write, caching or fallback.
      const stripe=[];
      for (const id of stripeIds) {
        // Never perform a provider readback for an unprocessed, mismatched or
        // test-mode inbox event. In particular, do not invoke paid provider
        // adapters before the existing ingress authority is checked.
        const inbox=await readStripeInbox({tenantId,eventId:id});
        if (!record(inbox,['eventId','eventType','status','livemode','payloadSha256']) ||
            inbox.eventId !== id || inbox.status !== 'processed' ||
            inbox.livemode !== true || !SHA256.test(inbox.payloadSha256)) fail();
        const provider=await readStripeEvent({tenantId,eventId:id});
        stripe.push(checkedStripe(inbox, provider, id, tenantId, product, periodStart, periodEnd));
      }
      const runs=[];
      for (const id of runIds) {
        const run=await readAgentRun({tenantId,runId:id});
        if (!run || run.tenantId !== tenantId || run.runId !== id ||
            !BILLING_ID.test(run.billingLineId || '')) fail();
        const bill=await readProviderCost({tenantId,runId:id,billingLineId:run.billingLineId});
        runs.push(checkedRun(run, bill, id, tenantId, product, periodStart, periodEnd));
      }
      const stripeByObject=new Map();
      for (const event of stripe) {
        const prior=stripeByObject.get(event.businessKey);
        if (prior) {
          // Replay of an equivalent business object is idempotent despite
          // distinct Stripe event IDs and payload hashes.
          if (['kind','chargeId','sourceId','grossMinor','taxMinor','feeMinor']
            .some(k => prior[k] !== event[k])) fail();
        } else stripeByObject.set(event.businessKey,event);
      }
      const uniqueStripe=[...stripeByObject.values()].sort((a,b)=>a.businessKey.localeCompare(b.businessKey));
      const uniqueRuns=new Map(), allocatedBilling=new Set();
      for (const run of runs) {
        if (uniqueRuns.has(run.runId) || allocatedBilling.has(run.billingLineId)) fail();
        allocatedBilling.add(run.billingLineId);
        uniqueRuns.set(run.runId,run);
      }
      // If the charge occurs in this bounded slice, refunds and disputes
      // cannot cumulatively exceed the captured gross amount for it.
      const charges=new Map(uniqueStripe.filter(e=>e.kind==='PAYMENT').map(e=>[e.chargeId,e.grossMinor]));
      const chargeSources=new Map(uniqueStripe.filter(e=>e.kind==='PAYMENT').map(e=>[e.chargeId,e.sourceId]));
      for (const event of uniqueStripe) {
        if (event.kind !== 'PAYMENT' && chargeSources.has(event.chargeId) &&
            chargeSources.get(event.chargeId) !== event.sourceId) fail();
      }
      for (const [chargeId, amount] of charges) {
        const reversed=uniqueStripe.filter(e=>e.chargeId===chargeId && e.kind!=='PAYMENT')
          .reduce((s,e)=>s+BigInt(e.grossMinor),0n);
        if (reversed>BigInt(amount)) fail();
      }
      let cash=0n, fees=0n;
      for (const event of uniqueStripe) {
        const net=BigInt(event.grossMinor)-BigInt(event.taxMinor);
        cash += event.kind === 'PAYMENT' ? net : -net;
        fees += BigInt(event.feeMinor);
      }
      let inference=0n, tools=0n, success=0, failed=0;
      const perRun=[...uniqueRuns.values()].sort((a,b)=>a.runId.localeCompare(b.runId));
      for (const run of perRun) {
        inference+=BigInt(run.inferenceMinor);
        tools+=BigInt(run.toolsMinor);
        if (run.status==='SUCCEEDED') success++; else failed++;
      }
      const totalCost=safe(inference+tools);
      const result={
        schemaVersion:RECONCILIATION_VERSION,
        qualification:'READ_ONLY_SOURCE_ADAPTER_INPUT_NOT_INDEPENDENTLY_ATTESTED',
        status:'INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION',
        currency:'EUR', product, periodStart, periodEnd,
        netCashExcludingTaxMinor:safe(cash), stripeFeesMinor:safe(fees),
        inferenceCostMinor:safe(inference), toolCostMinor:safe(tools),
        successfulRuns:success, failedRuns:failed,
        costPerSuccessfulRunMinor:success ? safe((BigInt(totalCost)+BigInt(success)-1n)/BigInt(success)) : null,
        stripeBusinessObjects:uniqueStripe.length,
        agentRunCosts:perRun.map(({runId,status,provider,model,inputTokens,outputTokens,
          inferenceMinor,toolsMinor,totalMinor,evidenceHash}) => ({
          runId,status,provider,model,inputTokens,outputTokens,inferenceMinor,toolsMinor,totalMinor,evidenceHash,
        })),
      };
      return {
        ...result,
        // Digest is tenant-bound without disclosing the principal or customer ID.
        snapshotSha256:hash([tenantId, result,
          uniqueStripe.map(e=>[e.businessKey,e.grossMinor,e.taxMinor,e.feeMinor,e.evidenceHash]),
          perRun.map(e=>[e.runId,e.billingLineId,e.evidenceHash])]),
      };
      } catch { fail(); }
    },
  });
}
