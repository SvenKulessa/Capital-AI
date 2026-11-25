-- Disposable synthetic auth fixture only, no production SQL.
alter table auth.users add column created_at timestamptz, add column email_confirmed_at timestamptz;
insert into auth.users(id,created_at,email_confirmed_at) values
 ('a0000000-0000-4000-8000-000000000001',clock_timestamp()-interval '1 day',clock_timestamp()-interval '1 day');
set role service_role;
do $$
begin
  if not capital_growth_private.grant_x_consent(repeat('a',64)) then raise exception 'GRANT_FAILED'; end if;
  if capital_growth_private.grant_x_consent(repeat('a',64)) then raise exception 'DUPLICATE_GRANT'; end if;
  if capital_growth_private.bind_x_signup(repeat('a',64),'a0000000-0000-4000-8000-000000000001') then raise exception 'OLD_USER_BOUND'; end if;
  if not capital_growth_private.grant_x_consent(repeat('b',64)) then raise exception 'GRANT_FAILED'; end if;
end $$;
reset role;
insert into auth.users(id,created_at,email_confirmed_at) values
 ('a0000000-0000-4000-8000-000000000002',clock_timestamp(),clock_timestamp()),
 ('a0000000-0000-4000-8000-000000000003',clock_timestamp(),null);
set role service_role;
do $$
begin
  if capital_growth_private.bind_x_signup(repeat('b',64),'a0000000-0000-4000-8000-000000000003') then raise exception 'UNCONFIRMED_USER_BOUND'; end if;
  if not capital_growth_private.bind_x_signup(repeat('b',64),'a0000000-0000-4000-8000-000000000002') then raise exception 'BIND_FAILED'; end if;
  if capital_growth_private.bind_x_signup(repeat('b',64),'a0000000-0000-4000-8000-000000000002') then raise exception 'REPLAY_BOUND'; end if;
  if capital_growth_private.bind_x_signup(repeat('a',64),'a0000000-0000-4000-8000-000000000002') then raise exception 'DOUBLE_ATTRIBUTION'; end if;
  if capital_growth_private.x_signup_count(clock_timestamp()-interval '1 day',clock_timestamp())<>1 then raise exception 'COUNT_INVALID'; end if;
  if capital_growth_private.record_x_initial_payment('a0000000-0000-4000-8000-000000000003',repeat('c',64),repeat('d',64),clock_timestamp(),clock_timestamp(),700)
    then raise exception 'UNBOUND_PAYMENT'; end if;
  if not capital_growth_private.record_x_initial_payment('a0000000-0000-4000-8000-000000000002',repeat('c',64),repeat('d',64),clock_timestamp(),clock_timestamp(),700)
    then raise exception 'PAYMENT_FAILED'; end if;
  if capital_growth_private.record_x_initial_payment('a0000000-0000-4000-8000-000000000002',repeat('c',64),repeat('d',64),clock_timestamp(),clock_timestamp(),700)
    then raise exception 'DUPLICATE_PAYMENT'; end if;
  if (capital_growth_private.x_conversion_candidates(clock_timestamp()-interval '1 day',clock_timestamp())->>'candidatePaidSubscriptions')::int is distinct from 1
    then raise exception 'PAYMENT_COUNT_INVALID'; end if;
  if capital_growth_private.reverse_x_initial_payment('a0000000-0000-4000-8000-000000000003',repeat('c',64))
    then raise exception 'FOREIGN_REVERSAL'; end if;
  if not capital_growth_private.reverse_x_initial_payment('a0000000-0000-4000-8000-000000000002',repeat('c',64))
    then raise exception 'REVERSAL_FAILED'; end if;
  if (capital_growth_private.x_conversion_candidates(clock_timestamp()-interval '1 day',clock_timestamp())->>'candidatePaidSubscriptions') is not null
    then raise exception 'REVERSED_COUNTED'; end if;
  if capital_growth_private.revoke_x_consent(repeat('b',64),'a0000000-0000-4000-8000-000000000003') then raise exception 'FOREIGN_REVOCATION'; end if;
  if capital_growth_private.revoke_x_consent_for_user('a0000000-0000-4000-8000-000000000003') then raise exception 'UNBOUND_WITHDRAWAL'; end if;
  if not capital_growth_private.revoke_x_consent_for_user('a0000000-0000-4000-8000-000000000002') then raise exception 'NONCE_FREE_WITHDRAWAL_FAILED'; end if;
  if capital_growth_private.revoke_x_consent_for_user('a0000000-0000-4000-8000-000000000002') then raise exception 'WITHDRAWAL_REPLAY'; end if;
  if capital_growth_private.x_signup_count(clock_timestamp()-interval '1 day',clock_timestamp())<>0 then raise exception 'REVOKED_COUNTED'; end if;
  if capital_growth_private.grant_x_consent(repeat('b',64)) then raise exception 'REVOKED_REGRANTED'; end if;
  begin
    update capital_growth_private.x_consent set revoked_at=null;
    raise exception 'DIRECT_WRITE_ALLOWED';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$
