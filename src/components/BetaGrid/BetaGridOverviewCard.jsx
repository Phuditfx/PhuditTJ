import React from 'react';
import { RefreshCw, TrendingUp, DollarSign, Layers, Activity, ShieldCheck, Zap } from 'lucide-react';

export default function BetaGridOverviewCard({
  profile,
  livePrice,
  isFetchingPrice,
  lastUpdated,
  onRefreshPrice,
  autoRefresh,
  setAutoRefresh,
  totalRealizedProfit,
  totalRealizedProfitNonFIFO = 0,
  totalRealizedProfitFIFO = 0,
  comparisonProfit = 0,
  completedCyclesCount,
  accountingMode = 'NON_FIFO',
  setAccountingMode,
  onExpandUpperZone,
  onExpandLowerZone,
  onExpandToLivePrice
}) {
  if (!profile) return null;

  const zones = profile.zones || [];
  const filledZones = zones.filter(z => z.status === 'FILLED');
  const emptyZones = zones.filter(z => z.status === 'EMPTY');

  // Total Capital Deployed = sum of capitalRequired for FILLED zones
  const totalCapitalDeployed = filledZones.reduce((sum, z) => sum + (parseFloat(z.capitalRequired) || 0), 0);

  // Total Max Capital Required if all zones are filled
  const totalMaxCapital = zones.reduce((sum, z) => sum + (parseFloat(z.capitalRequired) || 0), 0);

  // Available Cash Pool
  const initialCashReserve = parseFloat(profile.initialCashReserve) || 0;
  const availableCashPool = Math.max(0, initialCashReserve + totalRealizedProfit - totalCapitalDeployed);

  // Zone utilization percentage
  const utilizationPercent = zones.length > 0 ? Math.round((filledZones.length / zones.length) * 100) : 0;

  // Find which zone current live price is currently in
  let currentZoneText = 'Waiting for live price...';
  let currentZone = null;
  if (livePrice && zones.length > 0) {
    currentZone = zones.find(z => livePrice >= z.priceLevel && livePrice < z.targetSellPrice);
    if (!currentZone) {
      if (livePrice >= profile.plan?.upperPrice) {
        currentZoneText = `Above Upper Grid (> $${profile.plan.upperPrice.toFixed(2)})`;
      } else if (livePrice < profile.plan?.lowerPrice) {
        currentZoneText = `Below Lower Grid (< $${profile.plan.lowerPrice.toFixed(2)})`;
      } else {
        currentZoneText = `$${livePrice.toFixed(2)}`;
      }
    } else {
      currentZoneText = `Zone #${currentZone.levelIndex}: $${currentZone.priceLevel.toFixed(2)} → $${currentZone.targetSellPrice.toFixed(2)} (${currentZone.zoneType})`;
    }
  }

  // Calculate Unrealized PnL of all FILLED zones
  let totalUnrealizedPnL = 0;
  if (livePrice) {
    filledZones.forEach(z => {
      const pnl = (livePrice - z.priceLevel) * z.sharesAllocated;
      totalUnrealizedPnL += pnl;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner / Price Status Bar */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-200/20 dark:shadow-black/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <span className="text-2xl font-black font-serif italic text-white drop-shadow-md leading-none">β</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {profile.assetTicker}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                accountingMode === 'NON_FIFO'
                  ? 'bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                  : 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}>
                {accountingMode === 'NON_FIFO' ? 'Non-FIFO Discrete' : 'FIFO Broker Mode'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                • {profile.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Active Zone:</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                {currentZoneText}
              </span>
            </div>
          </div>
        </div>

        {/* Live Price & Accounting Mode Switcher Controls */}
        <div className="flex flex-wrap items-center gap-3.5 self-end md:self-auto">
          
          {/* Quick Toggle: Non-FIFO vs FIFO */}
          {setAccountingMode && (
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-black shadow-inner">
              <button
                onClick={() => setAccountingMode('NON_FIFO')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  accountingMode === 'NON_FIFO'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/30'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="โหมด Non-FIFO: คำนวณกำไรแยกอิสระเฉพาะไม้ของโซนนั้นๆ (Discrete Zone)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Non-FIFO</span>
              </button>
              <button
                onClick={() => setAccountingMode('FIFO')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  accountingMode === 'FIFO'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400/30'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="โหมด FIFO: คำนวณกำไรตามไม้ที่ซื้อเข้ามาก่อนหลังตามรายงานของโบรกเกอร์"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>FIFO (โบรกเกอร์)</span>
              </button>
            </div>
          )}

          <div className="flex flex-col text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${livePrice ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${livePrice ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Live Price
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {livePrice ? `$${livePrice.toFixed(2)}` : 'Loading...'}
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            <button
              onClick={onRefreshPrice}
              disabled={isFetchingPrice}
              className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm ${
                isFetchingPrice ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              title="Refresh live price"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingPrice ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
              title="Auto poll price every 30s"
            >
              {autoRefresh ? 'AUTO ON' : 'AUTO OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* ⚠️ Out-of-Bounds Breakout Alert Banners with 1-Click Expansion */}
      {livePrice && profile.plan?.upperPrice && livePrice > profile.plan.upperPrice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 dark:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                  ราคาวิ่งทะลุกรอบบน ($ {livePrice.toFixed(2)} &gt; $ {profile.plan.upperPrice.toFixed(2)})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  +{((livePrice - profile.plan.upperPrice) / profile.plan.upperPrice * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ราคาสูงกว่าโซนบนสุดในแผน คุณสามารถกดขยายโซนบนเพื่อเริ่มรับรอบใหม่ได้ทันที (ไม้ที่ถือครองอยู่จะไม่หาย)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            {onExpandUpperZone && (
              <button
                onClick={onExpandUpperZone}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕ ขยายโซนบน (+1 ไม้)</span>
              </button>
            )}
            {onExpandToLivePrice && (
              <button
                onClick={onExpandToLivePrice}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-black shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🚀 ขยายให้ถึง ${livePrice.toFixed(2)}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {livePrice && profile.plan?.lowerPrice && livePrice < profile.plan.lowerPrice && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/30 dark:border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-indigo-500/5 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
                  ราคาย่อหลุดต่ำกว่ากรอบล่าง ($ {livePrice.toFixed(2)} &lt; $ {profile.plan.lowerPrice.toFixed(2)})
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ราคาย่อลงลึกกว่าแผน คุณสามารถกดขยายโซนล่างเพื่อเพิ่มไม้ Safety Zone รับของราคาต่ำได้ทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            {onExpandLowerZone && (
              <button
                onClick={onExpandLowerZone}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕ ขยายโซนล่าง (+1 ไม้)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Capital Deployed */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-slate-200/10 dark:shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Capital Deployed</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              ${totalCapitalDeployed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{filledZones.length} / {zones.length} Zones Filled</span>
              <span className="font-semibold text-slate-400">Max ${totalMaxCapital.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Realized Cash Flow (Profit Collected) */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-slate-200/10 dark:shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {accountingMode === 'NON_FIFO' ? 'Realized Cash Flow' : 'FIFO Broker Realized'}
            </span>
            <div className={`p-2 rounded-xl ${
              accountingMode === 'NON_FIFO'
                ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${
              totalRealizedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalRealizedProfit >= 0 ? '+' : ''}${totalRealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{completedCyclesCount} รอบปิดแล้ว</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {accountingMode === 'NON_FIFO'
                  ? `FIFO: ${comparisonProfit >= 0 ? '+' : ''}$${comparisonProfit.toFixed(0)}`
                  : `Non-FIFO: +$${comparisonProfit.toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Unrealized P&L */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-slate-200/10 dark:shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Unrealized P&L</span>
            <div className={`p-2 rounded-xl ${totalUnrealizedPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${
              totalUnrealizedPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>On Open Zones</span>
              <span className="font-semibold text-slate-400">
                {totalCapitalDeployed > 0 ? `${((totalUnrealizedPnL / totalCapitalDeployed) * 100).toFixed(2)}%` : '0.00%'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Available Cash Pool & Capacity */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-slate-200/10 dark:shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Available Cash Pool</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              ${availableCashPool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${utilizationPercent}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{utilizationPercent}% Grid Deployed</span>
                <span>{emptyZones.length} Slots Open</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
