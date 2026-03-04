-- X Lead Discovery: stores brands and hotels/resorts found via xAI X search
CREATE TABLE x_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('swimwear_brand', 'hotel_resort')),
  brand_name text,
  x_handle text,
  tweet_text text NOT NULL,
  tweet_url text,
  tweet_id text UNIQUE,
  author_followers integer,
  search_query text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'contacted', 'pass')),
  notes text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_x_leads_category ON x_leads(category);
CREATE INDEX idx_x_leads_status ON x_leads(status);
CREATE INDEX idx_x_leads_discovered_at ON x_leads(discovered_at DESC);

-- Admins only — no public access
ALTER TABLE x_leads ENABLE ROW LEVEL SECURITY;
