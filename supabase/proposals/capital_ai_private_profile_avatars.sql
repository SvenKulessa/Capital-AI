-- Review-only proposal. NOT applied to production by this PR.
-- Private storage; all operations are via authenticated server proxy after
-- session verification, mandatory local ClamAV and image re-encoding.
-- No browser RLS policies (especially no INSERT/UPDATE/DELETE) are granted.
-- Before activation audit existing broad storage.objects policies: those must
-- not accidentally grant access to this bucket.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='capital-ai-profile-avatars') THEN
   RAISE EXCEPTION 'PROFILE_AVATAR_BUCKET_ALREADY_EXISTS_REVIEW';
 END IF;
 INSERT INTO storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
 VALUES ('capital-ai-profile-avatars','capital-ai-profile-avatars',false,
          524288, ARRAY['image/png']::text[]);
END $$;
-- No GRANT, signed public URLs, service-role in browser, or automatic schema cutover.
