-- CAPITAL AI Blueprint Commerce: transaction confirmation delivery evidence.
-- No customer emails/credentials or proprietary documents are added by this migration.
-- The SMTP receipt itself includes the immutable license snapshot attached to the message.
alter table private.blueprint_purchase_entitlements
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_claim_id text,
  add column if not exists confirmation_claim_until timestamptz;
-- A claim is at most two minutes old. A second webhook can retry if a worker fails.
comment on column private.blueprint_purchase_entitlements.confirmation_sent_at is
  'SMTP server accepted the customer contract confirmation; NOT evidence of inbox delivery.';
comment on column private.blueprint_purchase_entitlements.confirmation_claim_id is
  'Ephemeral random nonce for atomic receipt send lease; not a credential.';

create or replace function public.capital_ai_blueprint_commerce(
  _action text,
  _user_id uuid default null,
  _sku text default null,
  _version text default '1.0.0',
  _session_id text default null,
  _price_id text default null,
  _payment_intent_id text default null,
  _customer_id text default null,
  _licensee_name text default null,
  _license_version text default '1.0.0',
  _reason text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  a private.blueprint_release_artifacts%rowtype;
  p private.blueprint_purchase_entitlements%rowtype;
  affected integer := 0;
begin
  if _action = 'readiness' then
    if _sku not in ('CAP-BP-001','CAP-BP-002') then raise exception 'invalid_sku'; end if;
    select * into a from private.blueprint_release_artifacts
      where sku=_sku and version='1.0.0' and released=true;
    return pg_catalog.jsonb_build_object('ready',found, 'sha256',case when found then a.sha256_hex else null end);
  elsif _action = 'access' then
    if _user_id is null then raise exception 'missing_user'; end if;
    return coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'sku',sku,'version',version,'purchasedAt',purchased_at,'licenseVersion',license_version)
      order by purchased_at) from private.blueprint_purchase_entitlements
      where user_id=_user_id and status='paid'), '[]'::jsonb);
  elsif _action = 'download' then
    if _user_id is null or _sku not in ('CAP-BP-001','CAP-BP-002') then raise exception 'invalid_request'; end if;
    select r.* into a from private.blueprint_release_artifacts r
      where r.sku=_sku and r.released=true and exists (
        select 1 from private.blueprint_purchase_entitlements e
        where e.user_id=_user_id and e.sku=r.sku and e.version=r.version and e.status='paid')
      order by r.created_at desc limit 1;
    if not found then return pg_catalog.jsonb_build_object('entitled',false); end if;
    return pg_catalog.jsonb_build_object('entitled',true,'sku',a.sku,'version',a.version,
      'fileName',a.file_name,'sha256',a.sha256_hex,'bytes',pg_catalog.octet_length(a.content),
      'dataBase64',pg_catalog.encode(a.content,'base64'));
  elsif _action = 'fulfill' then
    if _user_id is null or _session_id is null or _payment_intent_id is null or
       _licensee_name is null or _license_version <> '1.0.0' or _version <> '1.0.0' or
       not ((_sku='CAP-BP-001' and _price_id='price_1UPoyMPKr4joNbEcbHllSBQ5') or
            (_sku='CAP-BP-002' and _price_id='price_1UPoyOPKr4joNbEcnxUWvnFK')) then raise exception 'fulfillment_invalid'; end if;
    select * into a from private.blueprint_release_artifacts
      where sku=_sku and version=_version and released=true;
    if not found then raise exception 'artifact_not_released'; end if;
    insert into private.blueprint_purchase_entitlements(
      checkout_session_id,user_id,sku,version,stripe_price_id,stripe_payment_intent_id,
      stripe_customer_id,licensee_legal_name,license_version)
      values(_session_id,_user_id,_sku,_version,_price_id,_payment_intent_id,
        _customer_id,_licensee_name,_license_version)
      on conflict (checkout_session_id) do nothing;
    select * into p from private.blueprint_purchase_entitlements where checkout_session_id=_session_id;
    if p.user_id is distinct from _user_id or p.sku is distinct from _sku or
       p.version is distinct from _version or p.stripe_price_id is distinct from _price_id or
       p.stripe_payment_intent_id is distinct from _payment_intent_id or
       p.licensee_legal_name is distinct from _licensee_name then
      raise exception 'session_identity_conflict';
    end if;
    return pg_catalog.jsonb_build_object('granted',p.status='paid','status',p.status);
  elsif _action = 'confirmation_claim' then
    if _session_id is null or _reason is null or _reason !~ '^[a-f0-9]{32}
    if _payment_intent_id is null or _reason not in ('refunded','disputed','revoked') then
      raise exception 'revoke_invalid'; end if;
    update private.blueprint_purchase_entitlements set
      status=_reason,updated_at=now() where stripe_payment_intent_id=_payment_intent_id
      and status='paid';
    get diagnostics affected = row_count;
    return pg_catalog.jsonb_build_object('revoked',affected);
  else
    raise exception 'unknown_action';
  end if;
end;
$$;
revoke all on function public.capital_ai_blueprint_commerce(text,uuid,text,text,text,text,text,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.capital_ai_blueprint_commerce(text,uuid,text,text,text,text,text,text,text,text,text)
  to service_role;
 then
      raise exception 'confirmation_claim_invalid';
    end if;
    update private.blueprint_purchase_entitlements
      set confirmation_claim_id=_reason, confirmation_claim_until=now() + interval '120 seconds'
      where checkout_session_id=_session_id and status='paid' and confirmation_sent_at is null
        and (confirmation_claim_until is null or confirmation_claim_until < now())
      returning * into p;
    if found then return pg_catalog.jsonb_build_object('claimed',true,'alreadySent',false); end if;
    select * into p from private.blueprint_purchase_entitlements where checkout_session_id=_session_id;
    return pg_catalog.jsonb_build_object('claimed',false,
      'alreadySent',p.confirmation_sent_at is not null);
  elsif _action = 'confirmation_sent' then
    if _session_id is null or _reason is null then raise exception 'confirmation_invalid'; end if;
    update private.blueprint_purchase_entitlements
      set confirmation_sent_at=now(),confirmation_claim_id=null,confirmation_claim_until=null
      where checkout_session_id=_session_id and status='paid' and confirmation_sent_at is null
        and confirmation_claim_id=_reason and confirmation_claim_until > now()
      returning * into p;
    return pg_catalog.jsonb_build_object('sent',found);
  elsif _action = 'confirmation_release' then
    if _session_id is null or _reason is null then raise exception 'confirmation_invalid'; end if;
    update private.blueprint_purchase_entitlements
      set confirmation_claim_id=null,confirmation_claim_until=null
      where checkout_session_id=_session_id and confirmation_sent_at is null
        and confirmation_claim_id=_reason;
    return pg_catalog.jsonb_build_object('released',found);
  elsif _action = 'revoke' then
    if _payment_intent_id is null or _reason not in ('refunded','disputed','revoked') then
      raise exception 'revoke_invalid'; end if;
    update private.blueprint_purchase_entitlements set
      status=_reason,updated_at=now() where stripe_payment_intent_id=_payment_intent_id
      and status='paid';
    get diagnostics affected = row_count;
    return pg_catalog.jsonb_build_object('revoked',affected);
  else
    raise exception 'unknown_action';
  end if;
end;
$$;
revoke all on function public.capital_ai_blueprint_commerce(text,uuid,text,text,text,text,text,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.capital_ai_blueprint_commerce(text,uuid,text,text,text,text,text,text,text,text,text)
  to service_role;
