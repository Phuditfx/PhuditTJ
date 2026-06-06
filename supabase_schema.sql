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
CREATE POLICY "Allow all operations" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.feed_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.dividends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.funding_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.global_feed_posts FOR ALL USING (true) WITH CHECK (true);

-- Weekly Swing Picks (VIP Feature)
CREATE TABLE public.weekly_swing_picks (
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
CREATE POLICY "Allow all operations" ON public.weekly_swing_picks FOR ALL USING (true) WITH CHECK (true);

-- Run the below lines if you have already created the weekly_swing_picks table
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS why_interesting TEXT;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS risk_considerations TEXT;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS target_rrr NUMERIC;
ALTER TABLE public.weekly_swing_picks ADD COLUMN IF NOT EXISTS confidence_level TEXT;

-- Alpha Picks Investment Tables
CREATE TABLE public.investment_positions (
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
CREATE POLICY "Allow all operations" ON public.investment_positions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.investment_transactions (
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
CREATE POLICY "Allow all operations" ON public.investment_transactions FOR ALL USING (true) WITH CHECK (true);
