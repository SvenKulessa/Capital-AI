import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { assessGa4Config, fetchRenderVariable, runGa4Probe } from './ga4-render-config-diagnostic.mjs';

const account = JSON.stringify({
  type: 'service_account', project_id: 'aifinancial-500208',
  client_email: 'private@example.invalid', private_key: 'CONFIDENTIAL_DO_NOT_PRINT',
});
const origin = 'https://api.render.com/v1/services/srv-dau1rp893c1s73cdhm1g/env-vars/';
const fake = (status = 200, key = 'GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON', value = account) =>
  new Response(JSON.stringify({envVar: {key, value}}), {status});

test('valid JSON and same documented/Render project return booleans and only safe code', () => {
  assert.deepEqual(assessGa4Config(account, 'aifinancial-500208'),
    { JSON_VALID: true, PROJECT_MATCH: true, reason: 'GA4_CONFIG_VALID' });
});
test('malformed, double-encoded, and absent secrets fail closed', () => {
  assert.equal(assessGa4Config('{broken', 'aifinancial-500208').reason, 'GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON');
  assert.equal(assessGa4Config(JSON.stringify(account), 'aifinancial-500208').reason, 'GA4_MCP_SERVICE_ACCOUNT_INVALID');
  assert.equal(assessGa4Config('', 'aifinancial-500208').reason, 'GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED');
});
test('wrong service-account shape, absent project, mismatch and unexpected expected project fail closed', () => {
  assert.equal(assessGa4Config(JSON.stringify({type:'authorized_user', project_id:'aifinancial-500208'}), 'aifinancial-500208').reason, 'GA4_MCP_SERVICE_ACCOUNT_INVALID');
  assert.equal(assessGa4Config(account, '').reason, 'GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED');
  assert.deepEqual(assessGa4Config(account, 'wrong-project'),
    {JSON_VALID:true, PROJECT_MATCH:false, reason:'GA4_MCP_PROJECT_MISMATCH'});
  assert.equal(assessGa4Config(account, 'aifinancial-500208', 'different-project').PROJECT_MATCH, false);
});
test('only the two exact Render env-var keys are accepted; no request on rejected input', async () => {
  let calls = 0;
  await assert.rejects(fetchRenderVariable('RENDER_API_KEY', 'token', async () => { calls++; return fake(); }), /RENDER_VARIABLE_NOT_ALLOWED/);
  assert.equal(calls, 0);
});
test('exact service, GET only, no redirect, and no token in output', async () => {
  const requests = [];
  const result = await runGa4Probe({ RENDER_API_KEY: 'PRIVATE_BEARER_KEY' }, async (url, options) => {
    requests.push({url, method:options.method, redirect:options.redirect, auth:options.headers.Authorization});
    const key = url.slice(origin.length);
    return fake(200,key,key === 'GOOGLE_ANALYTICS_CLOUD_PROJECT' ? 'aifinancial-500208' : account);
  });
  assert.deepEqual(result, {JSON_VALID:true, PROJECT_MATCH:true, reason:'GA4_CONFIG_VALID'});
  assert.deepEqual(requests.map(x=>x.url), [origin+'GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON', origin+'GOOGLE_ANALYTICS_CLOUD_PROJECT']);
  assert.ok(requests.every(x=>x.method==='GET' && x.redirect==='error' && x.auth==='Bearer PRIVATE_BEARER_KEY'));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|example.invalid|Bearer|project_id|private_key/);
});
test('HTTP denied, missing, rate-limited, oversized, malformed JSON, and wrong variable key never expose raw API text', async () => {
  for (const [status,code] of [[401,'RENDER_API_UNAUTHORIZED'],[403,'RENDER_API_FORBIDDEN'],[404,'RENDER_VAR_UNAVAILABLE'],[429,'RENDER_API_RATE_LIMITED'],[500,'RENDER_API_UNAVAILABLE']]) {
    const value = await runGa4Probe({RENDER_API_KEY:'TOKEN'}, async()=>fake(status));
    assert.deepEqual(value, {JSON_VALID:null,PROJECT_MATCH:null,reason:code});
  }
  const oversized = await runGa4Probe({RENDER_API_KEY:'TOKEN'}, async()=>new Response('x'.repeat(70000)));
  assert.equal(oversized.reason, 'RENDER_RESPONSE_INVALID');
  const invalidResponse = await runGa4Probe({RENDER_API_KEY:'TOKEN'}, async()=>new Response('PRIVATE_KEY'));
  assert.equal(invalidResponse.reason, 'RENDER_RESPONSE_INVALID');
  const wrongKey = await runGa4Probe({RENDER_API_KEY:'TOKEN'}, async()=>fake(200,'NOT_APPROVED','PRIVATE_KEY'));
  assert.equal(wrongKey.reason, 'RENDER_RESPONSE_INVALID');
  assert.doesNotMatch(JSON.stringify([oversized,invalidResponse,wrongKey]), /PRIVATE_KEY|TOKEN/);
});
test('missing token and network exceptions stay opaque', async () => {
  assert.equal((await runGa4Probe({})).reason, 'RENDER_API_NOT_CONFIGURED');
  assert.equal((await runGa4Probe({RENDER_API_KEY:'TOKEN'},async()=>{throw Error('PRIVATE_KEY=SECRET');})).reason,'RENDER_API_UNAVAILABLE');
});
test('CLI writes only approved keys and a safe reason even on failure', () => {
  const child = spawnSync(process.execPath, ['scripts/ga4-render-config-diagnostic.mjs'], {
    cwd: process.cwd(), encoding:'utf8', env:{PATH:process.env.PATH, HOME:process.env.HOME},
  });
  assert.equal(child.status,1);
  assert.equal(child.stderr,'');
  assert.deepEqual(JSON.parse(child.stdout),{JSON_VALID:null,PROJECT_MATCH:null,reason:'RENDER_API_NOT_CONFIGURED'});
});
