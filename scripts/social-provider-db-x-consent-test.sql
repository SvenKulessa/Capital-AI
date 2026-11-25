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
