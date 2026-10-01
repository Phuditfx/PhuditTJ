import { supabase } from '../supabaseClient';

const STORAGE_PREFIX = 'phudit_beta_grid_v1_';
const HISTORY_PREFIX = 'phudit_beta_history_v1_';

/**
 * Generate discrete zones based on GridPlan parameters
 * Supports Asymmetric Grid (Action Zone vs Safety Zone)
 */
export function generateGridZones(plan) {
  const { upperPrice, lowerPrice, gridStep, actionZoneShares, actionZoneLowerLimit, safetyZoneShares } = plan;
  
  const step = Math.max(0.01, parseFloat(gridStep) || 1);
  const upper = parseFloat(upperPrice) || 0;
  const lower = parseFloat(lowerPrice) || 0;
  const limit = parseFloat(actionZoneLowerLimit) !== undefined ? parseFloat(actionZoneLowerLimit) : lower;
  const actShares = parseInt(actionZoneShares, 10) || 1;
  const safeShares = parseInt(safetyZoneShares, 10) || 1;

  if (upper <= lower) {
    return [];
  }

  const zones = [];
  // Calculate price levels from upperPrice down to lowerPrice (or lower to upper)
  // We round prices to 2 decimals to prevent floating point inaccuracies
  let currentPrice = upper;
  let index = 1;

  while (currentPrice >= lower - 0.0001) {
    const roundedPrice = Math.round(currentPrice * 100) / 100;
    const targetSell = Math.round((roundedPrice + step) * 100) / 100;
    
    // Asymmetric zone allocation
    const isActionZone = roundedPrice >= limit;
    const sharesAllocated = isActionZone ? actShares : safeShares;
    const capitalRequired = Math.round(roundedPrice * sharesAllocated * 100) / 100;

    zones.push({
      id: `zone_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      levelIndex: index,
      priceLevel: roundedPrice,
      targetSellPrice: targetSell,
      sharesAllocated,
      capitalRequired,
      zoneType: isActionZone ? 'ACTION' : 'SAFETY',
      status: 'EMPTY', // 'EMPTY' | 'FILLED'
      filledAt: null,
      filledPrice: null,
    });

    currentPrice = Math.round((currentPrice - step) * 100) / 100;
    index++;
    if (index > 500) break; // safety guard
  }

  return zones;
}

/**
 * Default sample profile to get started immediately if no profiles exist
 */
export function createDefaultProfile(email) {
  const defaultPlan = {
    upperPrice: 38.00,
    lowerPrice: 26.00,
    gridStep: 1.00,
    actionZoneLowerLimit: 32.00,
    actionZoneShares: 10,
    safetyZoneShares: 20
  };

  const zones = generateGridZones(defaultPlan);

  return {
    id: `profile_${Date.now()}`,
    name: 'TQQQ Balanced Asymmetric Grid',
    assetTicker: 'TQQQ',
    plan: defaultPlan,
    zones,
    accountingMode: 'NON_FIFO', // 'NON_FIFO' | 'FIFO'
    initialCashReserve: 5000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Load beta grid profiles for user
 * Strategy: Supabase-first (cross-device sync), then localStorage cache, then default.
 */
export async function getBetaGridProfiles(email) {
  if (!email) return [];
  const cleanEmail = email.trim().toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${cleanEmail}`;

  // 1. Always try Supabase first for cross-device sync
  try {
    const { data, error } = await supabase
      .from('beta_grid_profiles')
      .select('data')
      .eq('email', cleanEmail)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const dbProfiles = data.map(item => item.data);
      // Update local cache with latest cloud data
      try {
        localStorage.setItem(storageKey, JSON.stringify(dbProfiles));
      } catch (e) {}
      return dbProfiles;
    }
  } catch (e) {
    console.warn('Supabase fetch failed, falling back to localStorage:', e);
  }

  // 2. Fallback to localStorage cache (e.g. offline or table not created yet)
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const localProfiles = JSON.parse(raw);
      if (Array.isArray(localProfiles) && localProfiles.length > 0) {
        return localProfiles;
      }
    }
  } catch (err) {
    console.warn('Error reading local beta grid profiles:', err);
  }

  // 3. Last resort: Initialize with default profile
  const defaultProfile = createDefaultProfile(cleanEmail);
  const initialProfiles = [defaultProfile];
  try {
    localStorage.setItem(storageKey, JSON.stringify(initialProfiles));
  } catch (e) {}

  return initialProfiles;
}

/**
 * Save beta grid profiles for user
 */
export async function saveBetaGridProfiles(email, profiles) {
  if (!email || !Array.isArray(profiles)) return;
  const cleanEmail = email.trim().toLowerCase();
  const storageKey = `${STORAGE_PREFIX}${cleanEmail}`;

  // Save to local storage
  try {
    localStorage.setItem(storageKey, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Failed saving beta grid to localStorage:', err);
  }

  // Attempt sync to Supabase (non-blocking)
  try {
    const upsertRows = profiles.map(p => ({
      id: p.id,
      email: cleanEmail,
      data: p,
      updated_at: new Date().toISOString()
    }));

    if (upsertRows.length > 0) {
      await supabase.from('beta_grid_profiles').upsert(upsertRows, { onConflict: 'id' });
    }
  } catch (err) {
    // Silently handle if table does not exist yet
  }
}

/**
 * Load completed cycle history log
 * Strategy: Supabase-first (cross-device sync), then localStorage cache.
 */
export async function getBetaCycleHistory(email) {
  if (!email) return [];
  const cleanEmail = email.trim().toLowerCase();
  const storageKey = `${HISTORY_PREFIX}${cleanEmail}`;

  // 1. Always try Supabase first for cross-device sync
  try {
    const { data, error } = await supabase
      .from('beta_grid_history')
      .select('data')
      .eq('email', cleanEmail)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const items = data.map(d => d.data);
      // Update local cache with latest cloud data
      try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch(e) {}
      return items;
    }
  } catch (e) {
    console.warn('Supabase history fetch failed, falling back to localStorage:', e);
  }

  // 2. Fallback to localStorage cache (offline / table not created)
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}

  return [];
}


/**
 * Save completed cycle history log
 */
export async function saveBetaCycleHistory(email, historyItems) {
  if (!email || !Array.isArray(historyItems)) return;
  const cleanEmail = email.trim().toLowerCase();
  const storageKey = `${HISTORY_PREFIX}${cleanEmail}`;

  try {
    localStorage.setItem(storageKey, JSON.stringify(historyItems));
  } catch (e) {}

  try {
    const upsertRows = historyItems.map(item => ({
      id: item.id,
      email: cleanEmail,
      data: item,
      created_at: item.sellTimestamp || new Date().toISOString()
    }));

    if (upsertRows.length > 0) {
      await supabase.from('beta_grid_history').upsert(upsertRows, { onConflict: 'id' });
    }
  } catch (e) {}
}
