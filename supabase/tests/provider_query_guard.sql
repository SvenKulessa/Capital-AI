-- Execute only against an isolated test database after loading the proposed DDL.
begin;
do $$
declare
  a uuid := '11111111-1111-4111-8111-111111111111';
  b uuid := '22222222-2222-4222-8222-222222222222';
  scopes_a jsonb := jsonb_build_array(
    jsonb_build_object('key', 'user:11111111-1111-4111-8111-111111111111:binance:account.snapshot', 'intervalMs', 60000),
    jsonb_build_object('key', 'global:binance:account.snapshot', 'intervalMs', 60000));
  scopes_b jsonb := jsonb_build_array(
    jsonb_build_object('key', 'user:22222222-2222-4222-8222-222222222222:binance:account.snapshot', 'intervalMs', 60000),
    jsonb_build_object('key', 'global:binance:account.snapshot', 'intervalMs', 60000));
  expiry bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint + 10000;
  result jsonb;
begin
  assert not has_function_privilege('anon', 'public.capital_ai_claim_provider_query(uuid,text,bigint,integer,jsonb)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.capital_ai_claim_provider_query(uuid,text,bigint,integer,jsonb)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.capital_ai_claim_provider_query(uuid,text,bigint,integer,jsonb)', 'EXECUTE');
  assert not has_table_privilege('anon', 'private.capital_ai_provider_query_state', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.capital_ai_provider_query_state', 'INSERT');
  assert not (select prosecdef from pg_proc where oid = 'public.capital_ai_claim_provider_query(uuid,text,bigint,integer,jsonb)'::regprocedure);
  assert (select relrowsecurity from pg_class where oid = 'private.capital_ai_provider_query_state'::regclass);

  result := public.capital_ai_claim_provider_query(a, 'sql-a1', expiry, 30, scopes_a);
  assert result->>'allowed' = 'true';
  result := public.capital_ai_claim_provider_query(a, 'sql-a1', expiry, 30, scopes_a);
  assert result->>'code' = 'QUERY_REPLAY_REJECTED';
  assert (select uses = 1 from private.capital_ai_provider_query_state where scope_key = 'rate:' || a);
  result := public.capital_ai_claim_provider_query(b, 'sql-b1', expiry, 30, scopes_b);
  assert result->>'code' = 'PROVIDER_QUERY_COST_THROTTLED';
  assert (select uses = 0 from private.capital_ai_provider_query_state where scope_key = 'rate:' || b);
  assert (select uses = 0 from private.capital_ai_provider_query_state where scope_key = 'replay:sql-b1');
  assert (select uses = 0 from private.capital_ai_provider_query_state
    where scope_key = 'cost:user:' || b || ':binance:account.snapshot');

  update private.capital_ai_provider_query_state set expires_at = clock_timestamp() - interval '1 second'
    where scope_key = 'cost:global:binance:account.snapshot';
  result := public.capital_ai_claim_provider_query(b, 'sql-b1', expiry, 1, scopes_b);
  assert result->>'allowed' = 'true';
  result := public.capital_ai_claim_provider_query(b, 'sql-b2', expiry, 1, '[]');
  assert result->>'code' = 'PROVIDER_QUERY_RATE_LIMITED';
  assert (select uses = 0 from private.capital_ai_provider_query_state where scope_key = 'replay:sql-b2');
  result := public.capital_ai_claim_provider_query(a, 'sql-expired', 1, 30, '[]');
  assert result->>'code' = 'INVALID_QUERY_PROOF';
  assert (select uses = 0 from private.capital_ai_provider_query_state where scope_key = 'replay:sql-expired');

  update private.capital_ai_provider_query_state set expires_at = clock_timestamp() - interval '1 second'
    where scope_key in ('rate:' || b, 'replay:sql-b1', 'cost:user:' || b || ':binance:account.snapshot', 'cost:global:binance:account.snapshot');
  assert public.capital_ai_claim_provider_query(b, 'sql-b1', expiry, 1, scopes_b)->>'allowed' = 'true';
  insert into private.capital_ai_provider_query_state values ('replay:old-expired', clock_timestamp() - interval '2 minutes', 1);
  assert public.capital_ai_claim_provider_query(a, 'sql-cleanup', expiry, 30, '[]')->>'allowed' = 'true';
  assert not exists (select 1 from private.capital_ai_provider_query_state where scope_key = 'replay:old-expired');
  assert (select uses = 1 from private.capital_ai_provider_query_state where scope_key = 'replay:sql-a1');

  begin
    perform public.capital_ai_claim_provider_query(a, 'sql-invalid', expiry, 30,
      '[{"key":"global:binance:account.snapshot","intervalMs":0}]');
    raise exception 'invalid scope accepted';
  exception when raise_exception then
    assert sqlerrm = 'INVALID_PROVIDER_STATE_REQUEST';
  end;
  assert not exists (select 1 from private.capital_ai_provider_query_state where scope_key = 'replay:sql-invalid');
end;
$$;
-- Exercise the RPC with its actual invoker role, not only the database owner.
set local role service_role;
select public.capital_ai_claim_provider_query('33333333-3333-4333-8333-333333333333', 'sql-role',
  floor(extract(epoch from clock_timestamp()) * 1000)::bigint + 10000, 30, '[]');
rollback;
