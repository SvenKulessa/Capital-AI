-- SEO-ROADMAP-0001 / S1 — SeoEngine persistence (draft schema)
-- Apply only after OWNER review. No RLS policies grant public write.

create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,
  locale text not null check (locale in ('de', 'en')),
  intent text not null check (intent in ('informational', 'commercial', 'transactional', 'navigational')),
  target_path text not null,
  priority int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phrase, locale)
);

create table if not exists public.seo_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.seo_keywords (id) on delete cascade,
  captured_at timestamptz not null default now(),
  position int null check (position is null or position >= 1),
  source text not null check (source in ('manual', 'search_console', 'estimated')),
  url text null
);

create index if not exists seo_rank_snapshots_keyword_captured_idx
  on public.seo_rank_snapshots (keyword_id, captured_at desc);

create table if not exists public.seo_content_inventory (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text not null,
  locale text not null check (locale in ('de', 'en')),
  status text not null check (status in ('draft', 'published', 'archived')),
  primary_keyword_id uuid null references public.seo_keywords (id) on delete set null,
  last_reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: deny-by-default; service role / owner policies to be added with IAM review.
alter table public.seo_keywords enable row level security;
alter table public.seo_rank_snapshots enable row level security;
alter table public.seo_content_inventory enable row level security;
