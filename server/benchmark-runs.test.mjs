import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { createBenchmarkRuns } from './benchmark-runs.mjs';

function req(method='GET', body=null, origin='https://capital-ai.online') {
  const stream = Readable.from(body === null ? [] : [Buffer.from(JSON.stringify(body))]);
  stream.method = method;
  stream.headers = { origin };
  return stream;
}
function res() {
  return {
    status: 0,
    headers: new Map(),
    setHeader(k,v){ this.headers.set(String(k).toLowerCase(), String(v)); },
    writeHead(status){ this.status=status; },
    end(){},
  };
}
function json(response,status,body){ response.status=status; response.payload=body; }

function memoryStore() {
  const rows = [];
  return {
    rows,
    async create(input) {
      const row = { id: randomUUID(), createdAt: '2026-10-06T07:45:00.000Z', ...input };
      rows.push(row);
      return row;
    },
    async getById(userId,id){ return rows.find(row => row.userId===userId && row.id===id) || null; },
    async list(userId,limit){ return rows.filter(row => row.userId===userId).slice(-limit).reverse(); },
  };
}

function auth(tier='starter') {
  return {
    async verify(){ return { userId:'00000000-0000-4000-8000-000000000001' }; },
    async resolvePaidTier(){ return tier; },
    sameOrigin(request){ return request.headers.origin === 'https://capital-ai.online'; },
  };
}

test('readiness is fail-closed until persistence is explicitly bound', async () => {
  const handler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth()});
  const response=res();
  await handler.handle(req(),response,new URL('https://capital-ai.online/api/benchmark/readiness'),json);
  assert.equal(response.status,200);
  assert.equal(response.payload.enabled,false);
  assert.equal(response.payload.persistenceBound,false);
  assert.equal(response.payload.executionBound,false);
  assert.equal(response.payload.productionEligible,false);
});

test('POST derives tier from server auth and queues only the standard profile', async () => {
  const store=memoryStore();
  const handler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('starter'),store});
  const response=res();
  await handler.handle(
    req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'a'.repeat(40),tier:'enterprise'}),
    response,
    new URL('https://capital-ai.online/api/benchmark/runs'),
    json,
  );
  assert.equal(response.status,202);
  assert.equal(store.rows[0].tier,'starter');
  assert.equal(store.rows[0].status,'QUEUED');
  assert.equal(response.payload.run.productionEligible,false);
  assert.equal(response.payload.run.decisionEligible,false);
});

test('POST rejects cross-origin and invalid repository or commit identity', async () => {
  const store=memoryStore();
  const handler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('pro'),store});
  const cross=res();
  await handler.handle(req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'b'.repeat(40)},'https://evil.example'),cross,new URL('https://capital-ai.online/api/benchmark/runs'),json);
  assert.equal(cross.status,403);
  const invalid=res();
  await handler.handle(req('POST',{repository:'bad',commitSha:'main'}),invalid,new URL('https://capital-ai.online/api/benchmark/runs'),json);
  assert.equal(invalid.status,400);
  assert.equal(store.rows.length,0);
});

test('free or inactive users never receive benchmark entitlement', async () => {
  const handler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth(null),store:memoryStore()});
  const response=res();
  await handler.handle(req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'c'.repeat(40)}),response,new URL('https://capital-ai.online/api/benchmark/runs'),json);
  assert.equal(response.status,403);
});

test('history is Pro/Enterprise only while direct status remains owner-scoped', async () => {
  const store=memoryStore();
  const proHandler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('pro'),store});
  const created=res();
  await proHandler.handle(req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'d'.repeat(40)}),created,new URL('https://capital-ai.online/api/benchmark/runs'),json);
  const id=created.payload.run.id;

  const history=res();
  await proHandler.handle(req('GET'),history,new URL('https://capital-ai.online/api/benchmark/history?limit=10'),json);
  assert.equal(history.status,200);
  assert.equal(history.payload.runs.length,1);

  const status=res();
  await proHandler.handle(req('GET'),status,new URL('https://capital-ai.online/api/benchmark/runs/'+id),json);
  assert.equal(status.status,200);
  assert.equal(status.payload.run.id,id);

  const starterHandler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('starter'),store});
  const starterHistory=res();
  await starterHandler.handle(req('GET'),starterHistory,new URL('https://capital-ai.online/api/benchmark/history'),json);
  assert.equal(starterHistory.status,403);
  assert.equal(starterHistory.payload.error,'benchmark_history_not_entitled');
});

