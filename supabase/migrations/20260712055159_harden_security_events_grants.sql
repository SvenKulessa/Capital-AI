
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.security_events FROM authenticated, anon;
REVOKE ALL ON public.security_events FROM anon;
