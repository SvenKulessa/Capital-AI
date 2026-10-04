ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS email text;

-- Bestehende beide Accounts direkt befüllen, damit nichts leer bleibt
UPDATE public.subscriptions s
SET email = u.email
FROM auth.users u
WHERE s.user_id = u.id AND s.email IS NULL;