
CREATE VIEW public.internal_user_lookup AS
SELECT id, email FROM auth.users;

COMMENT ON VIEW public.internal_user_lookup IS 'Server-only (service_role) Lookup von User-ID per E-Mail, z.B. fuer Stripe-Webhook-Zuordnung bei Gast-Checkouts. Kein Client-Zugriff.';

REVOKE ALL ON public.internal_user_lookup FROM authenticated, anon, public;
GRANT SELECT ON public.internal_user_lookup TO service_role;
