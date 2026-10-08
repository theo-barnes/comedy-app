-- Originals and prepared bytes stay private. Only backend-produced display pixels are public.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('gig-poster-originals', 'gig-poster-originals', false, 20971520,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('gig-poster-display', 'gig-poster-display', true, 20971520,
   ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Restrictive policies also defeat any pre-existing broad permissive app policy.
-- No permissive app policy is added: scoped, non-upsert signed uploads are issued
-- by the backend service role. Public bucket delivery does not use SELECT RLS.
CREATE POLICY gig_poster_app_read_guard ON storage.objects
  AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (bucket_id NOT IN ('gig-poster-originals', 'gig-poster-display'));

CREATE POLICY gig_poster_app_insert_guard ON storage.objects
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id NOT IN ('gig-poster-originals', 'gig-poster-display'));

CREATE POLICY gig_poster_app_update_guard ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id NOT IN ('gig-poster-originals', 'gig-poster-display'))
  WITH CHECK (bucket_id NOT IN ('gig-poster-originals', 'gig-poster-display'));

CREATE POLICY gig_poster_app_delete_guard ON storage.objects
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id NOT IN ('gig-poster-originals', 'gig-poster-display'));
