import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const proposal = readFileSync(new URL('supabase/proposals/provider_query_guard.sql', root), 'utf8');
const migration = readFileSync(new URL('supabase/migrations/20261007214554_provider_query_guard.sql', root), 'utf8');

test('provider query guard migration is byte-identical to the reviewed proposal', () => {
  assert.equal(migration, proposal);
});

test('provider query guard migration preserves least privilege and fail-closed function settings', () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path = '' set lock_timeout = '1500ms'/i);
  assert.match(migration, /revoke all on function public\.capital_ai_claim_provider_query[\s\S]*from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.capital_ai_claim_provider_query[\s\S]*to service_role;/i);
  assert.doesNotMatch(migration, /security definer/i);
});
