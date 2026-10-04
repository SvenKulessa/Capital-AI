-- ARCH-AUDIT-0002 (N1, Kapitel 14.4) - Persistenzschicht fuer die rueckwirkende
-- Validierung der Scoring-Engines gegen realisierte Wertentwicklung. Vor N1 gab es
-- keine Historisierung, welcher Score wann fuer welches Asset ausgegeben wurde -
-- eine Trefferquote/Falsch-Positiv-Rate war damit grundsaetzlich nicht bezifferbar.
-- Ein Eintrag pro Symbol und Kalendertag (UTC), damit die Auswertung spaeter reale
-- Kursbewegungen seit dem Snapshot-Zeitpunkt gegen den damals ausgegebenen Score
-- pruefen kann.

create table if not exists public.score_snapshots (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  asset_type    text not null,
  score         numeric not null,
  score_basis   text,
  price         numeric not null,
  snapshot_date date not null,
  created_at    timestamptz not null default now()
);

comment on table public.score_snapshots is 'Taegliche Score-/Preis-Snapshots je Asset fuer die rueckwirkende Score-Validierung (ARCH-AUDIT-0002 N1). Service-Role-only, kein Client-Zugriff.';

create unique index if not exists idx_score_snapshots_symbol_date on public.score_snapshots (symbol, snapshot_date);
create index if not exists idx_score_snapshots_snapshot_date on public.score_snapshots (snapshot_date);

alter table public.score_snapshots enable row level security;

drop policy if exists "service_role_full_access" on public.score_snapshots;
create policy "service_role_full_access" on public.score_snapshots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