test('evidence export is Pro/Enterprise only and exports only the persisted evidence manifest', async () => {
  const store=memoryStore();
  const pro=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('pro'),store});
  const created=res();
  await pro.handle(
    req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'e'.repeat(40)}),
    created,
    new URL('https://capital-ai.online/api/benchmark/runs'),
    json,
  );
  const row=store.rows[0];
  row.status='SUCCEEDED';
  row.completedAt='2026-10-06T18:00:00.000Z';
  row.evidenceId='evidence/cads/run-001';
  row.usage={
    schemaVersion:'CAPITAL_AI_BENCHMARK_USAGE@1',
    measurementStatus:'MEASURED',
    cost:{currency:'EUR',totalEur:0},
    credits:{calibrated:false,unitsCharged:null},
  };

  const exported=res();
  await pro.handle(
    req('GET'),
    exported,
    new URL('https://capital-ai.online/api/benchmark/runs/'+row.id+'/evidence'),
    json,
  );
  assert.equal(exported.status,200);
  assert.equal(exported.payload.schemaVersion,'CAPITAL_AI_BENCHMARK_EVIDENCE_EXPORT@1');
  assert.equal(exported.payload.evidenceId,'evidence/cads/run-001');
  assert.equal(exported.payload.evidencePayloadIncluded,false);
  assert.equal(exported.payload.benchmarkEvidenceOnly,true);
  assert.equal(exported.payload.productionEligible,false);
  assert.equal(exported.payload.decisionEligible,false);
  assert.equal(Object.hasOwn(exported.payload.run,'userId'),false);

  const starter=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('starter'),store});
  const denied=res();
  await starter.handle(
    req('GET'),
    denied,
    new URL('https://capital-ai.online/api/benchmark/runs/'+row.id+'/evidence'),
    json,
  );
  assert.equal(denied.status,403);
  assert.equal(denied.payload.error,'benchmark_evidence_export_not_entitled');
});

test('evidence export fails closed until a bounded evidence reference exists', async () => {
  const store=memoryStore();
  const handler=createBenchmarkRuns({env:{BENCHMARK_RUN_API_ENABLED:'true'},auth:auth('enterprise'),store});
  const created=res();
  await handler.handle(
    req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'f'.repeat(40)}),
    created,
    new URL('https://capital-ai.online/api/benchmark/runs'),
    json,
  );
  const response=res();
  await handler.handle(
    req('GET'),
    response,
    new URL('https://capital-ai.online/api/benchmark/runs/'+created.payload.run.id+'/evidence'),
    json,
  );
  assert.equal(response.status,409);
  assert.equal(response.payload.error,'benchmark_evidence_not_ready');
});

test('Marketplace-only user can access benchmark features without a Stripe subscription', async () => {
  const store=memoryStore();
  const marketplace={ async resolveTierForUser(){ return 'pro'; } };
  const handler=createBenchmarkRuns({
    env:{BENCHMARK_RUN_API_ENABLED:'true'},
    auth:auth(null),
    store,
    marketplace,
  });
  const response=res();
  await handler.handle(
    req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'1'.repeat(40)}),
    response,
    new URL('https://capital-ai.online/api/benchmark/runs'),
    json,
  );
  assert.equal(response.status,202);
  assert.equal(store.rows[0].tier,'pro');
});

test('highest valid channel tier governs benchmark capability access', async () => {
  const store=memoryStore();
  const marketplace={ async resolveTierForUser(){ return 'enterprise'; } };
  const handler=createBenchmarkRuns({
    env:{BENCHMARK_RUN_API_ENABLED:'true'},
    auth:auth('starter'),
    store,
    marketplace,
  });
  const created=res();
  await handler.handle(
    req('POST',{repository:'SvenKulessa/Capital-AI',commitSha:'2'.repeat(40)}),
    created,
    new URL('https://capital-ai.online/api/benchmark/runs'),
    json,
  );
  assert.equal(created.status,202);
  assert.equal(store.rows[0].tier,'enterprise');
});
