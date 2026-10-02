import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Plus,
  Settings2,
  Trash2,
  History,
  LayoutGrid,
  Layers,
  TrendingUp,
  RotateCcw,
  LineChart,
  AlertTriangle
} from 'lucide-react';
import {
  getBetaGridProfiles,
  saveBetaGridProfiles,
  getBetaCycleHistory,
  saveBetaCycleHistory,
  createDefaultProfile
} from '../db/betaGridDB';
import { fetchRealTimePrice } from '../api/priceApi';
import BetaGridOverviewCard from './BetaGrid/BetaGridOverviewCard';
import BetaGridZoneTable from './BetaGrid/BetaGridZoneTable';
import BetaGridCycleHistory from './BetaGrid/BetaGridCycleHistory';
import BetaGridPlanModal from './BetaGrid/BetaGridPlanModal';
import BetaGridChartModal from './BetaGrid/BetaGridChartModal';
import { supabase } from '../supabaseClient';

// ────────────────────────────────────────────────────────────
// Helper: Compute weighted Average Cost Basis from filled zones
// ────────────────────────────────────────────────────────────
function computeAverageCostBasis(zones) {
  const filled = zones.filter(z => z.status === 'FILLED');
  if (filled.length === 0) return 0;
  let totalCost = 0;
  let totalShares = 0;
  filled.forEach(z => {
    const shares = z.sharesRemaining !== undefined ? z.sharesRemaining : z.sharesAllocated;
    totalCost += z.priceLevel * shares;
    totalShares += shares;
  });
  return totalShares > 0 ? totalCost / totalShares : 0;
}

