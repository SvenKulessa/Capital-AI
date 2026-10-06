import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createBenchmarkRuns } from './benchmark-runs.mjs';

function req(method='GET', body=null, origin='https://capital-ai.online') {
  const stream = new EventEmitter();
  stream.method = method;
  stream.headers = { origin };
  setImmediate(() => {
    if (body !== null) stream.emit('data', Buffer.from(JSON.stringify(body)));
    stream.emit('end');
  });
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
