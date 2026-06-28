-- Migration script for adding multiple portfolios

-- 1. Create investment_portfolios table
CREATE TABLE IF NOT EXISTS public.investment_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.investment_portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.investment_portfolios;
CREATE POLICY "Allow all operations" ON public.investment_portfolios FOR ALL USING (true) WITH CHECK (true);

-- 2. Add portfolio_id columns to existing tables
ALTER TABLE public.investment_positions ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.investment_portfolios(id) ON DELETE CASCADE;
ALTER TABLE public.investment_transactions ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.investment_portfolios(id) ON DELETE CASCADE;
ALTER TABLE public.alpha_picks_journal ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.investment_portfolios(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_snapshots ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.investment_portfolios(id) ON DELETE CASCADE;

-- 3. Data Migration: Create Default Portfolio for each user and update existing records
DO $$
DECLARE
    rec RECORD;
    new_portfolio_id UUID;
BEGIN
    -- Loop through all unique users who have investment positions or journal entries
    FOR rec IN 
        SELECT DISTINCT user_email FROM (
            SELECT user_email FROM public.investment_positions WHERE portfolio_id IS NULL
            UNION
            SELECT user_email FROM public.alpha_picks_journal WHERE portfolio_id IS NULL
        ) AS users
    LOOP
        -- Check if Default Portfolio already exists for this user
        SELECT id INTO new_portfolio_id FROM public.investment_portfolios WHERE user_email = rec.user_email AND name = 'Default Portfolio' LIMIT 1;
        
        -- If not, create it
        IF new_portfolio_id IS NULL THEN
            INSERT INTO public.investment_portfolios (user_email, name, description)
            VALUES (rec.user_email, 'Default Portfolio', 'Auto-generated portfolio for existing data')
            RETURNING id INTO new_portfolio_id;
        END IF;

        -- Update records to point to this new portfolio
        UPDATE public.investment_positions SET portfolio_id = new_portfolio_id WHERE user_email = rec.user_email AND portfolio_id IS NULL;
        UPDATE public.investment_transactions SET portfolio_id = new_portfolio_id WHERE user_email = rec.user_email AND portfolio_id IS NULL;
        UPDATE public.alpha_picks_journal SET portfolio_id = new_portfolio_id WHERE user_email = rec.user_email AND portfolio_id IS NULL;
        UPDATE public.portfolio_snapshots SET portfolio_id = new_portfolio_id WHERE user_email = rec.user_email AND portfolio_id IS NULL;
        
    END LOOP;
END $$;
