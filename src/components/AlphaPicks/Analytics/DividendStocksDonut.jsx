import React, { useMemo } from 'react';

const DIVIDEND_COLORS = {
  'High (4%+)': '#0284c7',   // Deep Blue
  'Mid (2-4%)': '#38bdf8',   // Sky Blue
  'Low (0-2%)': '#7dd3fc',   // Light Sky Blue
  'No Dividend': '#334155'   // Slate Charcoal
};

export default function DividendStocksDonut({ positions = [] }) {
  // Compute dividend yield distribution
  const { data, dominantCategory, dominantPct } = useMemo(() => {
    let totalStockValue = 0;
    const catValues = {
      'High (4%+)': 0,
      'Mid (2-4%)': 0,
      'Low (0-2%)': 0,
      'No Dividend': 0
    };

    positions.forEach(p => {
      const shares = parseFloat(p.total_shares) || 0;
      const price = parseFloat(p.current_price || p.average_cost) || 0;
      const val = shares * price;
      totalStockValue += val;

      const divCategory = p.dividend_yield_category || 'No Dividend';
      if (catValues[divCategory] !== undefined) {
        catValues[divCategory] += val;
      } else {
        catValues['No Dividend'] += val;
      }
    });

    const formatted = [];
    let maxCat = 'No Dividend';
    let maxVal = -1;

    Object.keys(catValues).forEach(cat => {
      const val = catValues[cat];
      const pct = totalStockValue > 0 ? Math.round((val / totalStockValue) * 100) : 0;
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
      formatted.push({
        name: cat,
        value: val,
        percentage: pct,
        color: DIVIDEND_COLORS[cat]
      });
    });

    const domPct = totalStockValue > 0 ? Math.round((maxVal / totalStockValue) * 100) : 0;

    return {
      data: formatted,
      dominantCategory: maxCat.toUpperCase(),
      dominantPct: domPct
    };
  }, [positions]);

  // Generate SVG Donut Path
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Dividend Stocks
        </h3>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
          % ถือหุ้น
        </span>
      </div>

      {/* Donut and Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {data.map((item, index) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;

              if (item.percentage === 0) return null;

              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 hover:opacity-80"
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {dominantCategory}
            </span>
            <span className="text-2xl font-black text-white tracking-tight mt-0.5 font-mono">
              {dominantPct}%
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between sm:justify-start gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 font-semibold">{item.name}</span>
              </div>
              <span className="font-mono font-black text-white ml-auto">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
