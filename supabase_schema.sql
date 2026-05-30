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
