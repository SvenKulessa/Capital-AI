ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_required_account boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET mfa_required_account = false;