export default function BetaGridTrading({
  currentUser,
  isVip,
  requestAlert,
  requestConfirm
}) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active view tab: 'grid' | 'history'
  const [activeTab, setActiveTab] = useState('grid');

  // Live Price State
  const [livePrices, setLivePrices] = useState({});
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [modalEditProfile, setModalEditProfile] = useState(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  // Hard Reset confirm state
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);

  // Current Active Profile
  const currentProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0] || null;
  const currentTicker = currentProfile?.assetTicker || 'TQQQ';
  const currentLivePrice = livePrices[currentTicker] || null;

  // accountingMode is READ from profile — IMMUTABLE
  const accountingMode = currentProfile?.accountingMode || 'NON_FIFO';

  // Computed averageCostBasis from current profile's filled zones
  const averageCostBasis = currentProfile ? computeAverageCostBasis(currentProfile.zones || []) : 0;

  // 1. Initial Load
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loadedProfiles = await getBetaGridProfiles(currentUser);
        const loadedHistory = await getBetaCycleHistory(currentUser);

        if (isMounted) {
          setProfiles(loadedProfiles);
          setCycleHistory(loadedHistory);
          if (loadedProfiles.length > 0) {
            setSelectedProfileId(loadedProfiles[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load Beta Grid data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (currentUser) {
      loadData();
    }
    return () => { isMounted = false; };
  }, [currentUser]);

  // 2. Fetch Live Price
  const updateLivePrice = useCallback(async () => {
    if (!currentTicker) return;
    setIsFetchingPrice(true);
    try {
      const price = await fetchRealTimePrice(currentTicker);
      if (price !== null && !isNaN(price)) {
        setLivePrices(prev => ({ ...prev, [currentTicker]: parseFloat(price) }));
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.warn('Failed to fetch live price for', currentTicker, e);
    } finally {
      setIsFetchingPrice(false);
    }
  }, [currentTicker]);

  useEffect(() => {
    updateLivePrice();
  }, [updateLivePrice]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      updateLivePrice();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, updateLivePrice]);

  // 3. Persist helpers
  const persistProfiles = (updatedProfiles) => {
    setProfiles(updatedProfiles);
    saveBetaGridProfiles(currentUser, updatedProfiles);
  };

  const persistHistory = (updatedHistory) => {
    setCycleHistory(updatedHistory);
    saveBetaCycleHistory(currentUser, updatedHistory);
  };

  // ────────────────────────────────────────────────────────────
  // ZONE ACTIONS
  // ────────────────────────────────────────────────────────────

  // 4. Fill Zone (Buy)
  const handleFillZone = (zoneToFill) => {
    if (!currentProfile) return;

    const updatedZones = currentProfile.zones.map(z => {
      if (z.id === zoneToFill.id) {
        return {
          ...z,
          status: 'FILLED',
          filledAt: new Date().toISOString(),
          filledPrice: z.priceLevel,
          sharesRemaining: z.sharesAllocated // init full shares on buy
        };
      }
      return z;
    });

    const updatedProfile = { ...currentProfile, zones: updatedZones, updatedAt: new Date().toISOString() };
    // Recalculate averageCostBasis and store in profile
    updatedProfile.averageCostBasis = computeAverageCostBasis(updatedZones);
    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);

    if (requestAlert) {
      requestAlert(
        `📥 ซื้อไม้ #${zoneToFill.levelIndex} สำเร็จ`,
        `บันทึกซื้อ ${zoneToFill.sharesAllocated} หุ้นที่ราคา $${zoneToFill.priceLevel.toFixed(2)} (เป้าขาย $${zoneToFill.targetSellPrice.toFixed(2)})`
      );
    }
  };

  // 5. Harvest Zone (Sell) — supports partial sell + all 3 accounting modes
  const handleHarvestZone = (zoneToHarvest, sellShares = null) => {
    if (!currentProfile) return;

    const sharesRemaining = zoneToHarvest.sharesRemaining !== undefined
      ? zoneToHarvest.sharesRemaining
      : zoneToHarvest.sharesAllocated;

    const actualSellShares = sellShares !== null
      ? Math.min(Math.max(1, sellShares), sharesRemaining)
      : sharesRemaining;

    const isPartialSell = actualSellShares < sharesRemaining;
    const sharesAfterSell = sharesRemaining - actualSellShares;

    // ── NON_FIFO (Discrete) ──
    const discreteProfitDollars = (zoneToHarvest.targetSellPrice - zoneToHarvest.priceLevel) * actualSellShares;
    const discreteProfitPercent = ((zoneToHarvest.targetSellPrice - zoneToHarvest.priceLevel) / zoneToHarvest.priceLevel) * 100;

    // ── FIFO: earliest filled zone by filledAt timestamp ──
    const filledLots = (currentProfile.zones || [])
      .filter(z => z.status === 'FILLED')
      .sort((a, b) => new Date(a.filledAt || 0) - new Date(b.filledAt || 0));

    // FIFO: pop from the oldest lot
    let fifoCostBasis = zoneToHarvest.priceLevel;
    let remainingToSell = actualSellShares;
    let fifoTotalCost = 0;
    const fifoSellLots = [];

    for (const lot of filledLots) {
      if (remainingToSell <= 0) break;
      const lotShares = lot.sharesRemaining !== undefined ? lot.sharesRemaining : lot.sharesAllocated;
      const takFromLot = Math.min(remainingToSell, lotShares);
      fifoTotalCost += lot.priceLevel * takFromLot;
      fifoSellLots.push({ zoneId: lot.id, shares: takFromLot });
      remainingToSell -= takFromLot;
    }

    fifoCostBasis = actualSellShares > 0 ? fifoTotalCost / actualSellShares : zoneToHarvest.priceLevel;
    const fifoProfitDollars = (zoneToHarvest.targetSellPrice - fifoCostBasis) * actualSellShares;
    const fifoProfitPercent = fifoCostBasis > 0 ? ((zoneToHarvest.targetSellPrice - fifoCostBasis) / fifoCostBasis) * 100 : 0;

    // ── AVERAGE_COST ──
    const avgCost = averageCostBasis;
    const avgCostProfitDollars = (zoneToHarvest.targetSellPrice - avgCost) * actualSellShares;
    const avgCostProfitPercent = avgCost > 0 ? ((zoneToHarvest.targetSellPrice - avgCost) / avgCost) * 100 : 0;

    // ── Update zones based on accounting mode ──
    let updatedZones;

    if (accountingMode === 'FIFO') {
      // FIFO: deduct from oldest lots
      const fifoDeductMap = {};
      fifoSellLots.forEach(({ zoneId, shares }) => { fifoDeductMap[zoneId] = shares; });

      updatedZones = currentProfile.zones.map(z => {
        const deduct = fifoDeductMap[z.id] || 0;
        if (deduct === 0) return z;
        const rem = (z.sharesRemaining !== undefined ? z.sharesRemaining : z.sharesAllocated) - deduct;
        if (rem <= 0) {
          return { ...z, status: 'EMPTY', filledAt: null, filledPrice: null, sharesRemaining: z.sharesAllocated };
        }
        return { ...z, sharesRemaining: rem };
      });
    } else {
      // NON_FIFO and AVERAGE_COST: deduct from the sold zone itself
      updatedZones = currentProfile.zones.map(z => {
        if (z.id !== zoneToHarvest.id) return z;
        if (isPartialSell) {
          return { ...z, sharesRemaining: sharesAfterSell };
        }
        return { ...z, status: 'EMPTY', filledAt: null, filledPrice: null, sharesRemaining: z.sharesAllocated };
      });
    }

    // ── Pick profit to record based on active mode ──
    let recordedProfit, recordedPercent;
    if (accountingMode === 'NON_FIFO') {
      recordedProfit = discreteProfitDollars;
      recordedPercent = discreteProfitPercent;
    } else if (accountingMode === 'FIFO') {
      recordedProfit = fifoProfitDollars;
      recordedPercent = fifoProfitPercent;
    } else {
      recordedProfit = avgCostProfitDollars;
      recordedPercent = avgCostProfitPercent;
    }

    // ── History record ──
    const historyItem = {
      id: `cycle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      profileId: currentProfile.id,
      profileName: currentProfile.name,
      ticker: currentProfile.assetTicker,
      zoneId: zoneToHarvest.id,
      levelIndex: zoneToHarvest.levelIndex,
      priceLevel: zoneToHarvest.priceLevel,
      targetSellPrice: zoneToHarvest.targetSellPrice,
      sharesAllocated: zoneToHarvest.sharesAllocated,
      sharesSold: actualSellShares,
      isPartialSell,
      // All 3 modes recorded for reference
      profitDollars: discreteProfitDollars,
      profitPercent: discreteProfitPercent,
      fifoCostBasis,
      fifoProfitDollars,
      fifoProfitPercent,
      avgCostBasis: avgCost,
      avgCostProfitDollars,
      avgCostProfitPercent,
      // Active mode
      accountingMode,
      activeProfitDollars: recordedProfit,
      activeProfitPercent: recordedPercent,
      buyTimestamp: zoneToHarvest.filledAt || new Date().toISOString(),
      sellTimestamp: new Date().toISOString()
    };

    const updatedHistory = [historyItem, ...cycleHistory];
    persistHistory(updatedHistory);

    // Update averageCostBasis in profile after sell
    const newAvgCost = computeAverageCostBasis(updatedZones);
    const updatedProfile = {
      ...currentProfile,
      zones: updatedZones,
      averageCostBasis: newAvgCost,
      updatedAt: new Date().toISOString()
    };
    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);

    const isFakeLoss = accountingMode === 'FIFO' && recordedProfit < 0;

    if (requestAlert) {
      requestAlert(
        `💰 ปิดรอบทำกำไร (${accountingMode}) สำเร็จ!`,
        `${isFakeLoss ? '⚠️ โบรกเกอร์รายงานขาดทุน FIFO: ' : ''}${recordedProfit >= 0 ? '+' : ''}$${recordedProfit.toFixed(2)} (${recordedPercent >= 0 ? '+' : ''}${recordedPercent.toFixed(1)}%) — ขาย ${actualSellShares} หุ้น${isPartialSell ? ` (เหลือ ${sharesAfterSell} หุ้น)` : ''}`
      );
    }
  };

  // 6. Update Zone Shares
  const handleUpdateZoneShares = (zoneId, newShares) => {
    if (!currentProfile) return;
    const updatedZones = currentProfile.zones.map(z => {
      if (z.id === zoneId) {
        return {
          ...z,
          sharesAllocated: newShares,
          sharesRemaining: z.status === 'FILLED' ? newShares : newShares,
          capitalRequired: Math.round(z.priceLevel * newShares * 100) / 100
        };
      }
      return z;
    });

    const updatedProfile = {
      ...currentProfile,
      zones: updatedZones,
      averageCostBasis: computeAverageCostBasis(updatedZones),
      updatedAt: new Date().toISOString()
    };
    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);
  };

  // 7. Reset All Zones
  const handleResetAllZones = () => {
    if (!currentProfile) return;
    const updatedZones = currentProfile.zones.map(z => ({
      ...z,
      status: 'EMPTY',
      filledAt: null,
      filledPrice: null,
      sharesRemaining: z.sharesAllocated
    }));

    const updatedProfile = {
      ...currentProfile,
      zones: updatedZones,
      averageCostBasis: 0,
      updatedAt: new Date().toISOString()
    };
    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);
  };

  // 8. Dynamic Grid Expansion
  const handleExpandUpperZone = () => {
    if (!currentProfile) return;
    const plan = currentProfile.plan || {};
    const step = parseFloat(plan.gridStep) || 1.0;
    const currentUpper = parseFloat(plan.upperPrice) || (currentProfile.zones?.[0]?.priceLevel || 35);
    const newUpper = Math.round((currentUpper + step) * 100) / 100;
    const targetSell = Math.round((newUpper + step) * 100) / 100;
    const isAction = newUpper >= (parseFloat(plan.actionZoneLowerLimit) || 0);
    const shares = isAction ? (parseInt(plan.actionZoneShares, 10) || 10) : (parseInt(plan.safetyZoneShares, 10) || 20);
    const capital = Math.round(newUpper * shares * 100) / 100;

    const newZone = {
      id: `zone_${Date.now()}_upper_${Math.random().toString(36).substring(2, 6)}`,
      levelIndex: 1,
      priceLevel: newUpper,
      targetSellPrice: targetSell,
      sharesAllocated: shares,
      sharesRemaining: shares,
      capitalRequired: capital,
      zoneType: isAction ? 'ACTION' : 'SAFETY',
      status: 'EMPTY',
      filledAt: null,
      filledPrice: null
    };

    const updatedZones = [newZone, ...currentProfile.zones];
    updatedZones.forEach((z, i) => { z.levelIndex = i + 1; });

    const updatedProfile = {
      ...currentProfile,
      plan: { ...plan, upperPrice: newUpper },
      zones: updatedZones,
      updatedAt: new Date().toISOString()
    };

    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);

    if (requestAlert) {
      requestAlert('🚀 ขยายโซนบนสำเร็จ!', `เพิ่มโซนใหม่ $${newUpper.toFixed(2)} → $${targetSell.toFixed(2)} (${shares} หุ้น) เรียบร้อยแล้ว`);
    }
  };

  const handleExpandLowerZone = () => {
    if (!currentProfile) return;
    const plan = currentProfile.plan || {};
    const step = parseFloat(plan.gridStep) || 1.0;
    const currentLower = parseFloat(plan.lowerPrice) || 20;
    const newLower = Math.max(0.01, Math.round((currentLower - step) * 100) / 100);
    const targetSell = Math.round((newLower + step) * 100) / 100;
    const isAction = newLower >= (parseFloat(plan.actionZoneLowerLimit) || 0);
    const shares = isAction ? (parseInt(plan.actionZoneShares, 10) || 10) : (parseInt(plan.safetyZoneShares, 10) || 20);
    const capital = Math.round(newLower * shares * 100) / 100;

    const newZone = {
      id: `zone_${Date.now()}_lower_${Math.random().toString(36).substring(2, 6)}`,
      levelIndex: currentProfile.zones.length + 1,
      priceLevel: newLower,
      targetSellPrice: targetSell,
      sharesAllocated: shares,
      sharesRemaining: shares,
      capitalRequired: capital,
      zoneType: isAction ? 'ACTION' : 'SAFETY',
      status: 'EMPTY',
      filledAt: null,
      filledPrice: null
    };

    const updatedZones = [...currentProfile.zones, newZone];
    updatedZones.forEach((z, i) => { z.levelIndex = i + 1; });

    const updatedProfile = {
      ...currentProfile,
      plan: { ...plan, lowerPrice: newLower },
      zones: updatedZones,
      updatedAt: new Date().toISOString()
    };

    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);

    if (requestAlert) {
      requestAlert('🛡️ ขยายโซนล่างสำเร็จ!', `เพิ่มโซนรับลึก $${newLower.toFixed(2)} → $${targetSell.toFixed(2)} (${shares} หุ้น) เรียบร้อยแล้ว`);
    }
  };

  const handleExpandToLivePrice = () => {
    if (!currentProfile || !currentLivePrice) return;
    const plan = currentProfile.plan || {};
    const step = parseFloat(plan.gridStep) || 1.0;
    let currentUpper = parseFloat(plan.upperPrice) || 35;
    if (currentLivePrice <= currentUpper) return;

    let newZones = [];
    while (currentUpper < currentLivePrice) {
      currentUpper = Math.round((currentUpper + step) * 100) / 100;
      const targetSell = Math.round((currentUpper + step) * 100) / 100;
      const isAction = currentUpper >= (parseFloat(plan.actionZoneLowerLimit) || 0);
      const shares = isAction ? (parseInt(plan.actionZoneShares, 10) || 10) : (parseInt(plan.safetyZoneShares, 10) || 20);
      newZones.unshift({
        id: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        priceLevel: currentUpper,
        targetSellPrice: targetSell,
        sharesAllocated: shares,
        sharesRemaining: shares,
        capitalRequired: Math.round(currentUpper * shares * 100) / 100,
        zoneType: isAction ? 'ACTION' : 'SAFETY',
        status: 'EMPTY',
        filledAt: null,
        filledPrice: null
      });
    }

    const updatedZones = [...newZones, ...currentProfile.zones];
    updatedZones.forEach((z, i) => { z.levelIndex = i + 1; });

    const updatedProfile = {
      ...currentProfile,
      plan: { ...plan, upperPrice: currentUpper },
      zones: updatedZones,
      updatedAt: new Date().toISOString()
    };

    const updatedProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    persistProfiles(updatedProfiles);

    if (requestAlert) {
      requestAlert('🚀 ขยายโซนบนครอบคลุมราคาปัจจุบันสำเร็จ!', `เพิ่ม ${newZones.length} โซนใหม่จนถึงราคา $${currentUpper.toFixed(2)} เรียบร้อยแล้ว`);
    }
  };

  // 9. Profile Management (preserving filled orders on edit)
  const handleSavePlan = (savedProfileData) => {
    let updatedProfiles;
    const existingIndex = profiles.findIndex(p => p.id === savedProfileData.id);

    if (existingIndex >= 0) {
      const oldProfile = profiles[existingIndex];
      const oldFilledZones = oldProfile.zones?.filter(z => z.status === 'FILLED') || [];

      const mergedZones = savedProfileData.zones.map(newZone => {
        const match = oldFilledZones.find(oz => Math.abs(oz.priceLevel - newZone.priceLevel) < 0.001);
        if (match) {
          return {
            ...newZone,
            status: 'FILLED',
            filledAt: match.filledAt,
            filledPrice: match.filledPrice,
            sharesAllocated: match.sharesAllocated || newZone.sharesAllocated,
            sharesRemaining: match.sharesRemaining !== undefined ? match.sharesRemaining : (match.sharesAllocated || newZone.sharesAllocated),
            capitalRequired: match.capitalRequired || (newZone.priceLevel * (match.sharesAllocated || newZone.sharesAllocated)),
            targetSellPrice: match.targetSellPrice || newZone.targetSellPrice
          };
        }
        return newZone;
      });

      const outsideFilled = oldFilledZones.filter(
        oz => !mergedZones.some(mz => Math.abs(mz.priceLevel - oz.priceLevel) < 0.001)
      );

      const finalZones = [...mergedZones, ...outsideFilled].sort((a, b) => b.priceLevel - a.priceLevel);
      finalZones.forEach((z, i) => { z.levelIndex = i + 1; });

      savedProfileData.zones = finalZones;
      // Preserve immutable accountingMode from old profile
      savedProfileData.accountingMode = oldProfile.accountingMode;
      savedProfileData.averageCostBasis = computeAverageCostBasis(finalZones);

      updatedProfiles = profiles.map(p => p.id === savedProfileData.id ? { ...p, ...savedProfileData, updatedAt: new Date().toISOString() } : p);
    } else {
      // New profile — init sharesRemaining for all zones
      savedProfileData.zones = (savedProfileData.zones || []).map(z => ({
        ...z,
        sharesRemaining: z.sharesRemaining !== undefined ? z.sharesRemaining : z.sharesAllocated
      }));
      savedProfileData.averageCostBasis = 0;
      updatedProfiles = [savedProfileData, ...profiles];
    }

    persistProfiles(updatedProfiles);
    setSelectedProfileId(savedProfileData.id);
  };

  const handleDeleteProfile = (profileId) => {
    if (profiles.length <= 1) {
      if (requestAlert) requestAlert('แจ้งเตือน', 'ต้องมีอย่างน้อย 1 กลยุทธ์ในระบบ');
      return;
    }
    const doDelete = () => {
      const remaining = profiles.filter(p => p.id !== profileId);
      persistProfiles(remaining);
      setSelectedProfileId(remaining[0].id);
    };
    if (requestConfirm) {
      requestConfirm('ลบกลยุทธ์', 'คุณต้องการลบกลยุทธ์ Grid นี้ใช่หรือไม่?', doDelete);
    } else if (window.confirm('Delete this strategy profile?')) {
      doDelete();
    }
  };

  // 10. HARD RESET — wipe everything and restart fresh
  const handleHardReset = async () => {
    try {
      const cleanEmail = currentUser?.trim().toLowerCase();
      if (!cleanEmail) return;

      // Clear Supabase
      try {
        await supabase.from('beta_grid_profiles').delete().eq('email', cleanEmail);
        await supabase.from('beta_grid_history').delete().eq('email', cleanEmail);
      } catch (e) {
        console.warn('Supabase clear failed (may not exist yet):', e);
      }

      // Clear localStorage
      const storageKeys = Object.keys(localStorage).filter(k =>
        k.includes('phudit_beta_grid') || k.includes('phudit_beta_history')
      );
      storageKeys.forEach(k => localStorage.removeItem(k));

      // Reset state
      setCycleHistory([]);
      setProfiles([]);
      setSelectedProfileId(null);
      setShowHardResetConfirm(false);

      if (requestAlert) {
        requestAlert('🔄 Hard Reset สำเร็จ', 'ข้อมูลทั้งหมดถูกลบแล้ว กรุณาสร้าง Beta Account ใหม่');
      }

      // Open create modal
      setTimeout(() => {
        setModalEditProfile(null);
        setIsPlanModalOpen(true);
      }, 500);
    } catch (err) {
      console.error('Hard reset failed:', err);
    }
  };

  // ── Computed profits for overview ──
  const currentProfileHistory = cycleHistory.filter(h => h.profileId === selectedProfileId);
  const totalRealizedProfitNonFIFO = currentProfileHistory.reduce((sum, h) => sum + (parseFloat(h.profitDollars) || 0), 0);
  const totalRealizedProfitFIFO = currentProfileHistory.reduce((sum, h) => {
    const v = h.fifoProfitDollars !== undefined ? h.fifoProfitDollars : h.profitDollars;
    return sum + (parseFloat(v) || 0);
  }, 0);
  const totalRealizedProfitAvgCost = currentProfileHistory.reduce((sum, h) => {
    const v = h.avgCostProfitDollars !== undefined ? h.avgCostProfitDollars : h.profitDollars;
    return sum + (parseFloat(v) || 0);
  }, 0);

  const totalRealizedProfit =
    accountingMode === 'NON_FIFO' ? totalRealizedProfitNonFIFO :
    accountingMode === 'FIFO' ? totalRealizedProfitFIFO :
    totalRealizedProfitAvgCost;

  const comparisonProfit =
    accountingMode === 'NON_FIFO' ? totalRealizedProfitFIFO :
    totalRealizedProfitNonFIFO;

  if (!isVip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center blur-md opacity-60 select-none pointer-events-none">
        <h2 className="text-2xl font-black">VIP Feature Locked</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 px-2 sm:px-0 animate-fade-in">

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-[#0B1121] transition-colors"></div>
      <div className="fixed top-0 left-0 w-full h-[550px] bg-gradient-to-b from-indigo-600/10 via-cyan-500/5 to-transparent -z-10 pointer-events-none"></div>

      {/* Top Header & Strategy Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">

        {/* Branding */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <span className="text-2xl font-black font-serif italic text-white drop-shadow-md leading-none">β</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                Beta Portfolio (Grid Trading)
              </h1>
              {currentProfile?.accountingMode && (
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase border ${
                  currentProfile.accountingMode === 'NON_FIFO'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : currentProfile.accountingMode === 'FIFO'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                }`}>
                  {currentProfile.accountingMode === 'NON_FIFO' ? 'NON-FIFO' :
                   currentProfile.accountingMode === 'FIFO' ? 'FIFO' : 'AVG COST'}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              Discrete Zone Tracking • Asymmetric Grid Engine • Automated Cash Flow
            </p>
          </div>
        </div>

        {/* Strategy Profile Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {profiles.length > 0 && (
            <div className="relative">
              <select
                value={selectedProfileId || ''}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl px-3.5 py-2.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.assetTicker} • {p.name} [{p.accountingMode || 'NON_FIFO'}]
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <span className="text-[10px]">▼</span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setModalEditProfile(null);
              setIsPlanModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            title="Create new Grid Strategy"
          >
            <Plus size={14} />
            <span>สร้าง Grid ใหม่</span>
          </button>

          {currentProfile && (
            <button
              onClick={() => {
                setModalEditProfile(currentProfile);
                setIsPlanModalOpen(true);
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Edit Current Grid Plan"
            >
              <Settings2 size={16} />
            </button>
          )}

          {profiles.length > 1 && currentProfile && (
            <button
              onClick={() => handleDeleteProfile(currentProfile.id)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer"
              title="Delete Strategy Profile"
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Hard Reset Button */}
          <button
            onClick={() => setShowHardResetConfirm(true)}
            className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-400 hover:text-rose-600 hover:border-rose-400 dark:hover:border-rose-700 transition-colors cursor-pointer"
            title="Hard Reset — ลบข้อมูลทั้งหมดแล้วเริ่มใหม่"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Hard Reset Confirmation Banner */}
      {showHardResetConfirm && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0" />
            <div>
              <div className="font-black text-rose-700 dark:text-rose-400 text-sm">⚠️ Hard Reset — ยืนยันการลบข้อมูลทั้งหมด</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Profiles, Zones, และประวัติรอบทั้งหมด (Supabase + localStorage) จะถูกลบถาวร ไม่สามารถกู้คืนได้
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowHardResetConfirm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleHardReset}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black shadow-md shadow-rose-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>ยืนยัน Hard Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View Mode Selector */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex p-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 shadow-lg shadow-slate-200/10 dark:shadow-black/20">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
            <span>กระดาน Grid Trading</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History size={14} />
            <span>ประวัติรอบ & กระแสเงินสด ({cycleHistory.length})</span>
          </button>
          <button
            onClick={() => setIsChartModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 ml-1"
            title="ดูกราฟโซน Grid พร้อมเส้นราคาแนวนอนและระดับไม้"
          >
            <LineChart size={14} />
            <span>📈 ดูกราฟโซน Grid</span>
          </button>
        </div>

        {currentProfile?.plan && (
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Range: ${currentProfile.plan.lowerPrice.toFixed(2)} - ${currentProfile.plan.upperPrice.toFixed(2)}</span>
            <span>•</span>
            <span>Step: ${currentProfile.plan.gridStep.toFixed(2)}</span>
            <span>•</span>
            <span>Action Limit: ${currentProfile.plan.actionZoneLowerLimit?.toFixed(2) || '-'}</span>
          </div>
        )}
      </div>

      {/* Overview Cards Panel */}
      <BetaGridOverviewCard
        profile={currentProfile}
        livePrice={currentLivePrice}
        isFetchingPrice={isFetchingPrice}
        lastUpdated={lastUpdated}
        onRefreshPrice={updateLivePrice}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        totalRealizedProfit={totalRealizedProfit}
        totalRealizedProfitNonFIFO={totalRealizedProfitNonFIFO}
        totalRealizedProfitFIFO={totalRealizedProfitFIFO}
        totalRealizedProfitAvgCost={totalRealizedProfitAvgCost}
        comparisonProfit={comparisonProfit}
        completedCyclesCount={currentProfileHistory.length}
        accountingMode={accountingMode}
        onExpandUpperZone={handleExpandUpperZone}
        onExpandLowerZone={handleExpandLowerZone}
        onExpandToLivePrice={handleExpandToLivePrice}
        onOpenChart={() => setIsChartModalOpen(true)}
      />

      {/* Main Content Area */}
      {activeTab === 'grid' && currentProfile && (
        <BetaGridZoneTable
          zones={currentProfile.zones || []}
          livePrice={currentLivePrice}
          accountingMode={accountingMode}
          averageCostBasis={averageCostBasis}
          onFillZone={handleFillZone}
          onHarvestZone={handleHarvestZone}
          onUpdateZoneShares={handleUpdateZoneShares}
          onResetAllZones={handleResetAllZones}
          onExpandUpperZone={handleExpandUpperZone}
          onExpandLowerZone={handleExpandLowerZone}
          requestConfirm={requestConfirm}
        />
      )}

      {activeTab === 'history' && (
        <BetaGridCycleHistory
          history={cycleHistory}
          accountingMode={accountingMode}
          setAccountingMode={null} // immutable — no switching in history view
          totalRealizedProfitNonFIFO={totalRealizedProfitNonFIFO}
          totalRealizedProfitFIFO={totalRealizedProfitFIFO}
          onDeleteHistoryItem={(id) => {
            const updated = cycleHistory.filter(h => h.id !== id);
            persistHistory(updated);
          }}
          onClearAllHistory={() => {
            persistHistory([]);
          }}
          requestConfirm={requestConfirm}
        />
      )}

      {/* Grid Strategy Plan Modal */}
      <BetaGridPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSave={handleSavePlan}
        existingProfile={modalEditProfile}
        currentLivePrice={currentLivePrice}
      />

      {/* Grid Chart Visualizer Modal */}
      <BetaGridChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        profile={currentProfile}
        livePrice={currentLivePrice}
        onFillZone={handleFillZone}
        onHarvestZone={handleHarvestZone}
      />

    </div>
  );
}
