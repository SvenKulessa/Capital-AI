-- Explicit privilege, tenant, ordered-hash and rights negative tests (disposable PG).
do $test$
begin
  if (select relrowsecurity from pg_class where oid='public.social_media_carousel_groups'::regclass) is not true
  or has_table_privilege('anon','public.social_media_carousel_groups','SELECT')
  or has_table_privilege('authenticated','public.social_media_carousel_groups','INSERT')
  or has_function_privilege('anon','public.capital_social_claim_carousel_group(uuid,uuid,text,text,text,text[],text[],text[],text,text)','EXECUTE')
  or has_function_privilege('authenticated','public.capital_social_begin_carousel_attempt(uuid,uuid,uuid,text)','EXECUTE')
  or has_function_privilege('anon','public.capital_social_note_carousel_unknown(uuid,uuid,uuid,text,text,text,text)','EXECUTE')
  then raise exception 'FAIL: carousel ACL/RLS exposure'; end if;
  if (select count(*) from public.social_media_carousel_groups) <> 0 then
    raise exception 'FAIL: group table must start empty'; end if;
end $test$;

set role service_role;
do $test$
declare ids text[] := array['etf-1','etf-2','etf-3'];
        hashes text[] := array[repeat('1',64),repeat('2',64),repeat('3',64)];
        approvals text[] := array['carousel-a1','carousel-a2','carousel-a3'];
        key text := 'ig-camp:ig-content:INSTAGRAM:CAROUSEL:'||repeat('f',64);
        owner uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        other_user uuid := 'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        account uuid := 'e683ecba-1fab-45f7-8c6a-a35418750771';
begin
  begin
    perform public.capital_social_claim_carousel_group(other_user,account,
      'ig-camp','ig-content',repeat('b',40),ids,hashes,approvals,repeat('f',64),key);
    raise exception 'FAIL: cross-user claim accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_ACCOUNT_NOT_READY' then raise; end if;
  end;
  begin
    perform public.capital_social_claim_carousel_group(owner,account,
      'ig-camp','ig-content',repeat('b',40),ids,
      array[repeat('1',64),repeat('a',64),repeat('3',64)],
      approvals,repeat('f',64),key);
    raise exception 'FAIL: mutated hash accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_HASH_APPROVAL_NOT_READY' then raise; end if;
  end;
  begin
    perform public.capital_social_claim_carousel_group(owner,account,
      'ig-camp','ig-content',repeat('b',40),
      array['etf-2','etf-1','etf-3'],hashes,approvals,repeat('f',64),key);
    raise exception 'FAIL: reordered assets accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_HASH_APPROVAL_NOT_READY' then raise; end if;
  end;
  begin
    perform public.capital_social_claim_carousel_group(owner,account,
      'ig-camp','ig-content',repeat('b',40),ids,hashes,approvals,
      repeat('f',64),'attacker-chosen-key');
    raise exception 'FAIL: mutable delivery key accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_GROUP_IDENTITY_INVALID' then raise; end if;
  end;
  begin
    perform public.capital_social_claim_carousel_group(owner,account,
      'ig-camp','ig-content',repeat('b',40),ids,hashes,
      array['carousel-a1','legacy-no-hash','carousel-a3'],repeat('f',64),key);
    raise exception 'FAIL: missing rights/legacy approval accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_HASH_APPROVAL_NOT_READY' then raise; end if;
  end;
end $test$;
reset role;