begin
  begin
    perform capital_growth_private.grant_x_consent(repeat('c',64));
    raise exception 'BROWSER_RPC_ALLOWED';
  exception when insufficient_privilege then null; end;
  begin
    perform capital_growth_private.revoke_x_consent_for_user('a0000000-0000-4000-8000-000000000002');
    raise exception 'BROWSER_WITHDRAWAL_RPC_ALLOWED';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Smartcopy fixture: independent from X campaign and no shared payment authority.
set role service_role;
do $$
declare u uuid:='a0000000-0000-4000-8000-000000000002'; c text:='smartcopy-'||repeat('a',24); r text:=repeat('e',64); v jsonb;
begin
 if capital_growth_private.grant_smartcopy_consent('a0000000-0000-4000-8000-000000000003',c,r,repeat('f',64)) then raise exception 'SMARTCOPY_UNCONFIRMED_GRANTED'; end if;
 if not capital_growth_private.grant_smartcopy_consent(u,c,r,repeat('f',64)) then raise exception 'SMARTCOPY_GRANT_FAILED'; end if;
 v:=public.capital_smartcopy_read_consent(u,c,r);
 if v->>'productId' is distinct from 'ai-smartcopy' or v->>'purpose' is distinct from 'PRODUCT_CONVERSION' or v->>'revokedAt' is not null then raise exception 'SMARTCOPY_READ_INVALID'; end if;
 if public.capital_smartcopy_read_consent(u,c,repeat('b',64)) is not null or public.capital_smartcopy_read_consent(u,'smartcopy-'||repeat('b',24),r) is not null or public.capital_smartcopy_read_consent('a0000000-0000-4000-8000-000000000001',c,r) is not null then raise exception 'SMARTCOPY_FOREIGN_READ'; end if;
 if not capital_growth_private.withdraw_smartcopy_consent(u,c,r) then raise exception 'SMARTCOPY_WITHDRAW_FAILED'; end if;
 if public.capital_smartcopy_read_consent(u,c,r)->>'revokedAt' is null then raise exception 'SMARTCOPY_WITHDRAW_NOT_READ'; end if;
 if capital_growth_private.grant_smartcopy_consent(u,c,r,repeat('1',64)) then raise exception 'SMARTCOPY_REGRANTED'; end if;
 begin
  update capital_growth_private.smartcopy_consent set revoked_at=null;
  raise exception 'SMARTCOPY_DIRECT_WRITE_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$
begin
 begin
  perform public.capital_smartcopy_read_consent('a0000000-0000-4000-8000-000000000002','smartcopy-'||repeat('a',24),repeat('e',64));
  raise exception 'SMARTCOPY_BROWSER_READ_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Independent fixture license records. Only the disposable database owner seeds them.
insert into capital_growth_private.smartcopy_entitlement_fixture(user_id,campaign_id,release_sha256,intent_id,state)
values ('a0000000-0000-4000-8000-000000000001','smartcopy-'||repeat('c',24),repeat('d',64),'pi_fixturegranted','GRANTED'),
 ('a0000000-0000-4000-8000-000000000001','smartcopy-'||repeat('c',24),repeat('d',64),'pi_fixturerevoked','REVOKED');
