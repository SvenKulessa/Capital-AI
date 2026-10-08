import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { createUserAnalysisBindings, validateAnalysisBinding } from './user-analysis-bindings.mjs';

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
};
const subjectA = '11111111-1111-1111-1111-111111111111';
const subjectB = '22222222-2222-2222-2222-222222222222';
const draft = {
  moduleId: 'enterprise_scorer',
  provider: 'kraken',
  modelProvider: 'ollama',
  modelId: 'llama3.2',
  bindingEnabled: true,
};

function req(method, body) {
  const readable = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  readable.method = method;
  readable.headers = { origin: 'https://capital-ai.local' };
  return readable;
}

function res() { return { setHeader() {} }; }

async function invoke(server, method, body, route = '/api/profile/analysis-bindings') {
  let status = -1; let payload;
  const handled = await server.handle(req(method, body), res(), new URL('https://capital-ai.local' + route),
    (_response, code, data) => { status = code; payload = data; });
  return { handled, status, payload };
}

test('binding contract is an allowlisted metadata-only shape', () => {
  assert.deepEqual(validateAnalysisBinding(draft), {
    _module_id: 'enterprise_scorer', _provider: 'kraken', _model_provider: 'ollama',
    _model_id: 'llama3.2', _binding_enabled: true,
  });
  assert.equal(validateAnalysisBinding({ ...draft, apiKey: 'do-not-store' }), null);
  assert.equal(validateAnalysisBinding({ ...draft, modelId: 'https://127.0.0.1:8080?token=abc' }), null);
  assert.equal(validateAnalysisBinding({ ...draft, moduleId: '__proto__' }), null);
  assert.equal(validateAnalysisBinding({ ...draft, provider: 'fake-provider' }), null);
  assert.equal(validateAnalysisBinding({ ...draft, modelProvider: null, modelId: 'llama' }), null);
  assert.equal(validateAnalysisBinding({ ...draft, modelProvider: null, modelId: null, provider: null }), null);
});

test('user identity is derived from verified session and is bound to all CRUD RPC calls', async () => {
  let userId = subjectA;
  const rows = new Map();
  const calls = [];
  const fetchImpl = async (address, options) => {
    const rpc = new URL(String(address)).pathname.split('/').at(-1);
    const input = JSON.parse(options.body);
    calls.push({ rpc, input });
    assert.equal(options.redirect, 'error');
    if (rpc === 'capital_ai_upsert_user_analysis_binding') {
      rows.set(input._user_id + '/' + input._module_id, input);
      return Response.json({ saved: true, moduleId: input._module_id, executionEnabled: false });
    }
    if (rpc === 'capital_ai_list_user_analysis_bindings') {
      return Response.json([...rows.values()].filter(row => row._user_id === input._user_id)
        .map(row => ({ moduleId: row._module_id, provider: row._provider, executionEnabled: false })));
    }
    if (rpc === 'capital_ai_delete_user_analysis_binding') {
      rows.delete(input._user_id + '/' + input._module_id);
      return Response.json({ deleted: true });
    }
    throw Error('Unexpected RPC');
  };
  const server = createUserAnalysisBindings({
    env, fetchImpl,
    auth: { verify: async () => ({ userId }), sameOrigin: () => true },
  });
  const a = await invoke(server, 'PUT', { ...draft, userId: subjectB });
  assert.equal(a.status, 422, 'client-supplied user id is rejected');
  assert.equal(calls.length, 0);
  assert.equal((await invoke(server, 'PUT', draft)).status, 200);
  userId = subjectB;
  assert.deepEqual((await invoke(server, 'GET')).payload.bindings, []);
  assert.equal((await invoke(server, 'PUT', { ...draft, moduleId: 'market_screener' })).status, 200);
  assert.equal((await invoke(server, 'DELETE', undefined,
    '/api/profile/analysis-bindings/enterprise_scorer')).status, 200);
  userId = subjectA;
  assert.equal((await invoke(server, 'GET')).payload.bindings.length, 1);
  assert.equal(calls.at(-1).input._user_id, subjectA);
  assert.doesNotMatch(JSON.stringify(calls), /apiKey|apiSecret|secretPayload/);
});

test('auth, origin and config failures fail closed', async () => {
  const fetchImpl = async () => { throw Error('Unauthorized upstream'); };
  const anonymous = createUserAnalysisBindings({ env, fetchImpl,
    auth: { verify: async () => null, sameOrigin: () => true } });
  assert.equal((await invoke(anonymous, 'GET')).status, 401);
  const crossOrigin = createUserAnalysisBindings({ env, fetchImpl,
    auth: { verify: async () => ({ userId: subjectA }), sameOrigin: () => false } });
  assert.equal((await invoke(crossOrigin, 'PUT', draft)).status, 403);
  assert.equal((await invoke(crossOrigin, 'GET')).status, 503);
  const unconfigured = createUserAnalysisBindings({ env: {},
    auth: { verify: async () => ({ userId: subjectA }), sameOrigin: () => true } });
  assert.equal((await invoke(unconfigured, 'GET')).status, 503);
});

test('SQL migration limits execution, direct RPC grants and per-user references', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261008181500_private_user_analysis_bindings.sql', import.meta.url), 'utf8');
  assert.match(sql, /execution_enabled boolean NOT NULL DEFAULT false CHECK \(execution_enabled = false\)/);
  assert.match(sql, /ALTER TABLE private\.user_analysis_bindings ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /c\.user_id = _user_id AND c\.provider = _provider AND c\.status = 'VERIFIED'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.capital_ai_upsert_user_analysis_binding\(/);
  assert.match(sql, /TO service_role/);
  assert.doesNotMatch(sql, /vault\.decrypted_secrets|vault\.create_secret|vault\.update_secret/);
});
