import React, { useState, useEffect } from 'react';
import DynamicRiskCalculator from './DynamicRiskCalculator';
import TISwingPicksPlan from './TISwingPicksPlan';

export default function PositionSizingCalculator({ accountBalance = 0 }) {
  const [activeMode, setActiveMode] = useState('position_sizing');
  
  const [riskMode, setRiskMode] = useState(() => localStorage.getItem('phudit_risk_mode') || '$');
  const [riskValue, setRiskValue] = useState(() => localStorage.getItem('phudit_risk_value') || '1');
  const [accountSize, setAccountSize] = useState(() => accountBalance > 0 ? accountBalance.toString() : '10000');
  const [slDistance, setSlDistance] = useState(() => localStorage.getItem('phudit_sl_distance') || '0.10');
  const [entryPrice, setEntryPrice] = useState('');

  const [results, setResults] = useState({
    sharesToBuy: 0,
    expectedProfit: 0,
    buyingPower: null,
    calculatedRisk: 0,
  });

  useEffect(() => {
    if (accountBalance > 0) {
      setAccountSize(accountBalance.toString());
    }
  }, [accountBalance]);

  useEffect(() => {
    localStorage.setItem('phudit_risk_mode', riskMode);
    localStorage.setItem('phudit_risk_value', riskValue);
    localStorage.setItem('phudit_sl_distance', slDistance.toString());
  }, [riskMode, riskValue, slDistance]);

  useEffect(() => {
    // Calculations
    const riskVal = parseFloat(riskValue) || 0;
    const sl = parseFloat(slDistance) || 0;
    const entry = entryPrice === '' ? null : parseFloat(entryPrice);

    let calculatedRisk = 0;
    let shares = 0;
    let buyingPower = null;

    if (riskMode === '$') {
      calculatedRisk = riskVal;
      if (sl > 0) shares = calculatedRisk / sl;
    } else if (riskMode === '%') {
      const accSize = parseFloat(accountSize) || 0;
      calculatedRisk = accSize * (riskVal / 100);
      if (sl > 0) shares = calculatedRisk / sl;
    } else if (riskMode === 'budget') {
      if (entry !== null && entry > 0) {
        shares = riskVal / entry;
        if (sl > 0) calculatedRisk = shares * sl;
      }
    }

    const expectedProfit = calculatedRisk * 3; // 1:3 RR
    
    if (entry !== null && entry > 0) {
      buyingPower = shares * entry;
    } else if (riskMode === 'budget') {
      buyingPower = riskVal;
    }

    setResults({
      sharesToBuy: shares,
      expectedProfit: expectedProfit,
      buyingPower: buyingPower,
      calculatedRisk: calculatedRisk
    });
  }, [riskMode, riskValue, accountSize, slDistance, entryPrice]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header section */}
      <div className="mb-6 border-b border-slate-200/50 dark:border-slate-800/60 pb-5">
        <h1 className="text-3xl font-black flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          <span className="filter drop-shadow-md">🛡️</span> Position Sizing & Risk
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold text-xs uppercase tracking-widest">
          คำนวณขนาดการเข้าเทรด Penny Stocks อย่างรวดเร็ว
        </p>
      </div>

      <div className="flex gap-2 mb-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-200/10 dark:shadow-black/20 w-fit">
        <button
          onClick={() => setActiveMode('position_sizing')}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
            activeMode === 'position_sizing'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🛡️ Penny Stocks Sizing
        </button>
        <button
          onClick={() => setActiveMode('advanced')}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
            activeMode === 'advanced'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🧮 Trading goals for survival
        </button>
        <button
          onClick={() => setActiveMode('ti_swing_picks')}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
            activeMode === 'ti_swing_picks'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🎯 TI Swing Picks Plan
        </button>
      </div>

      {activeMode === 'position_sizing' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Form */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-3xl shadow-xl shadow-slate-200/10 dark:shadow-black/20 p-6">
          <h2 className="text-xl font-black mb-6 text-slate-800 dark:text-slate-200 border-l-4 border-indigo-500 pl-3">
            พารามิเตอร์การเทรด (Input)
          </h2>
          
          <div className="space-y-6">
            
            {/* Risk Mode & Inputs */}
            <div className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">รูปแบบการคำนวณ (Mode)</label>
              </div>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl w-full">
                <button
                  onClick={() => setRiskMode('$')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                    riskMode === '$' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >$ (Fixed)</button>
                <button
                  onClick={() => setRiskMode('%')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                    riskMode === '%' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >% (Account)</button>
                <button
                  onClick={() => setRiskMode('budget')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                    riskMode === 'budget' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >Budget</button>
              </div>

              {/* Dynamic Inputs Based on Mode */}
              {riskMode === '%' && (
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700/50">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Account Size ($)</label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input onFocus={(e) => e.target.select()} 
                      type="number" step="any"
                      min="0"
                      value={accountSize}
                      onChange={(e) => setAccountSize(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-right"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  {riskMode === '$' ? 'Risk per Trade ($)' : riskMode === '%' ? 'Risk (%)' : 'Budget Amount ($)'}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {riskMode === '%' ? '%' : '$'}
                  </span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number" step="any"
                    min="0"
                    step={riskMode === '%' ? "0.1" : "1"}
                    value={riskValue}
                    onChange={(e) => setRiskValue(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-right"
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
                    type="number" step="any"
                    min="0.01"
                    step="0.01"
                    value={slDistance}
                    onChange={(e) => setSlDistance(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Entry Price */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  ราคาจุดเข้าเทรด ($)
                  {riskMode === 'budget' && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input onFocus={(e) => e.target.select()} 
                    type="number" step="any"
                    min="0"
                    step="0.01"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder={riskMode === 'budget' ? "Required" : "Optional"}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-right"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {riskMode === 'budget' ? 'จำเป็นต้องใส่เพื่อคำนวณจำนวนหุ้นและ Risk' : 'ใส่เฉพาะเมื่อต้องการคำนวณ Buying Power'}
              </p>
            </div>

          </div>
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-indigo-950/90 via-[#0B1121]/90 to-purple-950/70 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-indigo-500/30 text-white relative overflow-hidden h-full flex flex-col justify-center">
            <h2 className="text-xl font-black mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">ผลการคำนวณ (Strategy)</h2>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-slate-700/60 pb-3">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">จำนวนหุ้นที่ต้องเข้าเทรด (Shares)</span>
                <span className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent font-mono">
                  {results.sharesToBuy > 0 ? Math.floor(results.sharesToBuy).toLocaleString() : '0'}
                </span>
              </div>
              
              {(riskMode === '%' || riskMode === 'budget') && (
                <div className="flex justify-between items-end border-b border-slate-700/60 pb-3">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">ความเสี่ยงเมื่อโดน SL (Risk)</span>
                  <span className="text-2xl font-black font-mono text-rose-400">
                    {results.calculatedRisk > 0 ? `-$${results.calculatedRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-end border-b border-slate-700/60 pb-3">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">กำไรคาดหวังที่ RR 1:3 ($)</span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  +${results.expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-end pb-2">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">จำนวนทุนที่ต้องใช้ (Buying Power)</span>
                <span className={`text-2xl font-black font-mono ${results.buyingPower !== null ? 'text-white' : 'text-slate-600'}`}>
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
