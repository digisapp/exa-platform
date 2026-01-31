-- =============================================
-- EXA SWIM SHOP - Database Schema
-- Marketplace for swimwear brands
-- =============================================

-- Shop Brands (the 50+ swimwear companies)
CREATE TABLE shop_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Payout information
  payout_email TEXT, -- PayPal or bank email
  stripe_account_id TEXT, -- For Stripe Connect payouts

  -- Settings
  commission_rate DECIMAL(5,2) DEFAULT 30.00, -- EXA's cut (%)
  model_commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Model affiliate cut (%)
  ships_internationally BOOLEAN DEFAULT false,
  avg_ship_days INTEGER DEFAULT 5,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'suspended')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop Categories
CREATE TABLE shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES shop_categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default swimwear categories
INSERT INTO shop_categories (name, slug, sort_order) VALUES
  ('Bikinis', 'bikinis', 1),
  ('One-Pieces', 'one-pieces', 2),
  ('Cover-Ups', 'cover-ups', 3),
  ('Resort Wear', 'resort-wear', 4),
  ('Accessories', 'accessories', 5);

-- Shop Products
CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES shop_brands(id) ON DELETE CASCADE,
  category_id UUID REFERENCES shop_categories(id),

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Pricing (in cents to avoid floating point issues)
  wholesale_price INTEGER NOT NULL, -- What we pay brand
  retail_price INTEGER NOT NULL, -- What customer pays
  compare_at_price INTEGER, -- Original price for "sale" display

  -- Media
  images TEXT[] DEFAULT '{}', -- Array of image URLs

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Inventory tracking
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,

  -- Stats
  total_sold INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, slug)
);

-- Product Variants (size/color combinations)
CREATE TABLE shop_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,

  -- Variant details
  sku TEXT NOT NULL UNIQUE,
  size TEXT NOT NULL,
  color TEXT,
  color_hex TEXT, -- For color swatch display

  -- Inventory
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,

  -- Price override (if different from product)
  price_override INTEGER,

  -- Variant-specific image
  image_url TEXT,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping Cart (stored for logged-in users)
CREATE TABLE shop_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For guest carts

  -- Affiliate tracking
  affiliate_model_id UUID REFERENCES models(id),
  affiliate_code TEXT,

  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart Items
CREATE TABLE shop_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES shop_carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES shop_product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cart_id, variant_id)
);

-- Orders
CREATE TABLE shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- Human readable: EXA-240131-XXXX

  -- Customer
  user_id UUID REFERENCES auth.users(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,

  -- Shipping address
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',

  -- Billing (if different)
  billing_same_as_shipping BOOLEAN DEFAULT true,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,

  -- Totals (in cents)
  subtotal INTEGER NOT NULL,
  shipping_cost INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,

  -- Payment
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  paid_at TIMESTAMPTZ,

  -- Affiliate
  affiliate_model_id UUID REFERENCES models(id),
  affiliate_code TEXT,
  affiliate_commission INTEGER DEFAULT 0, -- Amount model earns

  -- Order status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'processing',
    'partially_shipped', 'shipped', 'delivered',
    'cancelled', 'refund_requested'
  )),

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items (each item from potentially different brands)
CREATE TABLE shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES shop_product_variants(id),
  brand_id UUID NOT NULL REFERENCES shop_brands(id),

  -- Snapshot at time of order (prices can change)
  product_name TEXT NOT NULL,
  variant_sku TEXT NOT NULL,
  variant_size TEXT NOT NULL,
  variant_color TEXT,

  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL, -- Retail price per item
  wholesale_price INTEGER NOT NULL, -- What we pay brand per item
  line_total INTEGER NOT NULL, -- unit_price * quantity

  -- Fulfillment (per item, since brands ship separately)
  fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN (
    'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'
  )),
  shipped_at TIMESTAMPTZ,
  tracking_number TEXT,
  tracking_carrier TEXT,
  delivered_at TIMESTAMPTZ,

  -- For returns/issues
  return_status TEXT CHECK (return_status IN ('none', 'requested', 'approved', 'received', 'credited')),
  return_reason TEXT,
  store_credit_issued INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Payouts (what we owe brands after orders)
