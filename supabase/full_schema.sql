-- ==========================================
-- FILE: 001_initial_schema.sql
-- ==========================================
-- 001_initial_schema.sql

-- Setup trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-------------------------------------------------------------------------------
-- 1. users
-------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    email TEXT,
    role TEXT CHECK (role IN ('artisan', 'buyer', 'facilitator')),
    display_name TEXT,
    preferred_language TEXT CHECK (preferred_language IN ('en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur')),
    guidance_level TEXT CHECK (guidance_level IN ('beginner', 'intermediate', 'experienced')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Anyone can read artisan basic profiles" ON users FOR SELECT USING (role = 'artisan');
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);


-------------------------------------------------------------------------------
-- 2. artisan_profiles
-------------------------------------------------------------------------------
CREATE TABLE artisan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artisan_name TEXT,
    business_name TEXT,
    craft_type TEXT,
    craft_category TEXT,
    location TEXT,
    cooperative_name TEXT,
    profile_photo_url TEXT,
    craft_story TEXT,
    years_experience INTEGER,
    production_capacity TEXT,
    verification_status TEXT CHECK (verification_status IN ('self_declared', 'facilitator_reviewed', 'cooperative_verified', 'documentation_pending')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_artisan_profiles_user_id ON artisan_profiles(user_id);

CREATE TRIGGER update_artisan_profiles_updated_at
BEFORE UPDATE ON artisan_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE artisan_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can manage own profile" ON artisan_profiles FOR ALL USING (user_id = auth.uid());



-------------------------------------------------------------------------------
-- 3. products
-------------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    category TEXT,
    tags TEXT[],
    materials JSONB,
    care_instructions TEXT,
    dimensions TEXT,
    stock_quantity INTEGER,
    moq INTEGER,
    lead_time_days INTEGER,
    price NUMERIC,
    min_safe_price NUMERIC,
    suggested_price NUMERIC,
    status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
    customisation_available BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_artisan_id ON products(artisan_id);
CREATE INDEX idx_products_status ON products(status);

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can manage own products" ON products FOR ALL USING (artisan_id = auth.uid());
CREATE POLICY "Anyone can view published products" ON products FOR SELECT USING (status = 'published');


-------------------------------------------------------------------------------
-- 4. product_images
-------------------------------------------------------------------------------
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false,
    original_url TEXT,
    enhanced_url TEXT,
    quality_score INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can manage own product images" ON product_images FOR ALL 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.artisan_id = auth.uid()));

CREATE POLICY "Anyone can view images of published products" ON product_images FOR SELECT 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.status = 'published'));


-------------------------------------------------------------------------------
-- 5. voice_records
-------------------------------------------------------------------------------
CREATE TABLE voice_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    language TEXT CHECK (language IN ('en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur')),
    duration_seconds NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_records_product_id ON voice_records(product_id);
CREATE INDEX idx_voice_records_user_id ON voice_records(user_id);

ALTER TABLE voice_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own voice records" ON voice_records FOR ALL USING (user_id = auth.uid());


-------------------------------------------------------------------------------
-- 6. voice_transcripts
-------------------------------------------------------------------------------
CREATE TABLE voice_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_record_id UUID NOT NULL REFERENCES voice_records(id) ON DELETE CASCADE,
    original_text TEXT,
    original_language TEXT CHECK (original_language IN ('en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur')),
    translated_text TEXT,
    translated_language TEXT CHECK (translated_language IN ('en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur')),
    ai_generated_title TEXT,
    ai_generated_description TEXT,
    ai_generated_category TEXT,
    ai_generated_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_transcripts_voice_record_id ON voice_transcripts(voice_record_id);

ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own voice transcripts" ON voice_transcripts FOR ALL 
USING (EXISTS (SELECT 1 FROM voice_records vr WHERE vr.id = voice_record_id AND vr.user_id = auth.uid()));


