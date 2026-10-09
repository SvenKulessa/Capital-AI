-- After parallel workers, exactly one durable claim and one terminal publish-log.
set role service_role;
do $$
declare v_jobs integer;
        v_job public.social_media_delivery_jobs%rowtype;
begin
  select count(*) into v_jobs from public.social_media_delivery_jobs
    where user_id='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101'
      and delivery_key='campaign:content:asset:YOUTUBE';
  if v_jobs <> 1 then raise exception 'FAIL: concurrent claim produced % records', v_jobs; end if;
  if (select count(*) from public.social_media_publish_log) <> 0 then
    raise exception 'FAIL: reservation must not create published log';
  end if;
  select * into v_job from public.social_media_delivery_jobs
    where delivery_key='campaign:content:asset:YOUTUBE';
  if v_job.status <> 'CLAIMED' then raise exception 'FAIL: claim state'; end if;
  v_job := public.capital_social_note_unknown(
    'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
    v_job.id, 'video123', 'test://provider-accepted-not-published');
  if v_job.status <> 'UNKNOWN' or v_job.publish_log_id is not null then
    raise exception 'FAIL: UNKNOWN receipt created terminal log';
  end if;
  begin
    perform public.capital_social_note_unknown(
      'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
      v_job.id, 'foreignProviderId', 'test://tampered');
    raise exception 'FAIL: foreign provider receipt overwrote existing id';
  exception when others then
    if sqlerrm <> 'SOCIAL_DELIVERY_UNKNOWN_UPDATE_DENIED' then raise; end if;
  end;
  v_job := public.capital_social_complete_delivery(
    'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
    v_job.id,'PUBLISHED','video123',
    'https://www.youtube.com/watch?v=video123',
    'test://verified-provider-readback');
  if v_job.status <> 'PUBLISHED' or v_job.publish_log_id is null then
    raise exception 'FAIL: terminal log not linked';
  end if;
  if (select count(*) from public.social_media_publish_log
      where id=v_job.publish_log_id and status='published') <> 1 then
    raise exception 'FAIL: log state mismatch';
  end if;
  begin
    perform public.capital_social_complete_delivery(
      'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
      v_job.id,'PUBLISHED','video123',
      'https://www.youtube.com/watch?v=video123','test://duplicate');
    raise exception 'FAIL: duplicate log accepted';
  exception when others then
    if sqlerrm <> 'SOCIAL_DELIVERY_NOT_FINISHABLE' then raise; end if;
  end;
end $$;
reset role;

-- Test the RLS policy itself with a temporary test-only GRANT.
set role authenticated;
do $$
begin
  if (select count(*) from public.social_media_delivery_jobs) <> 0 then
    raise exception 'FAIL: authenticated sees delivery despite RLS';
  end if;
end $$;
reset role;
