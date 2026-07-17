-- Saved copies of model-generated comp cards so admins can view the actual
-- card from /admin/comp-card-leads. Previously only comp_card_exported_at was
-- stamped; the PDF/JPEGs were generated client-side and never stored.
--
-- Private bucket, same convention as chat-media/content-media: deliberately NO
-- storage.objects policies for client roles — writes go through
-- service-generated signed upload URLs (/api/comp-card-creator/save-card) and
-- reads through service-generated signed download URLs (admin exports API), so
-- the bucket stays fully locked to anon/authenticated clients. Cards can carry
-- real names, which are admin-only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('comp-cards', 'comp-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Latest saved card per model, storage paths keyed by asset:
-- { "pdf": "<path>", "front": "<path>", "back": "<path>", "saved_at": "<iso>" }
ALTER TABLE models ADD COLUMN IF NOT EXISTS comp_card_assets jsonb;