-------------------------------------------------------------------------------
-- 7. pricing_inputs
-------------------------------------------------------------------------------
CREATE TABLE pricing_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_costs JSONB,
    labor_hours NUMERIC,
    labor_rate NUMERIC,
    packaging_cost NUMERIC,
    overhead_cost NUMERIC,
    logistics_cost NUMERIC,
    profit_margin_percent NUMERIC,
    calculated_min_price NUMERIC,
    calculated_suggested_price NUMERIC,
    price_range_low NUMERIC,
    price_range_high NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_inputs_product_id ON pricing_inputs(product_id);

CREATE TRIGGER update_pricing_inputs_updated_at
BEFORE UPDATE ON pricing_inputs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pricing_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can manage own pricing inputs" ON pricing_inputs FOR ALL 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.artisan_id = auth.uid()));


-------------------------------------------------------------------------------
-- 8. product_passports
-------------------------------------------------------------------------------
CREATE TABLE product_passports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qr_code_url TEXT,
    shareable_url TEXT,
    passport_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_passports_product_id ON product_passports(product_id);

ALTER TABLE product_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can manage own product passports" ON product_passports FOR ALL 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.artisan_id = auth.uid()));

CREATE POLICY "Anyone can view passports of published products" ON product_passports FOR SELECT 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.status = 'published'));


-------------------------------------------------------------------------------
-- 9. buyer_enquiries
-------------------------------------------------------------------------------
CREATE TABLE buyer_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER,
    budget NUMERIC,
    delivery_deadline TIMESTAMPTZ,
    customisation_request TEXT,
    status TEXT CHECK (status IN ('new', 'viewed', 'responded', 'closed')) DEFAULT 'new',
    artisan_response TEXT CHECK (artisan_response IN ('interested', 'need_details', 'cannot_fulfil')),
    artisan_response_note TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buyer_enquiries_product_id ON buyer_enquiries(product_id);
CREATE INDEX idx_buyer_enquiries_buyer_id ON buyer_enquiries(buyer_id);
CREATE INDEX idx_buyer_enquiries_artisan_id ON buyer_enquiries(artisan_id);

CREATE TRIGGER update_buyer_enquiries_updated_at
BEFORE UPDATE ON buyer_enquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE buyer_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own enquiries" ON buyer_enquiries FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Artisans can view received enquiries" ON buyer_enquiries FOR SELECT USING (artisan_id = auth.uid());
CREATE POLICY "Buyers can insert enquiries" ON buyer_enquiries FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Buyers can update own enquiries" ON buyer_enquiries FOR UPDATE USING (buyer_id = auth.uid());
CREATE POLICY "Artisans can update received enquiries" ON buyer_enquiries FOR UPDATE USING (artisan_id = auth.uid());
CREATE POLICY "Buyers can delete own enquiries" ON buyer_enquiries FOR DELETE USING (buyer_id = auth.uid());


-------------------------------------------------------------------------------
-- 10. notifications
-------------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (user_id = auth.uid());


-------------------------------------------------------------------------------
-- 11. facilitator_reviews
-------------------------------------------------------------------------------
CREATE TABLE facilitator_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facilitator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    review_status TEXT CHECK (review_status IN ('pending', 'approved', 'needs_changes')),
    notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_facilitator_reviews_facilitator_id ON facilitator_reviews(facilitator_id);
CREATE INDEX idx_facilitator_reviews_product_id ON facilitator_reviews(product_id);

ALTER TABLE facilitator_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can view their product reviews" ON facilitator_reviews FOR SELECT 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.artisan_id = auth.uid()));

CREATE POLICY "Facilitators can view and manage their reviews" ON facilitator_reviews FOR ALL 
USING (facilitator_id = auth.uid() AND EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'facilitator'));


-------------------------------------------------------------------------------
-- 12. guidance_workflows
-------------------------------------------------------------------------------
CREATE TABLE guidance_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_key TEXT UNIQUE NOT NULL,
    title_en TEXT,
    title_ta TEXT,
    title_hi TEXT,
    title_te TEXT,
    title_kn TEXT,
    title_ml TEXT,
    title_bn TEXT,
    title_mr TEXT,
    title_ur TEXT,
    target_role TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_guidance_workflows_updated_at
BEFORE UPDATE ON guidance_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE guidance_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active guidance workflows" ON guidance_workflows FOR SELECT USING (is_active = true);


