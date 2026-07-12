-- Private storage bucket for paid (exclusive/PPV) content media.
--
-- Exclusive content_items previously stored their full-resolution media in the
-- public-read "portfolio" bucket, so the media_url revealed on unlock — or
-- grabbed from the network tab / a shared link — was a permanent
-- unauthenticated URL: URL secrecy was the only protection on paid content.
-- New EXCLUSIVE uploads now land here instead; content_items.media_url stores
-- the storage PATH (prefixed "exclusive/") and servers hand out short-lived
-- signed URLs to authorized viewers only (buyer, owner, admin). The blurred
-- low-res preview stays in the public portfolio bucket — it is the public
-- teaser, that's its job. Free/portfolio uploads are public content and are
-- unchanged. See src/lib/content-media.ts for the full URL convention.

INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', false)
ON CONFLICT (id) DO NOTHING;

-- Deliberately NO storage.objects policies for client roles on this bucket:
-- all writes happen via service-generated signed UPLOAD URLs
-- (/api/upload/signed-url with exclusive=true) and all reads via
-- service-generated signed DOWNLOAD URLs issued only after the server has
-- verified the viewer is authorized (purchase row, owning model, or admin),
-- so the bucket stays fully locked to anon/authenticated clients.
