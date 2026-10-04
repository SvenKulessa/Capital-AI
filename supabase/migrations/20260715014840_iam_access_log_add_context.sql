
ALTER TABLE public.iam_access_log
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;
CREATE INDEX IF NOT EXISTS idx_iam_access_log_user_id ON public.iam_access_log (user_id);
CREATE INDEX IF NOT EXISTS idx_iam_access_log_created_at ON public.iam_access_log (created_at DESC);
