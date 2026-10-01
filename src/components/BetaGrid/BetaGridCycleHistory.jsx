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
  Clock
} from 'lucide-react';

export default function BetaGridCycleHistory({
  history = [],
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
  const totalProfit = filteredHistory.reduce((sum, h) => sum + (parseFloat(h.profitDollars) || 0), 0);
  const totalCapitalTurnover = filteredHistory.reduce((sum, h) => sum + ((parseFloat(h.priceLevel) || 0) * (parseInt(h.sharesAllocated, 10) || 0)), 0);
  const avgProfit = filteredHistory.length > 0 ? totalProfit / filteredHistory.length : 0;

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
    const headers = ['Date', 'Ticker', 'Strategy', 'Buy Price', 'Sell Price', 'Shares', 'Capital Used', 'Profit Dollars', 'Profit Percent'];
    const rows = filteredHistory.map(h => [
      `"${new Date(h.sellTimestamp).toLocaleString()}"`,
      `"${h.ticker}"`,
      `"${h.profileName || ''}"`,
      h.priceLevel,
      h.targetSellPrice,
      h.sharesAllocated,
      (h.priceLevel * h.sharesAllocated).toFixed(2),
      h.profitDollars.toFixed(2),
      h.profitPercent.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `beta_grid_cycles_${Date.now()}.csv`);
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
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Completed Grid Cycles (บันทึกประวัติการปิดรอบ)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ทุกรอบคำนวณกำไรตามจริงแบบ Discrete Zone (Non-FIFO) ไม่ขึ้นกับลำดับซื้อของโบรกเกอร์
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
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

      {/* 3 Metric Cards for History */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Realized Cash Flow
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            จาก {filteredHistory.length} รอบที่ปิดทำกำไรสำเร็จ
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Average Profit / Cycle
          </span>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            +${avgProfit.toFixed(2)}
          </div>
          <span className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 mt-1">
            กำไรเฉลี่ยต่อหนึ่งไม้ที่หมุนรอบ
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Capital Turnover
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            ${totalCapitalTurnover.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            เงินทุนหมุนเวียนที่ดึงกลับพร้อมกำไร
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
              <th className="py-3 px-3">Zone (Buy → Sell)</th>
              <th className="py-3 px-3">Shares</th>
              <th className="py-3 px-3">Capital Deployed</th>
              <th className="py-3 px-3">Discrete Profit</th>
              <th className="py-3 px-3">Return</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredHistory.map((item) => {
              const capital = item.priceLevel * item.sharesAllocated;
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(item.sellTimestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.sellTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
                    {item.sharesAllocated} หุ้น
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                    ${capital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="py-3 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                    +${item.profitDollars.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{item.profitPercent.toFixed(1)}%
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
          <p className="text-xs">เมื่อคุณกด "ขายทำกำไร" ในโซนที่มีหุ้น ข้อมูลรอบจะถูกบันทึกที่นี่โดยอัตโนมัติ</p>
        </div>
      )}

    </div>
  );
}
