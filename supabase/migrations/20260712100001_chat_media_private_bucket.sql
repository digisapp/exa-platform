-- Private storage bucket for chat media.
--
-- Chat uploads previously went through the generic portfolio pipeline into the
-- public-read "portfolio" bucket, so any chat media URL — including PPV media —
-- was a permanent unauthenticated link once seen (and every chat photo was also
-- cross-posted into the model's public portfolio via content_items). New chat
-- uploads now land here instead; messages.media_url stores the storage PATH and
-- servers hand out short-lived signed URLs per authorized viewer.

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Deliberately NO storage.objects policies for client roles on this bucket:
-- all writes happen via service-generated signed UPLOAD URLs
-- (/api/upload/chat) and all reads via service-generated signed DOWNLOAD URLs
-- (src/lib/chat-media.ts, applied after the per-viewer PPV strip), so the
-- bucket stays fully locked to anon/authenticated clients.
