-- Server-owned, tenant-isolated synthetic financial learning scenarios.
-- No provider feeds, secrets or user financial records are stored.
CREATE TABLE IF NOT EXISTS private.learning_simulator_scenarios (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL CHECK (length(trim(name)) > 0),
  weights jsonb NOT NULL,
  vols jsonb NOT NULL,
  corrs jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_simulator_scenarios_owner_order
  ON private.learning_simulator_scenarios (user_id, created_at, id);
ALTER TABLE private.learning_simulator_scenarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.learning_simulator_scenarios FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT, INSERT, DELETE ON private.learning_simulator_scenarios TO service_role;

CREATE OR REPLACE FUNCTION public.capital_ai_learning_simulator_scenarios(
  _user_id uuid, _action text, _scenario_id uuid DEFAULT NULL, _payload jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE _count integer;
BEGIN
  IF _user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id)
    THEN RAISE EXCEPTION 'INVALID_USER'; END IF;
  IF _action = 'GET' THEN
    RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'weights', s.weights, 'vols', s.vols,
      'corrs', s.corrs, 'createdAt', s.created_at
    ) ORDER BY s.created_at, s.id), '[]'::jsonb)
    FROM private.learning_simulator_scenarios s WHERE s.user_id = _user_id);
  ELSIF _action = 'POST' THEN
    IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' OR
      _payload->>'name' IS NULL OR length(trim(_payload->>'name')) NOT BETWEEN 1 AND 80 OR
      jsonb_typeof(_payload->'weights') IS DISTINCT FROM 'object' OR
      jsonb_typeof(_payload->'vols') IS DISTINCT FROM 'object' OR
      jsonb_typeof(_payload->'corrs') IS DISTINCT FROM 'object'
      THEN RAISE EXCEPTION 'INVALID_SCENARIO'; END IF;
    -- Serialize writes per user and enforce max 10 even under concurrent requests.
    PERFORM 1 FROM auth.users WHERE id = _user_id FOR UPDATE;
    SELECT count(*) INTO _count FROM private.learning_simulator_scenarios WHERE user_id = _user_id;
    IF _count >= 10 THEN RETURN jsonb_build_object('error','LIMIT_REACHED'); END IF;
    INSERT INTO private.learning_simulator_scenarios(id, user_id, name, weights, vols, corrs)
      VALUES ((_payload->>'id')::uuid, _user_id, trim(_payload->>'name'),
        _payload->'weights', _payload->'vols', _payload->'corrs');
    RETURN jsonb_build_object('saved', true, 'id', _payload->>'id');
  ELSIF _action = 'DELETE' THEN
    IF _scenario_id IS NULL THEN RAISE EXCEPTION 'INVALID_ID'; END IF;
    DELETE FROM private.learning_simulator_scenarios
      WHERE user_id = _user_id AND id = _scenario_id;
    RETURN jsonb_build_object('deleted', FOUND, 'id', _scenario_id);
  END IF;
  RAISE EXCEPTION 'INVALID_ACTION';
END;
$$;
REVOKE ALL ON FUNCTION public.capital_ai_learning_simulator_scenarios(uuid,text,uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capital_ai_learning_simulator_scenarios(uuid,text,uuid,jsonb)
  TO service_role;
