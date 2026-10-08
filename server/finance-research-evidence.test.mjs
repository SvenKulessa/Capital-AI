import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projectFinanceResearchReceipt, persistFinanceResearchReceipt,
  FINANCE_RESEARCH_STREAM, FINANCE_RESEARCH_CHANNEL,
} from './finance-research-evidence.mjs';

const fingerprint = char => char.repeat(64);
const result = () => ({
  contractVersion: 'CAPITAL_AI_FINANCE_MODEL_EVALUATION@1',
  state: 'RESEARCH_EVALUATED',
  modelId: 'traditional-scoring',
  sourceModelVersion: '1.0.0',
  sourceIdentityFingerprint: fingerprint('a'),
  featureFingerprint: fingerprint('b'),
  effectiveWeightFingerprint: fingerprint('c'),
  research: { researchCompositeValue: 99.25, input: { apiKey: 'DO_NOT_LEAK' } },
  reasons: [], scoreEligible: false, rankEligible: false,
  decisionEligible: false, productionEligible: false,
});
const context = () => ({
  assetClass: 'equity_us',
  instrumentFingerprint: fingerprint('d'),
  rightsEvidenceFingerprint: fingerprint('e'),
  sourceScope: 'NON_PRIVATE_OPEN_DATA',
  rightsDecision: 'OPEN_SOURCE_OPEN_DATA_ADMITTED',
  evaluatedAt: 1780950000000,
});
const env = () => ({
  FINANCE_RESEARCH_TRANSPORT_ENABLED: 'true',
  NATS_REPLICAS: '1',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_' + 'x'.repeat(32),
});
const expectedConfig = {
  storage: 'file', discard: 'new', num_replicas: 1, max_age: 0,
  deny_delete: true, deny_purge: true, max_bytes: 64 * 1024 * 1024,
  max_msg_size: 8192, subjects: ['capital.research.score.*'],
};
function fixtures({ack = {stream: FINANCE_RESEARCH_STREAM, seq: 7}, dbStatus = 201} = {}) {
  const published = [], cache = [], writes = [], managers = [];
  const tx = {
    set(k,v,opts) { cache.push(['set',k,v,opts]); return this; },
    publish(k,v) { cache.push(['publish',k,v]); return this; },
    async exec() { cache.push(['exec']); },
  };
  const bus = {
    async start() { return true; },
    manager: { streams: {
      async info(name) { managers.push(name); return {config: expectedConfig}; },
    } },
    js: { async publish(subject, payload, opts) {
      published.push({subject,payload,opts}); return ack;
    } },
    redis: {multi() {return tx;} },
  };
  const fetchImpl = async (url, opts) => {
    writes.push({url: String(url),opts});
    if (opts.method === 'GET') return {
      ok:true, async json() {return [{event_id: JSON.parse(writes[0].opts.body).event_id,
        record_hash: JSON.parse(writes[0].opts.body).record_hash,
        jetstream_sequence:7}];},
    };
    return { status:dbStatus };
  };
  return {bus, fetchImpl, published, cache, writes, managers};
}

test('Finance metadata projection is deterministic, excludes score values and secrets', () => {
  const a = projectFinanceResearchReceipt(result(), context());
  const b = projectFinanceResearchReceipt(result(), context());
  assert.equal(a.eventId, b.eventId);
  assert.match(a.eventId, /^[a-f0-9]{64}$/);
  assert.equal(a.record.scoreEligible, false);
  assert.equal(JSON.stringify(a.record).includes('99.25'), false);
  assert.equal(a.raw.includes('DO_NOT_LEAK'), false);
  assert.equal(a.raw.includes('researchCompositeValue'), false);
});

