-- Targeted performance hardening for the M10 shadow-evaluation credential FK.
-- Mirrors the production Supabase optimization verified by Database Advisor readback.
create index if not exists m10_shadow_evaluations_credential_id_idx
  on public.m10_shadow_evaluations (credential_id);
