import React, { useState, useEffect } from 'react';
import LightweightChartComponent from './LightweightChartComponent';
import { fetchATR60m } from '../api/priceApi';

export default function FighterComponent({ accountBalance, sharedOrder, setSharedOrder, isVip }) {
  // Use sharedOrder state from parent (App.jsx)
  const { symbol, tiEntryAlert, entry, stopLoss, tp1, tp2, tp3 } = sharedOrder || {
    symbol: 'AAPL', tiEntryAlert: '', entry: 150, stopLoss: 145, tp1: 165, tp2: 180, tp3: 195
  };

  const updateShared = (key, value) => {
    if (setSharedOrder) {
      setSharedOrder(prev => ({ ...prev, [key]: value }));
    }
  };

  // Local parameter states
  const [sizingMode, setSizingMode] = useState('Risk($)'); // Budget, Risk($), Risk(%)
  const [inputValue, setInputValue] = useState(''); // ค่าตามโหมดที่เลือก
  const [isUnlocked, setIsUnlocked] = useState(false); // โหมด Sim Open/Close
  const [portfolioMode, setPortfolioMode] = useState('Moonbag (Free Share)');

  // ผลลัพธ์จากการคำนวณหลัก
  const [shares, setShares] = useState(0);
  const [calcBudget, setCalcBudget] = useState(0);
  const [riskDollar, setRiskDollar] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusColor, setStatusColor] = useState('');

  const handleQuickSL = (percent) => {
    const pEntry = parseFloat(entry) || 0;
    if (pEntry > 0) {
      const newSl = pEntry * (1 - (percent / 100));
      updateShared('stopLoss', newSl.toFixed(2));
    }
  };

  const handleAutoSL = async () => {
    const pEntry = parseFloat(entry) || 0;
    if (pEntry > 0 && symbol) {
      setStatusMessage('🤖 AI กำลังคำนวณ ATR14 (TF60m)...');
      setStatusColor('text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/50');
      
      const atr = await fetchATR60m(symbol);
      if (atr) {
        const atrMultiplier = 1.5;
        const newSl = pEntry - (atr * atrMultiplier);
        updateShared('stopLoss', newSl.toFixed(2));
        setStatusMessage(`🤖 AI แนะนำจุด SL ที่ $${newSl.toFixed(2)} (อิงจาก 1.5x ATR14 60m: $${atr.toFixed(2)})`);
        setStatusColor('text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/50');
      } else {
        const newSl = pEntry * 0.975; // Heuristic: -2.5% for swing low proxy
        updateShared('stopLoss', newSl.toFixed(2));
        setStatusMessage('⚠️ ดึงข้อมูล ATR ไม่สำเร็จ AI แนะนำจุด SL สำรองที่ -2.5%');
        setStatusColor('text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/50');
      }
    }
  };

  // ⚡ คำนวณ Position Sizing Engine อัตโนมัติเมื่อค่าเปลี่ยน
  useEffect(() => {
    let calculatedShares = 0;
    const pEntry = parseFloat(entry) || 0;
    const pStopLoss = parseFloat(stopLoss) || 0;
    const pVal = parseFloat(inputValue) || 0;
    const gapDistance = Math.abs(pEntry - pStopLoss);

    if (pEntry > 0 && gapDistance > 0) {
      if (sizingMode === 'Budget') {
        calculatedShares = pVal / pEntry;
      } else if (sizingMode === 'Risk($)') {
        calculatedShares = pVal / gapDistance;
      } else if (sizingMode === 'Risk(%)') {
        calculatedShares = (accountBalance * (pVal / 100)) / gapDistance;
      }
    }

    setShares(calculatedShares);
    const totalCost = calculatedShares * pEntry;
    setCalcBudget(totalCost);
    const currentActualRisk = calculatedShares * gapDistance;
    setRiskDollar(currentActualRisk);

    // Sync calculated shares and actual risk dollar to sharedOrder
    if (setSharedOrder) {
      setSharedOrder(prev => {
        if (prev.calculatedShares === calculatedShares && prev.actualRiskDollar === currentActualRisk) {
          return prev;
        }
        return {
          ...prev,
          calculatedShares,
          actualRiskDollar: currentActualRisk
        };
      });
    }

    // 🔓 ระบบตรวจสอบสถานะวงเงินพอร์ต (Locked / Unlocked Sim)
    if (totalCost > accountBalance) {
      const maxPossibleShares = accountBalance / pEntry;
      const shortAmount = totalCost - accountBalance;

      if (!isUnlocked) {
        setStatusMessage(`⛔ ทุนพอร์ตไม่พอ! เทรดสูงสุดได้แค่ ${Math.floor(maxPossibleShares)} หุ้น (ขาดเงิน $${shortAmount.toFixed(2)})`);
        setStatusColor('text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50');
      } else {
        setStatusMessage(`⚠️ วงเงินเกินพอร์ตจริง (โหมด Sim Unlocked) ขาดเงินทุนจำลอง $${shortAmount.toFixed(2)}`);
        setStatusColor('text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50');
      }
    } else {
      setStatusMessage('✅ ยอดวงเงินพอร์ตปัจจุบันเพียงพอสำหรับการเทรดนี้');
      setStatusColor('text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50');
    }
  }, [symbol, entry, stopLoss, sizingMode, inputValue, isUnlocked, accountBalance, setSharedOrder]);

  // ระบบ Auto-calculate TP1, TP2, TP3 เมื่อ Entry หรือ StopLoss เปลี่ยน
  useEffect(() => {
    const pEntry = parseFloat(entry) || 0;
    const pStopLoss = parseFloat(stopLoss) || 0;
    if (pEntry > 0 && pStopLoss > 0) {
      const gapDistance = Math.abs(pEntry - pStopLoss);
      if (gapDistance > 0) {
        const isLong = pEntry >= pStopLoss;
        const formatPrice = (val) => parseFloat(val.toFixed(2));
        updateShared('tp1', formatPrice(isLong ? pEntry + gapDistance : pEntry - gapDistance));
        updateShared('tp2', formatPrice(isLong ? pEntry + gapDistance * 2 : pEntry - gapDistance * 2));
        updateShared('tp3', formatPrice(isLong ? pEntry + gapDistance * 3 : pEntry - gapDistance * 3));
      }
    }
  }, [entry, stopLoss]);

  // 🎁 ฟังก์ชันถอดสูตรคำนวณผลลัพธ์ 3 ทิศทางแบบ LET
  const evaluate3WayResult = (targetPrice, currentMode) => {
    const qtyTotal = shares;
    const priceCost = parseFloat(entry) || 0;
    const priceSell = parseFloat(targetPrice) || 0;

    if (qtyTotal <= 0 || priceSell <= 0) return "รอคำนวณ...";
    if (priceSell <= priceCost) {
      const totalCost = qtyTotal * priceCost;
      const revenue = qtyTotal * priceSell;
      return `⛔ ขาดทุน $${Math.abs(totalCost - revenue).toFixed(2)} (Cut Loss)`;
    }

    let qtySell = 0;
    const totalCost = qtyTotal * priceCost;

    // กำหนดจำนวนหุ้นที่จะขายตามโหมดริหารพอร์ต
    if (currentMode.includes("Cash")) {
      qtySell = qtyTotal; // ขายหมดเกลี้ยง
    } else if (currentMode.includes("Moonbag")) {
      qtySell = Math.ceil(totalCost / priceSell); // ขายเอาทุนคืนครบ
    } else if (currentMode.includes("50/50")) {
      qtySell = qtyTotal * 0.5; // แบ่งขายครึ่งหนึ่ง
    }

    const revenue = qtySell * priceSell;
    const sharesLeft = qtyTotal - qtySell;
    const cashChange = revenue - totalCost;

    if (currentMode.includes("Cash")) {
      return `💰 กำไรรวม $${(revenue - totalCost).toFixed(2)}`;
    } else {
      if (sharesLeft <= 0 || revenue < totalCost) {
        const totalProfit = (qtyTotal * priceSell) - totalCost;
        return `⚠️ กำไรไม่พอแปลงหุ้น (ขายหมด +$${totalProfit.toFixed(2)})`;
      }
      return `📦 ฟรี ${sharesLeft.toFixed(4)} หุ้น + 💵 ทอน $${cashChange.toFixed(2)}`;
    }
  };

  return (
    <div className="relative">
      <div className={`crypto-card p-6 flex flex-col gap-6 transition-colors duration-300 ${!isVip ? 'blur-md pointer-events-none select-none opacity-60' : ''}`}>

        {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 relative z-10">
        <div>
          <h2 className="text-xl font-black tracking-widest text-amber-600 dark:text-amber-500 flex items-center gap-2">
            <span>⚡ ALPHA TRADER</span>
            <span className="text-slate-400 dark:text-slate-300 text-lg font-bold">| TI SWING PICK OPTIMIZER</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">เครื่องมือปรับจูนจุดเข้าซื้อและ Risk/Reward (RR) สำหรับการทำกำไรระยะสั้น (TF60/TF15)</p>
        </div>
        <div className="bg-slate-50 dark:bg-[#111] px-4 py-2 rounded-sm border border-slate-200 dark:border-slate-800 text-right shadow-inner">
          <span className="text-[10px] text-amber-600/70 block font-black uppercase tracking-widest">Active Balance</span>
          <span className="text-lg font-mono font-black text-amber-600 dark:text-amber-500">${accountBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Grid โซนกรอกข้อมูลอินพุต */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative z-10">
        <div className="bg-slate-50 dark:bg-[#111] p-3 rounded-sm border border-slate-200 dark:border-slate-800">
          <label className="text-[10px] text-slate-500 block mb-1.5 uppercase font-bold tracking-wider">SYMBOL</label>
          <input 
            type="text" 
            value={symbol} 
            onChange={(e) => updateShared('symbol', e.target.value.toUpperCase())} 
            onFocus={(e) => e.target.select()}
            className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-700 rounded-sm p-2 font-mono font-black text-amber-600 dark:text-amber-500 focus:outline-none focus:border-amber-500 text-sm uppercase shadow-inner" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-[#111] p-3 rounded-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
          <label className="text-[10px] text-amber-600 block mb-1.5 uppercase font-bold tracking-wider pl-2">TI ENTRY ALERT</label>
          <input 
            type="number" 
            value={tiEntryAlert} 
            onChange={(e) => updateShared('tiEntryAlert', e.target.value)} 
            onFocus={(e) => e.target.select()}
            placeholder="Day Breakout"
            className="w-full bg-white dark:bg-[#0a0a0a] border border-amber-200 dark:border-amber-900/50 rounded-sm p-2 font-mono font-black text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500 text-sm shadow-inner" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-[#111] p-3 rounded-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
          <label className="text-[10px] text-emerald-600 block mb-1.5 uppercase font-bold tracking-wider pl-2">CUSTOM ENTRY (TF60)</label>
          <input 
            type="number" 
            value={entry} 
            onChange={(e) => updateShared('entry', e.target.value)} 
            onFocus={(e) => e.target.select()}
            className="w-full bg-white dark:bg-[#0a0a0a] border border-emerald-200 dark:border-emerald-900/50 rounded-sm p-2 font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 text-sm shadow-inner" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-[#111] p-3 rounded-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-600"></div>
          <label className="text-[10px] text-rose-600 block mb-1.5 uppercase font-bold tracking-wider pl-2">CUSTOM SL (TF60)</label>
          <input 
            type="number" 
            value={stopLoss} 
            onChange={(e) => updateShared('stopLoss', e.target.value)} 
            onFocus={(e) => e.target.select()}
            className="w-full bg-white dark:bg-[#0a0a0a] border border-rose-200 dark:border-rose-900/50 rounded-sm p-2 font-mono font-black text-rose-600 dark:text-rose-500 focus:outline-none focus:border-rose-500 text-sm shadow-inner" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-[#111] p-3 rounded-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
          <label className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-wider text-center">🔓 SIM LIMIT</label>
          <button 
            onClick={() => setIsUnlocked(!isUnlocked)} 
            className={`w-full py-2 px-2 rounded-sm font-black text-[10px] transition-all cursor-pointer border ${
              isUnlocked 
                ? 'bg-amber-500 text-white dark:text-black border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                : 'bg-white dark:bg-[#222] text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#333]'
            }`}
          >
            {isUnlocked ? '⚡ UNLOCKED' : '🔒 NORMAL'}
          </button>
        </div>
      </div>

      {/* โหมดการเลือกคำนวณ Sizing & SL Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        <div className="bg-slate-50 dark:bg-[#111] p-4 rounded-sm border border-slate-200 dark:border-slate-800 lg:col-span-2 flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-widest">SIZING INPUT MODE</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['Budget', 'Risk($)', 'Risk(%)'].map((mode) => (
                <button 
                  key={mode} 
                  onClick={() => setSizingMode(mode)} 
                  className={`py-2 rounded-sm text-xs font-black transition-all cursor-pointer border ${
                    sizingMode === mode 
                      ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                      : 'bg-white dark:bg-[#222] text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#333]'
                  }`}
                >
                  {mode === 'Budget' ? '💰 BUDGET' : mode === 'Risk($)' ? '💵 RISK ($)' : '📊 RISK (%)'}
                </button>
              ))}
            </div>
            <input 
              type="number" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onFocus={(e) => e.target.select()}
              className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-700 rounded-sm p-3 font-mono font-black text-xl text-center text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-inner" 
              placeholder="0.00" 
            />
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-widest">QUICK SL ASSISTANT</label>
            <div className="flex gap-2">
              <button onClick={handleAutoSL} className="flex-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-sm py-1.5 text-[10px] font-black uppercase transition-colors cursor-pointer flex items-center justify-center gap-1">
                🤖 AI Auto-SL
              </button>
              {[-1, -2, -3, -5].map(pct => (
                <button key={pct} onClick={() => handleQuickSL(Math.abs(pct))} className="flex-1 bg-white dark:bg-[#222] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-sm py-1.5 text-[10px] font-black transition-colors cursor-pointer">
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* แผงแสดงผลลัพธ์แบบเรียลไทม์ */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-amber-200 dark:border-amber-900/40 p-4 rounded-sm grid grid-cols-2 gap-3 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]">
          <div className="text-center border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">SHARES</span>
            <span className="text-2xl font-mono font-black text-slate-900 dark:text-white mt-1 select-all">{shares.toFixed(4)}</span>
          </div>
          <div className="text-center flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">ACTUAL RISK $</span>
            <span className="text-2xl font-mono font-black text-rose-600 dark:text-rose-500 mt-1">${riskDollar.toFixed(2)}</span>
          </div>
          <div className="col-span-2 text-center pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Buying Power</span>
            <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-500 mt-1 block drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">
              ${calcBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Lightweight Interactive Chart */}
      <div className="w-full h-[400px] rounded-sm overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0a0a] relative z-10">
        {symbol ? (
          <LightweightChartComponent 
            symbol={symbol}
            entry={entry}
            stopLoss={stopLoss}
            tp1={tp1}
            tp2={tp2}
            tp3={tp3}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-sm">
            กรุณากรอก Symbol เพื่อโหลดกราฟ
          </div>
        )}
      </div>

      {/* แถบแจ้งเตือนสถานะการเงิน (Status Box) */}
      <div className={`p-2 rounded-sm border text-[11px] font-bold tracking-wide text-center transition-all ${statusColor} relative z-10 uppercase`}>
        {statusMessage}
      </div>

      {/* ส่วนที่ 2: ระบบบริหารจัดการเป้าหมายราคาและการแบ่งขาย (Take Profit Plan) */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-5 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h3 className="text-sm font-black tracking-widest text-amber-600 dark:text-amber-500 flex items-center gap-2">
              <span>🎯 AUTO TP CALCULATOR (1:1 / 1:2 / 1:3)</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">เป้าหมายกำไรจากการคำนวณ RR อัตโนมัติ (Custom Entry - Custom SL)</p>
          </div>
          <div className="flex gap-1 bg-slate-50 dark:bg-[#111] p-1 rounded-sm border border-slate-200 dark:border-slate-800 shadow-inner">
            {['Cash (All Out)', 'Moonbag (Free Share)', '50/50 Split'].map((mode) => (
              <button 
                key={mode} 
                onClick={() => setPortfolioMode(mode)} 
                className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase transition-all cursor-pointer border ${
                  portfolioMode === mode 
                    ? 'bg-amber-600 text-white dark:text-black shadow border-amber-500' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* ตารางแสดงผลลัพธ์รายเป้าหมายราคา */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'TP1 (1R)', price: tp1, setPrice: (v) => updateShared('tp1', v), color: 'text-emerald-600 dark:text-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.1)]' },
            { id: 'TP2 (2R)', price: tp2, setPrice: (v) => updateShared('tp2', v), color: 'text-teal-600 dark:text-teal-400', glow: 'shadow-[0_0_10px_rgba(45,212,191,0.1)]' },
            { id: 'TP3 (3R)', price: tp3, setPrice: (v) => updateShared('tp3', v), color: 'text-indigo-600 dark:text-indigo-400', glow: 'shadow-[0_0_10px_rgba(129,140,248,0.1)]' },
          ].map((tp) => (
            <div key={tp.id} className={`bg-slate-50 dark:bg-[#111] p-4 rounded-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3 transition-all ${tp.glow} hover:border-slate-300 dark:hover:border-slate-600`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{tp.id} TARGET</span>
                  <input 
                  type="number" 
                  value={tp.price} 
                  onChange={(e) => tp.setPrice(e.target.value)} 
                  onFocus={(e) => e.target.select()}
                  className={`w-24 bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-700 rounded-sm p-1 text-center font-mono font-black text-sm ${tp.color} focus:outline-none focus:border-amber-500`} 
                />
              </div>

              <div className="bg-white dark:bg-[#0a0a0a] p-3 rounded-sm border border-slate-200 dark:border-slate-800 min-h-[64px] flex items-center justify-center text-center shadow-inner">
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                  {evaluate3WayResult(tp.price, portfolioMode)}
                </span>
              </div>
              <div className="text-[9px] text-slate-500 text-right italic font-medium">
                โหมดแบ่งกำไร: {portfolioMode}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🛠️ Trader Tools & Resources for Small Capital Traders */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-4 relative z-10">
        <h3 className="text-sm font-black tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-3">
          <span>🛠️ TRADER TOOLS & RESOURCES (Free Tiers)</span>
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          เครื่องมือแนะนำสำหรับเทรดเดอร์ทุนน้อยที่ต้องการข้อมูลระดับโปรแบบฟรีๆ (ใช้ควบคู่กับ Dime ได้)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="https://finviz.com/" target="_blank" rel="noreferrer" className="block bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors group">
            <h4 className="font-black text-slate-800 dark:text-white text-xs mb-1 group-hover:text-indigo-500">FINVIZ</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              สแกนหุ้นเทคนิคัลและพื้นฐานฟรี (Screener) และดู Heatmap ตลาดได้อย่างรวดเร็ว
            </p>
          </a>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="block bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors group">
            <h4 className="font-black text-slate-800 dark:text-white text-xs mb-1 group-hover:text-indigo-500">TradingView</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              สุดยอดแพลตฟอร์มวาดกราฟและตีเส้นที่ดีที่สุด สมัครฟรีสามารถดู TF Day/1H และสร้าง Watchlist ได้
            </p>
          </a>
          <a href="https://www.webull.com/" target="_blank" rel="noreferrer" className="block bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors group">
            <h4 className="font-black text-slate-800 dark:text-white text-xs mb-1 group-hover:text-indigo-500">Webull Desktop</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              มี Level 2 Data (ถ้าได้โปรฟรี) และ Order Flow ที่ดูง่าย เหมาะมากสำหรับการหาจุดเข้าแบบลึกๆ 
            </p>
          </a>
          <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer" className="block bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors group">
            <h4 className="font-black text-slate-800 dark:text-white text-xs mb-1 group-hover:text-indigo-500">Yahoo Finance</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              ติดตามข่าวสาร งบการเงิน และ Price Action เบื้องต้นแบบ Real-time ที่เร็วมากบนมือถือ
            </p>
          </a>
        </div>
      </div>
      </div>
      
      {!isVip && (
        <div className="absolute inset-0 flex items-center justify-center z-50 flex-col gap-3 pointer-events-auto">
          <div className="bg-slate-900/90 text-white px-8 py-6 rounded-2xl text-lg font-black shadow-2xl border border-slate-700 text-center backdrop-blur-sm">
            <div className="text-5xl mb-3">🔒</div>
            VIP Exclusive Feature
            <p className="text-sm font-medium text-slate-400 mt-2">
              The ALPHA TRADER Engine & Auto TP Calculator<br/>
              are reserved for VIP members.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
