create table if not exists public.subscription_confirmations_sent (
  session_id text primary key,
  sent_at    timestamptz not null default now()
);

comment on table public.subscription_confirmations_sent is 'Idempotenzsperre fuer Abo-Bestaetigungsmails je Stripe Checkout Session (ARCH-AUDIT-0002 H3). Service-Role-only, kein Client-Zugriff.';

alter table public.subscription_confirmations_sent enable row level security;

drop policy if exists "service_role_full_access" on public.subscription_confirmations_sent;
create policy "service_role_full_access" on public.subscription_confirmations_sent
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
