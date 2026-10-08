-- Disposable Supabase-like fixture data and grants; no production secrets.
grant select, insert, update, delete on
  public.social_media_accounts, public.social_media_oauth_states,
  public.social_media_publish_log, public.social_media_content_approvals
  to service_role;

insert into auth.users(id) values
  ('d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101'),
  ('a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101');

insert into public.social_media_accounts (
  id,user_id,platform,status,scopes,access_token_encrypted,token_expires_at,
  external_account_id
) values (
  'f683ecba-1fab-45f7-8c6a-a35418750771',
  'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'youtube','connected',array['youtube.upload'],'TEST_CIPHERTEXT_NOT_REAL',
  now()+ interval '1 hour','UCOWNER_TEST'
);

insert into public.social_media_content_approvals(
  id,user_id,title,platforms,status,decided_at,decided_by,
  campaign_id,content_id,source_sha,asset_id,asset_sha256,public_publish_allowed
) values (
  'approval-1','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'Mock-owned video',array['youtube'],'approved',now(),'owner',
  'campaign','content',repeat('b',40),'asset',repeat('a',64),true
), (
  'legacy-no-hash','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'Legacy untrusted',array['youtube'],'approved',now(),'owner',
  null,null,null,null,null,false
);

insert into public.social_media_oauth_states(
  state_token,user_id,platform,redirect_uri,code_verifier,expires_at
) values (
  repeat('c',64),'d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'x','https://capital-ai.online/api/social-media/auth/callback',
  repeat('v',43),now()+ interval '10 minutes'
);
