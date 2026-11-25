-- Isolated PG17 contract ONLY. Not a Supabase production migration.
-- The service role is a trusted backend boundary; never expose these functions to browser callers.
begin;
create schema capital_growth_private;
revoke all on schema capital_growth_private from public,anon,authenticated,service_role;
grant usage on schema capital_growth_private to service_role;
create table capital_growth_private.x_consent (
  nonce_sha256 text primary key check (nonce_sha256 ~ '^[a-f0-9]{64}$'),
  campaign_id text not null default 'capital-ai-growth-20261120' check (campaign_id='capital-ai-growth-20261120'),
  content_id text not null default 'CAP-GROW-005' check (content_id='CAP-GROW-005'),
  granted_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_id uuid unique references auth.users(id) on delete cascade,
  registered_at timestamptz,
  confirmed_at timestamptz,
  check (expires_at>granted_at and expires_at<=granted_at+interval '30 days'),
  check (revoked_at is null or revoked_at>=granted_at),
  check ((user_id is null and registered_at is null and confirmed_at is null)
    or (user_id is not null and registered_at is not null and confirmed_at is not null and confirmed_at>=registered_at))
);
alter table capital_growth_private.x_consent enable row level security;
revoke all on capital_growth_private.x_consent from public,anon,authenticated,service_role;
-- Explicit service-only RPC, fixed search path and fixed campaign/purpose.
-- Grant is issued by server after a separate affirmative conversion-purpose choice.
-- The nonce must be generated on the server and conveyed via protected session state.
create function capital_growth_private.grant_x_consent(p_nonce text)
returns boolean language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
  if p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' then raise exception 'X_CONSENT_INVALID'; end if;
  insert into capital_growth_private.x_consent(nonce_sha256,granted_at,expires_at)
    values(p_nonce,t,t+interval '30 days') on conflict do nothing;
  return found;
