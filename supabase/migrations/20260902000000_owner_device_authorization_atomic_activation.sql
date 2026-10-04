-- CAPITAL-AI-OPS — Stage-C remediation for Owner Device Authorization.
-- Repository migration only. Applying it to a provider remains a separately authorized mutation.

alter table public.owner_authorization_evidence
  add column if not exists ceremony_verified boolean,
  alter column rp_verified drop not null,
  alter column origin_verified drop not null,
  alter column user_presence_verified drop not null,
  alter column user_verification_verified drop not null;

comment on column public.owner_authorization_evidence.ceremony_verified is
  'Aggregate maintained-library WebAuthn ceremony result. Individual RP/origin/UP/UV fields stay NULL unless independently evidenced.';

create or replace function public.consume_adr0104_owner_authorization(
  p_challenge_id uuid, p_owner_user_id uuid, p_credential_record_id uuid,
  p_expected_counter bigint, p_new_counter bigint, p_context_digest text,
  p_slot_id text, p_chat_binding_hash text, p_project_set_digest text,
  p_authorized_project_set jsonb, p_active_project_id text, p_current_main_sha text,
  p_session_start timestamptz, p_session_end timestamptz,
  p_device_bound_verified boolean, p_ceremony_verified boolean, p_reason_class text
) returns table(evidence_id uuid, session_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.owner_authorization_challenges%rowtype;
  v_credential public.owner_device_credentials%rowtype;
  v_evidence_id uuid;
  v_session_id uuid;
begin
  if p_ceremony_verified is distinct from true or p_device_bound_verified is distinct from true then raise exception 'OWNER_AUTH_NOT_VERIFIED'; end if;

  select * into v_challenge from public.owner_authorization_challenges
  where id=p_challenge_id and owner_user_id=p_owner_user_id and action='ACTIVATE_ADR_0104_SESSION' for update;
  if not found or v_challenge.consumed_at is not null or v_challenge.expires_at <= now() then raise exception 'OWNER_AUTH_CHALLENGE_INVALID_OR_REPLAYED'; end if;
  if v_challenge.context_digest <> p_context_digest then raise exception 'OWNER_AUTH_CONTEXT_DRIFT'; end if;
  if v_challenge.context->>'ownerActorId' <> p_owner_user_id::text
     or v_challenge.context->>'slotId' <> p_slot_id
     or v_challenge.context->>'slotPreState' <> 'AVAILABLE'
     or v_challenge.context->>'chatBindingHash' <> p_chat_binding_hash
     or v_challenge.context->>'projectSetDigest' <> p_project_set_digest
     or v_challenge.context->>'initialActiveProjectId' <> p_active_project_id
     or v_challenge.context->>'currentMainSha' <> p_current_main_sha
     or (v_challenge.context->>'sessionStart')::timestamptz <> p_session_start
     or (v_challenge.context->>'sessionEnd')::timestamptz <> p_session_end then
    raise exception 'OWNER_AUTH_CONTEXT_PRECONDITION_DRIFT';
  end if;

  select * into v_credential from public.owner_device_credentials
  where id=p_credential_record_id and owner_user_id=p_owner_user_id and revoked_at is null
    and device_type='singleDevice' and backup_eligible=false and backed_up=false for update;
  if not found or v_credential.counter <> p_expected_counter then raise exception 'OWNER_AUTH_CREDENTIAL_STATE_DRIFT'; end if;
  if exists(select 1 from public.adr0104_owner_sessions where slot_id=p_slot_id) then raise exception 'ADR0104_SLOT_UNAVAILABLE'; end if;

  update public.owner_authorization_challenges set consumed_at=now() where id=p_challenge_id and consumed_at is null;
  if not found then raise exception 'OWNER_AUTH_CHALLENGE_REPLAY'; end if;

  insert into public.owner_authorization_evidence(
    challenge_id,owner_user_id,credential_id,action,context_digest,ceremony_verified,
    rp_verified,origin_verified,user_presence_verified,user_verification_verified,
    device_bound_verified,outcome,reason_class
  ) values (
    p_challenge_id,p_owner_user_id,p_credential_record_id,'ACTIVATE_ADR_0104_SESSION',p_context_digest,true,
    null,null,null,null,true,'ALLOW',p_reason_class
  ) returning id into v_evidence_id;

  update public.owner_device_credentials set counter=p_new_counter where id=p_credential_record_id and counter=p_expected_counter;
  if not found then raise exception 'OWNER_AUTH_COUNTER_UPDATE_FAILED'; end if;

  insert into public.adr0104_owner_sessions(
    slot_id,owner_user_id,chat_binding_hash,project_set_digest,authorized_project_set,
    active_project_id,current_main_sha,evidence_id,session_start,session_end,state
  ) values (
    p_slot_id,p_owner_user_id,p_chat_binding_hash,p_project_set_digest,p_authorized_project_set,
    p_active_project_id,p_current_main_sha,v_evidence_id,p_session_start,p_session_end,'ACTIVE'
  ) returning id into v_session_id;

  insert into public.owner_authorization_consumptions(evidence_id,action,target_digest,result)
  values(v_evidence_id,'ACTIVATE_ADR_0104_SESSION',p_context_digest,'CONSUMED');
  return query select v_evidence_id,v_session_id;
end;
$$;

revoke all on function public.consume_adr0104_owner_authorization(uuid,uuid,uuid,bigint,bigint,text,text,text,text,jsonb,text,text,timestamptz,timestamptz,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.consume_adr0104_owner_authorization(uuid,uuid,uuid,bigint,bigint,text,text,text,text,jsonb,text,text,timestamptz,timestamptz,boolean,boolean,text) to service_role;
