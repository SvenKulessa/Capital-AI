alter table public.profiles
  drop constraint if exists profiles_iam_role_check;

alter table public.profiles
  add constraint profiles_iam_role_check
  check (iam_role = any (array[
    'owner'::text,
    'admin'::text,
    'supervisor'::text,
    'diagnostic_operator'::text,
    'operations_operator'::text,
    'security_auditor'::text,
    'user'::text
  ]));

comment on column public.profiles.iam_role is
  'Coarse CAPITAL-AI IAM role. Fine-grained production actions additionally require capability grants/approvals; break-glass is transient step-up state, not a persisted role.';