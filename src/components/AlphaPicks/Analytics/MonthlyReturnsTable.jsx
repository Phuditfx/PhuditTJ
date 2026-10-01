import React, { useState } from 'react';
import { Calendar, Filter, ChevronDown, TrendingUp } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthlyReturnsTable({ monthlyData = {} }) {
  // monthlyData structure: { 2026: { 0: 1.3, 1: 2.1, 2: -2.1, ... }, 2025: { ... } }
  const availableYears = Object.keys(monthlyData).map(Number).sort((a, b) => b - a);
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');

  const displayedYears = selectedYearFilter === 'ALL' 
    ? availableYears 
    : availableYears.filter(y => y === Number(selectedYearFilter));

  // Compute Year Totals and Column Averages
  const yearTotals = {};
  const monthSums = Array(12).fill(0);
  const monthCounts = Array(12).fill(0);

  availableYears.forEach(year => {
    let yearCompound = 1;
    let hasDataForYear = false;
    for (let m = 0; m < 12; m++) {
      const val = monthlyData[year]?.[m];
      if (val !== undefined && val !== null) {
        hasDataForYear = true;
        yearCompound *= (1 + val / 100);
        monthSums[m] += val;
        monthCounts[m] += 1;
      }
    }
    yearTotals[year] = hasDataForYear ? (yearCompound - 1) * 100 : null;
  });

  const monthAverages = monthSums.map((sum, idx) => {
    return monthCounts[idx] > 0 ? sum / monthCounts[idx] : null;
  });

  // Cell color helper strictly matching the user's screenshot
  const getCellClass = (val) => {
    if (val === undefined || val === null) {
      return 'bg-[#181a20] dark:bg-[#12161f] border border-slate-800/40 text-transparent select-none';
    }
    if (val >= 5.0) {
      // Bright vibrant green badge
      return 'bg-[#00c853] text-slate-950 font-black shadow-md shadow-emerald-500/20';
    }
    if (val > 0) {
      // Forest/Dark green badge
      return 'bg-[#0e3a24] text-emerald-400 font-bold border border-emerald-800/40';
    }
    if (val < 0) {
      // Maroon/Dark red badge
      return 'bg-[#4a1c1a] text-rose-300 font-bold border border-rose-800/40';
    }
    return 'bg-[#1e2330] text-slate-400 font-semibold border border-slate-700/50';
  };

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 overflow-hidden flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Monthly Returns</span>
        </h3>

        {/* Year Filter */}
        {availableYears.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">กรองปี:</span>
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/70 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
            >
              <option value="ALL">All</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table Matrix */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-center border-collapse min-w-[700px]">
          <thead>
            <tr className="text-slate-400 text-xs font-bold">
              <th className="py-2.5 px-3 text-left w-16"></th>
              {MONTH_NAMES.map(m => (
                <th key={m} className="py-2.5 px-1.5 font-bold tracking-wider">{m}</th>
              ))}
              <th className="py-2.5 px-3 text-right font-black tracking-wider text-slate-300">Year</th>
            </tr>
          </thead>
          <tbody className="space-y-2">
            {displayedYears.map(year => {
              const yearTotal = yearTotals[year];
              return (
                <tr key={year} className="group">
                  {/* Year label */}
                  <td className="py-2 px-3 text-left font-black text-slate-300 font-mono text-sm">
                    {year}
                  </td>

                  {/* 12 Months */}
                  {MONTH_NAMES.map((_, mIdx) => {
                    const val = monthlyData[year]?.[mIdx];
                    return (
                      <td key={mIdx} className="p-1">
                        <div
                          className={`h-9 flex items-center justify-center rounded-lg text-xs font-mono transition-transform group-hover:scale-[1.02] ${getCellClass(val)}`}
                        >
                          {val !== undefined && val !== null ? `${val > 0 ? '' : ''}${val.toFixed(val % 1 === 0 ? 0 : 1)}%` : ''}
                        </div>
                      </td>
                    );
                  })}

                  {/* Year Total */}
                  <td className="py-2 px-3 text-right font-mono font-black text-sm">
                    {yearTotal !== null && yearTotal !== undefined ? (
                      <span className={yearTotal >= 0 ? 'text-[#00c853]' : 'text-rose-400'}>
                        {yearTotal >= 0 ? '+' : ''}{yearTotal.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Average Row */}
            {displayedYears.length > 0 && (
              <tr className="border-t border-slate-800/80 pt-2">
                <td className="py-3 px-3 text-left font-black text-slate-400 font-mono text-xs uppercase">
                  Avg
                </td>
                {monthAverages.map((avg, idx) => (
                  <td key={idx} className="py-3 px-1">
                    {avg !== null ? (
                      <span
                        className={`font-mono font-bold text-xs ${
                          avg >= 0 ? 'text-[#00c853]' : 'text-rose-400'
                        }`}
                      >
                        {avg >= 0 ? '+' : ''}{avg.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs">-</span>
                    )}
                  </td>
                ))}
                <td className="py-3 px-3 text-right"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {displayedYears.length === 0 && (
        <div className="py-8 text-center text-slate-500 text-xs">
          ยังไม่มีข้อมูลผลตอบแทนรายเดือนในพอร์ตนี้ ข้อมูลจะถูกบันทึกและคำนวณโดยอัตโนมัติตามประวัติการซื้อขาย
        </div>
      )}
    </div>
  );
}
