import React, { useState, useEffect } from 'react';

export default function FighterComponent({ accountBalance, sharedOrder, setSharedOrder }) {
  // Use sharedOrder state from parent (App.jsx)
  const { symbol, entry, stopLoss, tp1, tp2, tp3 } = sharedOrder || {
    symbol: 'AAPL', entry: 150, stopLoss: 145, tp1: 165, tp2: 180, tp3: 195
  };

  const updateShared = (key, value) => {
    if (setSharedOrder) {
      setSharedOrder(prev => ({ ...prev, [key]: value }));
    }
  };

  // Local parameter states
  const [sizingMode, setSizingMode] = useState('Risk($)'); // Budget, Risk($), Risk(%)
  const [inputValue, setInputValue] = useState(200); // ค่าตามโหมดที่เลือก
  const [isUnlocked, setIsUnlocked] = useState(false); // โหมด Sim Open/Close
  const [portfolioMode, setPortfolioMode] = useState('Moonbag (Free Share)');

  // ผลลัพธ์จากการคำนวณหลัก
  const [shares, setShares] = useState(0);
  const [calcBudget, setCalcBudget] = useState(0);
  const [riskDollar, setRiskDollar] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusColor, setStatusColor] = useState('');

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
        setStatusColor('text-rose-400 bg-rose-950/30 border-rose-900/50');
      } else {
        setStatusMessage(`⚠️ วงเงินเกินพอร์ตจริง (โหมด Sim Unlocked) ขาดเงินทุนจำลอง $${shortAmount.toFixed(2)}`);
        setStatusColor('text-amber-400 bg-amber-950/30 border-amber-900/50');
      }
    } else {
      setStatusMessage('✅ ยอดวงเงินพอร์ตปัจจุบันเพียงพอสำหรับการเทรดนี้');
      setStatusColor('text-emerald-400 bg-emerald-950/30 border-emerald-900/50');
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg flex flex-col gap-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-3xl"></div>

      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-indigo-650 dark:text-indigo-400">⚡ FIGHTER POSITION ENGINE 2.0</h2>
          <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">เครื่องคำนวณตำแหน่งซื้อ (Position Sizing) และจัดทำแผนเป้าหมายกำไรอย่างเป็นระบบ</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800/80 text-right shadow-inner">
          <span className="text-[10px] text-slate-500 block font-semibold">Active Balance</span>
          <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">${accountBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Grid โซนกรอกข้อมูลอินพุต */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5 uppercase font-bold">SYMBOL</label>
          <input 
            type="text" 
            value={symbol} 
            onChange={(e) => updateShared('symbol', e.target.value.toUpperCase())} 
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 font-mono font-bold text-indigo-650 dark:text-indigo-300 focus:outline-none focus:border-indigo-500 text-sm uppercase text-slate-800 dark:text-white" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5 uppercase font-bold">ENTRY PRICE ($)</label>
          <input 
            type="number" 
            value={entry} 
            onChange={(e) => updateShared('entry', e.target.value)} 
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-sm text-slate-800 dark:text-white" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5 uppercase font-bold">STOP LOSS ($)</label>
          <input 
            type="number" 
            value={stopLoss} 
            onChange={(e) => updateShared('stopLoss', e.target.value)} 
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 font-mono text-rose-600 dark:text-rose-450 font-bold focus:outline-none focus:border-rose-500 text-sm text-slate-800 dark:text-white" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-center">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-2 uppercase font-bold">🔓 SIMULATE BUDGET LIMIT</label>
          <button 
            onClick={() => setIsUnlocked(!isUnlocked)} 
            className={`w-full py-2 px-4 rounded font-bold text-xs transition-all cursor-pointer border border-solid ${
              isUnlocked 
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md shadow-amber-500/20' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 text-slate-550 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            {isUnlocked ? '⚡ UNLOCKED (ACTIVE)' : '🔒 LOCKED (NORMAL)'}
          </button>
        </div>
      </div>

      {/* โหมดการเลือกคำนวณ Sizing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-lg border border-slate-200 dark:border-slate-800/60 lg:col-span-2">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-2.5 uppercase font-bold">SIZING INPUT MODE</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['Budget', 'Risk($)', 'Risk(%)'].map((mode) => (
              <button 
                key={mode} 
                onClick={() => setSizingMode(mode)} 
                className={`py-2 rounded text-xs font-bold transition-all cursor-pointer border border-solid ${
                  sizingMode === mode 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow' 
                    : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {mode === 'Budget' ? '💰 BUDGET LIMIT' : mode === 'Risk($)' ? '💵 RISK AMOUNT ($)' : '📊 RISK PORTFOLIO (%)'}
              </button>
            ))}
          </div>
          <input 
            type="number" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3 font-mono font-bold text-xl text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" 
            placeholder="กรอกจำนวนเงินตามโหมดที่เลือก..." 
          />
        </div>

        {/* แผงแสดงผลลัพธ์แบบเรียลไทม์ */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-5 rounded-lg grid grid-cols-2 gap-4 shadow-inner">
          <div className="text-center border-r border-slate-200 dark:border-slate-800/60 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">FRACTIONAL SHARES</span>
            <span className="text-2xl font-mono font-bold text-slate-800 dark:text-white mt-1 select-all">{shares.toFixed(4)}</span>
          </div>
          <div className="text-center flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">ACTUAL RISK $</span>
            <span className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-455 mt-1">${riskDollar.toFixed(2)}</span>
          </div>
          <div className="col-span-2 text-center pt-3.5 border-t border-slate-200 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Calculated Buying Power</span>
            <span className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
              ${calcBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* แถบแจ้งเตือนสถานะการเงิน (Status Box) */}
      <div className={`p-3 rounded border text-xs font-semibold tracking-wide text-center transition-all ${statusColor}`}>
        {statusMessage}
      </div>

      {/* ส่วนที่ 2: ระบบบริหารจัดการเป้าหมายราคาและการแบ่งขาย (Take Profit Plan) */}
      <div className="border-t border-slate-200 dark:border-slate-800/60 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h3 className="text-base font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
              <span>🎯 TARGET PRICE MANAGEMENT (TAKE PROFIT)</span>
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">จำลองผลลัพธ์แผนการขายทำกำไร 3 รูปแบบตามระดับเป้าหมายราคา (Cash Out / Moonbag / Split)</p>
          </div>
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-inner">
            {['Cash (All Out)', 'Moonbag (Free Share)', '50/50 Split'].map((mode) => (
              <button 
                key={mode} 
                onClick={() => setPortfolioMode(mode)} 
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all cursor-pointer border border-transparent ${
                  portfolioMode === mode 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow border-slate-200 dark:border-slate-700' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* ตารางแสดงผลลัพธ์รายเป้าหมายราคา */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'TP1', price: tp1, setPrice: (v) => updateShared('tp1', v), color: 'text-emerald-650 dark:text-emerald-400' },
            { id: 'TP2', price: tp2, setPrice: (v) => updateShared('tp2', v), color: 'text-teal-600 dark:text-teal-400' },
            { id: 'TP3', price: tp3, setPrice: (v) => updateShared('tp3', v), color: 'text-indigo-600 dark:text-indigo-400' },
          ].map((tp) => (
            <div key={tp.id} className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{tp.id} TARGET PRICE</span>
                <input 
                  type="number" 
                  value={tp.price} 
                  onChange={(e) => tp.setPrice(e.target.value)} 
                  className={`w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1 text-center font-mono font-bold text-sm ${tp.color} focus:outline-none focus:border-indigo-500`} 
                />
              </div>

              <div className="bg-white dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-850 min-h-[76px] flex items-center justify-center text-center shadow-inner">
                <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
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
    </div>
  );
}
