-- Isolated synthetic transaction, always rolled back. No Google requests or real owner rows.
begin;
do $$
declare
 u uuid := gen_random_uuid(); other_user uuid := gen_random_uuid(); a uuid := gen_random_uuid();
 j uuid := gen_random_uuid(); r jsonb;
begin
 insert into auth.users(id) values(u),(other_user);
 insert into public.social_media_accounts(id,user_id,platform,status,external_account_id,access_token_encrypted,refresh_token_encrypted)
 values(a,u,'youtube','connected','UC'||repeat('a',22),'SYNTHETIC_ACCESS','SYNTHETIC_REFRESH');
 insert into public.social_media_accounts(user_id,platform,status) values(u,'x','connected'),(other_user,'youtube','connected');
 insert into public.youtube_private_upload_jobs(id,user_id,account_id,channel_id,asset_sha256) values(j,u,a,'UC'||repeat('a',22),repeat('a',64));
 insert into public.youtube_private_upload_archive(source_job_id,user_id,account_id,channel_id,asset_sha256,provider_video_id,original_status,original_created_at,original_verified_at,original_record,archive_reason)
 values(j,u,a,'UC'||repeat('a',22),repeat('a',64),'TestVideo01','VERIFIED_PRIVATE',now(),now(),'{}','OWNER_ATTESTED_DELETED_ON_YOUTUBE');
 insert into public.social_media_oauth_states(state_token,user_id,platform,redirect_uri,expires_at) values('synthetic-'||u,u,'youtube','https://capital-ai.online/',now()+interval '1 minute');
 insert into public.social_media_content_approvals(id,user_id,title,status) values('privacy-'||u,u,'Synthetic','pending');
 insert into public.social_media_delivery_jobs(user_id,account_id,approval_ref,campaign_id,content_id,source_sha,asset_id,asset_sha256,platform,delivery_key,expires_at) values(u,a,'privacy-'||u,'fixture','fixture',repeat('a',40),'asset',repeat('a',64),'youtube','fixture:'||u,now());
 insert into public.social_media_publish_log(user_id,platform,status,publish_type) values(u,'youtube','draft','draft');
 r := public.capital_youtube_privacy_begin(u);
 if r->>'refreshCipher' <> 'SYNTHETIC_REFRESH' or r->>'userId' <> u::text then raise exception 'FAIL: wrong grant'; end if;
 if exists(select 1 from public.social_media_accounts where id=a and status='connected') then raise exception 'FAIL: still connected'; end if;
 begin
  update public.social_media_accounts set status='connected' where id=a;
  raise exception 'FAIL: late callback accepted';
 exception when others then if sqlerrm <> 'YOUTUBE_PRIVACY_RECONNECT_REQUIRED' then raise; end if; end;
 begin
  perform public.capital_youtube_privacy_reconnect(u);
  raise exception 'FAIL: pending reconnect accepted';
 exception when others then if sqlerrm <> 'YOUTUBE_PRIVACY_CLEANUP_PENDING' then raise; end if; end;
 r := public.capital_youtube_privacy_finish(u);
 if r->>'deleted' <> 'true' then raise exception 'FAIL: cleanup not confirmed'; end if;
 if exists(select 1 from public.youtube_private_upload_jobs where user_id=u)
 or exists(select 1 from public.youtube_private_upload_archive where user_id=u)
 or exists(select 1 from public.social_media_delivery_jobs where user_id=u and platform='youtube')
 or exists(select 1 from public.social_media_accounts where user_id=u and platform='youtube')
 or exists(select 1 from public.social_media_publish_log where user_id=u and platform='youtube')
 or exists(select 1 from public.social_media_oauth_states where user_id=u and platform='youtube') then raise exception 'FAIL: provider data remains'; end if;
 if not exists(select 1 from public.social_media_accounts where user_id=other_user and platform='youtube')
 or not exists(select 1 from public.social_media_accounts where user_id=u and platform='x') then raise exception 'FAIL: cross-owner/platform deletion'; end if;
 begin
  insert into public.social_media_accounts(user_id,platform,status) values(u,'youtube','connected');
  raise exception 'FAIL: deleted account resurrected';
 exception when others then if sqlerrm <> 'YOUTUBE_PRIVACY_RECONNECT_REQUIRED' then raise; end if; end;
 begin
  insert into public.social_media_oauth_states(state_token,user_id,platform,redirect_uri,expires_at) values('late-'||u,u,'youtube','https://capital-ai.online/',now());
  raise exception 'FAIL: late state accepted';
 exception when others then if sqlerrm <> 'YOUTUBE_PRIVACY_RECONNECT_REQUIRED' then raise; end if; end;
 perform public.capital_youtube_privacy_finish(u); -- idempotent retry
 perform public.capital_youtube_privacy_reconnect(u);
 insert into public.social_media_accounts(user_id,platform,status) values(u,'youtube','connecting');
 if exists(select 1 from public.youtube_privacy_revocations where user_id=u) then raise exception 'FAIL: reconnect marker'; end if;
 if has_function_privilege('anon','public.capital_youtube_privacy_begin(uuid)','execute')
 or has_function_privilege('authenticated','public.capital_youtube_privacy_finish(uuid)','execute')
 or has_table_privilege('authenticated','public.youtube_privacy_revocations','select')
 or has_table_privilege('service_role','public.youtube_private_upload_jobs','delete') then raise exception 'FAIL: broad ACL'; end if;
end $$;
rollback;
