import React, { useState, useMemo, useCallback, useRef } from 'react';
import { fetchRealTimePrice } from '../api/priceApi';

const DEFAULT_STOCKS = [
  { id: 1, symbol: 'AAPL', price: '', fetchingPrice: false },
  { id: 2, symbol: 'MSFT', price: '', fetchingPrice: false },
  { id: 3, symbol: 'TSLA', price: '', fetchingPrice: false },
  { id: 4, symbol: 'NVDA', price: '', fetchingPrice: false },
  { id: 5, symbol: 'AMZN', price: '', fetchingPrice: false },
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
    setStocks([...stocks, { id: nextId++, symbol: `STOCK${letter}`, price: '', fetchingPrice: false }]);
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
        ? { ...s, fetchingPrice: false, price: price ? String(price) : s.price }
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

  // ---- Calculation ----
  const results = useMemo(() => {
    const cap = parseFloat(capital);
    const pct = parseFloat(riskPct);
    const fixed = parseFloat(riskFixed);

    if (!cap || cap <= 0) return null;
    if ((!pct || pct <= 0) && (!fixed || fixed <= 0)) return null;

    // Risk amount in $
    const riskDollarFromPct = pct > 0 ? cap * (pct / 100) : null;   // e.g. 2% of 10000 = $200
    const riskDollarFromFixed = fixed > 0 ? fixed : null;              // e.g. $200 directly

    return stocks.map(s => {
      const price = parseFloat(s.price);
      if (!price || price <= 0) return { ...s, price: null };

      // % method: Shares = Risk$ / Price, Capital = Shares × Price
      const sharesFromPct = riskDollarFromPct ? riskDollarFromPct / price : null;
      const capitalFromPct = sharesFromPct ? sharesFromPct * price : null;
      const pctOfPortFromPct = capitalFromPct && cap ? (capitalFromPct / cap) * 100 : null;

      // Fixed $ method: same formula — Risk$ / Price = Shares
      const sharesFromFixed = riskDollarFromFixed ? riskDollarFromFixed / price : null;
      const capitalFromFixed = sharesFromFixed ? sharesFromFixed * price : null;
      const pctOfPortFromFixed = capitalFromFixed && cap ? (capitalFromFixed / cap) * 100 : null;

      return {
        ...s,
        price,
        sharesFromPct, capitalFromPct, pctOfPortFromPct,
        sharesFromFixed, capitalFromFixed, pctOfPortFromFixed,
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
              className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + เพิ่มหุ้น
            </button>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2">
            💡 กรอก Ticker แล้วกด Enter หรือ Tab เพื่อดึงราคาอัตโนมัติ
          </p>

          <div className="flex flex-col gap-2.5">
            {stocks.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold w-5 text-right flex-shrink-0">{idx + 1}.</span>

                {/* Symbol field — select all on focus for immediate typing */}
                <input
                  type="text"
                  placeholder="TICKER"
                  value={s.symbol}
                  onChange={e => updateStock(s.id, 'symbol', e.target.value.toUpperCase())}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => handleSymbolKeyDown(e, s.id, s.symbol)}
                  onBlur={e => handleSymbolBlur(s.id, s.symbol)}
                  className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase cursor-text"
                />

                {/* Price field — with loading indicator */}
                <div className="relative flex-shrink-0 w-28">
                  {s.fetchingPrice ? (
                    <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-600 rounded-lg flex items-center justify-center gap-1.5 text-xs text-indigo-500 font-bold">
                      <span className="animate-spin text-[10px]">⏳</span>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={s.price}
                        onChange={e => updateStock(s.id, 'price', e.target.value)}
                        onFocus={e => e.target.select()}
                        className={`w-full pl-6 pr-2 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                          s.price ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </>
                  )}
                </div>

                <button
                  onClick={() => removeStock(s.id)}
                  disabled={stocks.length <= 3}
                  className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 flex-shrink-0"
                >
                  ✕
                </button>
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
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    % Risk ({riskPct}% / trade)
                  </span>
                  <span className="text-lg">{sufficientPct ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${fmt(totalCapitalFromPct)}</span>
                  <span className="text-xs text-slate-500 font-semibold">Total Required</span>
                </div>
                <p className={`text-xs font-bold mt-1.5 ${sufficientPct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {sufficientPct
                    ? `✅ เงินพอ! เหลือ $${fmt(cap - totalCapitalFromPct)}`
                    : `❌ เงินไม่พอ! ขาดอีก $${fmt(totalCapitalFromPct - cap)}`}
                </p>
              </div>
            )}

            {hasFixed && (
              <div className={`rounded-2xl p-5 border-2 shadow-sm transition-all ${
                sufficientFixed
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    Fixed $ (${riskFixed} / trade)
                  </span>
                  <span className="text-lg">{sufficientFixed ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${fmt(totalCapitalFromFixed)}</span>
                  <span className="text-xs text-slate-500 font-semibold">Total Required</span>
                </div>
                <p className={`text-xs font-bold mt-1.5 ${sufficientFixed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {sufficientFixed
                    ? `✅ เงินพอ! เหลือ $${fmt(cap - totalCapitalFromFixed)}`
                    : `❌ เงินไม่พอ! ขาดอีก $${fmt(totalCapitalFromFixed - cap)}`}
                </p>
              </div>
            )}
          </div>

          {/* Detail Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">รายละเอียดแต่ละหุ้น</span>
              <span className="text-[10px] text-slate-400">
                {stocks.filter(s => parseFloat(s.price) > 0).length} / {stocks.length} หุ้นพร้อมคำนวณ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase font-bold text-slate-500">
                    <th className="px-4 py-3 text-left">หุ้น</th>
                    <th className="px-4 py-3 text-right">ราคา</th>
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
                      className={`border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors ${!r.price ? 'opacity-40' : ''}`}
                    >
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {r.symbol || `#${i + 1}`}
                        {r.fetchingPrice && <span className="ml-1 text-[9px] text-indigo-400 animate-pulse">loading...</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {r.price ? `$${fmt(r.price)}` : '—'}
                      </td>
                      {hasPct && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.sharesFromPct ? r.sharesFromPct.toFixed(4) : '—'}
                        </td>
                      )}
                      {hasPct && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.capitalFromPct ? `$${fmt(r.capitalFromPct)}` : '—'}
                        </td>
                      )}
                      {hasFixed && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.sharesFromFixed ? r.sharesFromFixed.toFixed(4) : '—'}
                        </td>
                      )}
                      {hasFixed && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.capitalFromFixed ? `$${fmt(r.capitalFromFixed)}` : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {hasPct && r.pctOfPortFromPct
                          ? <span className="text-indigo-500">{r.pctOfPortFromPct.toFixed(2)}%</span>
                          : hasFixed && r.pctOfPortFromFixed
                            ? <span className="text-emerald-500">{r.pctOfPortFromFixed.toFixed(2)}%</span>
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 font-extrabold">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs uppercase">รวม</td>
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
            <p className="text-slate-500 dark:text-slate-400 font-semibold">กรอก Capital และ Risk เพื่อดูผลการคำนวณ</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ผลลัพธ์จะแสดงด้านล่างนี้</p>
          </div>
        </div>
      )}
    </div>
  );
}
