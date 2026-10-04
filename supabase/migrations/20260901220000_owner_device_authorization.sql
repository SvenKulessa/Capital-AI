-- CAPITAL-AI-OPS — M10-independent Owner Device Authorization persistence.
-- Repository migration only. Applying it to production remains a separate provider mutation.

create table if not exists public.owner_device_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_type text not null check (device_type = 'singleDevice'),
  backup_eligible boolean not null default false check (backup_eligible = false),
  backed_up boolean not null default false check (backed_up = false),
  aaguid text,
  device_ref text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.owner_authorization_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('OWNER_DEVICE_ENROLLMENT', 'ACTIVATE_ADR_0104_SESSION', 'AUTHORIZE_GITHUB_OWNER_MUTATION')),
  challenge text not null unique,
  context_digest text not null,
  context jsonb not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint owner_authorization_challenge_expiry check (expires_at > issued_at)
);

create table if not exists public.owner_authorization_evidence (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.owner_authorization_challenges(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  credential_id uuid references public.owner_device_credentials(id),
  action text not null,
  context_digest text not null,
  rp_verified boolean not null,
  origin_verified boolean not null,
  user_presence_verified boolean not null,
  user_verification_verified boolean not null,
  device_bound_verified boolean not null,
  outcome text not null check (outcome in ('ALLOW', 'DENY')),
  reason_class text not null,
  verified_at timestamptz not null default now()
);

create table if not exists public.owner_authorization_consumptions (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null unique references public.owner_authorization_evidence(id),
  action text not null,
  target_digest text not null,
  result text not null check (result in ('CONSUMED', 'FAILED')),
  consumed_at timestamptz not null default now()
);

create table if not exists public.adr0104_owner_sessions (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null unique check (slot_id in ('ADR-0104-S1', 'ADR-0104-S2', 'ADR-0104-S3')),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  chat_binding_hash text not null,
  project_set_digest text not null,
  authorized_project_set jsonb not null,
  active_project_id text not null,
  current_main_sha text not null check (current_main_sha ~ '^[0-9a-f]{40}$'),
  evidence_id uuid not null unique references public.owner_authorization_evidence(id),
  session_start timestamptz not null,
  session_end timestamptz not null,
  state text not null check (state in ('ACTIVE', 'CONSUMED', 'REVOKED')),
  created_at timestamptz not null default now(),
  constraint adr0104_session_duration check (session_end > session_start)
);

create index if not exists idx_owner_auth_challenges_owner_action on public.owner_authorization_challenges(owner_user_id, action, issued_at desc);
create index if not exists idx_owner_auth_evidence_owner_verified on public.owner_authorization_evidence(owner_user_id, verified_at desc);
create index if not exists idx_adr0104_sessions_owner_state on public.adr0104_owner_sessions(owner_user_id, state, session_end desc);

alter table public.owner_device_credentials enable row level security;
alter table public.owner_authorization_challenges enable row level security;
alter table public.owner_authorization_evidence enable row level security;
alter table public.owner_authorization_consumptions enable row level security;
alter table public.adr0104_owner_sessions enable row level security;

-- No browser-facing policies are created. Productive access is service-role/server-only.
revoke all on public.owner_device_credentials from anon, authenticated;
revoke all on public.owner_authorization_challenges from anon, authenticated;
revoke all on public.owner_authorization_evidence from anon, authenticated;
revoke all on public.owner_authorization_consumptions from anon, authenticated;
revoke all on public.adr0104_owner_sessions from anon, authenticated;
