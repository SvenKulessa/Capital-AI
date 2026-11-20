import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path=new URL('../supabase/migration-candidates/20261120045100_unit_economics_isolated_ledger.sql',import.meta.url);
const sql=readFileSync(path,'utf8');
const runner=readFileSync(new URL('./unit-economics-ledger-pg-integration.mjs',import.meta.url),'utf8');
const lower=sql.toLowerCase();
test('candidate only: private schema, tenant foreign key and no production DDL deploy',()=>{
  assert.match(sql,/create schema if not exists capital_ai_ue/);
  assert.match(sql,/tenant_id uuid not null references auth\.users\(id\)/);
  assert.match(sql,/constraint ue_tenant_key unique \(tenant_id,idempotency_key\)/);
  assert.match(sql,/constraint ue_tenant_source unique \(tenant_id,source_snapshot_sha256\)/);
  assert.match(sql,/constraint ue_run_pk primary key \(tenant_id,run_id\)/);
  assert.match(sql,/accounting_eligible boolean not null default false check \(accounting_eligible = false\)/);
  assert.match(sql,/provenance = 'SYNTHETIC_ISOLATED'/);
  assert.doesNotMatch(lower,/alter table public\./);
});
test('RLS direct denial and public/authenticated API isolation',()=>{
  for(const table of ['snapshots','run_allocations','reversals']){
    assert.match(sql,new RegExp('alter table capital_ai_ue\\.'+table+' enable row level security'));
    assert.match(sql,new RegExp('create policy ue_deny_'+(table==='run_allocations'?'runs':table)+' on capital_ai_ue\\.'+table));
  }
  assert.match(sql,/revoke all on all tables in schema capital_ai_ue from public, anon, authenticated, service_role/);
  assert.match(sql,/revoke all on schema capital_ai_ue from public, anon, authenticated, service_role/);
  assert.doesNotMatch(sql,/grant\s+(select|insert|update|delete)\s+on\s+.+\s+to\s+(anon|authenticated|service_role)/i);
});
test('service-role RPCs have empty search path and no public execute privileges',()=>{
  const funcs=['record_snapshot','reverse_snapshot','read_snapshot'];
  assert.equal((sql.match(/security definer set search_path = ''/g)||[]).length,3);
  for(const f of funcs){
    assert.match(sql,new RegExp('create function capital_ai_ue\\.'+f+'\\('));
    assert.match(sql,new RegExp('revoke all on function capital_ai_ue\\.'+f+'\\('));
    assert.match(sql,new RegExp('grant execute on function capital_ai_ue\\.'+f+'\\('));
  }
  assert.equal((sql.match(/to service_role;/g)||[]).length,4); // schema usage + three EXECUTE
  assert.doesNotMatch(sql,/grant execute[\s\S]{0,300} to (?:public|anon|authenticated)\s*;/i);
});
test('transaction lock precedes replay, unique constraints enforce cross-session correctness',()=>{
  const create=sql.slice(sql.indexOf('create function capital_ai_ue.record_snapshot'),sql.indexOf('create function capital_ai_ue.reverse_snapshot'));
  assert.ok(create.indexOf('pg_advisory_xact_lock')<create.indexOf('where tenant_id=_tenant_id and idempotency_key=_key'));
  assert.ok(create.indexOf('where tenant_id=_tenant_id and idempotency_key=_key')<
    create.indexOf('insert into capital_ai_ue.snapshots'));
  assert.match(create,/UE_COST_TOTAL_MISMATCH/);
  assert.match(create,/duplicate_source/);
  assert.match(create,/pg_catalog\.jsonb_array_elements/);
  assert.doesNotMatch(create,/pg_sleep|dblink|http_post|create trigger/i);
});
test('rollback is immutable append-only; test runner checks hard crash and separate restore',()=>{
  assert.match(sql,/create table capital_ai_ue\.reversals/);
  assert.match(sql,/constraint ue_reversal_pk primary key \(tenant_id,snapshot_id\)/);
  assert.match(sql,/constraint ue_reversal_parent foreign key \(tenant_id,snapshot_id\)/);
  assert.doesNotMatch(lower,/\btruncate\b|\bdrop table\b|\bdelete from capital_ai_ue\b|\bupdate capital_ai_ue\b/);
  assert.match(runner,/SIGKILL/);
  assert.match(runner,/pg_dump/);assert.match(runner,/pg_restore/);
  assert.match(runner,/ue_ledger_restore_ci/);
  assert.match(runner,/restoreVerified=true/);
  assert.match(runner,/providerCalls:0,productionMutations:0/);
});

test('restore validates full-row digests of each ledger table and refuses corrupt archives',()=>{
  assert.match(runner,/to_jsonb\(t\)::text/);
  for(const table of ['snapshots','run_allocations','reversals'])
    assert.match(runner,new RegExp('from capital_ai_ue\\.'+table+' t;'));
  assert.match(runner,/assert\.deepEqual\(after,before/);
  assert.match(runner,/ue_ledger_corrupt_ci/);
  assert.match(runner,/head -c/);
  assert.match(runner,/pg17_truncated_dump_fails_closed/);
  assert.match(runner,/pg17_restore_acl_rls_all_tables_and_rpcs/);
});
