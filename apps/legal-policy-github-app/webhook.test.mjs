import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { entitlementForSubscription } from './lib/entitlements.mjs';
import { dependencyDiffToInventory, spdxSbomToInventory, sbomBindsToSource } from './lib/scanner.mjs';
import { handleGitHubEvent, verifyWebhookSignature } from './lib/webhook.mjs';
import { createOAuthState, oauthAuthorizeUrl, verifyOAuthState } from './lib/oauth.mjs';
import { evidenceHash, evidenceRecord, secureTokenEquals } from './lib/evidence-store.mjs';
import { generateAndFetchAsyncSbom } from './lib/sbom.mjs';
import { contentLengthExceedsLimit, readBoundedRequestBody } from './lib/request-body.mjs';

test('webhook signature is verified with constant-time comparison', () => {
  const body = Buffer.from('{"ok":true}'); const secret = 'secret'; const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(verifyWebhookSignature(body, signature, secret), true); assert.equal(verifyWebhookSignature(body, `${signature.slice(0,-1)}0`, secret), false);
});

test('team plan enables PR gate and evidence history', () => {
  const entitlement = entitlementForSubscription({marketplace_purchase:{plan:{name:'Team'}}});
  assert.equal(entitlement.plan, 'team'); assert.equal(entitlement.capabilities.prGate, true); assert.equal(entitlement.capabilities.evidenceHistory, true);
});

test('dependency scope mapping is fail-closed for runtime without repository config', () => {
  const inventory = dependencyDiffToInventory({dependencies:[{change_type:'added',name:'x',version:'1',license:'MIT',scope:'runtime'}],repository:'acme/repo',sourceSha:'abc'});
  assert.equal(inventory.components[0].usageClass, null);
});

test('repository config can classify runtime deployment', () => {
  const inventory = dependencyDiffToInventory({dependencies:[{change_type:'added',name:'x',version:'1',license:'MIT',scope:'runtime'}],repository:'acme/repo',sourceSha:'abc',repositoryConfig:{scopeUsageClasses:{runtime:'HOSTED_NETWORK_SERVICE'}}});
  assert.equal(inventory.components[0].usageClass, 'HOSTED_NETWORK_SERVICE');
});

test('OAuth setup state is signed, expires and binds the installation', () => {
  const now = Date.UTC(2026, 9, 1, 15, 0, 0);
  const signingKey = '0123456789abcdef0123456789abcdef';
  const wrongKey = 'abcdef0123456789abcdef0123456789';
  const state = createOAuthState({ installationId: 42, marketplacePlanId: 7, secret: signingKey, now });
  const verified = verifyOAuthState(state, signingKey, now + 60_000);
  assert.equal(verified.installationId, 42);
  assert.equal(verified.marketplacePlanId, 7);
  assert.equal(verifyOAuthState(state, wrongKey, now + 60_000), null);
  assert.equal(verifyOAuthState(state, signingKey, now + 11 * 60_000), null);
});

test('OAuth state rejects weak signing keys and tampering fail-closed', () => {
  const now = Date.UTC(2026, 9, 1, 15, 0, 0);
  const signingKey = '0123456789abcdef0123456789abcdef';
  assert.throws(
    () => createOAuthState({ installationId: 42, secret: 'too-short', now }),
    /at least 32 bytes/,
  );
  assert.equal(verifyOAuthState('invalid.state', 'too-short', now), null);
  const state = createOAuthState({ installationId: 42, secret: signingKey, now });
  const [payload, signature] = state.split('.');
  assert.equal(verifyOAuthState(`${payload}x.${signature}`, signingKey, now + 1_000), null);
});

test('OAuth authorization URL binds callback and state', () => {
  const url = new URL(oauthAuthorizeUrl({ clientId: 'Iv1.example', redirectUri: 'https://legal.example/auth/github/callback', state: 'abc' }));
  assert.equal(url.origin + url.pathname, 'https://github.com/login/oauth/authorize'); assert.equal(url.searchParams.get('client_id'), 'Iv1.example'); assert.equal(url.searchParams.get('redirect_uri'), 'https://legal.example/auth/github/callback'); assert.equal(url.searchParams.get('state'), 'abc');
});

test('SPDX SBOM conversion remains fail-closed without usage classification', () => {
  const sbom={packages:[{SPDXID:'SPDXRef-Repository',name:'acme/repo',versionInfo:'main'},{SPDXID:'SPDXRef-Package-x',name:'x',versionInfo:'1',licenseDeclared:'MIT',externalRefs:[{referenceType:'purl',referenceLocator:'pkg:npm/x@1'}]}]};
  const inventory=spdxSbomToInventory({sbom,repository:'acme/repo',sourceSha:'abc'});
  assert.equal(inventory.components.length,1); assert.equal(inventory.components[0].usageClass,null); assert.equal(sbomBindsToSource(sbom,'abc'),false);
});

