import React, { useState } from 'react';
import { 
  ArrowDownUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Edit3, 
  Filter, 
  Layers, 
  TrendingUp, 
  Zap, 
  ShoppingBag,
  RotateCcw
} from 'lucide-react';

export default function BetaGridZoneTable({
  zones = [],
  livePrice = null,
  onFillZone,
  onHarvestZone,
  onUpdateZoneShares,
  onResetAllZones,
  onExpandUpperZone,
  onExpandLowerZone,
  requestConfirm
}) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'FILLED' | 'EMPTY'
  const [sortOrder, setSortOrder] = useState('DESC'); // 'DESC' (high to low) | 'ASC' (low to high)
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editSharesValue, setEditSharesValue] = useState('');

  // Filtering
  const filteredZones = zones.filter(zone => {
    if (filter === 'FILLED') return zone.status === 'FILLED';
    if (filter === 'EMPTY') return zone.status === 'EMPTY';
    return true;
  });

  // Sorting
  const sortedZones = [...filteredZones].sort((a, b) => {
    return sortOrder === 'DESC' ? b.priceLevel - a.priceLevel : a.priceLevel - b.priceLevel;
  });

  const handleStartEditShares = (zone) => {
    setEditingZoneId(zone.id);
    setEditSharesValue(String(zone.sharesAllocated));
  };

  const handleSaveShares = (zoneId) => {
    const val = parseInt(editSharesValue, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateZoneShares(zoneId, val);
    }
    setEditingZoneId(null);
  };

  const handleResetConfirm = () => {
    const doReset = () => {
      onResetAllZones();
    };
    if (requestConfirm) {
      requestConfirm('Reset All Zones', 'คุณต้องการรีเซ็ตทุกโซนกลับเป็นสถานะ EMPTY หรือไม่? (ประวัติรอบที่เคยปิดกำไรแล้วจะไม่ถูกลบ)', doReset);
    } else if (window.confirm('Reset all zones back to EMPTY?')) {
      doReset();
    }
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-black/30 overflow-hidden flex flex-col">
      
      {/* Table Header Bar & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Discrete Zone Grid Board
          </h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {zones.length} โซน
          </span>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          
          {/* Status Filter */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({zones.length})
            </button>
            <button
              onClick={() => setFilter('FILLED')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'FILLED'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ถือครอง ({zones.filter(z => z.status === 'FILLED').length})
            </button>
            <button
              onClick={() => setFilter('EMPTY')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'EMPTY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              รอรับ ({zones.filter(z => z.status === 'EMPTY').length})
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(s => s === 'DESC' ? 'ASC' : 'DESC')}
            className="p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Toggle sort direction"
          >
            <ArrowDownUp size={13} />
            <span>{sortOrder === 'DESC' ? 'ราคา สูง → ต่ำ' : 'ราคา ต่ำ → สูง'}</span>
          </button>

          {/* Quick Expand Zones Buttons */}
          {onExpandUpperZone && (
            <button
              onClick={onExpandUpperZone}
              className="p-1.5 px-2.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/60 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              title="เพิ่ม 1 โซนใหม่ด้านบนสุด"
            >
              <span>➕ โซนบน</span>
            </button>
          )}

          {onExpandLowerZone && (
            <button
              onClick={onExpandLowerZone}
              className="p-1.5 px-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800/60 bg-indigo-50/60 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              title="เพิ่ม 1 โซนใหม่ด้านล่างสุด"
            >
              <span>➕ โซนล่าง</span>
            </button>
          )}

          {/* Reset All Zones Button */}
          <button
            onClick={handleResetConfirm}
            className="p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Reset all filled zones to empty"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset โซน</span>
          </button>

        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 text-[11px] font-black uppercase tracking-wider">
              <th className="py-3 px-4">Level / Zone</th>
              <th className="py-3 px-3">Buy Price (จุดซื้อ)</th>
              <th className="py-3 px-3">Target Sell (เป้าขาย)</th>
              <th className="py-3 px-3">Shares (หุ้น)</th>
              <th className="py-3 px-3">Capital (เงินทุน)</th>
              <th className="py-3 px-3">Discrete Profit / ไม้</th>
              <th className="py-3 px-3">Live Status & Unrealized P&L</th>
              <th className="py-3 px-4 text-right">Non-FIFO Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {sortedZones.map((zone) => {
              const isCurrentMarketZone = livePrice && livePrice >= zone.priceLevel && livePrice < zone.targetSellPrice;
              const isFilled = zone.status === 'FILLED';
              const discreteProfitDollars = (zone.targetSellPrice - zone.priceLevel) * zone.sharesAllocated;
              const discreteProfitPct = ((zone.targetSellPrice - zone.priceLevel) / zone.priceLevel) * 100;

              // Unrealized PnL when FILLED
              const unrealizedDollars = livePrice ? (livePrice - zone.priceLevel) * zone.sharesAllocated : null;
              const unrealizedPct = livePrice ? ((livePrice - zone.priceLevel) / zone.priceLevel) * 100 : null;

              return (
                <tr
                  key={zone.id}
                  className={`transition-colors ${
                    isCurrentMarketZone
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/50'
                      : isFilled
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Column 1: Level / Zone Badge */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                        #{zone.levelIndex}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        zone.zoneType === 'ACTION'
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      }`}>
                        {zone.zoneType}
                      </span>
                      {isCurrentMarketZone && (
                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-sm animate-pulse">
                          <Zap size={10} />
                          <span>LIVE ZONE</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Column 2: Buy Price */}
                  <td className="py-3.5 px-3">
                    <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                      ${zone.priceLevel.toFixed(2)}
                    </div>
                    {isFilled && zone.filledAt && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock size={10} />
                        {new Date(zone.filledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </td>

                  {/* Column 3: Target Sell Price */}
                  <td className="py-3.5 px-3">
                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ${zone.targetSellPrice.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      +${(zone.targetSellPrice - zone.priceLevel).toFixed(2)} (+{discreteProfitPct.toFixed(1)}%)
                    </span>
                  </td>

                  {/* Column 4: Shares Allocated (Editable) */}
                  <td className="py-3.5 px-3">
                    {editingZoneId === zone.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          autoFocus
                          value={editSharesValue}
                          onChange={(e) => setEditSharesValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveShares(zone.id);
                            if (e.key === 'Escape') setEditingZoneId(null);
                          }}
                          className="w-16 bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                        />
                        <button
                          onClick={() => handleSaveShares(zone.id)}
                          className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleStartEditShares(zone)}
                        className="group flex items-center gap-1.5 cursor-pointer font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Click to edit shares for this zone"
                      >
                        <span>{zone.sharesAllocated} หุ้น</span>
                        <Edit3 size={11} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    )}
                  </td>

                  {/* Column 5: Capital Required */}
                  <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                    ${(zone.priceLevel * zone.sharesAllocated).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Column 6: Discrete Non-FIFO Profit per Cycle */}
                  <td className="py-3.5 px-3">
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +${discreteProfitDollars.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {(discreteProfitPct).toFixed(1)}% ต่อรอบ
                    </span>
                  </td>

                  {/* Column 7: Status & Unrealized PnL */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isFilled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        <span className={`text-xs font-black tracking-wide ${isFilled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {isFilled ? 'FILLED (ถือครอง)' : 'EMPTY (ว่าง)'}
                        </span>
                      </div>

                      {/* If FILLED, show Unrealized P&L against live price */}
                      {isFilled && livePrice && (
                        <div className={`text-[11px] font-mono font-bold ${unrealizedDollars >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {unrealizedDollars >= 0 ? '+' : ''}${unrealizedDollars.toFixed(2)} ({unrealizedPct >= 0 ? '+' : ''}{unrealizedPct.toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Column 8: Action Buttons (Buy vs Sell Harvest) */}
                  <td className="py-3.5 px-4 text-right">
                    {!isFilled ? (
                      <button
                        onClick={() => onFillZone(zone)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 dark:text-slate-200 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                        title="บันทึกว่าราคาลงมาถึงจุดนี้และซื้อแล้ว"
                      >
                        <ShoppingBag size={13} />
                        <span>ซื้อไม้ (Buy)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onHarvestZone(zone)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5 ring-1 ring-emerald-400/30"
                        title="ขายทำกำไรเป้าหมายรอบนี้ (Non-FIFO Discrete Profit) และรีเซ็ตโซน"
                      >
                        <DollarSign size={13} />
                        <span>ขายทำกำไร (+${discreteProfitDollars.toFixed(0)})</span>
                      </button>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedZones.length === 0 && (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
          <Layers size={32} className="opacity-40" />
          <p className="text-sm font-semibold">ไม่มีโซนที่ตรงกับเงื่อนไขตัวกรอง</p>
        </div>
      )}

    </div>
  );
}