-------------------------------------------------------------------------------
-- 13. guidance_steps
-------------------------------------------------------------------------------
CREATE TABLE guidance_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES guidance_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    screen_name TEXT,
    target_id TEXT,
    gesture_type TEXT CHECK (gesture_type IN ('point', 'tap', 'swipe', 'scroll', 'highlight', 'wait', 'success')),
    instruction_en TEXT,
    instruction_ta TEXT,
    instruction_hi TEXT,
    instruction_te TEXT,
    instruction_kn TEXT,
    instruction_ml TEXT,
    instruction_bn TEXT,
    instruction_mr TEXT,
    instruction_ur TEXT,
    expected_event TEXT,
    expected_condition TEXT,
    fallback_instruction_en TEXT,
    fallback_instruction_ta TEXT,
    fallback_instruction_hi TEXT,
    fallback_instruction_te TEXT,
    fallback_instruction_kn TEXT,
    fallback_instruction_ml TEXT,
    fallback_instruction_bn TEXT,
    fallback_instruction_mr TEXT,
    fallback_instruction_ur TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guidance_steps_workflow_id ON guidance_steps(workflow_id);

CREATE TRIGGER update_guidance_steps_updated_at
BEFORE UPDATE ON guidance_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE guidance_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guidance steps" ON guidance_steps FOR SELECT USING (true);


-------------------------------------------------------------------------------
-- 14. user_guidance_progress
-------------------------------------------------------------------------------
CREATE TABLE user_guidance_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES guidance_workflows(id) ON DELETE CASCADE,
    workflow_version INTEGER,
    current_step_id UUID REFERENCES guidance_steps(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('not_started', 'active', 'paused', 'skipped', 'completed')) DEFAULT 'not_started',
    guidance_level TEXT CHECK (guidance_level IN ('beginner', 'intermediate', 'experienced')),
    dont_show_again BOOLEAN DEFAULT false,
    last_shown_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    skipped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, workflow_id)
);

CREATE INDEX idx_user_guidance_progress_user_id ON user_guidance_progress(user_id);
CREATE INDEX idx_user_guidance_progress_workflow_id ON user_guidance_progress(workflow_id);

CREATE TRIGGER update_user_guidance_progress_updated_at
BEFORE UPDATE ON user_guidance_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_guidance_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own guidance progress" ON user_guidance_progress FOR ALL USING (user_id = auth.uid());


-------------------------------------------------------------------------------
-- 15. guidance_events
-------------------------------------------------------------------------------
CREATE TABLE guidance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES guidance_workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES guidance_steps(id) ON DELETE SET NULL,
    event_type TEXT CHECK (event_type IN ('GUIDE_STARTED', 'GUIDE_STEP_VIEWED', 'GUIDE_STEP_COMPLETED', 'GUIDE_PAUSED', 'GUIDE_RESUMED', 'GUIDE_SKIPPED', 'GUIDE_REPLAYED', 'GUIDE_COMPLETED', 'GUIDE_TARGET_NOT_FOUND', 'GUIDE_ERROR')),
    screen_name TEXT,
    target_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guidance_events_user_id ON guidance_events(user_id);
CREATE INDEX idx_guidance_events_workflow_id ON guidance_events(workflow_id);

ALTER TABLE guidance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own guidance events" ON guidance_events FOR ALL USING (user_id = auth.uid());

-- Deferred policies
CREATE POLICY "Anyone can view artisan profiles of published products" ON artisan_profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM products p 
        WHERE p.artisan_id = artisan_profiles.user_id AND p.status = 'published'
    )
);


-- ==========================================
-- FILE: 002_auth_user_sync.sql
-- ==========================================
-- 002_auth_user_sync.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role, preferred_language, guidance_level)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    NULL,
    'en',
    'beginner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (idempotent)
INSERT INTO public.users (id, email, phone, role, preferred_language, guidance_level)
SELECT id, email, phone, NULL, 'en', 'beginner'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- FILE: 003_users_grants.sql
-- ==========================================
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;


-- ==========================================
-- FILE: 004_create_storage_buckets.sql
-- ==========================================
-- 004_create_storage_buckets.sql

