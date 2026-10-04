create table if not exists public.alert_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  symbol             text not null,
  asset_type         text not null,
  condition          text not null check (condition in ('score_above', 'score_below')),
  threshold          numeric not null,
  confirmed          boolean not null default false,
  confirm_token      text,
  unsubscribe_token  text not null,
  active             boolean not null default true,
  last_notified_at   timestamptz,
  created_at         timestamptz not null default now()
);

comment on table public.alert_subscriptions is 'E-Mail-basierte Alert-Abos je Symbol/Schwellenwert (ARCH-AUDIT-0002 H2). Double-Opt-In ueber confirm_token, Abmeldung ueber unsubscribe_token. Service-Role-only, kein Client-Zugriff.';

create index if not exists idx_alert_subscriptions_symbol on public.alert_subscriptions (symbol) where confirmed = true and active = true;
create unique index if not exists idx_alert_subscriptions_confirm_token on public.alert_subscriptions (confirm_token) where confirm_token is not null;
create unique index if not exists idx_alert_subscriptions_unsubscribe_token on public.alert_subscriptions (unsubscribe_token);

alter table public.alert_subscriptions enable row level security;

drop policy if exists "service_role_full_access" on public.alert_subscriptions;
create policy "service_role_full_access" on public.alert_subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
