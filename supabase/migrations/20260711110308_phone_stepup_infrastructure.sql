-- Telefonnummer gilt für beide Owner-Mails (gmail + gmx), da eine Person / ein Faktor.
update public.profiles p
set phone_number = '+4915204697947',
    phone_verified = true
from auth.users u
where u.id = p.id
  and u.email in ('sven.kulessa@gmail.com', 'sven.kulessa@gmx.net');

-- Kurzlebige SMS-OTP-Challenges für Step-up (Break-Glass, Passwort-Reset-Bestätigung).
create table if not exists public.phone_stepup_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone_number text not null,
  otp_hash text not null,
  purpose text not null check (purpose in ('break_glass', 'password_reset')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_phone_stepup_email on public.phone_stepup_challenges (email, purpose, created_at desc);

-- Kurzlebige Step-up-Tokens, die requireStepUp() nach erfolgreicher OTP-Prüfung ausstellt.
create table if not exists public.iam_stepup_tokens (
  token_hash text primary key,
  email text not null,
  purpose text not null check (purpose in ('break_glass', 'password_reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.phone_stepup_challenges enable row level security;
alter table public.iam_stepup_tokens enable row level security;

drop policy if exists "service_role_only_challenges" on public.phone_stepup_challenges;
create policy "service_role_only_challenges" on public.phone_stepup_challenges
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_role_only_tokens" on public.iam_stepup_tokens;
create policy "service_role_only_tokens" on public.iam_stepup_tokens
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');