-- 1. Create the profile-photos bucket and make it public
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to profile-photos
CREATE POLICY "Public read access for profile-photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile-photos');

-- 3. Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'profile-photos' 
    AND name LIKE (auth.uid()::text || '_%')
);

-- 4. Allow authenticated users to update their own profile photos
CREATE POLICY "Users can update their own profile photos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'profile-photos' 
    AND name LIKE (auth.uid()::text || '_%')
);

-- 5. Allow authenticated users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'profile-photos' 
    AND name LIKE (auth.uid()::text || '_%')
);


-- ==========================================
-- FILE: 005_authenticated_table_grants.sql
-- ==========================================
-- 005_authenticated_table_grants.sql

-- Grant full CRUD base privileges for operational tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artisan_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_transcripts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_passports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_enquiries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilitator_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_guidance_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_events TO authenticated;

-- Grant Read-Only base privileges for configuration tables to authenticated users
GRANT SELECT ON public.guidance_workflows TO authenticated;
GRANT SELECT ON public.guidance_steps TO authenticated;


-- ==========================================
-- FILE: 006_public_passports_and_storage.sql
-- ==========================================
-- 006_public_passports_and_storage.sql

-- 1. Create qr-codes bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for qr-codes
CREATE POLICY "Public read access for qr-codes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'qr-codes');

CREATE POLICY "Authenticated users can manage qr-codes" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'qr-codes');

-- 3. Grants for anon to read passports and published products
-- This allows the unauthenticated backend client to fetch public passport data
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_passports TO anon;


-- ==========================================
-- FILE: 012_market_price_cache.sql
-- ==========================================
CREATE TABLE market_price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_signature TEXT UNIQUE NOT NULL,
    price_low NUMERIC(10,2),
    price_high NUMERIC(10,2),
    price_median NUMERIC(10,2),
    source_listings JSONB,
    fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_market_price_cache_query_signature ON market_price_cache(query_signature);

ALTER TABLE pricing_inputs 
ADD COLUMN market_price_low NUMERIC(10,2) NULL,
ADD COLUMN market_price_high NUMERIC(10,2) NULL,
ADD COLUMN market_price_reasoning TEXT NULL,
ADD COLUMN market_data_source TEXT DEFAULT 'live_search',
ADD COLUMN market_sample_listings JSONB NULL,
ADD COLUMN final_price_basis TEXT NULL;

ALTER TABLE pricing_inputs
ADD CONSTRAINT check_final_price_basis 
CHECK (final_price_basis IS NULL OR final_price_basis IN ('cost_floor', 'market_estimate', 'manual'));


-- ==========================================
-- FILE: 013_product_images_bucket.sql
-- ==========================================
-- 013_product_images_bucket.sql

-- 1. Create the product-images bucket and make it public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to product-images
CREATE POLICY "Public read access for product-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- 3. Allow authenticated users to manage product-images
CREATE POLICY "Authenticated users can manage product-images" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'product-images');


