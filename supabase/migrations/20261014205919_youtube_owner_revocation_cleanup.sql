-- Owner-initiated YouTube revocation. No browser table/secret access is granted.
-- The marker prevents late callbacks and writes from resurrecting deleted data.
begin;
create table public.youtube_privacy_revocations (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.youtube_privacy_revocations enable row level security;
revoke all on public.youtube_privacy_revocations from public,anon,authenticated;
grant select on public.youtube_privacy_revocations to service_role;

create function public.capital_youtube_privacy_write_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_table_name in ('social_media_accounts','social_media_oauth_states','social_media_publish_log','social_media_delivery_jobs') then
  if new.platform <> 'youtube' then return new; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 20261014));
 if exists (select 1 from public.youtube_privacy_revocations where user_id=new.user_id) then
  -- Only the begin RPC may disable the existing account; no new grant can be stored.
  if tg_table_name='social_media_accounts' and tg_op='UPDATE' then
   if new.status='disconnected'
   and new.access_token_encrypted is not distinct from old.access_token_encrypted
   and new.refresh_token_encrypted is not distinct from old.refresh_token_encrypted then return new; end if;
  end if;
  raise exception 'YOUTUBE_PRIVACY_RECONNECT_REQUIRED';
 end if;
 return new;
end $$;
create trigger youtube_privacy_accounts before insert or update on public.social_media_accounts for each row execute function public.capital_youtube_privacy_write_guard();
create trigger youtube_privacy_states before insert or update on public.social_media_oauth_states for each row execute function public.capital_youtube_privacy_write_guard();
create trigger youtube_privacy_jobs before insert or update on public.youtube_private_upload_jobs for each row execute function public.capital_youtube_privacy_write_guard();
create trigger youtube_privacy_archive before insert or update on public.youtube_private_upload_archive for each row execute function public.capital_youtube_privacy_write_guard();
create trigger youtube_privacy_delivery before insert or update on public.social_media_delivery_jobs for each row execute function public.capital_youtube_privacy_write_guard();
create trigger youtube_privacy_publish before insert or update on public.social_media_publish_log for each row execute function public.capital_youtube_privacy_write_guard();

create function public.capital_youtube_privacy_begin(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.social_media_accounts%rowtype;
begin
 if p_user_id is null then raise exception 'YOUTUBE_OWNER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,20261014));
 insert into public.youtube_privacy_revocations(user_id) values(p_user_id) on conflict do nothing;
 select * into a from public.social_media_accounts where user_id=p_user_id and platform='youtube' for update;
 if found then
  update public.social_media_accounts set status='disconnected' where id=a.id;
 end if;
 delete from public.social_media_oauth_states where user_id=p_user_id and platform='youtube';
 return jsonb_build_object('userId',p_user_id,'refreshCipher',a.refresh_token_encrypted,'accessCipher',a.access_token_encrypted);
end $$;

create function public.capital_youtube_privacy_finish(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if p_user_id is null then raise exception 'YOUTUBE_OWNER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,20261014));
 if not exists(select 1 from public.youtube_privacy_revocations where user_id=p_user_id) then raise exception 'YOUTUBE_PRIVACY_BEGIN_REQUIRED'; end if;
 delete from public.youtube_private_upload_archive where user_id=p_user_id;
 delete from public.youtube_private_upload_jobs where user_id=p_user_id;
 delete from public.social_media_delivery_jobs where user_id=p_user_id and platform='youtube';
 delete from public.social_media_publish_log where user_id=p_user_id and platform='youtube';
 delete from public.social_media_oauth_states where user_id=p_user_id and platform='youtube';
 delete from public.social_media_accounts where user_id=p_user_id and platform='youtube';
 update public.youtube_privacy_revocations set completed_at=coalesce(completed_at,now()) where user_id=p_user_id;
 return jsonb_build_object('deleted',true,'userId',p_user_id);
end $$;

create function public.capital_youtube_privacy_reconnect(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if p_user_id is null then raise exception 'YOUTUBE_OWNER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,20261014));
 if exists(select 1 from public.youtube_privacy_revocations where user_id=p_user_id and completed_at is null) then raise exception 'YOUTUBE_PRIVACY_CLEANUP_PENDING'; end if;
 delete from public.youtube_privacy_revocations where user_id=p_user_id;
 return jsonb_build_object('ready',true);
end $$;
revoke all on function public.capital_youtube_privacy_write_guard() from public,anon,authenticated;
revoke all on function public.capital_youtube_privacy_begin(uuid) from public,anon,authenticated;
revoke all on function public.capital_youtube_privacy_finish(uuid) from public,anon,authenticated;
revoke all on function public.capital_youtube_privacy_reconnect(uuid) from public,anon,authenticated;
grant execute on function public.capital_youtube_privacy_begin(uuid),public.capital_youtube_privacy_finish(uuid),public.capital_youtube_privacy_reconnect(uuid) to service_role;
comment on table public.youtube_privacy_revocations is 'Minimal account-scoped deletion marker without provider metadata or credentials. Pending markers block reconnect until Google revocation and database cleanup succeed. Completed markers block late callbacks until explicitly requested reconnect; account deletion cascades.';
commit;
