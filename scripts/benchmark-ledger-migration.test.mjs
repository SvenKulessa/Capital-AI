import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20261006080124_benchmark_run_usage_ledger.sql',import.meta.url),'utf8');

test('benchmark ledger is RLS protected and API roles have no direct table grants',()=>{
  for(const table of ['benchmark_runs','benchmark_usage_ledger']){
    assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
    assert.match(sql,new RegExp('revoke all on table public\\.'+table+' from public, anon, authenticated, service_role'));
  }
  assert.match(sql,/using \(false\)\s+with check \(false\)/);
});

test('benchmark run and usage can never become production or decision eligible',()=>{
  assert.match(sql,/production_eligible boolean not null default false check \(production_eligible = false\)/);
  assert.match(sql,/decision_eligible boolean not null default false check \(decision_eligible = false\)/);
});

test('credits remain uncharged until calibration is explicitly true',()=>{
  assert.match(sql,/credits_calibrated boolean not null default false/);
  assert.match(sql,/_credits_calibrated = false and _units_charged is not null/);
});

test('only service_role receives benchmark RPC execution',()=>{
  for(const fn of [
    'capital_ai_create_benchmark_run',
    'capital_ai_get_benchmark_run',
    'capital_ai_list_benchmark_runs',
    'capital_ai_record_benchmark_usage',
  ]){
    assert.match(sql,new RegExp('grant execute on function public\\.'+fn));
  }
  assert.match(sql,/from public, anon, authenticated/);
});
