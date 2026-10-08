-- Isolated relational contract tests before concurrent delivery claims.
do $$
begin
  if has_function_privilege('authenticated',
    'public.capital_social_claim_delivery(uuid,uuid,text,text,text,text,text,text,text,text)', 'EXECUTE')
  or has_function_privilege('anon',
    'public.capital_social_consume_oauth_state(text,uuid,text,text)', 'EXECUTE') then
    raise exception 'FAIL: public social RPC execute privilege';
  end if;
  if not has_table_privilege('service_role',
       'public.social_media_content_approvals', 'SELECT')
     or has_table_privilege('anon',
       'public.social_media_content_approvals', 'SELECT')
     or has_table_privilege('authenticated',
       'public.social_media_content_approvals', 'SELECT') then
    raise exception 'FAIL: minimum production approval read grant';
  end if;
  if (select count(*) from public.social_media_delivery_jobs) <> 0 then
    raise exception 'FAIL: jobs should be empty before parallel claim';
  end if;
  if (select count(*) from public.social_media_content_approvals
      where id = 'legacy-no-hash' and public_publish_allowed = false
       and asset_sha256 is null) <> 1 then
    raise exception 'FAIL: old approvals are not fail-closed';
  end if;
end $$;

-- RLS second boundary (even if SELECT was incorrectly granted).
grant select on public.social_media_delivery_jobs to authenticated;
set role authenticated;
do $$
begin
  if (select count(*) from public.social_media_delivery_jobs) <> 0 then
    raise exception 'FAIL: authenticated role sees service-only deliveries';
  end if;
end $$;
reset role;

set role service_role;
do $$
declare v_state public.social_media_oauth_states%rowtype;
begin
  select * into v_state from public.capital_social_consume_oauth_state(
    repeat('c',64),'d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
    'x','https://capital-ai.online/api/social-media/auth/callback');
  if v_state.used_at is null or v_state.code_verifier <> repeat('v',43) then
    raise exception 'FAIL: OAuth first consume did not return PKCE data';
  end if;
  begin
    perform public.capital_social_consume_oauth_state(
      repeat('c',64),'d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
      'x','https://capital-ai.online/api/social-media/auth/callback');
    raise exception 'FAIL: OAuth replay accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_OAUTH_STATE_REUSED_OR_EXPIRED' then raise; end if;
  end;
end $$;

do $$
begin
  begin
    perform public.capital_social_claim_delivery(
      'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
      'f683ecba-1fab-45f7-8c6a-a35418750771',
      'approval-1','campaign','content',repeat('b',40),
      'asset',repeat('a',64),'youtube','campaign:content:asset:YOUTUBE');
    raise exception 'FAIL: wrong-owner account accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_ACCOUNT_NOT_READY' then raise; end if;
  end;
  begin
    perform public.capital_social_claim_delivery(
      'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
      'f683ecba-1fab-45f7-8c6a-a35418750771',
      'legacy-no-hash','campaign','content',repeat('b',40),
      'asset',repeat('a',64),'youtube','campaign:content:asset:YOUTUBE');
    raise exception 'FAIL: old approval promoted';
  exception when others then
    if sqlerrm <> 'SOCIAL_HASH_APPROVAL_NOT_READY' then raise; end if;
  end;
end $$;
reset role;
