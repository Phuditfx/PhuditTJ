import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function DailyActivityHeatmap({ transactions = [] }) {
  // Navigation offset in years (0 = current rolling 12 months, -1 = last year, etc.)
  const [yearOffset, setYearOffset] = useState(0);

  // Group transactions by YYYY-MM-DD
  const activityMap = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const dateStr = t.transaction_date || t.created_at;
      if (!dateStr) return;
      const key = dateStr.split('T')[0];
      if (!map[key]) {
        map[key] = { count: 0, details: [] };
      }
      map[key].count += 1;
      map[key].details.push(t);
    });
    return map;
  }, [transactions]);

  // Generate 52 weeks of dates for the selected 12-month period
  const { weeks, monthLabels } = useMemo(() => {
    const endDate = new Date();
    // Apply year offset
    endDate.setFullYear(endDate.getFullYear() + yearOffset);
    // Align to Saturday of the current week
    const dayOfWeek = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - dayOfWeek));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (52 * 7 - 1));

    const weeksList = [];
    const months = [];
    let currentMonth = -1;

    let cur = new Date(startDate);
    for (let w = 0; w < 52; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const dateKey = cur.toISOString().split('T')[0];
        const month = cur.getMonth();

        if (d === 0 && month !== currentMonth) {
          months.push({
            name: cur.toLocaleString('en-US', { month: 'short' }),
            weekIndex: w
          });
          currentMonth = month;
        }

        weekDays.push({
          date: new Date(cur),
          dateKey,
          activity: activityMap[dateKey] || null
        });

        cur.setDate(cur.getDate() + 1);
      }
      weeksList.push(weekDays);
    }

    return { weeks: weeksList, monthLabels: months };
  }, [yearOffset, activityMap]);

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 overflow-hidden flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Daily Activity
        </h3>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">
            {yearOffset === 0 ? 'Last 12 Months' : `${new Date().getFullYear() + yearOffset}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setYearOffset(prev => prev - 1)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Previous 12 months"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setYearOffset(prev => Math.min(0, prev + 1))}
              disabled={yearOffset >= 0}
              className={`p-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer ${
                yearOffset >= 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              title="Next 12 months"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="inline-block min-w-[700px]">
          {/* Month Header row */}
          <div className="flex text-[11px] font-semibold text-slate-400 mb-1.5 pl-6 relative h-4">
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                className="absolute"
                style={{ left: `${m.weekIndex * 13.5 + 24}px` }}
              >
                {m.name}
              </span>
            ))}
          </div>

          {/* Grid: 7 rows x 52 columns */}
          <div className="flex gap-1">
            {/* Day of Week Labels */}
            <div className="flex flex-col gap-1 pr-1.5 text-[10px] font-bold text-slate-500 font-mono select-none">
              {DAY_LABELS.map((label, idx) => (
                <div key={idx} className="w-3.5 h-3 flex items-center justify-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => {
                    const hasActivity = day.activity && day.activity.count > 0;
                    const count = day.activity ? day.activity.count : 0;

                    return (
                      <div
                        key={dIdx}
                        className={`w-3 h-3 rounded-[3px] transition-all cursor-pointer group relative ${
                          hasActivity
                            ? count >= 3
                              ? 'bg-[#38bdf8] shadow-sm shadow-cyan-400/40'
                              : 'bg-[#0284c7]'
                            : 'bg-[#1a1f2c] hover:bg-slate-700/60'
                        }`}
                        title={`${day.dateKey}: ${count} activity`}
                      >
                        {/* Custom Tooltip */}
                        {hasActivity && (
                          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700 text-white text-[10px] rounded-md shadow-xl whitespace-nowrap z-30 pointer-events-none">
                            <span className="font-bold text-cyan-400">{day.dateKey}</span>
                            <span className="text-slate-300 ml-1.5">• {count} transactions</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>บันทึกความถี่การซื้อ-ขายและปรับสัดส่วนพอร์ตรายวัน</span>
        <div className="flex items-center gap-1.5">
          <span>น้อย</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1a1f2c]"></span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0284c7]"></span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#38bdf8]"></span>
          <span>มาก</span>
        </div>
      </div>
    </div>
  );
}