test('SBOM source binding requires exact PR head identity', () => {
  const sbom={packages:[{SPDXID:'SPDXRef-Repository',name:'acme/repo',versionInfo:'abc'}]};
  assert.equal(sbomBindsToSource(sbom,'abc'),true); assert.equal(sbomBindsToSource(sbom,'def'),false);
});

test('asynchronous SBOM flow keeps every application-level fetch on the validated GitHub report endpoint', async () => {
  const calls=[]; let poll=0;
  const fetchImpl=async (url, options={})=>{
    calls.push({url:String(url),options});
    if(String(url).endsWith('/generate-report')) return new Response(JSON.stringify({sbom_url:'https://api.github.com/repos/acme/repo/dependency-graph/sbom/fetch-report/uuid'}),{status:201,headers:{'content-type':'application/json'}});
    if(String(url).includes('/fetch-report/uuid')) {
      poll+=1;
      if(poll===1) return new Response(null,{status:202});
      return new Response(JSON.stringify({packages:[]}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error(`unexpected ${url}`);
  };
  const result=await generateAndFetchAsyncSbom({owner:'acme',repo:'repo',token:'installation-secret',fetchImpl,attempts:3,pollDelayMs:0,sleep:async()=>{}});
  assert.equal(result.status,'ready');
  assert.equal(calls.length,3);
  for (const call of calls) assert.match(call.url,/^https:\/\/api\.github\.com\/repos\/acme\/repo\/dependency-graph\/sbom\//);
  assert.equal(calls.at(-1).options.redirect,'follow');
});

test('asynchronous SBOM fetch URL rejects alternate hosts and embedded credentials', async () => {
  const badUrls=[
    'https://evil.example/repos/acme/repo/dependency-graph/sbom/fetch-report/uuid',
    'https://user:pass@api.github.com/repos/acme/repo/dependency-graph/sbom/fetch-report/uuid',
  ];
  for (const sbom_url of badUrls) {
    const fetchImpl=async () => new Response(JSON.stringify({sbom_url}),{status:201,headers:{'content-type':'application/json'}});
    await assert.rejects(
      generateAndFetchAsyncSbom({owner:'acme',repo:'repo',token:'secret',fetchImpl,attempts:1,pollDelayMs:0,sleep:async()=>{}}),
      /unexpected SBOM fetch URL/,
    );
  }
});
test('evidence hash is canonical and evidence record stores metadata instead of source contents', () => {
  assert.equal(evidenceHash({b:1,a:2}), evidenceHash({a:2,b:1}));
  const result={policyId:'LEGAL_POLICY_COMMUNITY@1',releaseDecision:'ALLOW',counts:{ALLOW:1,ALLOW_WITH_OBLIGATIONS:0,LEGAL_REVIEW_REQUIRED:0,BLOCKED:0},components:[{component:'x',exactVersion:'1',artifactIdentity:'pkg:npm/x@1',licenseExpression:'MIT',usageClass:'BUILD_ONLY',legalStatus:'ALLOW',obligations:[],outstandingObligations:[]}],evaluatedAt:'2026-10-04T00:00:00.000Z'};
  const record=evidenceRecord({result,gateDecision:'ALLOW',entitlement:{plan:'team'},installationId:1,accountId:2,repository:'acme/repo',repositoryId:3,sourceSha:'abc',evidenceSource:'GITHUB_DEPENDENCY_REVIEW',sourceBound:true,now:new Date('2026-10-04T00:00:00Z'),env:{LEGAL_POLICY_TEAM_RETENTION_DAYS:'30'}});
  assert.equal(record.summary.sourceBound,true); assert.equal(record.source_sha,'abc'); assert.equal(record.expires_at,'2026-11-03T00:00:00.000Z'); assert.equal(Object.hasOwn(record,'source_code'),false);
});

test('maintenance token comparison is exact', () => {
  assert.equal(secureTokenEquals('abc','abc'),true); assert.equal(secureTokenEquals('abc','abd'),false); assert.equal(secureTokenEquals('abc','ab'),false);
});

import { deleteAccountEvidence, deleteExpiredEvidence, deleteInstallationEvidence, persistEvidence } from './lib/evidence-store.mjs';

test('evidence persistence uses backend secret only and writes append-only audit metadata', async () => {
  const calls=[];
  const fetchImpl=async (url, options={}) => { calls.push({url:String(url),options}); return new Response(null,{status:201}); };
  const result={policyId:'LEGAL_POLICY_COMMUNITY@1',releaseDecision:'ALLOW',counts:{ALLOW:1,ALLOW_WITH_OBLIGATIONS:0,LEGAL_REVIEW_REQUIRED:0,BLOCKED:0},components:[{component:'x',exactVersion:'1',artifactIdentity:'pkg:npm/x@1',licenseExpression:'MIT',usageClass:'BUILD_ONLY',legalStatus:'ALLOW',obligations:[],outstandingObligations:[]}],evaluatedAt:'2026-10-04T00:00:00.000Z'};
  const env={LEGAL_POLICY_SUPABASE_URL:'https://project.supabase.co',LEGAL_POLICY_SUPABASE_SECRET_KEY:'sb_secret_example',LEGAL_POLICY_TEAM_RETENTION_DAYS:'30'};
  const stored=await persistEvidence({result,gateDecision:'ALLOW',entitlement:{plan:'team'},installationId:1,accountId:2,repository:'acme/repo',repositoryId:3,sourceSha:'abc',evidenceSource:'GITHUB_DEPENDENCY_REVIEW',sourceBound:true,env},fetchImpl);
  assert.equal(stored.persisted,true);
  assert.equal(calls[0].options.headers.apikey,'sb_secret_example');
  assert.equal(calls[0].options.headers.authorization,'Bearer sb_secret_example');
  assert.equal(calls[0].options.method,'POST');
  const body=JSON.parse(calls[0].options.body);
  assert.equal(body.repository_full_name,'acme/repo');
  assert.equal(Object.hasOwn(body,'source_code'),false);
});

test('retention, uninstall and cancellation deletion use bounded evidence-table DELETE filters', async () => {
  const calls=[];
  const fetchImpl=async (url, options={}) => { calls.push({url:String(url),options}); return new Response(null,{status:204}); };
  const env={LEGAL_POLICY_SUPABASE_URL:'https://project.supabase.co',LEGAL_POLICY_SUPABASE_SECRET_KEY:'sb_secret_example'};
  await deleteExpiredEvidence({env,now:new Date('2026-10-04T00:00:00Z'),fetchImpl});
  await deleteInstallationEvidence({installationId:42,env,fetchImpl});
  await deleteAccountEvidence({accountId:99,env,fetchImpl});
  assert.match(calls[0].url,/expires_at=lt\./);
  assert.match(calls[1].url,/installation_id=eq\.42/);
  assert.match(calls[2].url,/account_id=eq\.99/);
  assert.equal(calls[0].options.method,'DELETE');
  assert.equal(calls[1].options.method,'DELETE');
  assert.equal(calls[2].options.method,'DELETE');
});

test('Marketplace lifecycle accepts purchase/change and deletes evidence on cancellation', async () => {
  const calls=[];
  const fetchImpl=async (url, options={}) => { calls.push({url:String(url),options}); return new Response(null,{status:204}); };
  const env={LEGAL_POLICY_SUPABASE_URL:'https://project.supabase.co',LEGAL_POLICY_SUPABASE_SECRET_KEY:'sb_secret_example'};

  const purchased=await handleGitHubEvent({
    eventName:'marketplace_purchase',
    payload:{action:'purchased',marketplace_purchase:{account:{id:99}}},
    env,
    fetchImpl,
  });
  const changed=await handleGitHubEvent({
    eventName:'marketplace_purchase',
    payload:{action:'changed',marketplace_purchase:{account:{id:99}}},
    env,
    fetchImpl,
  });
  const cancelled=await handleGitHubEvent({
    eventName:'marketplace_purchase',
    payload:{action:'cancelled',marketplace_purchase:{account:{id:99}}},
    env,
    fetchImpl,
  });

  assert.equal(purchased.action,'purchased');
  assert.equal(changed.action,'changed');
  assert.equal(cancelled.action,'cancelled');
  assert.equal(cancelled.evidenceDeletion.deleted,true);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/legal_policy_evidence\?account_id=eq\.99$/);
  assert.equal(calls[0].options.method,'DELETE');
});

test('Marketplace cancellation fails closed without account identity', async () => {
  await assert.rejects(
    handleGitHubEvent({
      eventName:'marketplace_purchase',
      payload:{action:'cancelled',marketplace_purchase:{}},
      env:{},
      fetchImpl:async()=>new Response(null,{status:204}),
    }),
    /Missing account id/,
  );
});


test('webhook content-length preflight rejects oversized requests', () => {
  assert.equal(contentLengthExceedsLimit({'content-length':'1048577'}), true);
  assert.equal(contentLengthExceedsLimit({'content-length':'1048576'}), false);
  assert.equal(contentLengthExceedsLimit({}), false);
});

test('bounded request reader rejects chunked bodies over the limit', async () => {
  async function* chunks() {
    yield Buffer.alloc(6);
    yield Buffer.alloc(5);
  }
  await assert.rejects(
    readBoundedRequestBody(chunks(), 10),
    (error) => error?.code === 'REQUEST_BODY_TOO_LARGE' && error?.status === 413,
  );
});

test('bounded request reader returns bodies at or below the limit', async () => {
  async function* chunks() {
    yield Buffer.from('hello');
    yield Buffer.from('world');
  }
  const body = await readBoundedRequestBody(chunks(), 10);
  assert.equal(body.toString('utf8'), 'helloworld');
});
