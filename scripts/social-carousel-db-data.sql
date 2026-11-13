-- Synthetic disposable PostgreSQL fixture. Never insert into production.
insert into public.social_media_accounts
 (id,user_id,platform,status,scopes,access_token_encrypted,token_expires_at,external_account_id)
values ('e683ecba-1fab-45f7-8c6a-a35418750771',
 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101','instagram','connected',
 array['pages_show_list','instagram_basic','instagram_content_publish','pages_read_engagement'],
 'SYNTHETIC_CIPHER_NOT_SECRET',now()+interval '1 hour','17800000000000001');
insert into public.social_media_content_approvals
 (id,user_id,title,platforms,status,decided_at,decided_by,campaign_id,content_id,
  source_sha,asset_id,asset_sha256,public_publish_allowed)
values
 ('carousel-a1','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'Synthetic only 1',array['instagram'],'approved',now(),'synthetic-test',
  'ig-camp','ig-content',repeat('b',40),'etf-1',repeat('1',64),true),
 ('carousel-a2','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'Synthetic only 2',array['instagram'],'approved',now(),'synthetic-test',
  'ig-camp','ig-content',repeat('b',40),'etf-2',repeat('2',64),true),
 ('carousel-a3','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
  'Synthetic only 3',array['instagram'],'approved',now(),'synthetic-test',
  'ig-camp','ig-content',repeat('b',40),'etf-3',repeat('3',64),true);
