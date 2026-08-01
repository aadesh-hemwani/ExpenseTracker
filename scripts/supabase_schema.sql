-- Supabase Schema for Bank Statement Analytics

-- 1. accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. statements
CREATE TABLE IF NOT EXISTS statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    statement_start_date DATE,
    statement_end_date DATE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    statement_id UUID REFERENCES statements(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    balance NUMERIC,
    merchant TEXT,
    category TEXT,
    transaction_hash TEXT NOT NULL UNIQUE,
    is_transfer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on transaction_hash for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);

-- 4. transfers
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    to_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE
);

-- 5. merchant_rules
CREATE TABLE IF NOT EXISTS merchant_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL UNIQUE,
    normalized_merchant TEXT NOT NULL
);

-- 6. category_rules
CREATE TABLE IF NOT EXISTS category_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL
);

-- 7. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant TEXT NOT NULL,
    average_amount NUMERIC NOT NULL,
    billing_frequency TEXT NOT NULL
);

-- 8. analytics_cache
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    period TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: Enable Row Level Security (RLS)
-- You can modify these policies based on how you securely pass the firebase_uid

-- ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access their own accounts" ON accounts
--     FOR ALL USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- (Apply similar policies for other tables if RLS is desired)

-- Seed default merchant rules
INSERT INTO merchant_rules (pattern, normalized_merchant) VALUES
('Myntra', 'Myntra'),
('Zomato', 'Zomato'),
('Swiggy', 'Swiggy'),
('Zepto', 'Zepto'),
('Zerodha', 'Zerodha'),
('Indian Clearing Corp', 'Zerodha / ICC'),
('Pronto', 'Pronto'),
('Netflix', 'Netflix'),
('Spotify', 'Spotify'),
('Uber', 'Uber'),
('Ola', 'Ola'),
('Zeta', 'Zeta')
ON CONFLICT (pattern) DO UPDATE SET normalized_merchant = EXCLUDED.normalized_merchant;

-- Seed default category rules
INSERT INTO category_rules (pattern, category) VALUES
('Myntra', 'Shopping'),
('Zomato', 'Food'),
('Swiggy', 'Food'),
('Pronto', 'Food'),
('Zepto', 'Food'),
('Zerodha', 'Investment'),
('Indian Clearing Corp', 'Investment'),
('Netflix', 'Entertainment'),
('Spotify', 'Entertainment'),
('Uber', 'Transport'),
('Ola', 'Transport'),
('Zeta', 'Food')
ON CONFLICT (pattern) DO UPDATE SET category = EXCLUDED.category;
