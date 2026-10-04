
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS totp_pending_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.step_up_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    purpose text NOT NULL DEFAULT 'owner-action',
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at timestamptz
);
COMMENT ON TABLE public.step_up_tokens IS 'Kurzlebige, einmalig verwendbare Step-Up-Tokens (TOTP-verifiziert) fuer Owner-Aktionen. Server-only, kein Client-Zugriff.';
CREATE INDEX idx_step_up_tokens_lookup ON public.step_up_tokens (user_id, token_hash) WHERE used_at IS NULL;
ALTER TABLE public.step_up_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.step_up_tokens FROM authenticated, anon;

CREATE TABLE public.break_glass_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    used_at timestamptz
);
COMMENT ON TABLE public.break_glass_codes IS 'Gehashte Einmal-Recovery-Codes fuer den Break-Glass-Prozess. Server-only, kein Client-Zugriff.';
CREATE INDEX idx_break_glass_codes_user ON public.break_glass_codes (user_id) WHERE used_at IS NULL;
ALTER TABLE public.break_glass_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.break_glass_codes FROM authenticated, anon;