-- ==========================================
-- FILE: 014_voice_records_bucket.sql
-- ==========================================
-- Migration to create the voice-records storage bucket and security policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice-records',
    'voice-records',
    false, -- Voice recordings should be PRIVATE
    10485760, -- 10MB
    ARRAY['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create policies for voice-records bucket
-- Allow authenticated artisan to upload their own recording
CREATE POLICY "Allow authenticated artisan to insert voice records"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'voice-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow authenticated artisan to select their own recording
CREATE POLICY "Allow authenticated artisan to select own voice records"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'voice-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Allow authenticated artisan to update own voice records
CREATE POLICY "Allow authenticated artisan to update own voice records"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'voice-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'voice-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow authenticated artisan to delete own voice records
CREATE POLICY "Allow authenticated artisan to delete own voice records"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'voice-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ==========================================
-- FILE: 015_service_role_grants.sql
-- ==========================================
-- Grant full access to service_role for all existing tables, sequences, and routines in the public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Ensure service_role automatically gets full access to any future tables, sequences, and routines created in the public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;


-- ==========================================
-- FILE: 016_add_enhanced_quality.sql
-- ==========================================
ALTER TABLE product_images ADD COLUMN enhanced_quality_score INTEGER;


-- ==========================================
-- FILE: 017_add_enhanced_quality_flag.sql
-- ==========================================
-- 017_add_enhanced_quality_flag.sql
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS enhanced_quality BOOLEAN DEFAULT false;


-- ==========================================
-- FILE: 018_marketplace_expansion.sql
-- ==========================================
-- 018_marketplace_expansion.sql

-------------------------------------------------------------------------------
-- 1. Extend buyer_enquiries status
-------------------------------------------------------------------------------
ALTER TABLE buyer_enquiries DROP CONSTRAINT IF EXISTS buyer_enquiries_status_check;
ALTER TABLE buyer_enquiries ADD CONSTRAINT buyer_enquiries_status_check 
  CHECK (status IN ('new', 'viewed', 'responded', 'quote_sent', 'accepted', 'rejected', 'closed'));

-------------------------------------------------------------------------------
-- 2. quotations
-------------------------------------------------------------------------------
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id TEXT UNIQUE NOT NULL,
    enquiry_id UUID NOT NULL REFERENCES buyer_enquiries(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    artisan_id UUID NOT NULL REFERENCES users(id),
    current_version INTEGER DEFAULT 1,
    status TEXT CHECK (status IN ('draft', 'sent', 'changes_requested', 'accepted', 'rejected')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quotations_enquiry_id ON quotations(enquiry_id);
CREATE INDEX idx_quotations_artisan_id ON quotations(artisan_id);
CREATE INDEX idx_quotations_buyer_id ON quotations(buyer_id);

CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans can manage own quotations" ON quotations FOR ALL USING (artisan_id = auth.uid());
CREATE POLICY "Buyers can read own quotations" ON quotations FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Buyers can update own quotations" ON quotations FOR UPDATE USING (buyer_id = auth.uid());

-------------------------------------------------------------------------------
-- 3. quotation_revisions
-------------------------------------------------------------------------------
CREATE TABLE quotation_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    moq INTEGER,
    customization_cost NUMERIC DEFAULT 0,
    production_lead_time_days INTEGER,
    expected_dispatch_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    artisan_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(quotation_id, version)
);

CREATE INDEX idx_quotation_revisions_quotation_id ON quotation_revisions(quotation_id);

ALTER TABLE quotation_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans can manage own quotation revisions" ON quotation_revisions FOR ALL 
USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_id AND q.artisan_id = auth.uid()));
CREATE POLICY "Buyers can read own quotation revisions" ON quotation_revisions FOR SELECT 
USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_id AND q.buyer_id = auth.uid()));

-------------------------------------------------------------------------------
-- 4. orders
-------------------------------------------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id TEXT UNIQUE NOT NULL,
    quotation_id UUID UNIQUE REFERENCES quotations(id),
    enquiry_id UUID REFERENCES buyer_enquiries(id),
    product_id UUID NOT NULL REFERENCES products(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    artisan_id UUID NOT NULL REFERENCES users(id),
    status TEXT CHECK (status IN ('confirmed', 'in_production', 'ready_for_dispatch', 'dispatched', 'delivered', 'completed', 'cancellation_requested', 'cancelled', 'return_requested', 'returned', 'disputed')) DEFAULT 'confirmed',
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_order_value NUMERIC NOT NULL,
    customization_details TEXT,
    product_snapshot JSONB NOT NULL,
    order_date TIMESTAMPTZ DEFAULT now(),
    expected_completion_date TIMESTAMPTZ,
    expected_dispatch_date TIMESTAMPTZ,
    actual_dispatch_date TIMESTAMPTZ,
    buyer_notes TEXT,
    artisan_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_artisan_id ON orders(artisan_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans can manage own orders" ON orders FOR ALL USING (artisan_id = auth.uid());
CREATE POLICY "Buyers can read own orders" ON orders FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Buyers can update own orders" ON orders FOR UPDATE USING (buyer_id = auth.uid());

-------------------------------------------------------------------------------
-- 5. order_status_history
-------------------------------------------------------------------------------
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans can manage order history" ON order_status_history FOR ALL 
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.artisan_id = auth.uid()));
CREATE POLICY "Buyers can read order history" ON order_status_history FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));


