import React, { useState } from 'react';
import { 
  TrendingUp, 
  Download, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Zap, 
  Search,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  AlertTriangle,
  Info
} from 'lucide-react';

const MODE_LABELS = {
  NON_FIFO: { label: 'Non-FIFO Discrete', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  FIFO: { label: 'FIFO Broker', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  AVERAGE_COST: { label: 'Avg Cost', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
};

export default function BetaGridCycleHistory({
  history = [],
  accountingMode = 'NON_FIFO',
  setAccountingMode, // ignored — immutable now, kept for backward compat
  totalRealizedProfitNonFIFO = 0,
  totalRealizedProfitFIFO = 0,
  onDeleteHistoryItem,
  onClearAllHistory,
  requestConfirm
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('ALL');

  // Extract unique tickers in history
  const uniqueTickers = Array.from(new Set(history.map(h => h.ticker).filter(Boolean)));

  // Filtered history
  const filteredHistory = history.filter(item => {
    const matchTicker = selectedTicker === 'ALL' || item.ticker === selectedTicker;
    const matchSearch = !searchTerm || 
      item.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profileName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTicker && matchSearch;
  });

  // Analytics on filtered history
  const totalNonFIFOProfit = filteredHistory.reduce((sum, h) => sum + (parseFloat(h.profitDollars) || 0), 0);
  const totalFIFOProfit = filteredHistory.reduce((sum, h) => {
    const fifoVal = h.fifoProfitDollars !== undefined ? parseFloat(h.fifoProfitDollars) : parseFloat(h.profitDollars);
    return sum + (fifoVal || 0);
  }, 0);
  const totalAvgCostProfit = filteredHistory.reduce((sum, h) => {
    const v = h.avgCostProfitDollars !== undefined ? parseFloat(h.avgCostProfitDollars) : parseFloat(h.profitDollars);
    return sum + (v || 0);
  }, 0);

  const activeTotalProfit =
    accountingMode === 'NON_FIFO' ? totalNonFIFOProfit :
    accountingMode === 'FIFO' ? totalFIFOProfit :
    totalAvgCostProfit;
  const profitDifference = totalNonFIFOProfit - totalFIFOProfit;
  const totalCapitalTurnover = filteredHistory.reduce((sum, h) => sum + ((parseFloat(h.priceLevel) || 0) * (parseInt(h.sharesSold || h.sharesAllocated, 10) || 0)), 0);
  const avgProfit = filteredHistory.length > 0 ? activeTotalProfit / filteredHistory.length : 0;

  const handleDeleteItem = (id) => {
    const doDelete = () => onDeleteHistoryItem(id);
    if (requestConfirm) {
      requestConfirm('Delete History Record', 'คุณต้องการลบประวัติรอบนี้หรือไม่?', doDelete);
    } else if (window.confirm('Delete this completed cycle record?')) {
      doDelete();
    }
  };

  const handleClearAll = () => {
    const doClear = () => onClearAllHistory();
    if (requestConfirm) {
      requestConfirm('Clear All History', 'คุณต้องการล้างประวัติการปิดรอบทั้งหมดหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้', doClear);
    } else if (window.confirm('Clear all cycle history?')) {
      doClear();
    }
  };

  const exportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = [
      'Date',
      'Ticker',
      'Strategy',
      'Discrete Buy Price',
      'Sell Price',
      'Shares',
      'Capital Used',
      'Non-FIFO Profit ($)',
      'Non-FIFO Return (%)',
      'Broker FIFO Cost ($)',
      'Broker FIFO Profit ($)',
      'Broker FIFO Return (%)',
      'Accounting Discrepancy ($)'
    ];
    const rows = filteredHistory.map(h => {
      const nonFifo = parseFloat(h.profitDollars) || 0;
      const fifoProfit = h.fifoProfitDollars !== undefined ? parseFloat(h.fifoProfitDollars) : nonFifo;
      const fifoCost = h.fifoPriceLevel !== undefined ? parseFloat(h.fifoPriceLevel) : h.priceLevel;
      const fifoReturn = h.fifoProfitPercent !== undefined ? parseFloat(h.fifoProfitPercent) : (parseFloat(h.profitPercent) || 0);
      const diff = nonFifo - fifoProfit;

      return [
        `"${new Date(h.sellTimestamp).toLocaleString()}"`,
        `"${h.ticker}"`,
        `"${h.profileName || ''}"`,
        h.priceLevel,
        h.targetSellPrice,
        h.sharesAllocated,
        (h.priceLevel * h.sharesAllocated).toFixed(2),
        nonFifo.toFixed(2),
        (parseFloat(h.profitPercent) || 0).toFixed(2),
        fifoCost.toFixed(2),
        fifoProfit.toFixed(2),
        fifoReturn.toFixed(2),
        diff.toFixed(2)
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `beta_grid_cycles_${accountingMode}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-black/30 overflow-hidden flex flex-col gap-6 p-5 sm:p-6">
      
      {/* Top Header & Analytics Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Completed Grid Cycles (บันทึกประวัติการปิดรอบ)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            รองรับการเปรียบเทียบกำไรจริงแบบ Discrete Zone (Non-FIFO) กับยอดบันทึกภาษี/โบรกเกอร์ (FIFO)
          </p>
        </div>

        {/* Action Controls — mode is now immutable, shown as read-only badge */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Immutable mode badge */}
          <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${MODE_LABELS[accountingMode]?.color || MODE_LABELS.NON_FIFO.color}`}>
            🔒 {MODE_LABELS[accountingMode]?.label || accountingMode}
          </span>

          {filteredHistory.length > 0 && (
            <button
              onClick={exportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 size={13} />
              <span>ล้างประวัติ</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards: Dual Accounting Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Non-FIFO Realized Cash Flow */}
        <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
          accountingMode === 'NON_FIFO'
            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/30'
            : 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Non-FIFO Cash Flow
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              Discrete
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            +${totalNonFIFOProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            กำไรแท้จริงตามรอบ ({filteredHistory.length} รอบ)
          </span>
        </div>

        {/* Card 2: FIFO Broker Statement P&L */}
        <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
          accountingMode === 'FIFO'
            ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/40 ring-1 ring-amber-500/30'
            : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Broker Statement (FIFO)
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Statement
            </span>
          </div>
          <div className={`text-2xl font-black font-mono mt-2 ${
            totalFIFOProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
          }`}>
            {totalFIFOProfit >= 0 ? '+' : ''}${totalFIFOProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            ยอดที่โบรกเกอร์รายงานตามลำดับซื้อก่อน
          </span>
        </div>

        {/* Card 3: FIFO Discrepancy / Drag */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              FIFO Discrepancy
            </span>
            <ArrowRightLeft size={13} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2">
            {profitDifference >= 0 ? '+' : ''}${profitDifference.toFixed(2)}
          </div>
          <span className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 mt-1">
            {profitDifference > 0 ? '💡 เงินสดจริงมากกว่าที่โบรกโชว์' : 'ความต่างทางบัญชี FIFO'}
          </span>
        </div>

        {/* Card 4: Capital Turnover & Average */}
        <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Turnover & Avg/Cycle
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            ${totalCapitalTurnover.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            เฉลี่ย +${avgProfit.toFixed(2)} / รอบ ({accountingMode})
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา Ticker / Strategy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {uniqueTickers.length > 1 && (
          <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedTicker('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTicker === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All Tickers
            </button>
            {uniqueTickers.map(tk => (
              <button
                key={tk}
                onClick={() => setSelectedTicker(tk)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedTicker === tk
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tk}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History Log Table */}
      <div className="overflow-x-auto custom-scrollbar border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
              <th className="py-3 px-4">Date / Time</th>
              <th className="py-3 px-3">Ticker / Strategy</th>
              <th className="py-3 px-3">Zone Price</th>
              <th className="py-3 px-3">Shares Sold</th>
              <th className="py-3 px-3">Capital</th>
              <th className="py-3 px-3">
                <span className={accountingMode === 'NON_FIFO' ? 'text-indigo-600 dark:text-indigo-400 underline decoration-2' : ''}>
                  Discrete (Non-FIFO)
                </span>
              </th>
              <th className="py-3 px-3">
                <span className={accountingMode === 'FIFO' ? 'text-amber-600 dark:text-amber-400 underline decoration-2' : ''}>
                  FIFO Broker
                </span>
              </th>
              <th className="py-3 px-3">
                <span className={accountingMode === 'AVERAGE_COST' ? 'text-purple-600 dark:text-purple-400 underline decoration-2' : ''}>
                  Avg Cost
                </span>
              </th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredHistory.map((item) => {
              const sharesSold = item.sharesSold || item.sharesAllocated || 0;
              const capital = item.priceLevel * sharesSold;
              const nonFifoProfit = parseFloat(item.profitDollars) || 0;
              const nonFifoPct = parseFloat(item.profitPercent) || 0;
              const fifoProfit = item.fifoProfitDollars !== undefined ? parseFloat(item.fifoProfitDollars) : nonFifoProfit;
              const fifoPct = item.fifoProfitPercent !== undefined ? parseFloat(item.fifoProfitPercent) : nonFifoPct;
              const avgCostProfit = item.avgCostProfitDollars !== undefined ? parseFloat(item.avgCostProfitDollars) : nonFifoProfit;
              const avgCostPct = item.avgCostProfitPercent !== undefined ? parseFloat(item.avgCostProfitPercent) : nonFifoPct;
              const isFakeLoss = fifoProfit < 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(item.sellTimestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.sellTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {item.isPartialSell && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-0.5 inline-block">PARTIAL</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-black text-slate-900 dark:text-white font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                      {item.ticker}
                    </span>
                    {item.profileName && (
                      <span className="block text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
                        {item.profileName}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold">
                    <span className="text-slate-700 dark:text-slate-300">${item.priceLevel.toFixed(2)}</span>
                    <span className="text-slate-400 mx-1.5">→</span>
                    <span className="text-emerald-500">${item.targetSellPrice.toFixed(2)}</span>
                  </td>

                  <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {sharesSold} หุ้น
                    {item.isPartialSell && (
                      <span className="block text-[10px] text-slate-400">จาก {item.sharesAllocated}</span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                    ${capital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Discrete Non-FIFO Profit */}
                  <td className={`py-3 px-3 font-mono ${
                    accountingMode === 'NON_FIFO' ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                  }`}>
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      +${nonFifoProfit.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-500">
                      +{nonFifoPct.toFixed(1)}%
                    </div>
                  </td>

                  {/* Broker FIFO Profit */}
                  <td className={`py-3 px-3 font-mono ${
                    accountingMode === 'FIFO' ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                  }`}>
                    <div className={`font-black ${fifoProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {fifoProfit >= 0 ? '+' : ''}${fifoProfit.toFixed(2)}
                    </div>
                    {isFakeLoss ? (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 rounded mt-0.5">
                        <AlertTriangle size={10} />
                        <span>Fake Loss</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">{fifoPct >= 0 ? '+' : ''}{fifoPct.toFixed(1)}%</div>
                    )}
                  </td>

                  {/* Average Cost Profit */}
                  <td className={`py-3 px-3 font-mono ${
                    accountingMode === 'AVERAGE_COST' ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                  }`}>
                    {item.avgCostBasis ? (
                      <>
                        <div className={`font-black ${avgCostProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          {avgCostProfit >= 0 ? '+' : ''}${avgCostProfit.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          avg ${item.avgCostBasis.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredHistory.length === 0 && (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
          <Clock size={32} className="opacity-30" />
          <p className="text-sm font-semibold">ยังไม่มีประวัติการปิดรอบทำกำไร</p>
          <p className="text-xs">เมื่อคุณกด "ขายทำกำไร" ในโซนที่มีหุ้น ข้อมูลรอบจะถูกบันทึกที่นี่พร้อมทั้งคำนวณแบบ Non-FIFO และ FIFO อัตโนมัติ</p>
        </div>
      )}

    </div>
  );
}
