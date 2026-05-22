import React, { useState, useEffect } from 'react';

export default function QuickOrderWidget({ currentRank, accountBalance, onSaveTrade, sharedOrder, setSharedOrder }) {
  const { symbol, entry, stopLoss: sl, tp1: tp } = sharedOrder || {
    symbol: 'AAPL', entry: '', stopLoss: '', tp1: ''
  };

  const updateShared = (key, value) => {
    if (setSharedOrder) setSharedOrder(prev => ({ ...prev, [key]: value }));
  };

  const [direction, setDirection] = useState('Long'); // Long or Short
  const [riskAmount, setRiskAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [shareInputMode, setShareInputMode] = useState('calculated'); // 'calculated' | 'custom'
  const [customShares, setCustomShares] = useState('');

  // เมื่อเปลี่ยนยศ ให้ดึงค่าความเสี่ยงขั้นต่ำเริ่มต้นของยศนั้นมาใช้
  useEffect(() => {
    if (currentRank) {
      setRiskAmount(currentRank.risk1.toString());
    }
  }, [currentRank]);

  // คำนวณหา Gap
  const pEntry = parseFloat(entry) || 0;
  const pSl = parseFloat(sl) || 0;
  const pRisk = parseFloat(riskAmount) || 0;

  // ตรวจสอบความสมเหตุสมผลของทิศทางราคา
  const isDirectionValid = direction === 'Long' 
    ? (pSl === 0 || pEntry > pSl) 
    : (pSl === 0 || pEntry < pSl);

  const gap = Math.abs(pEntry - pSl) || 0;
  
  // คำนวณจำนวนหุ้นทศนิยม 4 ตำแหน่ง (Fractional Shares)
  const fractionalShares = gap > 0 && pRisk > 0 ? (pRisk / gap).toFixed(4) : "0.0000";
  const actualShares = shareInputMode === 'calculated' ? parseFloat(fractionalShares) : (parseFloat(customShares) || 0);
  const buyingPowerRequired = (actualShares * pEntry).toFixed(2);

  // คำนวณวงเงินสูงสุดของยศในการเข้าเทรด
  const maxBudget = accountBalance * (currentRank.maxAlloc / 100);
  const isOverBudget = parseFloat(buyingPowerRequired) > maxBudget;

  const handleSave = () => {
    if (!symbol) {
      alert("กรุณากรอก SYMBOL หุ้น");
      return;
    }
    if (pEntry <= 0 || pSl <= 0) {
      alert("กรุณากรอก Entry Price และ Stop Loss ให้ถูกต้อง");
      return;
    }
    if (!isDirectionValid) {
      alert(direction === 'Long' 
        ? "สำหรับ Long: Stop Loss ต้องอยู่ต่ำกว่าราคาเข้าซื้อ (Entry Price)" 
        : "สำหรับ Short: Stop Loss ต้องอยู่สูงกว่าราคาเข้าซื้อ (Entry Price)"
      );
      return;
    }
    if (isOverBudget) {
      setShowConfirm(true);
      return;
    }
    if (actualShares <= 0) {
      alert("กรุณาระบุจำนวนหุ้นให้มากกว่า 0");
      return;
    }

    performSave();
  };

  const performSave = () => {
    // สร้างข้อมูลบันทึกเข้าพอร์ต
    const tradeData = {
      symbol: symbol.toUpperCase(),
      direction,
      entryPrice: pEntry,
      stopLoss: pSl,
      takeProfit: parseFloat(tp) || 0,
      shares: actualShares,
      plannedRisk: pRisk, // บันทึกเงิน Risk ของไม้แรกไว้ใช้อ้างอิง RR
      status: 'Open',
      contextScore: 5, // Default ค่อยแก้ตอนปิดดีล
      planAdherenceScore: 100, // Default ค่อยแก้ตอนปิดดีล
    };

    onSaveTrade(tradeData);
    
    // เคลียร์ค่าฟอร์มบางส่วนเพื่อความสะดวก
    updateShared('symbol', 'AAPL');
    updateShared('entry', '');
    updateShared('stopLoss', '');
    updateShared('tp1', '');
    setCustomShares('');
    setShareInputMode('calculated');
    setShowConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/30 p-5 rounded-xl shadow-lg relative overflow-hidden flex flex-col gap-4 glow-card-indigo transition-all duration-350">
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-indigo-800"></div>
      
      <div className="pl-2">
        <h3 className="font-extrabold text-indigo-600 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800/80 pb-2 flex items-center gap-1.5 text-base">
          <span>⚡ Quick Order Widget</span>
        </h3>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Sidebar Assistant</p>
      </div>

      {/* Symbol & Direction Toggle */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Symbol</label>
          <input 
            type="text" 
            value={symbol} 
            onChange={e => updateShared('symbol', e.target.value.toUpperCase())} 
            placeholder="AAPL"
            className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 uppercase" 
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Direction</label>
          <div className="grid grid-cols-2 border border-slate-200 dark:border-slate-800 rounded overflow-hidden h-[38px]">
            <button 
              onClick={() => setDirection('Long')}
              className={`text-xs font-bold transition-all cursor-pointer ${direction === 'Long' ? 'bg-emerald-600/90 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500'}`}
            >
              LONG
            </button>
            <button 
              onClick={() => setDirection('Short')}
              className={`text-xs font-bold transition-all cursor-pointer ${direction === 'Short' ? 'bg-rose-600/90 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500'}`}
            >
              SHORT
            </button>
          </div>
        </div>
      </div>

      {/* Entry, Stop Loss, Take Profit */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Entry ($)</label>
            <input 
              type="number" 
              value={entry} 
              onChange={e => updateShared('entry', e.target.value)} 
              placeholder="150"
              className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Stop Loss ($)</label>
            <input 
              type="number" 
              value={sl} 
              onChange={e => updateShared('stopLoss', e.target.value)} 
              placeholder="145"
              className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-rose-600 dark:text-rose-400 font-bold text-sm focus:outline-none focus:border-rose-500" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Take Profit ($)</label>
            <input 
              type="number" 
              value={tp} 
              onChange={e => updateShared('tp1', e.target.value)} 
              placeholder="165"
              className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        {/* Risk Input */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
            <span>Risk Capital Allocation ($)</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-normal">Level Min: ${currentRank?.risk1}</span>
          </div>
          <input 
            type="number" 
            value={riskAmount} 
            onChange={e => setRiskAmount(e.target.value)} 
            placeholder={currentRank?.risk1?.toString()}
            className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-rose-600 dark:text-rose-400 font-bold text-sm focus:outline-none focus:border-indigo-500" 
          />
        </div>
      </div>

      {/* Validation status info */}
      {!isDirectionValid && pEntry > 0 && pSl > 0 && (
        <div className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-2 rounded text-center">
          ⚠️ ทิศทางผิดพลาด: Stop Loss ไม่อยู่จุดที่ตัดขาดทุนได้จริง
        </div>
      )}

      {/* Output Panel */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-4 rounded-lg flex flex-col gap-3">
        <div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">
            <span>Shares to Purchase</span>
            <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-md shadow-inner">
              <button 
                onClick={() => setShareInputMode('calculated')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${shareInputMode === 'calculated' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >Auto</button>
              <button 
                onClick={() => setShareInputMode('custom')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${shareInputMode === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >Custom</button>
            </div>
          </div>
          {shareInputMode === 'calculated' ? (
            <div className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 select-all">{fractionalShares}</div>
          ) : (
            <input 
              type="number"
              value={customShares}
              onChange={(e) => setCustomShares(e.target.value)}
              placeholder={fractionalShares}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-indigo-500 w-full mt-1 placeholder-emerald-600/30 dark:placeholder-emerald-400/30"
            />
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800/60 pt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Buying Power Required:</span>
            <span className={`font-mono font-bold text-sm ${isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
              ${buyingPowerRequired}
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>Level Allocation Limit:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">${maxBudget.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({currentRank?.maxAlloc}%)</span>
          </div>
        </div>

        {/* Warning Indicator */}
        {isOverBudget && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-2 rounded text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-1 font-semibold leading-relaxed">
            <span className="animate-ping w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>วงเงินพอร์ตเกินลิมิตยศสูงสุด! ({currentRank?.maxAlloc}%)</span>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button 
        onClick={handleSave}
        className="bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] text-white font-extrabold py-3.5 rounded-lg transition-all shadow-md shadow-indigo-950/30 flex items-center justify-center gap-2 cursor-pointer mt-1 text-sm uppercase tracking-wide"
      >
        <span>📂 Log to Journal (Save Open)</span>
      </button>

      {/* Confirm Modal Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200 rounded-xl">
          <div className="bg-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-full mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">วงเงินพอร์ตเกินกำหนด!</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            การเทรดนี้ใช้งบประมาณ <strong className="text-rose-600 dark:text-rose-400">${buyingPowerRequired}</strong> ซึ่งเกินข้อกำหนดของยศสูงสุดที่ <strong className="text-emerald-650 dark:text-emerald-400">${maxBudget.toFixed(2)}</strong> คุณยังยืนยันที่จะบันทึกลง Journal หรือไม่?
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2.5 rounded-lg transition-all text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
            <button 
              onClick={performSave}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-lg transition-all text-xs shadow-lg shadow-rose-900/20 dark:shadow-rose-900/50 cursor-pointer"
            >
              ยืนยันการบันทึก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
