// PostgreSQL 17 integration verification, CI-only isolated synthetic identities.
// No production Supabase, provider, payment, or persistent external resource is used.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CAROL = '33333333-3333-4333-8333-333333333333';
const RUN = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const HASH = 'a'.repeat(64);

function command(program, args, input = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout.trim()) :
      reject(new Error(program + ' exited ' + code + ': ' + stderr.slice(0, 600))));
    child.stdin.on('error', () => {});
    child.stdin.end(input || '');
  });
}
const psql = sql => command('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
const literal = obj => "'" + JSON.stringify(obj).replaceAll("'", "''") + "'::jsonb";
function payload(runId) {
  const base = { id: runId, workflowId: 'ci-evidence',
    executionStatus: 'SYNTHETIC_LOCAL_COMPLETED', modelCalls: 0, externalApiCalls: 0,
    productionEligible: false, publicationAuthorized: false };
  const sorted = Object.fromEntries(Object.entries(base).sort(([a], [b]) => a.localeCompare(b)));
  const hash = createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return { json: literal({ ...base, receiptSha256: hash }), hash };
}
function create(user, n, key, requestHash = HASH) {
  const id = RUN(n);
  const receipt = payload(id);
  return psql('set role service_role; select public.capital_ai_create_agent_pilot_run(' +
    "'" + id + "'::uuid,'" + user + "'::uuid,'starter','ci-evidence','" + key +
    "','" + requestHash + "'," + receipt.json + ",'" + receipt.hash +
    "') ->> 'state';");
}
async function main() {
  assert.ok(process.env.PGHOST && process.env.PGPASSWORD && process.env.PGDATABASE,
    'Requires disposable CI PostgreSQL service');
  await psql("create role anon nologin; create role authenticated nologin; create role service_role nologin;");
  await psql('create schema auth; create table auth.users(id uuid primary key);');
  await psql("insert into auth.users(id) values ('" + ALICE + "'),('" + BOB + "'),('" + CAROL + "');");
  const migration = readFileSync(new URL('../supabase/migration-candidates/20261118180000_agent_operations_pilot_durable_ledger.sql', import.meta.url), 'utf8');
  await command('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], migration);

  for (const role of ['anon', 'authenticated']) {
    for (const signature of [
      'public.capital_ai_create_agent_pilot_run(uuid,uuid,text,text,text,text,jsonb,text)',
      'public.capital_ai_get_agent_pilot_run(uuid,uuid)']) {
      assert.equal(await psql("select has_function_privilege('" + role + "','" + signature + "','EXECUTE');"), 'f',
        role + ' must not execute privileged RPC');
    }
    assert.equal(await psql("select has_table_privilege('" + role +
      "','public.agent_operations_pilot_runs','SELECT');"), 'f');
  }
  assert.equal(await psql("select has_table_privilege('service_role','public.agent_operations_pilot_runs','SELECT');"), 'f');
  assert.equal(await psql("select has_function_privilege('service_role'," +
    "'public.capital_ai_create_agent_pilot_run(uuid,uuid,text,text,text,text,jsonb,text)','EXECUTE');"), 't');
  await assert.rejects(psql('set role anon; select count(*) from public.agent_operations_pilot_runs;'));
  await assert.rejects(psql('set role authenticated; select public.capital_ai_get_agent_pilot_run(' +
    "'" + ALICE + "'::uuid,'" + RUN(1) + "'::uuid);"));

  assert.equal(await create(ALICE, 1, 'alpha-key-00001'), 'created');
  assert.equal(await create(ALICE, 2, 'alpha-key-00001'), 'replayed');
  assert.equal(await create(ALICE, 3, 'alpha-key-00001', 'b'.repeat(64)), 'conflict');
  assert.equal(await create(ALICE, 4, 'alpha-key-00002'), 'created');
  assert.equal(await create(ALICE, 5, 'alpha-key-00003'), 'quota_exceeded');
  assert.equal(await create(BOB, 6, 'alpha-key-00001'), 'created');
  assert.equal(await psql('select count(*) from public.agent_operations_pilot_runs where user_id=' +
    "'" + ALICE + "'::uuid;"), '2');
  // Exercise the RLS policy independently of ACL revocation in this disposable DB.
  await psql('grant select on table public.agent_operations_pilot_runs to authenticated;');
  assert.equal(await psql('set role authenticated; select count(*) from public.agent_operations_pilot_runs;'), '0');
  await psql('revoke select on table public.agent_operations_pilot_runs from authenticated;');
  // Invalid foreign-key writes must roll back without spending a quota unit.
  await assert.rejects(create('44444444-4444-4444-8444-444444444444', 9, 'invalid-owner-0001'));
  assert.equal(await psql('select count(*) from public.agent_operations_pilot_runs;'), '3');
  assert.equal(await psql('set role service_role; select public.capital_ai_get_agent_pilot_run(' +
    "'" + BOB + "'::uuid,'" + RUN(1) + "'::uuid) is null;"), 't');
  const ownHash = payload(RUN(1)).hash;
  assert.equal(await psql('set role service_role; select public.capital_ai_get_agent_pilot_run(' +
    "'" + ALICE + "'::uuid,'" + RUN(1) + "'::uuid) ->> 'receiptSha256';"), ownHash);

  const states = await Promise.all(Array.from({ length: 18 }, (_, i) =>
    create(CAROL, i + 100, 'parallel-key-' + String(i).padStart(8, '0'))));
  assert.equal(states.filter(x => x === 'created').length, 2, 'atomic quota across independent DB sessions');
  assert.equal(states.filter(x => x === 'quota_exceeded').length, 16);
  assert.equal(await psql('select count(*) from public.agent_operations_pilot_runs where user_id=' +
    "'" + CAROL + "'::uuid;"), '2');

  // A fresh independent PostgreSQL client proves persisted reads across processes.
  assert.equal(await psql('select count(*) from public.agent_operations_pilot_runs;'), '5');
  console.log('VERIFIED: PostgreSQL17 ACL/RLS, service-only RPC, cross-tenant denial, idempotency, quota race, multi-process persistence');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
