
CREATE TABLE public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    event_type text NOT NULL CHECK (event_type IN ('failed_login','unauthorized_access','invalid_token','rate_limit_exceeded','permission_denied','suspicious_request')),
    attempted_email text,
    actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address inet,
    user_agent text,
    device_vendor text,
    device_type text,
    endpoint text,
    outcome text NOT NULL DEFAULT 'blocked',
    reason text
);

COMMENT ON TABLE public.security_events IS 'Audit log fuer unautorisierte Zugriffsversuche (IP, User-Agent, Geraetehersteller). Read-only fuer verifizierten Owner-Account, Schreibzugriff nur via Service-Role.';

CREATE INDEX idx_security_events_ip ON public.security_events (ip_address);
CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events (event_type);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_events_select_verified_owner
ON public.security_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.iam_role = 'owner'
          AND p.phone_verified = true
    )
    AND
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sven.kulessa@gmail.com'
);

REVOKE INSERT, UPDATE, DELETE ON public.security_events FROM authenticated, anon;
GRANT SELECT ON public.security_events TO authenticated;
