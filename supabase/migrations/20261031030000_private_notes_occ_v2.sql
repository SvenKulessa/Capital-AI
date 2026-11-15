-- CAPITAL_AI_PRIVATE_NOTES_OCC@2
-- Additive, transactional migration. The legacy RPC becomes read-only.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('private.dashboard_notes') IS NULL OR
     to_regprocedure('public.capital_ai_private_notes(uuid,text,text)') IS NULL THEN
    RAISE EXCEPTION 'notes_schema_missing' USING ERRCODE = '22023';
  END IF;
END
$$;

ALTER TABLE private.dashboard_notes
  ADD COLUMN revision bigint NOT NULL DEFAULT 1;
ALTER TABLE private.dashboard_notes
  ADD CONSTRAINT dashboard_notes_revision_positive CHECK (revision >= 1);

CREATE FUNCTION public.capital_ai_private_notes_v2(
  _user_id uuid,
  _action text DEFAULT 'GET',
  _notes text DEFAULT NULL,
  _expected_revision text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $occ$
DECLARE
  v_expected bigint;
  v_notes text;
  v_revision bigint;
BEGIN
  IF _user_id IS NULL OR _action IS NULL OR _action NOT IN ('GET', 'PUT') THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;
  IF _action = 'GET' THEN
    SELECT n.notes, n.revision INTO v_notes, v_revision
      FROM private.dashboard_notes n WHERE n.user_id = _user_id;
    RETURN jsonb_build_object('status','ok',
      'notes',coalesce(v_notes,''),'revision',coalesce(v_revision,0)::text);
  END IF;

  IF _notes IS NULL OR char_length(_notes) > 10000 OR
     _expected_revision IS NULL OR
     _expected_revision !~ '^(0|[1-9][0-9]{0,18})$' THEN
    RAISE EXCEPTION 'invalid_notes_request' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_expected := _expected_revision::bigint;
  EXCEPTION WHEN numeric_value_out_of_range OR invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_revision' USING ERRCODE = '22023';
  END;
  IF v_expected = 9223372036854775807 THEN
    RAISE EXCEPTION 'revision_exhausted' USING ERRCODE = '22023';
  END IF;

  IF v_expected = 0 THEN
    INSERT INTO private.dashboard_notes (user_id, notes, revision)
      VALUES (_user_id,_notes,1)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING notes,revision INTO v_notes,v_revision;
  ELSE
    UPDATE private.dashboard_notes n
       SET notes=_notes, revision=n.revision+1, updated_at=now()
     WHERE n.user_id=_user_id AND n.revision=v_expected
      RETURNING n.notes,n.revision INTO v_notes,v_revision;
  END IF;
  IF v_revision IS NOT NULL THEN
    RETURN jsonb_build_object('status','saved','notes',v_notes,
      'revision',v_revision::text);
  END IF;

  SELECT n.notes,n.revision INTO v_notes,v_revision
    FROM private.dashboard_notes n WHERE n.user_id=_user_id;
  RETURN jsonb_build_object('status','conflict',
    'notes',coalesce(v_notes,''),'revision',coalesce(v_revision,0)::text);
END
$occ$;

REVOKE ALL ON FUNCTION public.capital_ai_private_notes_v2(uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capital_ai_private_notes_v2(uuid,text,text,text)
  TO service_role;

-- Keep the old read contract but disallow all legacy writes.
CREATE OR REPLACE FUNCTION public.capital_ai_private_notes(
  _user_id uuid, _notes text DEFAULT NULL, _action text DEFAULT 'GET'
)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $legacy$
BEGIN
  IF _user_id IS NULL OR _action IS DISTINCT FROM 'GET' THEN
    RAISE EXCEPTION 'notes_revision_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(
    (SELECT n.notes FROM private.dashboard_notes n WHERE n.user_id=_user_id),
    '');
END
$legacy$;
REVOKE ALL ON FUNCTION public.capital_ai_private_notes(uuid,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capital_ai_private_notes(uuid,text,text)
  TO service_role;
COMMIT;