end $$;
-- One-time binding. Use actual auth.users timestamps, never browser-supplied dates.
-- Caller must separately verify session ownership and protected nonce before calling.
create function capital_growth_private.bind_x_signup(p_nonce text,p_user uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare c capital_growth_private.x_consent%rowtype; t timestamptz:=clock_timestamp();
  created timestamptz; confirmed timestamptz;
begin
  select * into c from capital_growth_private.x_consent where nonce_sha256=p_nonce for update;
  if not found or c.revoked_at is not null or c.expires_at<=t or c.user_id is not null
    or t>c.granted_at+interval '24 hours' then return false; end if;
  select created_at,email_confirmed_at into created,confirmed from auth.users where id=p_user;
  if not found or created is null or confirmed is null or created<c.granted_at or confirmed<created or confirmed>t then return false; end if;
  if exists(select 1 from capital_growth_private.x_consent where user_id=p_user) then return false; end if;
  begin
    update capital_growth_private.x_consent set user_id=p_user,registered_at=created,confirmed_at=confirmed where nonce_sha256=p_nonce;
  exception when unique_violation then return false;
  end;
  return true;
end $$;
-- Server verifies bound session user or pre-auth protected nonce. No re-grant on same receipt.
create function capital_growth_private.revoke_x_consent(p_nonce text,p_user uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update capital_growth_private.x_consent set revoked_at=clock_timestamp()
    where nonce_sha256=p_nonce and user_id is not distinct from p_user and revoked_at is null;
  return found;
end $$;
-- Bound users must be able to withdraw even if the original browser nonce
-- is lost. The trusted backend supplies only the verified session user ID.
create function capital_growth_private.revoke_x_consent_for_user(p_user uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_user is null then return false; end if;
  update capital_growth_private.x_consent set revoked_at=clock_timestamp()
    where user_id=p_user and revoked_at is null;
  return found;
end $$;
-- Counts only the currently valid confirmed consent cohort, never a provider click or causal attribution.
create function capital_growth_private.x_signup_count(p_start timestamptz,p_end timestamptz)
returns bigint language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
  if p_start is null or p_end is null or p_start>=p_end or p_end>t or p_end-p_start>interval '30 days'
    then raise exception 'X_CONSENT_WINDOW_INVALID'; end if;
  return (select count(*) from capital_growth_private.x_consent
    where revoked_at is null and expires_at>t and user_id is not null
      and registered_at>=p_start and confirmed_at<p_end);
end $$;
-- Only normalized initial paid invoice evidence from the existing verified
-- Stripe receipt adapter may be admitted by the trusted server.
create table capital_growth_private.x_initial_payment (
  user_id uuid primary key references capital_growth_private.x_consent(user_id) on delete cascade,
  invoice_key text not null unique check (invoice_key ~ '^[a-f0-9]{64}$'),
  subscription_key text not null unique check (subscription_key ~ '^[a-f0-9]{64}$'),
  paid_at timestamptz not null,
  observed_at timestamptz not null,
  amount_cents bigint not null check (amount_cents between 1 and 100000000),
  reversed boolean not null default false
);
alter table capital_growth_private.x_initial_payment enable row level security;
revoke all on capital_growth_private.x_initial_payment from public,anon,authenticated,service_role;
-- Serialize on consent; neither revoke nor payment ingestion can race past the consent boundary.
create function capital_growth_private.record_x_initial_payment(p_user uuid,p_invoice text,p_subscription text,
 p_paid timestamptz,p_observed timestamptz,p_cents bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare c capital_growth_private.x_consent%rowtype; t timestamptz:=clock_timestamp();
begin
  select * into c from capital_growth_private.x_consent where user_id=p_user for update;
  if not found or c.revoked_at is not null or c.expires_at<=t or p_paid is null or p_observed is null
    or p_paid<c.confirmed_at or p_paid>=c.expires_at or p_observed<p_paid
    or p_observed>t or t-p_observed>interval '1 hour' then return false; end if;
  insert into capital_growth_private.x_initial_payment(user_id,invoice_key,subscription_key,paid_at,observed_at,amount_cents)
    values(p_user,p_invoice,p_subscription,p_paid,p_observed,p_cents) on conflict do nothing;
  return found;
end $$;
-- Reversal is terminal. No re-count or automatic resurrection.
create function capital_growth_private.reverse_x_initial_payment(p_user uuid,p_invoice text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update capital_growth_private.x_initial_payment set reversed=true
   where user_id=p_user and invoice_key=p_invoice and not reversed;
  return found;
end $$;
-- This is recorded evidence, NOT complete cohort coverage or a current Stripe
-- verification. Aged receipts remain unknown until reconciliation.
create function capital_growth_private.x_conversion_candidates(p_start timestamptz,p_end timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp(); n bigint; a bigint;
begin
  if p_start is null or p_end is null or p_start>=p_end or p_end>t or p_end-p_start>interval '30 days'
    then raise exception 'X_CONSENT_WINDOW_INVALID'; end if;
  select count(*),sum(p.amount_cents) into n,a
  from capital_growth_private.x_consent c join capital_growth_private.x_initial_payment p using(user_id)
  where c.revoked_at is null and c.expires_at>t and c.registered_at>=p_start
    and c.confirmed_at<p_end and p.paid_at<p_end and not p.reversed and p.observed_at>=t-interval '24 hours';
  return jsonb_build_object('status','RECORDED_CANDIDATES_ONLY',
   'candidateRegistrations',nullif(capital_growth_private.x_signup_count(p_start,p_end),0),
   'candidatePaidSubscriptions',nullif(n,0),'candidateInitialInvoiceCents',a,
   'registrations',null,'paidSubscriptions',null,'revenueCents',null);
end $$;
revoke all on all functions in schema capital_growth_private from public,anon,authenticated,service_role;
grant execute on function capital_growth_private.grant_x_consent(text),
 capital_growth_private.bind_x_signup(text,uuid),capital_growth_private.revoke_x_consent(text,uuid),
 capital_growth_private.revoke_x_consent_for_user(uuid),
 capital_growth_private.x_signup_count(timestamptz,timestamptz),
 capital_growth_private.record_x_initial_payment(uuid,text,text,timestamptz,timestamptz,bigint),
 capital_growth_private.reverse_x_initial_payment(uuid,text),
 capital_growth_private.x_conversion_candidates(timestamptz,timestamptz) to service_role;
commit;

-- Independent product-purpose consent ledger in the SAME disposable CI schema.
-- No public execution privileges, no production migration or automatic grant.
begin;
create table capital_growth_private.smartcopy_consent (
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign_id text not null check(campaign_id ~ '^smartcopy-[a-f0-9]{24}$'),
 release_sha256 text not null check(release_sha256 ~ '^[a-f0-9]{64}$'),
 receipt_sha256 text not null unique check(receipt_sha256 ~ '^[a-f0-9]{64}$'),
 granted_at timestamptz not null,expires_at timestamptz not null,revoked_at timestamptz,
 primary key(user_id,campaign_id,release_sha256),
 check(expires_at>granted_at and expires_at<=granted_at+interval '30 days'),
 check(revoked_at is null or revoked_at>=granted_at)
);
alter table capital_growth_private.smartcopy_consent enable row level security;
revoke all on capital_growth_private.smartcopy_consent from public,anon,authenticated,service_role;
-- Trusted server supplies a separately captured affirmative choice and receipt digest.
create function capital_growth_private.grant_smartcopy_consent(p_user uuid,p_campaign text,p_release text,p_receipt text)
returns boolean language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
 if p_user is null or p_campaign is null or p_release is null or p_receipt is null or
 p_campaign !~ '^smartcopy-[a-f0-9]{24}$' or p_release !~ '^[a-f0-9]{64}$' or p_receipt !~ '^[a-f0-9]{64}$' then return false; end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and email_confirmed_at<=t) then return false; end if;
 insert into capital_growth_private.smartcopy_consent(user_id,campaign_id,release_sha256,receipt_sha256,granted_at,expires_at)
 values(p_user,p_campaign,p_release,p_receipt,t,t+interval '30 days') on conflict do nothing;
 return found;
end $$;
create function capital_growth_private.withdraw_smartcopy_consent(p_user uuid,p_campaign text,p_release text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update capital_growth_private.smartcopy_consent set revoked_at=clock_timestamp()
 where user_id=p_user and campaign_id=p_campaign and release_sha256=p_release and revoked_at is null;
 return found;
end $$;
-- Data API read only. ISO UTC milliseconds match the server receipt contract.
create function public.capital_smartcopy_read_consent(p_user uuid,p_campaign text,p_release text)
returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('userId',user_id,'productId','ai-smartcopy','campaignId',campaign_id,
 'releaseSha256',release_sha256,'receiptSha256',receipt_sha256,'purpose','PRODUCT_CONVERSION','analytics',true,
 'grantedAt',to_char(granted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'expiresAt',to_char(expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'revokedAt',case when revoked_at is null then null else to_char(revoked_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end)
 from capital_growth_private.smartcopy_consent
 where user_id=p_user and campaign_id=p_campaign and release_sha256=p_release
$$;
revoke all on function capital_growth_private.grant_smartcopy_consent(uuid,text,text,text),capital_growth_private.withdraw_smartcopy_consent(uuid,text,text),public.capital_smartcopy_read_consent(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function capital_growth_private.grant_smartcopy_consent(uuid,text,text,text),capital_growth_private.withdraw_smartcopy_consent(uuid,text,text),public.capital_smartcopy_read_consent(uuid,text,text) to service_role;
commit;
