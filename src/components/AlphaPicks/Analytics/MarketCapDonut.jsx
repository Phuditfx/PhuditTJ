import React, { useMemo } from 'react';

const CATEGORY_COLORS = {
  'Mega Cap': '#0284c7',   // Deep Blue
  'Large Cap': '#38bdf8',  // Vibrant Blue
  'Mid Cap': '#7dd3fc',    // Sky Blue
  'Small Cap': '#94a3b8',  // Slate Blue
  'Cash': '#334155'        // Dark Slate
};

export default function MarketCapDonut({ positions = [], cashBalance = 0, onEditStockCategory }) {
  // Compute total portfolio value and market cap weights
  const { data, dominantCategory, dominantPct } = useMemo(() => {
    let totalStockValue = 0;
    const catValues = {
      'Mega Cap': 0,
      'Large Cap': 0,
      'Mid Cap': 0,
      'Small Cap': 0,
      'Cash': Math.max(0, cashBalance)
    };

    positions.forEach(p => {
      const shares = parseFloat(p.total_shares) || 0;
      const price = parseFloat(p.current_price || p.average_cost) || 0;
      const val = shares * price;
      totalStockValue += val;

      const cat = p.market_cap_category || 'Large Cap';
      if (catValues[cat] !== undefined) {
        catValues[cat] += val;
      } else {
        catValues['Large Cap'] += val;
      }
    });

    const totalPortfolioValue = totalStockValue + catValues['Cash'];
    const formatted = [];
    let maxCat = 'Large Cap';
    let maxVal = -1;

    Object.keys(catValues).forEach(cat => {
      const val = catValues[cat];
      const pct = totalPortfolioValue > 0 ? Math.round((val / totalPortfolioValue) * 100) : 0;
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
      formatted.push({
        name: cat,
        value: val,
        percentage: pct,
        color: CATEGORY_COLORS[cat]
      });
    });

    const domPct = totalPortfolioValue > 0 ? Math.round((maxVal / totalPortfolioValue) * 100) : 0;

    return {
      data: formatted,
      dominantCategory: maxCat.toUpperCase(),
      dominantPct: domPct
    };
  }, [positions, cashBalance]);

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
          Market Cap
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