set role service_role;
do $$
declare u uuid:='a0000000-0000-4000-8000-000000000001'; c text:='smartcopy-'||repeat('c',24); r text:=repeat('d',64);
begin
 if public.capital_smartcopy_read_entitlement(u,c,r,'pi_fixturegranted') is not null then raise exception 'ENTITLEMENT_NO_CONSENT'; end if;
 if not capital_growth_private.grant_smartcopy_consent(u,c,r,repeat('9',64)) then raise exception 'ENTITLEMENT_CONSENT_FAILED'; end if;
 if public.capital_smartcopy_read_entitlement(u,c,r,'pi_fixturegranted')->>'state' is distinct from 'GRANTED' or public.capital_smartcopy_read_entitlement(u,c,r,'pi_fixturerevoked')->>'state' is distinct from 'REVOKED' then raise exception 'ENTITLEMENT_STATE_INVALID'; end if;
 if public.capital_smartcopy_read_entitlement(u,c,repeat('a',64),'pi_fixturegranted') is not null or public.capital_smartcopy_read_entitlement(u,'smartcopy-'||repeat('a',24),r,'pi_fixturegranted') is not null or public.capital_smartcopy_read_entitlement('a0000000-0000-4000-8000-000000000002',c,r,'pi_fixturegranted') is not null or public.capital_smartcopy_read_entitlement(u,c,r,'pi_otherintent') is not null then raise exception 'ENTITLEMENT_FOREIGN_READ'; end if;
 begin
 update capital_growth_private.smartcopy_entitlement_fixture set state='GRANTED';
 raise exception 'ENTITLEMENT_WRITE_ALLOWED';
 exception when insufficient_privilege then null; end;
 if not capital_growth_private.withdraw_smartcopy_consent(u,c,r) then raise exception 'ENTITLEMENT_WITHDRAW_FAILED'; end if;
 if public.capital_smartcopy_read_entitlement(u,c,r,'pi_fixturegranted') is not null then raise exception 'ENTITLEMENT_WITHDRAW_READ'; end if;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin
 perform public.capital_smartcopy_read_entitlement('a0000000-0000-4000-8000-000000000001','smartcopy-'||repeat('c',24),repeat('d',64),'pi_fixturegranted');
 raise exception 'ENTITLEMENT_BROWSER_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Independently recorded contractual acceptance (synthetic CI records).
insert into capital_growth_private.smartcopy_delivery_fixture(intent_id,user_id,campaign_id,release_sha256,receipt_sha256,terms_sha256,accepted_at)
select v.intent_id,u.id,'smartcopy-'||repeat('c',24),repeat('d',64),repeat(v.digest,64),repeat('8',64),u.email_confirmed_at
from auth.users u cross join (values ('pi_lifecycle001','7'),('pi_lifecycle002','6'),('pi_lifecycle003','5'),('pi_lifecyclerollback','4'),('pi_lifecyclerace','3')) as v(intent_id,digest)
where u.id='a0000000-0000-4000-8000-000000000001';
set role service_role;
do $$ declare u uuid:='a0000000-0000-4000-8000-000000000001'; c text:='smartcopy-'||repeat('c',24); r text:=repeat('d',64);
begin
 if public.capital_smartcopy_read_delivery(u,c,r,'pi_lifecycle001')->>'receiptSha256' is distinct from repeat('7',64) then raise exception 'DELIVERY_READ_FAILED'; end if;
 if public.capital_smartcopy_read_delivery(u,c,repeat('b',64),'pi_lifecycle001') is not null or public.capital_smartcopy_read_delivery('a0000000-0000-4000-8000-000000000002',c,r,'pi_lifecycle001') is not null then raise exception 'DELIVERY_SCOPE_BROKEN'; end if;
 begin
 update capital_growth_private.smartcopy_delivery_fixture set terms_sha256=repeat('a',64);
 raise exception 'DELIVERY_SERVICE_WRITE_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin
 perform public.capital_smartcopy_read_delivery('a0000000-0000-4000-8000-000000000001','smartcopy-'||repeat('c',24),repeat('d',64),'pi_lifecycle001');
 raise exception 'DELIVERY_BROWSER_READ_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Lifecycle is invoked by the disposable database owner, never the service role.
