set role service_role;
do $$
declare a uuid := '11111111-1111-1111-1111-111111111111';
 b uuid := '22222222-2222-2222-2222-222222222222';
 value jsonb;
begin
 perform public.capital_ai_upsert_user_provider_secret(a,'massive',repeat('fixture-owner-one-',3),repeat('a',24),'{"marketAccessApproved":true}');
 perform public.capital_ai_upsert_user_provider_secret(b,'massive',repeat('fixture-owner-two-',3),repeat('b',24),'{"marketAccessApproved":true}');
 value := public.capital_ai_get_user_provider_secret(a,'massive');
 assert value->>'secretPayload' = repeat('fixture-owner-one-',3), 'owner A read mismatch';
 assert public.capital_ai_get_user_provider_secret(b,'massive')->>'secretPayload' = repeat('fixture-owner-two-',3), 'owner B read mismatch';
 assert not (public.capital_ai_list_user_provider_connections(a)::text like '%fixture-owner%'), 'secret in metadata';
 perform public.capital_ai_delete_user_provider_secret(b,'massive');
 assert public.capital_ai_get_user_provider_secret(b,'massive') is null, 'B deletion failed';
 assert public.capital_ai_get_user_provider_secret(a,'massive') is not null, 'B delete affected A';
 perform public.capital_ai_mark_user_provider_status(a,'massive','VERIFIED');
 perform public.capital_ai_upsert_user_provider_secret(a,'massive',repeat('fixture-owner-rotated-',3),repeat('c',24),'{}');
 value := public.capital_ai_get_user_provider_secret(a,'massive');
 assert value->>'status'='PENDING' and value->>'credentialFingerprint'=repeat('c',24), 'rotation did not reset verification';
 assert value->>'secretPayload'=repeat('fixture-owner-rotated-',3), 'Vault update failed';
 perform public.capital_ai_upsert_user_provider_secret(a,'kraken',repeat('fixture-kraken-',3),repeat('d',24),'{}');
 perform public.capital_ai_upsert_user_provider_secret(a,'binance',repeat('fixture-binance-',3),repeat('e',24),'{}');
 begin
  perform public.capital_ai_upsert_user_provider_secret(a,'unknown',repeat('fixture-unknown-',3),repeat('f',24),'{}');
  raise exception 'unsupported provider accepted';
 exception when others then if sqlerrm <> 'UNSUPPORTED_PROVIDER' then raise; end if;
 end;
end $$;
reset role;
do $$
declare role_name text; fn record;
begin
 for role_name in select unnest(array['anon','authenticated']) loop
  assert not has_table_privilege(role_name,'private.user_provider_connections','select'), 'metadata table exposed';
  assert not has_table_privilege(role_name,'vault.secrets','select'), 'Vault exposed';
  for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'capital_ai_%user_provider%' loop
   assert not has_function_privilege(role_name,fn.oid,'execute'), 'private RPC exposed';
  end loop;
 end loop;
end $$;
select 'PASS: Massive migration, Kraken/Binance compatibility, owner isolation, rotation, deletion, service-only RPC; Vault crypto is fixture only';