CREATE TABLE shop_brand_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES shop_brands(id),

  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Amounts (in cents)
  gross_sales INTEGER NOT NULL, -- Total retail value
  our_commission INTEGER NOT NULL, -- EXA's cut
  affiliate_commission INTEGER NOT NULL, -- Model cuts
  net_payout INTEGER NOT NULL, -- What brand receives

  -- Order references
  order_item_ids UUID[] NOT NULL,
  order_count INTEGER NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),

  -- Payment details
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model Affiliate Earnings
CREATE TABLE shop_affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id),
  order_id UUID NOT NULL REFERENCES shop_orders(id),
  order_item_id UUID REFERENCES shop_order_items(id),

  -- Earnings
  order_total INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount INTEGER NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),

  -- Pending until order is delivered + hold period
  available_at TIMESTAMPTZ, -- When it can be withdrawn
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model Affiliate Codes (custom URLs)
CREATE TABLE shop_affiliate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id),
  code TEXT UNIQUE NOT NULL, -- e.g., "SARAH20" or username

  -- Optional discount for customers
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER, -- Percentage or cents

  -- Stats
  click_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product-Model associations (products a model has worn/promoted)
CREATE TABLE shop_model_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id),
  product_id UUID NOT NULL REFERENCES shop_products(id),

  -- Context
  worn_at_event TEXT, -- e.g., "Miami Swim Week 2024"
  photo_urls TEXT[], -- Photos of model wearing the product
  is_favorite BOOLEAN DEFAULT false, -- Model's curated picks

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(model_id, product_id)
);

-- Store Credit (for returns)
CREATE TABLE shop_store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Amount
  original_amount INTEGER NOT NULL,
  remaining_amount INTEGER NOT NULL,

  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('return', 'gift', 'compensation', 'promo')),
  source_order_id UUID REFERENCES shop_orders(id),
  reason TEXT,

  -- Validity
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  new_number := 'EXA-' || date_part || '-' || random_part;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_shop_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_brands_timestamp
  BEFORE UPDATE ON shop_brands
  FOR EACH ROW EXECUTE FUNCTION update_shop_timestamp();

CREATE TRIGGER update_shop_products_timestamp
  BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION update_shop_timestamp();

CREATE TRIGGER update_shop_product_variants_timestamp
  BEFORE UPDATE ON shop_product_variants
  FOR EACH ROW EXECUTE FUNCTION update_shop_timestamp();

CREATE TRIGGER update_shop_orders_timestamp
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW EXECUTE FUNCTION update_shop_timestamp();

-- Indexes for performance
CREATE INDEX idx_shop_products_brand ON shop_products(brand_id);
CREATE INDEX idx_shop_products_category ON shop_products(category_id);
CREATE INDEX idx_shop_products_active ON shop_products(is_active) WHERE is_active = true;
CREATE INDEX idx_shop_product_variants_product ON shop_product_variants(product_id);
CREATE INDEX idx_shop_product_variants_sku ON shop_product_variants(sku);
CREATE INDEX idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_affiliate ON shop_orders(affiliate_model_id);
CREATE INDEX idx_shop_order_items_order ON shop_order_items(order_id);
CREATE INDEX idx_shop_order_items_brand ON shop_order_items(brand_id);
CREATE INDEX idx_shop_affiliate_earnings_model ON shop_affiliate_earnings(model_id);
CREATE INDEX idx_shop_affiliate_codes_model ON shop_affiliate_codes(model_id);
CREATE INDEX idx_shop_affiliate_codes_code ON shop_affiliate_codes(code);

-- RLS Policies

-- Brands: public read for active, brand owners can manage their own
ALTER TABLE shop_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active brands"
  ON shop_brands FOR SELECT
  USING (status = 'active');

-- Products: public read for active
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON shop_products FOR SELECT
  USING (is_active = true);

-- Variants: public read for active
ALTER TABLE shop_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active variants"
  ON shop_product_variants FOR SELECT
  USING (is_active = true);

-- Orders: users can only see their own
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON shop_orders FOR SELECT
  USING (auth.uid() = user_id);

-- Affiliate earnings: models can see their own
ALTER TABLE shop_affiliate_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models can view own earnings"
  ON shop_affiliate_earnings FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Store credits: users can see their own
ALTER TABLE shop_store_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store credits"
  ON shop_store_credits FOR SELECT
  USING (auth.uid() = user_id);
