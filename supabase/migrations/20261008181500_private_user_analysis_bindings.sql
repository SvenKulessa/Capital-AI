-- CAPITAL-AI: personal BYOK/BYOM bindings (configuration only, NEVER execution admission).
-- Uses existing per-user provider Vault. No credentials, tokens or provider payloads are stored here.
CREATE TABLE IF NOT EXISTS private.user_analysis_bindings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id text NOT NULL CHECK (module_id IN (
    'enterprise_scorer','buffett_value_check','market_screener',
    'market_sentiment','sector_rotation','whale_radar','ai_newsfeed'
  )),
  provider text CHECK (provider IS NULL OR provider IN ('kraken','binance','massive')),
  model_provider text CHECK (model_provider IS NULL OR model_provider IN (
    'openai','anthropic','google','ollama','custom'
  )),
  model_id text CHECK (model_id IS NULL OR model_id ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,100}$'),
  binding_enabled boolean NOT NULL DEFAULT true,
  execution_enabled boolean NOT NULL DEFAULT false CHECK (execution_enabled = false),
  data_scope text NOT NULL DEFAULT 'USER_PRIVATE_ANALYSIS'
    CHECK (data_scope = 'USER_PRIVATE_ANALYSIS'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id),
  CONSTRAINT model_configuration_pair CHECK ((model_provider IS NULL) = (model_id IS NULL)),
  CONSTRAINT binding_has_source CHECK (provider IS NOT NULL OR model_provider IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS user_analysis_bindings_user_id_idx
  ON private.user_analysis_bindings (user_id);

ALTER TABLE private.user_analysis_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.user_analysis_bindings FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.user_analysis_bindings TO service_role;

CREATE OR REPLACE FUNCTION public.capital_ai_list_user_analysis_bindings(_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog STABLE
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'moduleId', b.module_id,
    'provider', b.provider,
    'modelProvider', b.model_provider,
    'modelId', b.model_id,
    'bindingEnabled', b.binding_enabled,
    'executionEnabled', false,
    'dataScope', b.data_scope,
    'providerStatus', CASE WHEN b.provider IS NULL THEN 'NOT_CONFIGURED'
      WHEN c.status = 'VERIFIED' THEN 'VERIFIED_PRIVATE'
      ELSE 'NOT_VERIFIED' END,
    'updatedAt', b.updated_at
  ) ORDER BY b.module_id), '[]'::jsonb)
  FROM private.user_analysis_bindings b
  LEFT JOIN private.user_provider_connections c
    ON c.user_id = b.user_id AND c.provider = b.provider
  WHERE b.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.capital_ai_upsert_user_analysis_binding(
  _user_id uuid, _module_id text, _provider text DEFAULT NULL,
  _model_provider text DEFAULT NULL, _model_id text DEFAULT NULL,
  _binding_enabled boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF _user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'INVALID_USER';
  END IF;
  IF _module_id IS NULL OR _module_id NOT IN (
    'enterprise_scorer','buffett_value_check','market_screener',
    'market_sentiment','sector_rotation','whale_radar','ai_newsfeed'
  ) THEN RAISE EXCEPTION 'INVALID_MODULE'; END IF;
  IF _provider IS NOT NULL AND _provider NOT IN ('kraken','binance','massive') THEN
    RAISE EXCEPTION 'INVALID_PROVIDER';
  END IF;
  IF (_model_provider IS NULL) <> (_model_id IS NULL) THEN
    RAISE EXCEPTION 'INVALID_MODEL_PAIR';
  END IF;
  IF _model_provider IS NOT NULL AND (
    _model_provider NOT IN ('openai','anthropic','google','ollama','custom')
    OR _model_id !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,100}$'
  ) THEN RAISE EXCEPTION 'INVALID_MODEL'; END IF;
  IF _provider IS NULL AND _model_provider IS NULL THEN RAISE EXCEPTION 'EMPTY_BINDING'; END IF;
  IF _binding_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_BINDING_STATE'; END IF;
  -- Exact authenticated user + owned, VERIFIED credential is required even for a saved association.
  IF _provider IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM private.user_provider_connections c
    WHERE c.user_id = _user_id AND c.provider = _provider AND c.status = 'VERIFIED'
  ) THEN RAISE EXCEPTION 'PROVIDER_NOT_VERIFIED_FOR_USER'; END IF;

  INSERT INTO private.user_analysis_bindings (
    user_id, module_id, provider, model_provider, model_id, binding_enabled
  ) VALUES (
    _user_id, _module_id, _provider, _model_provider, _model_id, _binding_enabled
  )
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    provider = EXCLUDED.provider,
    model_provider = EXCLUDED.model_provider,
    model_id = EXCLUDED.model_id,
    binding_enabled = EXCLUDED.binding_enabled,
    execution_enabled = false,
    updated_at = now();
  RETURN jsonb_build_object(
    'moduleId', _module_id, 'saved', true,
    'bindingEnabled', _binding_enabled, 'executionEnabled', false
  );
END
$$;

CREATE OR REPLACE FUNCTION public.capital_ai_delete_user_analysis_binding(
  _user_id uuid, _module_id text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF _user_id IS NULL OR _module_id IS NULL THEN RAISE EXCEPTION 'INVALID_ARGUMENT'; END IF;
  DELETE FROM private.user_analysis_bindings
   WHERE user_id = _user_id AND module_id = _module_id;
  RETURN jsonb_build_object('deleted', true, 'moduleId', _module_id);
END
$$;

-- SECURITY DEFINER functions must not be directly callable with anon/user JWTs.
REVOKE ALL ON FUNCTION public.capital_ai_list_user_analysis_bindings(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capital_ai_upsert_user_analysis_binding(uuid,text,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capital_ai_delete_user_analysis_binding(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capital_ai_list_user_analysis_bindings(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.capital_ai_upsert_user_analysis_binding(uuid,text,text,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.capital_ai_delete_user_analysis_binding(uuid,text) TO service_role;
