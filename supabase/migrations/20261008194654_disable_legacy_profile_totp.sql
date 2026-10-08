-- Owner-authorized retirement of the Finance profile-based TOTP lane.
-- Native Supabase auth.mfa_factors, passkeys and current sessions are untouched.
-- Old seeds are intentionally invalidated; reactivation requires fresh enrollment.
BEGIN;
UPDATE public.profiles
SET totp_enabled = false,
    totp_secret_encrypted = NULL,
    totp_pending_secret_encrypted = NULL
WHERE totp_enabled IS DISTINCT FROM false
   OR totp_secret_encrypted IS NOT NULL
   OR totp_pending_secret_encrypted IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_legacy_totp_retired'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_legacy_totp_retired
      CHECK (totp_enabled IS FALSE AND totp_secret_encrypted IS NULL
             AND totp_pending_secret_encrypted IS NULL);
  END IF;
END $$;

UPDATE public.step_up_tokens SET used_at = now() WHERE used_at IS NULL;
UPDATE public.break_glass_codes SET used_at = now() WHERE used_at IS NULL;
COMMIT;
