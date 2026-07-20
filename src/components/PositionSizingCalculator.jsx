import React, { useState, useEffect } from 'react';
import DynamicRiskCalculator from './DynamicRiskCalculator';

export default function PositionSizingCalculator() {
  const [activeMode, setActiveMode] = useState('position_sizing');
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [stopLossPercent, setStopLossPercent] = useState(5.0);
  const [maxPainLimit, setMaxPainLimit] = useState(200);

  const [results, setResults] = useState({
    dollarRisk: 0,
    positionSize: 0,
    expectedProfit: 0,
    isPainLimitExceeded: false,
    riskRatio: 0, // for progress bar
  });

  useEffect(() => {
    // Calculations
    const pSize = parseFloat(portfolioSize) || 0;
    const rPct = parseFloat(riskPercent) || 0;
    const slPct = parseFloat(stopLossPercent) || 0;
    const painLim = parseFloat(maxPainLimit) || 0;

    const dollarRisk = pSize * (rPct / 100);
    const positionSize = slPct > 0 ? dollarRisk / (slPct / 100) : 0;
    const expectedProfit = dollarRisk * 3; // 1:3 RR
    
    // Risk ratio for progress bar (capped at 100%)
    const riskRatio = painLim > 0 ? Math.min((dollarRisk / painLim) * 100, 100) : 100;

    setResults({
      dollarRisk,
      positionSize,
      expectedProfit,
      isPainLimitExceeded: dollarRisk > painLim,
      riskRatio
    });
  }, [portfolioSize, riskPercent, stopLossPercent, maxPainLimit]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header section */}
      <div className="mb-6 border-b-2 border-orange-500 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">
          <span className="text-orange-500">🛡️</span> Position Sizing & Risk
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
          คำนวณขนาดการซื้อขายที่เหมาะสมและบริหารความเสี่ยงอย่างเป็นระบบ
        </p>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        <button
          onClick={() => setActiveMode('position_sizing')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeMode === 'position_sizing'
              ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
          }`}
        >
          🛡️ Position Sizing
        </button>
        <button
          onClick={() => setActiveMode('advanced')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeMode === 'advanced'
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
          }`}
        >
          🧮 Advanced Calculator
        </button>
      </div>

      {activeMode === 'position_sizing' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 border-l-4 border-orange-500 pl-3">
            พารามิเตอร์การเทรด (Input)
          </h2>
          
          <div className="space-y-6">
            
            {/* Portfolio Size */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">ขนาดพอร์ตการลงทุน ($)</label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0"
                    value={portfolioSize}
                    onChange={(e) => setPortfolioSize(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                </div>
              </div>
              <input
                type="range"
                min="10000"
                max="1000000"
                step="1000"
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(e.target.value)}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                <span>$10,000</span>
                <span>$1,000,000</span>
              </div>
            </div>

            {/* Risk Percentage */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">ความเสี่ยงต่อไม้ (%)</label>
                <div className="relative w-24">
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0.1"
                    step="0.1"
                    max="100"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                <span>0.1%</span>
                <span>5.0%</span>
              </div>
            </div>

            {/* Stop Loss Distance */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">ระยะ Stop Loss (%)</label>
                <div className="relative w-24">
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0.1"
                    step="0.1"
                    max="100"
                    value={stopLossPercent}
                    onChange={(e) => setStopLossPercent(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="1.0"
                max="20.0"
                step="0.5"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(e.target.value)}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                <span>1.0%</span>
                <span>20.0%</span>
              </div>
            </div>

            {/* Max Pain Limit */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">ขีดจำกัดความเจ็บปวดต่อไม้ ($)</label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0"
                    value={maxPainLimit}
                    onChange={(e) => setMaxPainLimit(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                </div>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={maxPainLimit}
                onChange={(e) => setMaxPainLimit(e.target.value)}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                <span>$100</span>
                <span>$5,000</span>
              </div>
            </div>

          </div>
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl shadow-lg p-6 border-t-4 border-orange-500 text-white relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-slate-100">ผลการคำนวณ (Strategy)</h2>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium">จำนวนเงินที่เสี่ยงต่อไม้ ($)</span>
                <span className={`text-3xl font-extrabold ${results.isPainLimitExceeded ? 'text-rose-500' : 'text-orange-400'}`}>
                  ${results.dollarRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium">ขนาดเงินที่ใช้ซื้อหุ้น ($)</span>
                <span className="text-4xl font-black text-white">
                  ${results.positionSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-end pb-2">
                <span className="text-slate-400 font-medium">กำไรคาดหวังที่ RR 1:3 ($)</span>
                <span className="text-2xl font-bold text-emerald-400">
                  +${results.expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Alert Progress Bar */}
          <div className={`p-5 rounded-xl border shadow-sm transition-colors duration-300 ${results.isPainLimitExceeded ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <h3 className={`font-bold mb-2 ${results.isPainLimitExceeded ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
              การวิเคราะห์ความเสี่ยงด้านจิตวิทยา
            </h3>
            
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-2 overflow-hidden flex">
              <div 
                className={`h-4 transition-all duration-500 ${results.isPainLimitExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${results.riskRatio}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs font-bold mt-1">
              <span className="text-slate-500 dark:text-slate-400">Risk: ${results.dollarRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-slate-500 dark:text-slate-400">Limit: ${parseFloat(maxPainLimit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>

            {results.isPainLimitExceeded ? (
              <div className="mt-4 p-3 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-lg text-sm font-black text-center animate-pulse border border-rose-300 dark:border-rose-800">
                ⚠️ ความเสี่ยงเกินขีดจำกัดจิตวิทยา กรุณาลด % Risk ลง
              </div>
            ) : (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-bold text-center border border-emerald-200 dark:border-emerald-800/50">
                ✅ ความเสี่ยงอยู่ในระดับที่ควบคุมได้ ปลอดภัย
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="w-full">
          <DynamicRiskCalculator />
        </div>
      )}
    </div>
  );
}