-- ==========================================
-- FILE: 019_marketplace_grants.sql
-- ==========================================
-- 019_marketplace_grants.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;


-- ==========================================
-- FILE: 020_marketplace_phase2.sql
-- ==========================================
-- 020_marketplace_phase2.sql

-------------------------------------------------------------------------------
-- 1. Modify products table for Inventory & Capacity
-------------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_made_to_order BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS monthly_capacity INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Update status constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check 
  CHECK (status IN ('draft', 'published', 'out_of_stock', 'made_to_order', 'temporarily_unavailable', 'archived'));

-------------------------------------------------------------------------------
-- 2. product_variants
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('colour', 'size', 'pattern')),
    value TEXT NOT NULL,
    stock_quantity INTEGER,
    price_adjustment NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans can manage own product variants" ON product_variants FOR ALL 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.artisan_id = auth.uid()));
CREATE POLICY "Anyone can view product variants" ON product_variants FOR SELECT 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.status IN ('published', 'made_to_order')));

-- Grants for product_variants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT SELECT ON public.product_variants TO anon;

-------------------------------------------------------------------------------
-- 3. Variant Tracking in Enquiries & Orders
-------------------------------------------------------------------------------
ALTER TABLE buyer_enquiries ADD COLUMN IF NOT EXISTS requested_variant JSONB;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS variant_snapshot JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_snapshot JSONB;

-------------------------------------------------------------------------------
-- 4. order_cancellations
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cancelled_by_role TEXT NOT NULL CHECK (cancelled_by_role IN ('artisan', 'buyer', 'system')),
    cancelled_by_user UUID REFERENCES users(id),
    reason TEXT NOT NULL CHECK (reason IN ('Material unavailable', 'Unable to meet quantity', 'Production delay', 'Buyer request', 'Pricing disagreement', 'Other')),
    notes TEXT,
    previous_status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_cancellations_order_id ON order_cancellations(order_id);

ALTER TABLE order_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans can read and insert order cancellations" ON order_cancellations FOR ALL
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.artisan_id = auth.uid()));
CREATE POLICY "Buyers can read and insert order cancellations" ON order_cancellations FOR ALL
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));

-- Grants for order_cancellations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_cancellations TO authenticated;


-- ==========================================
-- FILE: 021_marketplace_phase3.sql
-- ==========================================
-- 1. Product Analytics (Performance)
CREATE TABLE IF NOT EXISTS product_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'passport_view', 'save', 'enquiry', 'order')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pae_product_id ON product_analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_pae_event_type ON product_analytics_events(event_type);

ALTER TABLE product_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisan can view own product analytics"
ON product_analytics_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products p 
        WHERE p.id = product_analytics_events.product_id 
        AND p.artisan_id = auth.uid()
    )
);

CREATE POLICY "Anyone can insert public analytics"
ON product_analytics_events FOR INSERT
WITH CHECK (true);


-- 2. Buyer Communication (Conversations & Messages)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_id UUID REFERENCES buyer_enquiries(id) ON DELETE CASCADE UNIQUE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    artisan_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_artisan ON conversations(artisan_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (auth.uid() = artisan_id OR auth.uid() = buyer_id);

CREATE POLICY "Users can insert own conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = artisan_id OR auth.uid() = buyer_id);


CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id
        AND (c.artisan_id = auth.uid() OR c.buyer_id = auth.uid())
    )
);

CREATE POLICY "Users can insert messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_id
        AND (c.artisan_id = auth.uid() OR c.buyer_id = auth.uid())
    )
);

CREATE POLICY "Users can update read status of received messages"
ON messages FOR UPDATE
USING (
    auth.uid() != sender_id AND
    EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id
        AND (c.artisan_id = auth.uid() OR c.buyer_id = auth.uid())
    )
);


-- 3. Reviews
CREATE TABLE IF NOT EXISTS buyer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    artisan_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating_overall INTEGER CHECK (rating_overall >= 1 AND rating_overall <= 5),
    rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
    rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
    rating_timeliness INTEGER CHECK (rating_timeliness >= 1 AND rating_timeliness <= 5),
    review_text TEXT,
    is_verified_buyer BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON buyer_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_artisan ON buyer_reviews(artisan_id);

