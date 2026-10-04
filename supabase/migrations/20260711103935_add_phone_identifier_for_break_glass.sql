-- Fügt Telefonnummer als zusätzlichen Identifikator für Break-Glass / Step-up-Flows hinzu.
-- Nicht-destruktiv: nur neue, nullable Spalten.
alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists phone_verified boolean not null default false;

comment on column public.profiles.phone_number is 'Sekundärer Identifikator für Break-Glass/Step-up (ADR-0003.5). Manuell durch Owner gepflegt, kein SMS-Versand implementiert.';
comment on column public.profiles.phone_verified is 'True sobald der Owner die Telefonnummer manuell bestätigt hat.';