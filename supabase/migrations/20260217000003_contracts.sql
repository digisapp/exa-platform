-- Contract/Agreement Workflow
-- Two tables: contract_templates (system templates) + contracts (sent to models)

-- ============================================================
-- Table: contract_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('model_release', 'nda', 'booking_terms')),
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT true,
  brand_id UUID REFERENCES public.actors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed system templates
INSERT INTO public.contract_templates (name, slug, description, category, content, is_system) VALUES
('Model Release', 'model_release', 'Standard model release for photo/video usage rights', 'model_release',
'<h2>Model Release Agreement</h2>
<p>This Model Release Agreement (&ldquo;Agreement&rdquo;) is entered into as of <strong>{{date}}</strong> by and between:</p>
<p><strong>Client:</strong> {{brand_name}}</p>
<p><strong>Model:</strong> {{model_name}}</p>

<h3>1. Grant of Rights</h3>
<p>The Model hereby grants to the Client, and the Client''s assigns, licensees, and successors, the irrevocable and unrestricted right to use and publish photographs or video of the Model, or in which the Model may be included, for editorial, trade, advertising, and any other purpose and in any manner and medium.</p>

<h3>2. Usage</h3>
<p>The Client may use the images in print, digital, social media, website, advertising, and any other medium now known or hereafter developed.</p>

<h3>3. Compensation</h3>
<p>The Model acknowledges that compensation, if any, has been agreed upon separately and that this release is not contingent upon any payment beyond what has been agreed.</p>

<h3>4. Release</h3>
<p>The Model releases and discharges the Client from any and all claims arising out of or in connection with the use of the photographs or video, including but not limited to claims for defamation or invasion of privacy.</p>

<p><em>By signing below, the Model acknowledges reading and agreeing to the terms of this Model Release.</em></p>', true),

('Non-Disclosure Agreement', 'nda', 'Confidentiality agreement for brand partnerships', 'nda',
'<h2>Non-Disclosure Agreement</h2>
<p>This Non-Disclosure Agreement (&ldquo;Agreement&rdquo;) is entered into as of <strong>{{date}}</strong> by and between:</p>
<p><strong>Disclosing Party:</strong> {{brand_name}}</p>
<p><strong>Receiving Party:</strong> {{model_name}}</p>

<h3>1. Confidential Information</h3>
<p>The Receiving Party agrees to hold in confidence all information disclosed by the Disclosing Party relating to upcoming campaigns, products, events, strategies, or any other business information designated as confidential.</p>

<h3>2. Obligations</h3>
<p>The Receiving Party shall not disclose, publish, or otherwise reveal any Confidential Information to any third party without prior written consent.</p>

<h3>3. Duration</h3>
<p>This Agreement shall remain in effect for a period of one (1) year from the date of signing.</p>

<h3>4. Return of Materials</h3>
<p>Upon termination of this Agreement, the Receiving Party shall return or destroy all materials containing Confidential Information.</p>

<p><em>By signing below, both parties acknowledge reading and agreeing to the terms of this NDA.</em></p>', true),

('Booking Terms & Conditions', 'booking_terms', 'Terms and conditions for booking engagements', 'booking_terms',
'<h2>Booking Terms &amp; Conditions</h2>
<p>This Agreement is entered into as of <strong>{{date}}</strong> by and between:</p>
<p><strong>Client:</strong> {{brand_name}}</p>
<p><strong>Model:</strong> {{model_name}}</p>

<h3>1. Services</h3>
<p>The Model agrees to provide modeling services as described in the associated booking details on the EXA Models platform.</p>

<h3>2. Cancellation Policy</h3>
<p>Either party may cancel with at least 48 hours notice. Late cancellations may result in forfeiture of deposit or partial payment.</p>

<h3>3. Conduct</h3>
<p>Both parties agree to conduct themselves professionally. The Model reserves the right to refuse any direction that makes them uncomfortable.</p>

<h3>4. Payment</h3>
<p>Payment terms are as agreed upon in the booking details on the EXA Models platform. All coin transactions are governed by EXA Models'' terms of service.</p>

<h3>5. Intellectual Property</h3>
<p>Unless otherwise agreed, the Client retains rights to images produced during the booking for the purposes outlined in the booking description.</p>

<p><em>By signing below, both parties acknowledge reading and agreeing to these Booking Terms &amp; Conditions.</em></p>', true);

-- ============================================================
-- Table: contracts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  pdf_storage_path TEXT,
  pdf_url TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft', 'sent', 'signed', 'voided')),
  signed_at TIMESTAMPTZ,
  signer_name TEXT,
  signer_ip TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_contracts_brand_id ON public.contracts(brand_id);
CREATE INDEX idx_contracts_model_id ON public.contracts(model_id);
CREATE INDEX idx_contracts_booking_id ON public.contracts(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_contracts_offer_id ON public.contracts(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_created_at ON public.contracts(created_at DESC);

-- ============================================================
-- Auto-update trigger for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_updated_at();

-- ============================================================
-- RLS: contract_templates
-- ============================================================
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system templates" ON public.contract_templates
  FOR SELECT TO authenticated
  USING (is_system = true);

CREATE POLICY "Admins can manage all templates" ON public.contract_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- ============================================================
-- RLS: contracts
-- ============================================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can view own contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    brand_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'brand')
  );

CREATE POLICY "Models can view contracts sent to them" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = contracts.model_id AND models.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can create contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'brand')
  );

CREATE POLICY "Brands can update own contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    brand_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'brand')
  );

CREATE POLICY "Models can sign contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = contracts.model_id AND models.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );
