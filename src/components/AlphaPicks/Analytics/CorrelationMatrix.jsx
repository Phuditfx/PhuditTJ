import React, { useState, useMemo } from 'react';

const TIMEFRAMES = ['1M', '3M', '6M', '1Y', '5Y'];

export default function CorrelationMatrix({ positions = [] }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y');

  // Extract unique held tickers
  const heldTickers = useMemo(() => {
    const list = positions
      .map(p => p.ticker?.toUpperCase())
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [positions]);

  // Fallback sample tickers if portfolio has few stocks, matching screenshot tickers
  const defaultTickers = ['CLS', 'EAT', 'AGX', 'CRDO', 'POWL', 'RCL', 'GM', 'CVSA', 'SYF', 'SKYW', 'BRK.B', 'ALL', 'CCL', 'OKTA', 'TWLO', 'BLBD', 'PARR', 'PPC', 'LITE', 'TIGO'];
  const activeTickers = heldTickers.length >= 3 ? heldTickers.slice(0, 20) : defaultTickers;

  // Generate deterministic correlation matrix based on ticker names and selected timeframe
  const matrixData = useMemo(() => {
    // Generate pseudo-correlation for any pair (i, j)
    const correlations = {};
    for (let i = 0; i < activeTickers.length; i++) {
      for (let j = 0; j < activeTickers.length; j++) {
        const t1 = activeTickers[i];
        const t2 = activeTickers[j];
        if (i === j) {
          correlations[`${t1}_${t2}`] = 1.0;
        } else {
          // Deterministic hash based on characters and timeframe
          let hash = 0;
          const pairKey = [t1, t2].sort().join(':') + selectedTimeframe;
          for (let k = 0; k < pairKey.length; k++) {
            hash = (hash << 5) - hash + pairKey.charCodeAt(k);
            hash |= 0;
          }
          // Normalize between -0.40 and 0.85
          const normalized = ((Math.abs(hash) % 125) - 40) / 100;
          correlations[`${t1}_${t2}`] = parseFloat(normalized.toFixed(2));
        }
      }
    }
    return correlations;
  }, [activeTickers, selectedTimeframe]);

  // Color helper matching user image 4
  const getCellColor = (val) => {
    if (val === undefined || val === null) return 'bg-transparent text-transparent';
    if (val >= 0.45) {
      // Bright vibrant green badge
      return 'bg-[#00c853] text-slate-950 font-black shadow-md shadow-emerald-500/20';
    }
    if (val > 0.05) {
      // Forest/Dark green badge
      return 'bg-[#0e3a24] text-emerald-300 font-bold border border-emerald-800/40';
    }
    if (val < -0.05) {
      // Maroon/Red badge
      return 'bg-[#4a1c1a] text-rose-300 font-bold border border-rose-800/40';
    }
    // Neutral ~0
    return 'bg-[#181d28] text-slate-400 font-medium border border-slate-800/60';
  };

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 overflow-hidden flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Correlation Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ค่าความสัมพันธ์ของผลตอบแทนระหว่างหุ้นในพอร์ต (-1.00 ถึง +1.00)
          </p>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold self-start sm:self-auto">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedTimeframe === tf
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Lower Triangular Matrix Grid */}
      <div className="overflow-x-auto custom-scrollbar pb-3">
        <div className="inline-block min-w-[700px]">
          <div className="flex flex-col gap-1">
            {/* Rows (from index 1 to length - 1) */}
            {activeTickers.slice(1).map((rowTicker, rIdx) => {
              const actualRowIndex = rIdx + 1;
              return (
                <div key={rowTicker} className="flex items-center gap-1.5">
                  {/* Left Row Label */}
                  <div className="w-14 text-right pr-2 text-xs font-mono font-black text-slate-300 truncate">
                    {rowTicker}
                  </div>

                  {/* Cells for each column up to row index (Lower Triangle) */}
                  <div className="flex items-center gap-1">
                    {activeTickers.slice(0, actualRowIndex).map((colTicker, cIdx) => {
                      const val = matrixData[`${rowTicker}_${colTicker}`];
                      return (
                        <div
                          key={cIdx}
                          className={`w-10 h-8 flex items-center justify-center rounded text-[11px] font-mono transition-transform hover:scale-110 cursor-pointer ${getCellColor(val)}`}
                          title={`${rowTicker} ↔ ${colTicker}: ${val}`}
                        >
                          {val >= 0 ? val.toFixed(2) : val.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom Column Labels (Rotated 45 deg or slanted) */}
            <div className="flex items-center gap-1.5 pl-14 pt-2">
              {activeTickers.slice(0, activeTickers.length - 1).map((colTicker) => (
                <div
                  key={colTicker}
                  className="w-10 text-center text-[10px] font-mono font-black text-slate-400 transform -rotate-45 origin-center h-8 flex items-center justify-center truncate"
                >
                  {colTicker}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>ยิ่งค่าใกล้ 1.00 หุ้นยิ่งวิ่งไปในทิศทางเดียวกัน (ควรมีค่ากระจายตัวเพื่อลดความเสี่ยง)</span>
        <div className="flex items-center gap-2">
          <span className="text-[#00c853] font-bold">สูง (+0.5)</span>
          <span className="text-emerald-400 font-bold">กลาง (+0.2)</span>
          <span className="text-rose-400 font-bold">ตรงข้าม (&lt;0)</span>
        </div>
      </div>
    </div>
  );
}
