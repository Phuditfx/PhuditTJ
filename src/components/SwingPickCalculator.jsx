import React, { useState, useMemo, useCallback, useRef } from 'react';
import { fetchRealTimePrice } from '../api/priceApi';

const DEFAULT_STOCKS = [
  { id: 1, symbol: 'AAPL', entryPrice: '', slPrice: '', fetchingPrice: false, aiLoading: false },
  { id: 2, symbol: 'MSFT', entryPrice: '', slPrice: '', fetchingPrice: false, aiLoading: false },
  { id: 3, symbol: 'TSLA', entryPrice: '', slPrice: '', fetchingPrice: false, aiLoading: false },
  { id: 4, symbol: 'NVDA', entryPrice: '', slPrice: '', fetchingPrice: false, aiLoading: false },
  { id: 5, symbol: 'AMZN', entryPrice: '', slPrice: '', fetchingPrice: false, aiLoading: false },
];

let nextId = 6;

export default function SwingPickCalculator({ accountBalance = 0 }) {
  const [stocks, setStocks] = useState(DEFAULT_STOCKS);
  // Pre-fill capital from account balance (editable)
  const [capital, setCapital] = useState(accountBalance > 0 ? String(accountBalance) : '');
  const [riskPct, setRiskPct] = useState('');
  const [riskFixed, setRiskFixed] = useState('');

  // ---- Stock management ----
  const addStock = () => {
    if (stocks.length >= 10) return;
    const letter = String.fromCharCode(65 + stocks.length);
    setStocks([...stocks, { id: nextId++, symbol: `STOCK${letter}`, entryPrice: '', slPrice: '', fetchingPrice: false, aiLoading: false }]);
  };

  const removeStock = (id) => {
    if (stocks.length <= 3) return;
    setStocks(stocks.filter(s => s.id !== id));
  };

  const updateStock = (id, field, value) => {
    setStocks(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // ---- Auto-fetch price on Enter / Tab (onBlur) ----
  const fetchPriceForStock = useCallback(async (id, symbol) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || sym.startsWith('STOCK')) return;
    updateStock(id, 'fetchingPrice', true);
    const price = await fetchRealTimePrice(sym);
    setStocks(prev => prev.map(s =>
      s.id === id
        ? { ...s, fetchingPrice: false, entryPrice: price ? String(price) : s.entryPrice }
        : s
    ));
  }, []);

  const handleSymbolKeyDown = (e, id, symbol) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      fetchPriceForStock(id, symbol);
    }
  };

  const handleSymbolBlur = (id, symbol) => {
    fetchPriceForStock(id, symbol);
  };

  // ---- AI Stop Loss Generator Placeholder ----
  const handleAICalculateSL = (id) => {
    const stock = stocks.find(s => s.id === id);
    if (!stock || !stock.entryPrice) return;

    updateStock(id, 'aiLoading', true);

    setTimeout(() => {
      setStocks(prev => prev.map(s => {
        if (s.id === id) {
          const entry = parseFloat(s.entryPrice) || 0;
          // MOCK: simulates AI suggesting a Stop Loss of 5% drop
          // To inject your real AI API call later:
          // const res = await fetchAIStopLoss(s.symbol, entry);
          const calculatedSL = (entry * 0.95).toFixed(2);
          return { ...s, aiLoading: false, slPrice: String(calculatedSL) };
        }
        return s;
      }));
    }, 600); // 600ms micro-loading for realistic UX
  };

  // ---- Calculation ----
  const results = useMemo(() => {
    const cap = parseFloat(capital);
    const pct = parseFloat(riskPct);
    const fixed = parseFloat(riskFixed);

    if (!cap || cap <= 0) return null;
    if ((!pct || pct <= 0) && (!fixed || fixed <= 0)) return null;

    // Risk amount in $
    const riskDollarFromPct = pct > 0 ? cap * (pct / 100) : null;
    const riskDollarFromFixed = fixed > 0 ? fixed : null;

    return stocks.map(s => {
      const entryPrice = parseFloat(s.entryPrice);
      const slPrice = parseFloat(s.slPrice);

      if (!entryPrice || entryPrice <= 0) {
        return { 
          ...s, 
          entryPrice: null, 
          slPrice: null, 
          riskPerShare: null,
          sharesFromPct: null,
          capitalFromPct: null,
          pctOfPortFromPct: null,
          sharesFromFixed: null,
          capitalFromFixed: null,
          pctOfPortFromFixed: null,
        };
      }

      // Risk per share = Entry Price - Stop Loss Price
      const riskPerShare = (slPrice > 0 && entryPrice > slPrice) ? (entryPrice - slPrice) : null;

      // % method Position Sizing math
      let sharesFromPct = null;
      let capitalFromPct = null;
      let pctOfPortFromPct = null;

      if (riskDollarFromPct && riskPerShare && riskPerShare > 0) {
        sharesFromPct = Math.floor(riskDollarFromPct / riskPerShare);
        capitalFromPct = sharesFromPct * entryPrice;
        pctOfPortFromPct = (capitalFromPct / cap) * 100;
      }

      // Fixed $ method Position Sizing math
      let sharesFromFixed = null;
      let capitalFromFixed = null;
      let pctOfPortFromFixed = null;

      if (riskDollarFromFixed && riskPerShare && riskPerShare > 0) {
        sharesFromFixed = Math.floor(riskDollarFromFixed / riskPerShare);
        capitalFromFixed = sharesFromFixed * entryPrice;
        pctOfPortFromFixed = (capitalFromFixed / cap) * 100;
      }

      return {
        ...s,
        entryPrice,
        slPrice: slPrice || null,
        riskPerShare,
        sharesFromPct,
        capitalFromPct,
        pctOfPortFromPct,
        sharesFromFixed,
        capitalFromFixed,
        pctOfPortFromFixed,
      };
    });
  }, [stocks, capital, riskPct, riskFixed]);

  const cap = parseFloat(capital) || 0;
  const hasPct = parseFloat(riskPct) > 0;
  const hasFixed = parseFloat(riskFixed) > 0;

  const totalCapitalFromPct = results ? results.reduce((sum, r) => sum + (r.capitalFromPct || 0), 0) : 0;
  const totalCapitalFromFixed = results ? results.reduce((sum, r) => sum + (r.capitalFromFixed || 0), 0) : 0;

  const sufficientPct = cap > 0 && totalCapitalFromPct > 0 && cap >= totalCapitalFromPct;
  const sufficientFixed = cap > 0 && totalCapitalFromFixed > 0 && cap >= totalCapitalFromFixed;

  const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 font-sans">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="text-2xl">📐</span>
          TI Swing Pick — Budget Calculator
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          คำนวณขนาด Position และ Capital ที่ต้องใช้สำหรับแต่ละหุ้น จากกลยุทธ์ TI Swing Pick
        </p>
      </div>

      {/* ===== TOP: Capital + Risk + Stocks (2 col) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Capital + Risk */}
        <div className="flex flex-col gap-5">

          {/* Capital Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
              💼 Total Account Capital
            </label>
            {accountBalance > 0 && (
              <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mb-2">
                📌 ดึงจาก Balance ปัจจุบัน: ${fmt(accountBalance)}
              </p>
            )}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 10000"
                value={capital}
                onChange={e => setCapital(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Risk Inputs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
              ⚖️ Risk Per Trade
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* % Risk */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">% ของ Capital</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 2"
                    value={riskPct}
                    onChange={e => setRiskPct(e.target.value)}
                    className="w-full pr-8 pl-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                {capital && riskPct && parseFloat(riskPct) > 0 && (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    = ${fmt(parseFloat(capital) * parseFloat(riskPct) / 100)} / trade
                  </span>
                )}
              </div>

              {/* Fixed $ Risk */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Fixed $ Amount</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="e.g. 200"
                    value={riskFixed}
                    onChange={e => setRiskFixed(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                {capital && riskFixed && parseFloat(riskFixed) > 0 && parseFloat(capital) > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    = {((parseFloat(riskFixed) / parseFloat(capital)) * 100).toFixed(2)}% of capital / trade
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stock List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              📋 รายการหุ้น ({stocks.length}/10)
            </label>
            <button
              onClick={addStock}
              disabled={stocks.length >= 10}
              className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              + เพิ่มหุ้น
            </button>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2">
            💡 กรอก Ticker แล้วกด Enter หรือ Tab เพื่อดึงราคาอัตโนมัติ
          </p>

          <div className="flex flex-col gap-3">
            {stocks.map((s, idx) => (
              <div key={s.id} className="bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-850">
                {/* Inputs Row */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold w-4 text-right flex-shrink-0">{idx + 1}.</span>

                  {/* Ticker Input */}
                  <div className="flex-1 min-w-[70px]">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Ticker</span>
                    <input
                      type="text"
                      placeholder="TICKER"
                      value={s.symbol}
                      onChange={e => updateStock(s.id, 'symbol', e.target.value.toUpperCase())}
                      onFocus={e => e.target.select()}
                      onKeyDown={e => handleSymbolKeyDown(e, s.id, s.symbol)}
                      onBlur={e => handleSymbolBlur(s.id, s.symbol)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase cursor-text"
                    />
                  </div>

                  {/* Entry Price Input */}
                  <div className="relative w-28 flex-shrink-0">
                    <span className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">Entry Price ($)</span>
                    {s.fetchingPrice ? (
                      <div className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-605 rounded-lg flex items-center justify-center gap-1 text-[10px] text-indigo-500 font-bold h-[26px]">
                        <span className="animate-spin text-[9px]">⏳</span>
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={s.entryPrice}
                          onChange={e => updateStock(s.id, 'entryPrice', e.target.value)}
                          onFocus={e => e.target.select()}
                          className={`w-full pl-5 pr-1 py-1 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-[26px] ${
                            s.entryPrice ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Stop Loss Price Input */}
                  <div className="relative w-28 flex-shrink-0">
                    <span className="text-[9px] font-bold text-rose-500 dark:text-rose-450 uppercase tracking-wider block mb-0.5">SL Price ($)</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Stop Loss"
                        value={s.slPrice}
                        onChange={e => updateStock(s.id, 'slPrice', e.target.value)}
                        onFocus={e => e.target.select()}
                        className={`w-full pl-5 pr-1 py-1 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 h-[26px] ${
                          s.slPrice ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeStock(s.id)}
                    disabled={stocks.length <= 3}
                    className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 flex-shrink-0 self-end mb-0.5"
                  >
                    ✕
                  </button>
                </div>

                {/* Warning for Stop Loss >= Entry Price */}
                {parseFloat(s.entryPrice) > 0 && parseFloat(s.slPrice) >= parseFloat(s.entryPrice) && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold pl-6 leading-none">
                    ⚠️ Stop Loss Price must be lower than Entry Price
                  </div>
                )}

                {/* Lower Quick SL Badges */}
                {parseFloat(s.entryPrice) > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pl-6">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Quick SL:</span>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(pct => (
                      <button
                        key={pct}
                        onClick={() => {
                          const entry = parseFloat(s.entryPrice) || 0;
                          const calculatedSL = (entry * (1 - (pct / 100))).toFixed(2);
                          updateStock(s.id, 'slPrice', String(calculatedSL));
                        }}
                        className="text-[9px] font-extrabold bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        {pct}%
                      </button>
                    ))}
                    <button
                      onClick={() => handleAICalculateSL(s.id)}
                      disabled={s.aiLoading}
                      className="text-[9px] font-black bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-755 text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {s.aiLoading ? (
                        <>
                          <span className="animate-spin text-[8px]">⏳</span>
                          <span>AI...</span>
                        </>
                      ) : (
                        <>
                          <span>🤖 AI SL</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: Summary Cards + Detail Table ===== */}
      {results && (hasPct || hasFixed) ? (
        <div className="flex flex-col gap-5">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hasPct && (
              <div className={`rounded-2xl p-5 border-2 shadow-sm transition-all ${
                sufficientPct
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/85'
                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/85'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest">
                    % Risk ({riskPct}% / trade)
                  </span>
                  <span className="text-lg animate-pulse">{sufficientPct ? '✅' : '🚨'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${fmt(totalCapitalFromPct)}</span>
                  <span className="text-xs text-slate-500 font-semibold">Total Capital Required</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  {sufficientPct ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>Sufficient Capital. Remaining: ${fmt(cap - totalCapitalFromPct)}</span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">เงินทุนเพียงพอสำหรับพอร์ตโฟลิโอของคุณ</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 animate-pulse">
                      <p className="text-xs font-black text-rose-600 dark:text-rose-450 flex items-center gap-1">
                        <span>Insufficient Capital. Shortfall of: ${fmt(totalCapitalFromPct - cap)}</span>
                      </p>
                      <span className="text-[10px] text-rose-400/80 font-medium">เงินทุนไม่พอสำหรับขนาดตำแหน่งที่คำนวณได้</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasFixed && (
              <div className={`rounded-2xl p-5 border-2 shadow-sm transition-all ${
                sufficientFixed
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/85'
                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/85'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-650 dark:text-emerald-400 uppercase tracking-widest">
                    Fixed $ (${riskFixed} / trade)
                  </span>
                  <span className="text-lg animate-pulse">{sufficientFixed ? '✅' : '🚨'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${fmt(totalCapitalFromFixed)}</span>
                  <span className="text-xs text-slate-500 font-semibold">Total Capital Required</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  {sufficientFixed ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>Sufficient Capital. Remaining: ${fmt(cap - totalCapitalFromFixed)}</span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">เงินทุนเพียงพอสำหรับพอร์ตโฟลิโอของคุณ</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 animate-pulse">
                      <p className="text-xs font-black text-rose-600 dark:text-rose-450 flex items-center gap-1">
                        <span>Insufficient Capital. Shortfall of: ${fmt(totalCapitalFromFixed - cap)}</span>
                      </p>
                      <span className="text-[10px] text-rose-400/80 font-medium">เงินทุนไม่พอสำหรับขนาดตำแหน่งที่คำนวณได้</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Detail Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">รายละเอียดแต่ละหุ้น (Position Sizing Detail)</span>
              <span className="text-[10px] text-slate-400">
                {stocks.filter(s => parseFloat(s.entryPrice) > 0 && parseFloat(s.slPrice) > 0).length} / {stocks.length} หุ้นพร้อมคำนวณ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase font-bold text-slate-500">
                    <th className="px-4 py-3 text-left">หุ้น</th>
                    <th className="px-4 py-3 text-right">Entry Price</th>
                    <th className="px-4 py-3 text-right">Stop Loss</th>
                    <th className="px-4 py-3 text-right">Risk/Share</th>
                    {hasPct && <th className="px-4 py-3 text-right text-indigo-500 dark:text-indigo-400">Shares (%)</th>}
                    {hasPct && <th className="px-4 py-3 text-right text-indigo-500 dark:text-indigo-400">Capital (%)</th>}
                    {hasFixed && <th className="px-4 py-3 text-right text-emerald-500 dark:text-emerald-400">Shares ($)</th>}
                    {hasFixed && <th className="px-4 py-3 text-right text-emerald-500 dark:text-emerald-400">Capital ($)</th>}
                    <th className="px-4 py-3 text-right">% Port</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors ${!r.entryPrice ? 'opacity-40' : ''}`}
                    >
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {r.symbol || `#${i + 1}`}
                        {r.fetchingPrice && <span className="ml-1 text-[9px] text-indigo-400 animate-pulse">loading...</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {r.entryPrice ? `$${fmt(r.entryPrice)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-500 dark:text-rose-450 font-bold">
                        {r.slPrice ? `$${fmt(r.slPrice)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {r.riskPerShare && r.riskPerShare > 0 ? `$${fmt(r.riskPerShare)}` : '—'}
                      </td>
                      {hasPct && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.sharesFromPct != null ? r.sharesFromPct.toLocaleString() : '—'}
                        </td>
                      )}
                      {hasPct && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.capitalFromPct != null ? `$${fmt(r.capitalFromPct)}` : '—'}
                        </td>
                      )}
                      {hasFixed && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.sharesFromFixed != null ? r.sharesFromFixed.toLocaleString() : '—'}
                        </td>
                      )}
                      {hasFixed && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.capitalFromFixed != null ? `$${fmt(r.capitalFromFixed)}` : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {hasPct && r.pctOfPortFromPct != null
                          ? <span className="text-indigo-500">{r.pctOfPortFromPct.toFixed(2)}%</span>
                          : hasFixed && r.pctOfPortFromFixed != null
                            ? <span className="text-emerald-500">{r.pctOfPortFromFixed.toFixed(2)}%</span>
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 font-extrabold">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs uppercase">รวม (Total)</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    {hasPct && <td className="px-4 py-3" />}
                    {hasPct && (
                      <td className="px-4 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                        ${fmt(totalCapitalFromPct)}
                      </td>
                    )}
                    {hasFixed && <td className="px-4 py-3" />}
                    {hasFixed && (
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${fmt(totalCapitalFromFixed)}
                      </td>
                    )}
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 shadow-sm">
          <span className="text-5xl opacity-30">📐</span>
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 font-semibold">กรอก Capital, Risk, Entry Price และ Stop Loss เพื่อดูผลการคำนวณ</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ผลลัพธ์ Position Sizing จะแสดงรายละเอียดด้านล่างนี้</p>
          </div>
        </div>
      )}
    </div>
  );
}
