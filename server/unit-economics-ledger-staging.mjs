/**
 * Internal-only bridge: authenticated reconciliation -> synthetic ledger candidate.
 * No HTTP route, DB connection, credentials or automatic activation.
 * PostgreSQL is reachable ONLY through the explicitly injected isolated executor.
 */
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { RECONCILIATION_VERSION } from './unit-economics-reconciliation.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9_-]{12,64}$/;
const HEX=/^[a-f0-9]{64}$/;
const PRODUCT=/^[a-z][a-z0-9_-]{1,63}$/;
const fail=()=>{throw new Error('UNIT_ECONOMICS_LEDGER_UNAVAILABLE')};
const cents=(v,allowNegative=false)=>Number.isSafeInteger(v)&&(allowNegative||v>=0);
function utc(s) {
  return typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s)&&
    Number.isFinite(Date.parse(s))&&new Date(s).toISOString().replace('.000Z','Z')===s;
}
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function validateProjection(x,product,start,end) {
  if(!x||typeof x!=='object'||Array.isArray(x)||x.schemaVersion!==RECONCILIATION_VERSION||
     x.status!=='INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION'||
     x.qualification!=='READ_ONLY_SOURCE_ADAPTER_INPUT_NOT_INDEPENDENTLY_ATTESTED'||
     x.product!==product||x.periodStart!==start||x.periodEnd!==end||
     x.currency!=='EUR'||!HEX.test(x.snapshotSha256||'')||
     !cents(x.netCashExcludingTaxMinor,true)||!cents(x.stripeFeesMinor)||
     !cents(x.inferenceCostMinor)||!cents(x.toolCostMinor)||
     !Number.isSafeInteger(x.successfulRuns)||x.successfulRuns<0||
     !Number.isSafeInteger(x.failedRuns)||x.failedRuns<0||
     !Array.isArray(x.agentRunCosts)||x.agentRunCosts.length>100||
     x.successfulRuns+x.failedRuns!==x.agentRunCosts.length)fail();

  let inferred=0n,tools=0n,successful=0,failed=0;
  const seen=new Set();
  const runs=x.agentRunCosts.map(r=>{
    if(!r||typeof r!=='object'||!UUID.test(r.runId||'')||
       !['SUCCEEDED','FAILED'].includes(r.status)||!HEX.test(r.evidenceHash||'')||
       !cents(r.inferenceMinor)||!cents(r.toolsMinor)||!cents(r.totalMinor)||
       BigInt(r.inferenceMinor)+BigInt(r.toolsMinor)!==BigInt(r.totalMinor)||
       seen.has(r.runId))fail();
    seen.add(r.runId);
    inferred+=BigInt(r.inferenceMinor);tools+=BigInt(r.toolsMinor);
    if(r.status==='SUCCEEDED')successful++;else failed++;
    return {runId:r.runId,status:r.status,inferenceMinor:r.inferenceMinor,
      toolsMinor:r.toolsMinor,evidenceHash:r.evidenceHash};
  }).sort((a,b)=>a.runId.localeCompare(b.runId));
  if(inferred!==BigInt(x.inferenceCostMinor)||tools!==BigInt(x.toolCostMinor)||
     successful!==x.successfulRuns||failed!==x.failedRuns)fail();
  return runs;
}

/** Only an independently verified server-side principal can select tenant. */
export function createUnitEconomicsLedgerStaging({
  resolveTenant, reconcile, record, reverse, read, uuid=randomUUID,
}={}) {
  if([resolveTenant,reconcile,record,reverse,read,uuid].some(f=>typeof f!=='function'))
    throw new TypeError('verified tenant, reconciliation and isolated ledger executors required');

  async function tenant(principal){
    const id=await resolveTenant(principal);
    if(typeof id!=='string'||!UUID.test(id))fail();
    return id;
  }
  return Object.freeze({
    async stage({principal,key,product,periodStart,periodEnd,stripeEventIds=[],agentRunIds=[]}={}) {
      try {
        const tenantId=await tenant(principal);
        if(typeof key!=='string'||!KEY.test(key)||typeof product!=='string'||!PRODUCT.test(product)||
           !utc(periodStart)||!utc(periodEnd)||periodStart>=periodEnd)fail();
        const source=await reconcile({principal,product,periodStart,periodEnd,stripeEventIds,agentRunIds});
        const runs=validateProjection(source,product,periodStart,periodEnd);
        const snapshotId=uuid();
        if(!UUID.test(snapshotId))fail();
        const fixed=[tenantId,source.snapshotSha256,product,periodStart,periodEnd,
          source.netCashExcludingTaxMinor,source.stripeFeesMinor,source.inferenceCostMinor,
          source.toolCostMinor,source.successfulRuns,source.failedRuns,runs];
        const payload={
          snapshotId,tenantId,idempotencyKey:key,requestSha256:sha(fixed),
          sourceSnapshotSha256:source.snapshotSha256,product,periodStart,periodEnd,
          netCashMinor:source.netCashExcludingTaxMinor,stripeFeesMinor:source.stripeFeesMinor,
          inferenceMinor:source.inferenceCostMinor,toolsMinor:source.toolCostMinor,
          successfulRuns:source.successfulRuns,failedRuns:source.failedRuns,runs,
        };
        const response=await record(payload);
        if(!response||!['created','replayed','duplicate_source','reversed','conflict'].includes(response.state))fail();
        if(response.state==='conflict')return {state:'conflict'};
        if(!UUID.test(response.snapshotId||''))fail();
        return {state:response.state,snapshotId:response.snapshotId,
          productionEligible:false,accountingEligible:false};
      } catch {fail()}
    },
    async rollback({principal,snapshotId,key,reasonSha256}={}) {
      try {
        const tenantId=await tenant(principal);
        if(!UUID.test(snapshotId||'')||!KEY.test(key||'')||!HEX.test(reasonSha256||''))fail();
        const response=await reverse({tenantId,snapshotId,key,reasonSha256});
        if(!response||!['reversed','replayed','conflict','not_found'].includes(response.state))fail();
        return {state:response.state,productionEligible:false};
      } catch {fail()}
    },
    async get({principal,snapshotId}={}) {
      try {
        const tenantId=await tenant(principal);
        if(!UUID.test(snapshotId||''))fail();
        const result=await read({tenantId,snapshotId});
        if(result===null)return null;
        if(!result||result.snapshotId!==snapshotId||result.accountingEligible!==false||
          !['active','reversed'].includes(result.state))fail();
        return result;
      } catch {fail()}
    },
  });
}