ALTER TABLE buyer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
ON buyer_reviews FOR SELECT
USING (true);

CREATE POLICY "Only buyer can insert reviews for completed orders"
ON buyer_reviews FOR INSERT
WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_id
        AND o.status = 'completed'
        AND o.buyer_id = auth.uid()
    )
);


-- ==========================================
-- FILE: 022_buyer_marketplace.sql
-- ==========================================
-- 022_buyer_marketplace.sql

-------------------------------------------------------------------------------
-- 1. Add state to artisan_profiles
-------------------------------------------------------------------------------
ALTER TABLE artisan_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE artisan_profiles ADD COLUMN IF NOT EXISTS district TEXT;

-------------------------------------------------------------------------------
-- 2. saved_products (Wishlist)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(buyer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_products_buyer_id ON saved_products(buyer_id);
CREATE INDEX IF NOT EXISTS idx_saved_products_product_id ON saved_products(product_id);

ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can manage own saved products" ON saved_products FOR ALL 
USING (buyer_id = auth.uid());

-- Grants for saved_products
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_products TO authenticated;


-- ==========================================
-- FILE: 023_buyer_features_6_to_10.sql
-- ==========================================
-- 023_buyer_features_6_to_10.sql

ALTER TABLE buyer_enquiries ADD COLUMN IF NOT EXISTS buyer_message TEXT;


-- ==========================================
-- FILE: 024_facilitator_flags.sql
-- ==========================================
-- 024_facilitator_flags.sql
-- Add flags and update review_status for the full correction loop

ALTER TABLE facilitator_reviews DROP CONSTRAINT IF EXISTS facilitator_reviews_review_status_check;
ALTER TABLE facilitator_reviews ADD CONSTRAINT facilitator_reviews_review_status_check 
  CHECK (review_status IN ('pending', 'approved', 'needs_changes', 'resubmitted'));

ALTER TABLE facilitator_reviews ADD COLUMN IF NOT EXISTS flags TEXT[];


-- ==========================================
-- FILE: 025_support_and_disputes.sql
-- ==========================================
-- 025_support_and_disputes.sql

-------------------------------------------------------------------------------
-- 1. support_requests
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('profile_help', 'product_creation_help', 'pricing_help', 'catalogue_help', 'buyer_enquiry_help', 'order_issue', 'other')),
    issue_summary TEXT NOT NULL,
    description TEXT NOT NULL,
    related_id UUID, -- Optional reference (e.g. order_id, product_id, enquiry_id)
    status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting_for_artisan', 'resolved', 'closed')) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_requests_artisan_id ON support_requests(artisan_id);

CREATE TRIGGER update_support_requests_updated_at
BEFORE UPDATE ON support_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Artisans can manage their own support requests
CREATE POLICY "Artisans can view own support requests" ON support_requests FOR SELECT USING (artisan_id = auth.uid());
CREATE POLICY "Artisans can insert own support requests" ON support_requests FOR INSERT WITH CHECK (artisan_id = auth.uid());
CREATE POLICY "Artisans can update own support requests" ON support_requests FOR UPDATE USING (artisan_id = auth.uid());

-- Facilitators access is typically granted via service_role or specific roles, 
-- but let's add a policy for anyone with role 'facilitator' just in case RLS is evaluated for them
CREATE POLICY "Facilitators can view all support requests" ON support_requests FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));
CREATE POLICY "Facilitators can update all support requests" ON support_requests FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));

-------------------------------------------------------------------------------
-- 2. disputes
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('product_damaged', 'quantity_mismatch', 'quality_disagreement', 'product_differs_from_description', 'production_delay', 'delivery_issue', 'cancellation_disagreement', 'other')),
    raised_by_role TEXT NOT NULL CHECK (raised_by_role IN ('buyer', 'artisan')),
    buyer_explanation TEXT,
    artisan_explanation TEXT,
    status TEXT NOT NULL CHECK (status IN ('open', 'under_review', 'waiting_for_buyer', 'waiting_for_artisan', 'resolved', 'closed')) DEFAULT 'open',
    facilitator_notes TEXT,
    resolution_summary TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_buyer_id ON disputes(buyer_id);
