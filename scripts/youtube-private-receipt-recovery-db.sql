-- DISPOSABLE PG17 ONLY. No real YouTube tokens, provider I/O, or production IDs.
-- Tests exact service-only archival, CAS delete, replay denial and re-claim
-- after a verified test receipt was explicitly retired by its owner.
do $$
begin
  if has_function_privilege('anon',
     'public.capital_youtube_archive_deleted_private_test(uuid,text,text,text)', 'EXECUTE')
    or has_function_privilege('authenticated',
     'public.capital_youtube_archive_deleted_private_test(uuid,text,text,text)', 'EXECUTE')
    or has_table_privilege('authenticated', 'public.youtube_private_upload_archive', 'SELECT')
    or has_table_privilege('service_role', 'public.youtube_private_upload_archive', 'DELETE')
    or has_table_privilege('service_role', 'public.youtube_private_upload_jobs', 'DELETE') then
      raise exception 'FAIL: broad YouTube recovery/archive ACL';
  end if;
  if not has_function_privilege('service_role',
     'public.capital_youtube_archive_deleted_private_test(uuid,text,text,text)', 'EXECUTE') then
      raise exception 'FAIL: service recovery execute grant missing';
  end if;
end $$;

-- The existing fixture account is made to look like the synthetic channel.
update public.social_media_accounts
  set external_account_id = 'UC' || repeat('a',22)
  where id = 'f683ecba-1fab-45f7-8c6a-a35418750771';
insert into public.social_media_accounts (
  id, user_id, platform, status, scopes, access_token_encrypted,
  token_expires_at, external_account_id
) values (
  'fa83ecba-1fab-45f7-8c6a-a35418750771',
  'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'youtube','connected',array['youtube.upload'],'SYNTHETIC_NO_TOKEN',
  now() + interval '1 hour','UC' || repeat('b',22)
);
insert into public.youtube_private_upload_jobs(
  id,user_id,account_id,channel_id,asset_sha256,status,video_id,verified_at
) values (
  '18e3cdb1-048f-4b97-a36d-b2b4713cb198',
  'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'f683ecba-1fab-45f7-8c6a-a35418750771',
  'UC' || repeat('a',22),repeat('d',64),
  'VERIFIED_PRIVATE','TestVideo01',now()
), (
  '81dbdd86-4757-4931-a2f6-2ec394e541d9',
  'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'fa83ecba-1fab-45f7-8c6a-a35418750771',
  'UC' || repeat('b',22),repeat('e',64),
  'VERIFIED_PRIVATE','OtherVid001',now()
);

set role service_role;
do $$
declare
  v_owner uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  v_wrong uuid := 'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  v_result boolean;
begin
  begin
    perform public.capital_youtube_archive_deleted_private_test(
      v_wrong, 'UC' || repeat('a',22), repeat('d',64), 'TestVideo01');
    raise exception 'FAIL: cross-owner reset accepted';
  exception when others then
    if sqlerrm <> 'YOUTUBE_PRIVATE_RECOVERY_RECEIPT_NOT_MATCHED' then raise; end if;
  end;
  begin
    perform public.capital_youtube_archive_deleted_private_test(
      v_owner, 'UC' || repeat('a',22), repeat('f',64), 'TestVideo01');
    raise exception 'FAIL: wrong-asset reset accepted';
  exception when others then
    if sqlerrm <> 'YOUTUBE_PRIVATE_RECOVERY_RECEIPT_NOT_MATCHED' then raise; end if;
  end;
  begin
    perform public.capital_youtube_archive_deleted_private_test(
      v_owner, 'UC' || repeat('a',22), repeat('d',64), 'AnotherVid1');
    raise exception 'FAIL: wrong-video reset accepted';
  exception when others then
    if sqlerrm <> 'YOUTUBE_PRIVATE_RECOVERY_RECEIPT_NOT_MATCHED' then raise; end if;
  end;

  select public.capital_youtube_archive_deleted_private_test(
    v_owner, 'UC' || repeat('a',22), repeat('d',64), 'TestVideo01') into v_result;
  if v_result is distinct from true then
    raise exception 'FAIL: archival transaction did not confirm success';
  end if;
  begin
    perform public.capital_youtube_archive_deleted_private_test(
      v_owner, 'UC' || repeat('a',22), repeat('d',64), 'TestVideo01');
    raise exception 'FAIL: deleted receipt replay accepted';
  exception when others then
    if sqlerrm <> 'YOUTUBE_PRIVATE_RECOVERY_RECEIPT_NOT_MATCHED' then raise; end if;
  end;
end $$;
reset role;

do $$
begin
  if (select count(*) from public.youtube_private_upload_archive) <> 1
     or (select count(*) from public.youtube_private_upload_jobs) <> 1 then
    raise exception 'FAIL: wrong number of archives or active jobs';
  end if;
  if not exists (
    select 1 from public.youtube_private_upload_archive
    where source_job_id = '18e3cdb1-048f-4b97-a36d-b2b4713cb198'
      and provider_video_id = 'TestVideo01'
      and original_status = 'VERIFIED_PRIVATE'
      and archive_reason = 'OWNER_ATTESTED_DELETED_ON_YOUTUBE'
      and provider_deletion_verified = false
      and original_record ->> 'video_id' = 'TestVideo01'
      and original_record ->> 'status' = 'VERIFIED_PRIVATE'
      and original_verified_at is not null
  ) then
    raise exception 'FAIL: original receipt not preserved exactly';
  end if;
  if not exists (
    select 1 from public.youtube_private_upload_jobs
    where id = '81dbdd86-4757-4931-a2f6-2ec394e541d9'
      and user_id = 'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101'
      and video_id = 'OtherVid001' and status = 'VERIFIED_PRIVATE'
  ) then
    raise exception 'FAIL: other owner's receipt changed';
  end if;
end $$;

-- The original deterministic job ID can be claimed again only after archival.
-- This is a local insert, NEVER a provider upload.
insert into public.youtube_private_upload_jobs(
  id,user_id,account_id,channel_id,asset_sha256,status
) values (
  '18e3cdb1-048f-4b97-a36d-b2b4713cb198',
  'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'f683ecba-1fab-45f7-8c6a-a35418750771',
  'UC' || repeat('a',22),repeat('d',64),'UNKNOWN'
);
do $$
begin
  if (select count(*) from public.youtube_private_upload_jobs) <> 2
    or (select count(*) from public.youtube_private_upload_archive) <> 1 then
    raise exception 'FAIL: reclaim or archive history lost';
  end if;
end $$;
