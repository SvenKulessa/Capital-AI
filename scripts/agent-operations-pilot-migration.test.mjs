import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/20261118180000_agent_operations_pilot_durable_ledger.sql',
  import.meta.url), 'utf8');

test('durable table denies direct API access and cannot become production eligible', () => {
  assert.match(sql, /create table if not exists public\.agent_operations_pilot_runs/);
  assert.match(sql, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /unique \(user_id, idempotency_key\)/);
  assert.match(sql, /alter table public\.agent_operations_pilot_runs enable row level security/);
  assert.match(sql, /revoke all on table public\.agent_operations_pilot_runs from public, anon, authenticated, service_role/);
  assert.match(sql, /for all to anon, authenticated using \(false\) with check \(false\)/);
  assert.match(sql, /production_eligible boolean not null default false check \(production_eligible = false\)/);
  assert.doesNotMatch(sql, /grant (?:all|select|insert|update|delete) on .* to (?:anon|authenticated)/i);
});

test('service-only RPC execution with a pinned schema search path', () => {
  for (const name of ['capital_ai_create_agent_pilot_run', 'capital_ai_get_agent_pilot_run']) {
    assert.match(sql, new RegExp('create or replace function public\\.' + name));
    assert.match(sql, new RegExp('revoke all on function public\\.' + name + '\\('));
    assert.match(sql, new RegExp('grant execute on function public\\.' + name + '\\('));
  }
  assert.equal((sql.match(/security definer\s+set search_path = ''/g) || []).length, 2);
  assert.equal((sql.match(/to service_role;/g) || []).length, 2);
  assert.doesNotMatch(sql, /grant execute[^;]*to\s+(?:public|anon|authenticated)\b/i);
  assert.doesNotMatch(sql, /auth\.jwt\(\)|raw_user_meta_data/i);
});

test('atomic, retry-safe quota and tenant isolation are enforced within one RPC', () => {
  const create = sql.slice(sql.indexOf('create or replace function public.capital_ai_create_agent_pilot_run'),
    sql.indexOf('create or replace function public.capital_ai_get_agent_pilot_run'));
  assert.match(create, /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(_user_id::text, 0\)\)/);
  const lock = create.indexOf('pg_advisory_xact_lock');
  const lookup = create.indexOf('where user_id = _user_id and idempotency_key = _idempotency_key');
  const count = create.indexOf('from public.agent_operations_pilot_runs\n   where user_id = _user_id and day_utc = v_day');
  const insert = create.indexOf('insert into public.agent_operations_pilot_runs');
  assert.ok(lock >= 0 && lock < lookup && lookup < count && count < insert);
  assert.match(create, /if v_existing\.request_hash <> _request_hash then/);
  assert.match(create, /'state', 'conflict'/);
  assert.match(create, /'state', 'replayed'/);
  assert.match(create, /if v_used >= v_limit then/);
  assert.match(create, /'state', 'quota_exceeded'/);
  assert.match(create, /when 'starter' then 2 when 'pro' then 10 else 30 end/);
  assert.match(create, /timezone\('UTC', pg_catalog\.clock_timestamp\(\)\)::date/);
  assert.match(create, /_receipt \? 'userId'/);
  assert.match(create, /_receipt \? 'tenantId'/);
  assert.match(sql, /where r\.user_id = _user_id and r\.id = _run_id/);
  assert.doesNotMatch(sql, /pg_sleep|dblink|http_post|pg_cron|create trigger/i);
});