CREATE INDEX idx_disputes_artisan_id ON disputes(artisan_id);

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own disputes" ON disputes FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Buyers can insert own disputes" ON disputes FOR INSERT WITH CHECK (buyer_id = auth.uid() AND raised_by_role = 'buyer');
CREATE POLICY "Buyers can update own disputes" ON disputes FOR UPDATE USING (buyer_id = auth.uid());

CREATE POLICY "Artisans can view own disputes" ON disputes FOR SELECT USING (artisan_id = auth.uid());
CREATE POLICY "Artisans can insert own disputes" ON disputes FOR INSERT WITH CHECK (artisan_id = auth.uid() AND raised_by_role = 'artisan');
CREATE POLICY "Artisans can update own disputes" ON disputes FOR UPDATE USING (artisan_id = auth.uid());

CREATE POLICY "Facilitators can view all disputes" ON disputes FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));
CREATE POLICY "Facilitators can update all disputes" ON disputes FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));

-------------------------------------------------------------------------------
-- 3. Modify conversations
-------------------------------------------------------------------------------
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS support_request_id UUID REFERENCES support_requests(id) ON DELETE CASCADE UNIQUE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE UNIQUE;

-- We need to allow buyer_id to be nullable because support requests only involve Artisan and Facilitator
ALTER TABLE conversations ALTER COLUMN buyer_id DROP NOT NULL;

-- Update RLS policies for conversations to allow facilitators
CREATE POLICY "Facilitators can view all conversations" ON conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));
CREATE POLICY "Facilitators can insert conversations" ON conversations FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));
CREATE POLICY "Facilitators can update conversations" ON conversations FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));

-- Update RLS policies for messages to allow facilitators
CREATE POLICY "Facilitators can view all messages" ON messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));
CREATE POLICY "Facilitators can insert messages" ON messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));
CREATE POLICY "Facilitators can update messages" ON messages FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'facilitator'));

-- Need to grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disputes TO authenticated;


-- ==========================================
-- FILE: 026_facilitator_activity.sql
-- ==========================================
CREATE TABLE facilitator_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facilitator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE facilitator_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view activity" ON facilitator_activities FOR SELECT TO authenticated USING (true);


-- ==========================================
-- FILE: 027_facilitator_profiles.sql
-- ==========================================
-- 027_facilitator_profiles.sql
-- Add facilitator profile fields to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS region_served TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages_spoken TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS areas_of_expertise TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS short_bio TEXT;

-- ==========================================
-- FILE: 028_cashfree_payments.sql
-- ==========================================
-- 028_cashfree_payments.sql

-------------------------------------------------------------------------------
-- 1. Extend orders table with payment and invoice tracking
-------------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT 
  CHECK (payment_status IN ('payment_initiated', 'payment_pending', 'paid', 'payment_failed', 'payment_expired', 'payment_cancelled', 'payment_refunded')) 
  DEFAULT 'payment_initiated';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'cashfree';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_gateway_order_id ON orders(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-------------------------------------------------------------------------------
-- 2. payments table (Tracks individual gateway payment attempts & webhook events)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    display_order_id TEXT,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'cashfree',
    gateway_order_id TEXT UNIQUE NOT NULL,
    payment_session_id TEXT,
    gateway_payment_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'payment_initiated',
    payment_method TEXT DEFAULT 'upi',
    event_id TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own payments" ON payments FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Buyers can insert own payments" ON payments FOR INSERT WITH CHECK (buyer_id = auth.uid());

-------------------------------------------------------------------------------
-- 3. invoices table (Official tax/commercial receipts generated on verified payment)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id),
    artisan_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_method TEXT DEFAULT 'upi',
    payment_gateway TEXT DEFAULT 'cashfree',
    gateway_payment_id TEXT,
    status TEXT DEFAULT 'paid',
    invoice_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_artisan_id ON invoices(artisan_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own invoices" ON invoices FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Artisans can read own invoices" ON invoices FOR SELECT USING (artisan_id = auth.uid());

-------------------------------------------------------------------------------
-- 4. Grants
-------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.invoices TO service_role;



