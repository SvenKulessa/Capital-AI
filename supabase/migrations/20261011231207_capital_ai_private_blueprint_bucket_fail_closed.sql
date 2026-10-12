-- CAPITAL-AI proprietary blueprint assets: private, fail closed.
-- This creates only a bucket. No public download, policy, API, role grant,
-- customer entitlement or provider integration is enabled.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'capital-ai-proprietary-blueprints') THEN
    RAISE EXCEPTION 'BUCKET_ALREADY_EXISTS_REVIEW_CONFIGURATION';
  END IF;
  INSERT INTO storage.buckets
    (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    (
      'capital-ai-proprietary-blueprints',
      'capital-ai-proprietary-blueprints',
      false,
      20971520,
      ARRAY[
        'text/markdown',
        'text/plain',
        'application/json',
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'text/yaml',
        'application/x-yaml'
      ]::text[]
    );
END $$;