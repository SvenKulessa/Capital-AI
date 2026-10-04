alter table public.iam_access_log
  add column if not exists user_id uuid,
  add column if not exists reason text,
  add column if not exists ip_address inet,
  add column if not exists user_agent text;