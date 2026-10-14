import test from 'node:test';
import assert from 'node:assert/strict';
import { readEnabledCloudApis, TARGET } from './google-cloud-admin-readback.mjs';
const TOKEN = 'synthetic-not-a-google-token';

function service(name, state = 'ENABLED', project = TARGET.projectNumber) {
  return { name: 'projects/' + project + '/services/' + name, state };
}
function reply(services, nextPageToken = '') {
  return { status: 200, json: async () => ({ services, nextPageToken }) };
}
test('requires a token with no control characters', async () => {
  await assert.rejects(() => readEnabledCloudApis({token:''}), /TOKEN_INVALID/);
  await assert.rejects(() => readEnabledCloudApis({token:'bad\ninjected'}), /TOKEN_INVALID/);
});
test('only GETs exact project, with readonly shaped output and paginates', async () => {
  let calls = 0;
  const fetcher = async (value, options) => {
    const u = new URL(value);
    assert.equal(u.origin, 'https://serviceusage.googleapis.com');
    assert.equal(u.pathname, '/v1/projects/542877602707/services');
    assert.equal(u.searchParams.get('filter'), 'state:ENABLED');
    assert.equal(u.searchParams.get('pageSize'), '200');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + TOKEN);
    calls++;
    if (calls === 1) return reply([service('serviceusage.googleapis.com')], 'page-two');
    assert.equal(u.searchParams.get('pageToken'), 'page-two');
    return reply([service('iam.googleapis.com'), service('drive.googleapis.com')]);
  };
  const summary = await readEnabledCloudApis({ token: TOKEN, fetcher });
  assert.equal(calls,2);
  assert.deepEqual(summary, {
    projectId:'aifinancial-500208',projectNumber:'542877602707',
    enabledServiceCount:3, serviceUsageEnabled:true, iamEnabled:true,
    iamCredentialsEnabled:false, driveApiEnabled:true, readonly:true,
  });
  assert.ok(!JSON.stringify(summary).includes(TOKEN));
});
test('denies responses from any other project', async () => {
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>reply([service('iam.googleapis.com','ENABLED','999')]) }), /RESPONSE_PROJECT_OR_STATE_INVALID/);
});
test('denies disabled services in ENABLED query', async () => {
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>reply([service('iam.googleapis.com','DISABLED')]) }), /RESPONSE_PROJECT_OR_STATE_INVALID/);
});
test('denies malformed API response and suspicious service name', async () => {
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>({ status:200, json:async()=>({ services: 'bad' }) }) }), /RESPONSE_SHAPE_INVALID/);
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>reply([service('bad/../../unsafe.googleapis.com')]) }), /RESPONSE_SERVICE_NAME_INVALID/);
});
test('denies pagination loop instead of reporting partial evidence', async () => {
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>reply([service('iam.googleapis.com')], 'page-one') }), /PAGINATION_INVALID/);
});
test('provider denial and network errors do not leak response data', async () => {
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>({status:403,json:async()=>({error:'private-details'})}) }), /HTTP_403/);
  await assert.rejects(() => readEnabledCloudApis({ token:TOKEN, fetcher:async()=>{ throw new Error('secret-url'); } }), /TRANSPORT_FAILED/);
});
