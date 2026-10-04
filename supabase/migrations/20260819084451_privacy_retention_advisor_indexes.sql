-- ADR-0092 follow-up: post-migration Supabase advisor hardening.
-- Keep this separate from 20260819103000 because that migration has already been applied
-- to production and must remain immutable for migration-history integrity.

begin;

create index if not exists idx_social_media_oauth_states_user_id
  on public.social_media_oauth_states (user_id);

create index if not exists idx_social_media_publish_log_account_id
  on public.social_media_publish_log (account_id);

commit;