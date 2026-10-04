-- ADR-0020 — Social Media Direct Publishing: echte OAuth-Token-Persistenz und Publish-Log.
--
-- Ersetzt die im Handover-Prototyp (Google AI Studio) verwendeten In-Memory-Arrays in
-- socialMediaRoutes.ts. In-Memory bedeutete: kein Multi-User-Scoping (ein globales Array fuer
-- ALLE Nutzer), Datenverlust bei jedem Deploy/Neustart, keine echten OAuth-Tokens. Diese
-- Migration bringt beides auf das gleiche Persistenz-/RLS-Muster wie die uebrigen
-- sicherheitskritischen Tabellen dieses Projekts (security_events, step_up_tokens): Service-
-- Role-only, kein direkter Client-Zugriff - die Express-API ist der einzige Zugriffspfad.

-- 1. Verknuepfte Social-Media-Konten pro Nutzer. Tokens liegen NIE im Klartext (AES-256-GCM via
--    server/iam/secretCrypto.ts, gleicher Verschluesselungsmechanismus wie TOTP-Secrets).
create table if not exists public.social_media_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  account_name text,
  handle text,
  avatar_url text,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'token_expired', 'connecting')),
  scopes text[] not null default '{}',
  followers_count integer,
  -- Generischer externer Referenzschluessel: YouTube channelId, Facebook Page-ID,
  -- Instagram Business Account-ID. Bei Facebook/Instagram wird HIER die Page- bzw.
  -- IG-Business-Account-ID gespeichert, NICHT die User-ID - Meta-Publishing laeuft ueber
  -- Page-Access-Tokens, nicht ueber den User-Access-Token (siehe platformPublishers.ts).
  external_account_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);
comment on table public.social_media_accounts is
  'Pro Nutzer verknuepfte Social-Media-Konten inkl. verschluesselter OAuth-Tokens. Server-only (Service-Role), kein Client-Zugriff - Zugriff ausschliesslich ueber /api/social-media/*.';

create or replace function public.touch_social_media_accounts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_social_media_accounts_updated_at on public.social_media_accounts;
create trigger trg_social_media_accounts_updated_at
  before update on public.social_media_accounts
  for each row execute function public.touch_social_media_accounts_updated_at();

-- 2. Kurzlebiger OAuth-State-Speicher. Bindet den State-Parameter serverseitig an den
--    angemeldeten Nutzer und die Plattform, BEVOR der Redirect zum Provider erfolgt - der
--    Handover-Prototyp verifizierte den State beim Callback nie (state war nur
--    `${platform}_${Date.now()}`, ungeprueft), was den Callback fuer jeden mit Kenntnis der
--    Callback-URL offen liess, ein beliebiges Konto als "verbunden" zu markieren. Diese Tabelle
--    schliesst die CSRF-Luecke: /auth/callback akzeptiert nur einen State, der hier mit
--    passendem user_id/platform, unbenutzt und unabgelaufen vorliegt.
create table if not exists public.social_media_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_token text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  redirect_uri text not null,
  -- PKCE code_verifier (nur X OAuth 2.0 erfordert PKCE zwingend, siehe oauthProviders.ts).
  -- Kein Secret im klassischen Sinn (Einmalgebrauch, wenige Minuten gueltig) - unverschluesselt
  -- ausreichend, analog zur bestehenden step_up_tokens-Handhabung.
  code_verifier text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
comment on table public.social_media_oauth_states is
  'Kurzlebige, einmalig verwendbare OAuth-State-Tokens fuer den Social-Media-Verbindungs-Handshake. Server-only.';

create index if not exists idx_social_media_oauth_states_expires on public.social_media_oauth_states (expires_at);

-- 3. Persistiertes Publish-Log (ersetzt das In-Memory-Array publishHistoryLogs).
create table if not exists public.social_media_publish_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id text,
  episode_title text,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  account_id uuid references public.social_media_accounts(id) on delete set null,
  account_handle text,
  status text not null check (status in ('published', 'scheduled', 'failed', 'draft')),
  publish_type text not null check (publish_type in ('instant', 'scheduled', 'draft')),
  published_url text,
  scheduled_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
comment on table public.social_media_publish_log is
  'Persistierte Veroeffentlichungshistorie pro Nutzer. Ersetzt das In-Memory-Array des Handover-Prototyps.';

create index if not exists idx_social_media_publish_log_user on public.social_media_publish_log (user_id, created_at desc);

-- RLS: gleiches Muster wie audit_logs_iam/step_up_tokens/user_quota - Service-Role-only.
-- Die Express-API (server-seitig, service_role-Key) ist der einzige Zugriffspfad; der Client
-- sieht ausschliesslich das, was die Route explizit zurueckgibt (u.a. NIE die *_encrypted-Spalten).
alter table public.social_media_accounts enable row level security;
alter table public.social_media_oauth_states enable row level security;
alter table public.social_media_publish_log enable row level security;

drop policy if exists "service_role_full_access" on public.social_media_accounts;
create policy "service_role_full_access" on public.social_media_accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.social_media_oauth_states;
create policy "service_role_full_access" on public.social_media_oauth_states
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.social_media_publish_log;
create policy "service_role_full_access" on public.social_media_publish_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