test('private BYOK, extra tenant context, score promotion and unknown rights fail closed', () => {
  assert.throws(() => projectFinanceResearchReceipt(result(), {...context(), sourceScope:'USER_PRIVATE_MARKET_DATA'}),
    /RESEARCH_PRIVATE_OR_RIGHTS_BLOCKED/);
  assert.throws(() => projectFinanceResearchReceipt(result(), {...context(), userId:'private-user'}),
    /RESEARCH_RECEIPT_CONTRACT_INVALID/);
  assert.throws(() => projectFinanceResearchReceipt({...result(), scoreEligible:true}, context()),
    /RESEARCH_ONLY_RESULT_REQUIRED/);
  assert.throws(() => projectFinanceResearchReceipt(result(), {...context(), rightsDecision:'NOT_PROVEN'}),
    /RESEARCH_PRIVATE_OR_RIGHTS_BLOCKED/);
  assert.throws(() => projectFinanceResearchReceipt(result(), {...context(), instrumentFingerprint:'BTC'}),
    /RESEARCH_PROVENANCE_INVALID/);
});

test('receipt ordering: JetStream PubAck -> Supabase write -> Valkey cache and pubsub', async () => {
  const f = fixtures();
  const delivery = await persistFinanceResearchReceipt(result(), context(), {
    env:env(), bus:f.bus, fetchImpl:f.fetchImpl,
  });
  assert.equal(f.managers.length,1);
  assert.equal(f.published.length,1);
  assert.equal(f.published[0].subject,'capital.research.score.equity_us');
  assert.equal(f.published[0].opts.msgID,delivery.eventId);
  assert.equal(f.writes[0].opts.method,'POST');
  assert.equal(f.cache.length,3);
  assert.equal(f.cache[0][0],'set');
  assert.equal(f.cache[1][1],FINANCE_RESEARCH_CHANNEL);
  assert.equal(f.cache[2][0],'exec');
  assert.ok(delivery.evidenceId.startsWith(FINANCE_RESEARCH_STREAM+':7:'));
  assert.ok(!JSON.stringify(delivery).includes('99.25'));
});

test('database failures fail closed: NATS may have a receipt but no cache/pubsub', async () => {
  const f = fixtures({dbStatus:503});
  await assert.rejects(
    persistFinanceResearchReceipt(result(), context(), {env:env(),bus:f.bus,fetchImpl:f.fetchImpl}),
    /RESEARCH_SUPABASE_WRITE_UNCONFIRMED/,
  );
  assert.equal(f.published.length,1);
  assert.equal(f.cache.length,0);
});

test('disabled transport performs no NATS/Valkey/Supabase I/O', async () => {
  const f = fixtures();
  await assert.rejects(
    persistFinanceResearchReceipt(result(), context(), {env:{},bus:f.bus,fetchImpl:f.fetchImpl}),
    /RESEARCH_TRANSPORT_DISABLED/,
  );
  assert.equal(f.managers.length,0);
  assert.equal(f.writes.length,0);
  assert.equal(f.cache.length,0);
});

test('replay duplicate requires exact Postgres PubAck sequence match', async () => {
  const good=fixtures({dbStatus:409});
  const delivery=await persistFinanceResearchReceipt(result(),context(),
    {env:env(),bus:good.bus,fetchImpl:good.fetchImpl});
  assert.equal(good.writes.length,2);
  assert.equal(delivery.state,'RESEARCH_EVALUATED');
  const bad=fixtures({dbStatus:409});
  bad.fetchImpl=async (url, opts)=>{
    bad.writes.push({url:String(url),opts});
    return opts.method==='POST' ? {status:409} : {ok:true,async json(){return [{
      event_id:'f'.repeat(64),record_hash:'f'.repeat(64),jetstream_sequence:7,
    }];}};
  };
  await assert.rejects(
    persistFinanceResearchReceipt(result(),context(),{env:env(),bus:bad.bus,fetchImpl:bad.fetchImpl}),
    /RESEARCH_SUPABASE_IDEMPOTENCY_CONFLICT/,
  );
  assert.equal(bad.cache.length,0);
});

test('missing service role secret cannot send any research facts', async () => {
  const f=fixtures();
  await assert.rejects(
    persistFinanceResearchReceipt(result(),context(),{
      env:{...env(),SUPABASE_SECRET_KEY:'sb_publishable_123'},
      bus:f.bus,fetchImpl:f.fetchImpl,
    }),
    /RESEARCH_SUPABASE_CONFIG_UNAVAILABLE/,
  );
  assert.equal(f.published.length,0);
});
