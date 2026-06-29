-- Migration script for Cash Balance and Funding History in Alpha Picks

-- 1. Add cash_balance to investment_portfolios
ALTER TABLE public.investment_portfolios ADD COLUMN IF NOT EXISTS cash_balance NUMERIC DEFAULT 0;

-- 2. Create portfolio_funding_history table
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
