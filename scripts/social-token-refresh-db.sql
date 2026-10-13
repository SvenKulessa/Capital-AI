-- Disposable PG17 only. No real credentials, providers or HTTP calls.
do $$
begin
 if has_function_privilege('anon','public.capital_social_claim_token_refresh(uuid,text,uuid)','EXECUTE')
  or has_function_privilege('authenticated','public.capital_social_claim_token_refresh(uuid,text,uuid)','EXECUTE')
  or has_function_privilege('authenticated','public.capital_social_finish_token_refresh(uuid,text,uuid,text,text,text,timestamptz)','EXECUTE')
  or has_function_privilege('anon','public.capital_social_end_token_refresh(uuid,text,uuid,text)','EXECUTE') then
    raise exception 'FAIL: browser role has refresh RPC access';
 end if;
end $$;

-- Separate owner/X fixture doesn't alter existing social delivery claims.
insert into public.social_media_accounts (
  id,user_id,platform,status,scopes,
  access_token_encrypted,refresh_token_encrypted,token_expires_at,
  external_account_id,handle
) values (
  'f8efecba-1fab-45f7-8c6a-a35418750771',
  'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'x','connected',array['tweet.read','tweet.write','users.read','offline.access'],
  'v1.synthetic-access','v1.synthetic-refresh',now()+ interval '4 minutes',
  '12345678','capitalai'
);

set role service_role;
do $$
declare v_row public.social_media_accounts%rowtype;
        v_uid uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        v_lease uuid := 'ff718548-44e9-44ee-8fbd-6595eecfb944';
begin
  begin
    perform public.capital_social_claim_token_refresh(
      'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101','x',v_lease);
    raise exception 'FAIL: cross-owner lease accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_REFRESH_NOT_DUE_OR_LOCKED' then raise; end if;
  end;
  select * into v_row from public.capital_social_claim_token_refresh(v_uid,'x',v_lease);
  if v_row.refresh_lease_id <> v_lease
    or v_row.refresh_token_encrypted <> 'v1.synthetic-refresh' then
    raise exception 'FAIL: owner lease not atomic';
  end if;
  begin
    perform public.capital_social_claim_token_refresh(
      v_uid,'x','ee718548-44e9-44ee-8fbd-6595eecfb944');
    raise exception 'FAIL: second live lease accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_REFRESH_NOT_DUE_OR_LOCKED' then raise; end if;
  end;
  begin
    perform public.capital_social_finish_token_refresh(
      v_uid,'x',v_lease,'v1.INVALID-PRIOR','v1.next-access',
      'v1.next-refresh',now()+ interval '2 hours');
    raise exception 'FAIL: old ciphertext CAS bypass';
  exception when others then
    if sqlerrm <> 'SOCIAL_REFRESH_CAS_LOST' then raise; end if;
  end;
  select * into v_row from public.capital_social_finish_token_refresh(
    v_uid,'x',v_lease,'v1.synthetic-refresh',
    'v1.next-access','v1.next-refresh',now()+ interval '2 hours');
  if v_row.refresh_token_encrypted <> 'v1.next-refresh'
    or v_row.access_token_encrypted <> 'v1.next-access'
    or v_row.refresh_lease_id is not null
    or v_row.token_expires_at < now() + interval '110 minutes' then
    raise exception 'FAIL: atomic refresh pair rotation';
  end if;
  begin
    perform public.capital_social_finish_token_refresh(
      v_uid,'x',v_lease,'v1.synthetic-refresh',
      'v1.replay-access','v1.replay-refresh',now()+ interval '2 hours');
    raise exception 'FAIL: old lease replay accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_REFRESH_CAS_LOST' then raise; end if;
  end;
end $$;
reset role;

-- Advance only disposable fixture clock fields to test rate limit and reconnect.
update public.social_media_accounts
set token_expires_at=now()+ interval '4 minutes'
where id='f8efecba-1fab-45f7-8c6a-a35418750771';

set role service_role;
do $$
declare v_uid uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        v_lease uuid := 'dd718548-44e9-44ee-8fbd-6595eecfb944';
        v_row public.social_media_accounts%rowtype;
begin
  perform public.capital_social_claim_token_refresh(v_uid,'x',v_lease);
  select * into v_row from public.capital_social_end_token_refresh(
    v_uid,'x',v_lease,'rate_limited');
  if v_row.refresh_retry_after < now() + interval '14 minutes'
    or v_row.refresh_reconnect_required
    or v_row.refresh_lease_id is not null then
    raise exception 'FAIL: retry cooldown not applied';
  end if;
  begin
    perform public.capital_social_claim_token_refresh(
      v_uid,'x','ce718548-44e9-44ee-8fbd-6595eecfb944');
    raise exception 'FAIL: throttled retry accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_REFRESH_NOT_DUE_OR_LOCKED' then raise; end if;
  end;
end $$;
reset role;
update public.social_media_accounts
  set refresh_retry_after=null where id='f8efecba-1fab-45f7-8c6a-a35418750771';

set role service_role;
do $$
declare v_uid uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        v_lease uuid := 'bd718548-44e9-44ee-8fbd-6595eecfb944';
        v_row public.social_media_accounts%rowtype;
begin
  perform public.capital_social_claim_token_refresh(v_uid,'x',v_lease);
  select * into v_row from public.capital_social_end_token_refresh(
    v_uid,'x',v_lease,'reconnect');
  if v_row.status <> 'token_expired' or not v_row.refresh_reconnect_required
    or v_row.refresh_lease_id is not null then
    raise exception 'FAIL: reconnect status not durable';
  end if;
  begin
    perform public.capital_social_claim_token_refresh(
      v_uid,'x','ac718548-44e9-44ee-8fbd-6595eecfb944');
    raise exception 'FAIL: reconnect-required claim accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_REFRESH_NOT_DUE_OR_LOCKED' then raise; end if;
  end;
end $$;
reset role;
