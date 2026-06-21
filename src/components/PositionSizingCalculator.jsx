import React, { useState, useEffect } from 'react';

export default function PositionSizingCalculator() {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPercent, setStopLossPercent] = useState(5);
  const [maxPainLimit, setMaxPainLimit] = useState(200);

  const [results, setResults] = useState({
    dollarRisk: 0,
    positionSize: 0,
    expectedProfit: 0,
    isPainLimitExceeded: false,
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

    setResults({
      dollarRisk,
      positionSize,
      expectedProfit,
      isPainLimitExceeded: dollarRisk > painLim,
    });
  }, [portfolioSize, riskPercent, stopLossPercent, maxPainLimit]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900">
      
      {/* Header section with Seeking Alpha vibe */}
      <div className="mb-8 border-b-2 border-orange-500 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <span className="text-orange-500">🛡️</span> Position Sizing & Risk
        </h1>
        <p className="text-slate-600 mt-2 font-medium">
          Calculate your optimal trade position size based on strict risk management rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Form */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-800 border-l-4 border-orange-500 pl-3">Input Parameters</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Portfolio Size ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  value={portfolioSize}
                  onChange={(e) => setPortfolioSize(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Risk per Trade (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(e.target.value)}
                    className="w-full pl-4 pr-8 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Stop Loss Distance (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={stopLossPercent}
                    onChange={(e) => setStopLossPercent(e.target.value)}
                    className="w-full pl-4 pr-8 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Max Psychological Pain Limit ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  value={maxPainLimit}
                  onChange={(e) => setMaxPainLimit(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                  placeholder="Maximum dollar amount you can tolerate losing"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 rounded-xl shadow-lg p-6 border-t-4 border-orange-500 text-white relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-slate-100">Calculated Strategy</h2>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium">Maximum Dollar Risk</span>
                <span className="text-3xl font-extrabold text-orange-400">
                  ${results.dollarRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium">Recommended Position Size</span>
                <span className="text-4xl font-black text-white">
                  ${results.positionSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-end pb-2">
                <span className="text-slate-400 font-medium">Expected Profit (1:3 RR)</span>
                <span className="text-2xl font-bold text-emerald-400">
                  +${results.expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Psychological Pain Warning */}
          {results.isPainLimitExceeded && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-lg shadow-sm animate-pulse">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="text-rose-800 font-black text-lg uppercase tracking-wide">Psychological Limit Exceeded</h3>
                  <p className="text-rose-700 font-medium mt-1">
                    Your calculated risk of <strong>${results.dollarRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> exceeds your maximum pain tolerance of <strong>${maxPainLimit}</strong>. Consider lowering your Risk % or increasing your Stop Loss distance!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {!results.isPainLimitExceeded && results.dollarRisk > 0 && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 rounded-r-lg shadow-sm">
               <div className="flex gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className="text-emerald-800 font-black text-lg uppercase tracking-wide">Risk is within limit</h3>
                  <p className="text-emerald-700 font-medium mt-1">
                    Your calculated risk is under your pain threshold. Trade safely!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
