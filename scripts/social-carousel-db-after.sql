-- Validates the one-winner claim, tenant CAS, replay, UNKNOWN and expiration.
set role service_role;
do $test$
declare r public.social_media_carousel_groups%rowtype;
        owner uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        other_user uuid := 'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
        account uuid := 'e683ecba-1fab-45f7-8c6a-a35418750771';
        key text := 'ig-camp:ig-content:INSTAGRAM:CAROUSEL:'||repeat('f',64);
        expired_key text := 'ig-camp:ig-content:INSTAGRAM:CAROUSEL:'||repeat('e',64);
begin
  if (select count(*) from public.social_media_carousel_groups) <> 1 then
    raise exception 'FAIL: exactly one parallel group claim required'; end if;
  select * into r from public.social_media_carousel_groups where delivery_key=key;
  if r.status <> 'CLAIMED' or r.asset_sha256s <> array[repeat('1',64),repeat('2',64),repeat('3',64)]
    or r.approval_refs <> array['carousel-a1','carousel-a2','carousel-a3']
    or r.user_id <> owner or r.account_id <> account then
      raise exception 'FAIL: ordered group readback mismatch'; end if;
  begin
    perform public.capital_social_begin_carousel_attempt(other_user,account,r.id,key);
    raise exception 'FAIL: foreign tenant CAS accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_GROUP_CAS_DENIED' then raise; end if;
  end;
  begin
    perform public.capital_social_begin_carousel_attempt(owner,account,r.id,'wrong-key');
    raise exception 'FAIL: altered key CAS accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_GROUP_CAS_DENIED' then raise; end if;
  end;
  r := public.capital_social_begin_carousel_attempt(owner,account,r.id,key);
  if r.status <> 'SUBMITTING' then raise exception 'FAIL: CAS not transitioned'; end if;
  begin
    perform public.capital_social_begin_carousel_attempt(owner,account,r.id,key);
    raise exception 'FAIL: replay CAS accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_GROUP_CAS_DENIED' then raise; end if;
  end;
  r := public.capital_social_note_carousel_unknown(owner,account,r.id,key,
    'CHILD_NOT_READY','12345','synthetic://unknown');
  if r.status <> 'UNKNOWN' or r.provider_delivery_id <> '12345' then
    raise exception 'FAIL: UNKNOWN not persisted'; end if;
  begin
    perform public.capital_social_note_carousel_unknown(owner,account,r.id,key,
      'CHILD_NOT_READY','99999','synthetic://tampered');
    raise exception 'FAIL: foreign provider receipt accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_UNKNOWN_CAS_DENIED' then raise; end if;
  end;
  if (select count(*) from public.social_media_publish_log) <> 1 then
    -- Existing single-asset smoke has already produced one synthetic video publish.
    raise exception 'FAIL: carousel created unexpected terminal publish log'; end if;

  -- A distinct fingerprint creates a separate group; expiration never re-enables it.
  r := public.capital_social_claim_carousel_group(owner,account,
    'ig-camp','ig-content',repeat('b',40),
    array['etf-1','etf-2','etf-3'],
    array[repeat('1',64),repeat('2',64),repeat('3',64)],
    array['carousel-a1','carousel-a2','carousel-a3'],repeat('e',64),expired_key);
  update public.social_media_carousel_groups set expires_at=now()-interval '1 minute' where id=r.id;
  begin
    perform public.capital_social_begin_carousel_attempt(owner,account,r.id,expired_key);
    raise exception 'FAIL: expired claim replay accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_CAROUSEL_GROUP_CAS_DENIED' then raise; end if;
  end;
end $test$;
reset role;
