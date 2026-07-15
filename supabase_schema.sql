-- If you already ran the first script, you only need to run this part:

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_feed_posts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (Easy Migration & Testing)
DROP POLICY IF EXISTS "Allow all operations" ON public.users;
CREATE POLICY "Allow all operations" ON public.users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON public.trades;
CREATE POLICY "Allow all operations" ON public.trades FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON public.plans;
CREATE POLICY "Allow all operations" ON public.plans FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON public.feed_posts;
CREATE POLICY "Allow all operations" ON public.feed_posts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON public.dividends;
CREATE POLICY "Allow all operations" ON public.dividends FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON public.funding_history;
CREATE POLICY "Allow all operations" ON public.funding_history FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations" ON public.global_feed_posts;
CREATE POLICY "Allow all operations" ON public.global_feed_posts FOR ALL USING (true) WITH CHECK (true);

-- Weekly Swing Picks (VIP Feature)
CREATE TABLE IF NOT EXISTS public.weekly_swing_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    ticker TEXT NOT NULL,
    sector TEXT NOT NULL,
    entry_alert_price NUMERIC,
    stop_loss_price NUMERIC,
    float_size TEXT,
    short_interest_level TEXT,
    setup_type TEXT,
    technical_score INTEGER,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.weekly_swing_picks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.weekly_swing_picks;
CREATE POLICY "Allow all operations" ON public.weekly_swing_picks FOR ALL USING (true) WITH CHECK (true);

-- Run the below lines if you have already created the weekly_swing_picks table
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS why_interesting TEXT;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS risk_considerations TEXT;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS target_rrr NUMERIC;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS confidence_level TEXT;

-- Alpha Picks Investment Tables
CREATE TABLE IF NOT EXISTS public.investment_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    ticker TEXT NOT NULL,
    total_shares NUMERIC NOT NULL DEFAULT 0,
    average_cost NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC,
    unrealized_pnl NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.investment_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.investment_positions;
CREATE POLICY "Allow all operations" ON public.investment_positions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    position_id UUID REFERENCES public.investment_positions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'BUY' or 'SELL'
    shares NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    transaction_date DATE NOT NULL,
    realized_pnl NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.investment_transactions;
CREATE POLICY "Allow all operations" ON public.investment_transactions FOR ALL USING (true) WITH CHECK (true);

-- Alpha Picks Journal (Plan & Stats)
CREATE TABLE IF NOT EXISTS public.alpha_picks_journal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    pick_date DATE NOT NULL,
    ticker TEXT NOT NULL,
    entry_alert_price NUMERIC,
    stop_loss_price NUMERIC,
    target_price NUMERIC,
    status TEXT DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    unrealized_pnl NUMERIC DEFAULT 0
);

ALTER TABLE public.alpha_picks_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.alpha_picks_journal;
CREATE POLICY "Allow all operations" ON public.alpha_picks_journal FOR ALL USING (true) WITH CHECK (true);

-- Swing Trade Updates (Task 1 & 3)
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS trade_type TEXT DEFAULT 'Base Trade';
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS highest_price_reached NUMERIC;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS current_sl NUMERIC;

-- Portfolio Snapshots (Task 2)
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    total_invested NUMERIC NOT NULL DEFAULT 0,
    total_value NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.portfolio_snapshots;
CREATE POLICY "Allow all operations" ON public.portfolio_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Added for Portfolio Rebalancer
ALTER TABLE public.investment_positions ADD COLUMN IF NOT EXISTS target_alloc NUMERIC DEFAULT 0;

-- Cash Balance for Portfolios
ALTER TABLE public.investment_portfolios ADD COLUMN IF NOT EXISTS cash_balance NUMERIC DEFAULT 0;

-- Portfolio Funding History (Deposits / Withdrawals)
CREATE TABLE IF NOT EXISTS public.portfolio_funding_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    portfolio_id UUID REFERENCES public.investment_portfolios(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'DEPOSIT' or 'WITHDRAWAL'
    amount NUMERIC NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.portfolio_funding_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.portfolio_funding_history;
CREATE POLICY "Allow all operations" ON public.portfolio_funding_history FOR ALL USING (true) WITH CHECK (true);

-- 4-Tier User Status System (Roles)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_ti_picks BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_alpha_picks BOOLEAN DEFAULT false;

-- Feed Post Category (General, TI Picks, Alpha Picks)
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.global_feed_posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- Penny Stocks Pro Feature
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_penny_stocks BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.penny_stocks_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_email TEXT NOT NULL,
    title TEXT NOT NULL,
    analysis_text TEXT,
    chart_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.penny_stocks_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.penny_stocks_posts;
CREATE POLICY "Allow all operations" ON public.penny_stocks_posts FOR ALL USING (true) WITH CHECK (true);