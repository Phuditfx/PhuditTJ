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
