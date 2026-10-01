import { supabase } from '../supabaseClient';

const STORAGE_PREFIX = 'phudit_alphapicks_analytics_v1_';

/**
 * Known ticker database for Market Cap and Dividend Yield categorization
 */
export const DEFAULT_STOCK_PROFILES = {
  // Mega Cap (> $200B)
  'AAPL': { marketCap: 'Mega Cap', capBillions: 3400, divYield: 0.5, divCategory: 'Low (0-2%)' },
  'MSFT': { marketCap: 'Mega Cap', capBillions: 3100, divYield: 0.7, divCategory: 'Low (0-2%)' },
  'NVDA': { marketCap: 'Mega Cap', capBillions: 2900, divYield: 0.1, divCategory: 'Low (0-2%)' },
  'GOOGL': { marketCap: 'Mega Cap', capBillions: 2100, divYield: 0.5, divCategory: 'Low (0-2%)' },
  'AMZN': { marketCap: 'Mega Cap', capBillions: 2000, divYield: 0.0, divCategory: 'No Dividend' },
  'META': { marketCap: 'Mega Cap', capBillions: 1400, divYield: 0.4, divCategory: 'Low (0-2%)' },
  'BRK.B': { marketCap: 'Mega Cap', capBillions: 980, divYield: 0.0, divCategory: 'No Dividend' },
  'TSLA': { marketCap: 'Mega Cap', capBillions: 750, divYield: 0.0, divCategory: 'No Dividend' },
  
  // Large Cap ($10B - $200B)
  'GM': { marketCap: 'Large Cap', capBillions: 55, divYield: 1.0, divCategory: 'Low (0-2%)' },
  'RCL': { marketCap: 'Large Cap', capBillions: 52, divYield: 1.1, divCategory: 'Low (0-2%)' },
  'ALL': { marketCap: 'Large Cap', capBillions: 48, divYield: 2.1, divCategory: 'Mid (2-4%)' },
  'SYF': { marketCap: 'Large Cap', capBillions: 24, divYield: 2.3, divCategory: 'Mid (2-4%)' },
  'CCL': { marketCap: 'Large Cap', capBillions: 26, divYield: 0.0, divCategory: 'No Dividend' },
  'OKTA': { marketCap: 'Large Cap', capBillions: 14, divYield: 0.0, divCategory: 'No Dividend' },
  'TWLO': { marketCap: 'Large Cap', capBillions: 12, divYield: 0.0, divCategory: 'No Dividend' },

  // Mid Cap ($2B - $10B)
  'CLS': { marketCap: 'Mid Cap', capBillions: 8.5, divYield: 0.0, divCategory: 'No Dividend' },
  'CRDO': { marketCap: 'Mid Cap', capBillions: 5.2, divYield: 0.0, divCategory: 'No Dividend' },
  'POWL': { marketCap: 'Mid Cap', capBillions: 3.8, divYield: 0.5, divCategory: 'Low (0-2%)' },
  'AGX': { marketCap: 'Mid Cap', capBillions: 2.9, divYield: 0.0, divCategory: 'No Dividend' },
  'PPC': { marketCap: 'Mid Cap', capBillions: 9.1, divYield: 3.5, divCategory: 'Mid (2-4%)' },
  'LITE': { marketCap: 'Mid Cap', capBillions: 4.1, divYield: 0.0, divCategory: 'No Dividend' },
  'BLBD': { marketCap: 'Mid Cap', capBillions: 2.1, divYield: 0.0, divCategory: 'No Dividend' },

  // Small Cap (< $2B)
  'EAT': { marketCap: 'Small Cap', capBillions: 1.8, divYield: 4.8, divCategory: 'High (4%+)' },
  'CVSA': { marketCap: 'Small Cap', capBillions: 1.2, divYield: 0.0, divCategory: 'No Dividend' },
  'SKYW': { marketCap: 'Small Cap', capBillions: 1.9, divYield: 0.0, divCategory: 'No Dividend' },
  'PARR': { marketCap: 'Small Cap', capBillions: 1.4, divYield: 0.0, divCategory: 'No Dividend' },
  'TIGO': { marketCap: 'Small Cap', capBillions: 1.6, divYield: 4.2, divCategory: 'High (4%+)' }
};

/**
 * Helper to get or infer stock category
 */
export function getStockCategory(ticker) {
  if (!ticker) return { marketCap: 'Mid Cap', divCategory: 'No Dividend', divYield: 0 };
  const clean = ticker.trim().toUpperCase();
  if (DEFAULT_STOCK_PROFILES[clean]) {
    return DEFAULT_STOCK_PROFILES[clean];
  }
  // Default estimate based on ticker length
  return {
    marketCap: clean.length <= 3 ? 'Large Cap' : 'Mid Cap',
    divCategory: 'No Dividend',
    divYield: 0
  };
}

/**
 * Fetch analytics snapshots from Supabase or LocalStorage
 */
export async function getAnalyticsSnapshots(userEmail, portfolioId) {
  if (!userEmail) return [];
  const storageKey = `${STORAGE_PREFIX}${userEmail}_${portfolioId || 'all'}`;

  // 1. Check local storage
  let localData = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (Array.isArray(localData) && localData.length > 0) {
    return localData;
  }

  // 2. Try Supabase
  try {
    let query = supabase
      .from('alpha_picks_analytics_snapshots')
      .select('*')
      .eq('user_email', userEmail.trim().toLowerCase())
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
      return data;
    }
  } catch (e) {
    // Table may not exist yet, fallback
  }

  return [];
}

/**
 * Save analytics snapshot
 */
export async function saveAnalyticsSnapshot(snapshot) {
  if (!snapshot || !snapshot.user_email) return;
  const cleanEmail = snapshot.user_email.trim().toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${cleanEmail}_${snapshot.portfolio_id || 'all'}`;

  // Update local cache
  try {
    let existing = [];
    const raw = localStorage.getItem(storageKey);
    if (raw) existing = JSON.parse(raw);
    const updated = [snapshot, ...existing.filter(s => !(s.year === snapshot.year && s.month === snapshot.month))];
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (e) {}

  // Upsert to Supabase
  try {
    await supabase
      .from('alpha_picks_analytics_snapshots')
      .upsert([snapshot], { onConflict: 'user_email,portfolio_id,year,month' });
  } catch (e) {
    // Ignore if table not yet migrated
  }
}