-- Use independent contract delivery evidence, NOT the optional marketing consent.
do $$
declare u uuid:='a0000000-0000-4000-8000-000000000001'; c text:='smartcopy-'||repeat('c',24); r text:=repeat('d',64);
 t timestamptz:=clock_timestamp(); paid timestamptz:=t-interval '1 hour'; d text:=repeat('7',64);
begin
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,0,false,paid,t,null)<>'DENIED' then raise exception 'MISSING_DELIVERY_GRANTED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,0,false,paid,t,repeat('9',64))<>'DENIED' then raise exception 'FORGED_DELIVERY_GRANTED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,0,false,paid,t,d)<>'GRANTED' then raise exception 'LIFECYCLE_GRANT_FAILED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,0,false,paid,t,d)<>'GRANTED' then raise exception 'REPLAY_FAILED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle002','ch_lifecycle001',499,0,false,paid,t,repeat('6',64))<>'DENIED' then raise exception 'DUPLICATE_CHARGE'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,repeat('b',64),'pi_lifecycle001','ch_lifecycle001',499,499,false,paid,t,null)<>'DENIED' then raise exception 'CROSS_RELEASE_REVOKE'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,100,false,paid,t,d)<>'GRANTED' then raise exception 'PARTIAL_REFUND_FAILED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,0,false,paid,t-interval '1 second',d)<>'GRANTED' then raise exception 'STALE_REPLAY_FAILED'; end if;
 if (select refunded_cents from capital_growth_private.smartcopy_entitlement_fixture where intent_id='pi_lifecycle001')<>100 then raise exception 'REFUND_REGRESSED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,499,false,paid,t,null)<>'REVOKED' then raise exception 'FULL_REFUND_FAILED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle001','ch_lifecycle001',499,0,false,paid,t,d)<>'REVOKED' then raise exception 'LATE_GRANT_RESURRECTED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle003','ch_lifecycle003',499,0,true,paid,t,null)<>'REVOKED' then raise exception 'DISPUTE_TOMBSTONE_FAILED'; end if;
 if capital_growth_private.apply_smartcopy_sandbox_payment(u,c,r,'pi_lifecycle003','ch_lifecycle003',499,0,false,paid,t,repeat('5',64))<>'REVOKED' then raise exception 'DISPUTE_RESURRECTED'; end if;
 if public.capital_smartcopy_read_entitlement(u,c,r,'pi_lifecycle001') is not null then raise exception 'WITHDRAWN_ANALYTICS_LEAK'; end if;
end $$;
set role service_role;
do $$ begin
 begin
 perform capital_growth_private.apply_smartcopy_sandbox_payment(null,null,null,null,null,null,null,null,null,null,null);
 raise exception 'SERVICE_LIFECYCLE_WRITE_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin
 perform capital_growth_private.apply_smartcopy_sandbox_payment(null,null,null,null,null,null,null,null,null,null,null);
 raise exception 'BROWSER_LIFECYCLE_WRITE_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Explicit transaction rollback (no fixture remains).
begin;
do $$ begin
 if capital_growth_private.apply_smartcopy_sandbox_payment('a0000000-0000-4000-8000-000000000001','smartcopy-'||repeat('c',24),repeat('d',64),'pi_lifecyclerollback','ch_lifecyclerollback',499,0,false,now()-interval '1 hour',now(),repeat('4',64))<>'GRANTED' then raise exception 'ROLLBACK_PRECONDITION_FAILED'; end if;
end $$;
rollback;
do $$ begin
 if exists(select 1 from capital_growth_private.smartcopy_entitlement_fixture where intent_id='pi_lifecyclerollback') then raise exception 'ROLLBACK_FAILED'; end if;
end $$;
