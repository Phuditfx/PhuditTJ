import React, { useState, useEffect } from 'react';
import DynamicRiskCalculator from './DynamicRiskCalculator';
import TISwingPicksPlan from './TISwingPicksPlan';

export default function PositionSizingCalculator() {
  const [activeMode, setActiveMode] = useState('position_sizing');
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [slDistance, setSlDistance] = useState(0.10);
  const [entryPrice, setEntryPrice] = useState('');

  const [results, setResults] = useState({
    sharesToBuy: 0,
    expectedProfit: 0,
    buyingPower: null,
  });

  useEffect(() => {
    // Calculations
    const risk = parseFloat(riskPerTrade) || 0;
    const sl = parseFloat(slDistance) || 0;
    const entry = entryPrice === '' ? null : parseFloat(entryPrice);

    let shares = 0;
    if (sl > 0) {
      shares = risk / sl;
    }

    const expectedProfit = risk * 3; // 1:3 RR
    
    let buyingPower = null;
    if (entry !== null && entry > 0) {
      buyingPower = shares * entry;
    }

    setResults({
      sharesToBuy: shares,
      expectedProfit: expectedProfit,
      buyingPower: buyingPower
    });
  }, [riskPerTrade, slDistance, entryPrice]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header section */}
      <div className="mb-6 border-b-2 border-orange-500 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">
          <span className="text-orange-500">🛡️</span> Position Sizing & Risk
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
          คำนวณขนาดการเข้าเทรด Penny Stocks อย่างรวดเร็ว
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
          🛡️ Penny Stocks Sizing
        </button>
        <button
          onClick={() => setActiveMode('advanced')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeMode === 'advanced'
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
          }`}
        >
          🧮 Trading goals for survival
        </button>
        <button
          onClick={() => setActiveMode('ti_swing_picks')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeMode === 'ti_swing_picks'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
          }`}
        >
          🎯 TI Swing Picks Plan
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
            
            {/* Risk per Trade */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Risk per Trade ($)<span className="text-rose-500 ml-1">*</span></label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0"
                    step="1"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                </div>
              </div>
            </div>

            {/* SL Distance */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">ระยะ SL ($ / share)<span className="text-rose-500 ml-1">*</span></label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={slDistance}
                    onChange={(e) => setSlDistance(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Entry Price */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">ราคาจุดเข้าเทรด ($)</label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-right"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">ใส่เฉพาะเมื่อต้องการคำนวณ Buying Power</p>
            </div>

          </div>
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl shadow-lg p-6 border-t-4 border-orange-500 text-white relative overflow-hidden h-full flex flex-col justify-center">
            <h2 className="text-xl font-bold mb-6 text-slate-100">ผลการคำนวณ (Strategy)</h2>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium">จำนวนหุ้นที่ต้องเข้าเทรด (Shares)</span>
                <span className="text-4xl font-black text-orange-400">
                  {results.sharesToBuy > 0 ? Math.floor(results.sharesToBuy).toLocaleString() : '0'}
                </span>
              </div>
              
              <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                <span className="text-slate-400 font-medium">กำไรคาดหวังที่ RR 1:3 ($)</span>
                <span className="text-3xl font-bold text-emerald-400">
                  +${results.expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-end pb-2">
                <span className="text-slate-400 font-medium">จำนวนทุนที่ต้องใช้ (Buying Power)</span>
                <span className={`text-2xl font-bold ${results.buyingPower !== null ? 'text-white' : 'text-slate-600'}`}>
                  {results.buyingPower !== null ? `$${results.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : activeMode === 'advanced' ? (
        <div className="w-full">
          <DynamicRiskCalculator />
        </div>
      ) : activeMode === 'ti_swing_picks' ? (
        <div className="w-full">
          <TISwingPicksPlan />
        </div>
      ) : null}
    </div>
  );
}
