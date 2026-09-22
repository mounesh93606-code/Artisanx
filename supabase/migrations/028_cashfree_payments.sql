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
