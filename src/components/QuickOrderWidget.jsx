import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function QuickOrderWidget({ currentRank, accountBalance, onSaveTrade, sharedOrder, setSharedOrder, activeTab, plans = [], requestAlert, requestConfirm, currentUser }) {
  const { t } = useLanguage();
  const { symbol, tiEntryAlert, entry, stopLoss: sl, tp1: tp } = sharedOrder || {
    symbol: 'AAPL', tiEntryAlert: '', entry: '', stopLoss: '', tp1: ''
  };

  const updateShared = (key, value) => {
    if (setSharedOrder) setSharedOrder(prev => ({ ...prev, [key]: value }));
  };

  const [direction, setDirection] = useState('Long'); // Long or Short
  const [riskAmount, setRiskAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [shareInputMode, setShareInputMode] = useState('calculated'); // 'calculated' | 'custom'
  const [customShares, setCustomShares] = useState('');
  
  // AI/Analytics Fields
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedSetup, setSelectedSetup] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  
  // Forward Testing Fields
  const [entryWindow, setEntryWindow] = useState('');
  const [orderType, setOrderType] = useState('');
  const [exitScenario, setExitScenario] = useState('');
  
  // Image Upload Fields
  const [tradeImage, setTradeImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const SETUP_OPTIONS = ['Day Breakout', 'Pullback/Dip', 'Reversal', 'Trend Following', 'Range Trading'];
  const MOOD_OPTIONS = ['🧘‍♂️ Calm/Focused', '😬 FOMO/Chasing', '😡 Revenge Trading', '🥱 Bored/Overtrading', '🤩 Overconfident'];

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
  
  // คำนวณจำนวนหุ้นเป็นจำนวนเต็ม (ปัดเศษลง)
  const rawShares = activeTab === 'fighter' 
    ? (sharedOrder?.calculatedShares !== undefined ? sharedOrder.calculatedShares : 0)
    : (gap > 0 && pRisk > 0 ? (pRisk / gap) : 0);
  const fractionalShares = Math.floor(rawShares).toString();
  const actualShares = shareInputMode === 'calculated' ? parseInt(fractionalShares, 10) : (parseInt(customShares, 10) || 0);
  const buyingPowerRequired = (actualShares * pEntry).toFixed(2);

  // คำนวณวงเงินสูงสุดของยศในการเข้าเทรด
  const maxBudget = accountBalance * (currentRank.maxAlloc / 100);
  const isOverBudget = parseFloat(buyingPowerRequired) > maxBudget;

  const handleSave = () => {
    if (!symbol) {
      if (requestAlert) requestAlert("ข้อมูลไม่ครบ", "กรุณากรอก SYMBOL หุ้น");
      else alert("กรุณากรอก SYMBOL หุ้น");
      return;
    }
    if (pEntry <= 0 || pSl <= 0) {
      if (requestAlert) requestAlert("ข้อมูลไม่ครบ", "กรุณากรอก Entry Price และ Stop Loss ให้ถูกต้อง");
      else alert("กรุณากรอก Entry Price และ Stop Loss ให้ถูกต้อง");
      return;
    }
    if (!isDirectionValid) {
      if (requestAlert) {
        requestAlert("ข้อผิดพลาดของราคา", direction === 'Long' 
          ? "สำหรับหน้า Long: Entry Price ต้องมากกว่า Stop Loss" 
          : "สำหรับหน้า Short: Entry Price ต้องน้อยกว่า Stop Loss");
      } else {
        alert(direction === 'Long' 
          ? "สำหรับหน้า Long: Entry Price ต้องมากกว่า Stop Loss" 
          : "สำหรับหน้า Short: Entry Price ต้องน้อยกว่า Stop Loss");
      }
      return;
    }
    if (isOverBudget) {
      setShowConfirm(true);
      return;
    }
    if (actualShares <= 0) {
      if (requestAlert) requestAlert("ข้อผิดพลาด", "กรุณาระบุจำนวนหุ้นให้มากกว่า 0");
      else alert("กรุณาระบุจำนวนหุ้นให้มากกว่า 0");
      return;
    }

    performSave();
  };

  const performSave = async () => {
    // Upload image first if selected
    let imageUrl = null;
    if (tradeImage && currentUser) {
      setIsUploading(true);
      try {
        const { uploadTradeImage } = await import('../db/journalDB');
        imageUrl = await uploadTradeImage(tradeImage, currentUser);
      } catch (err) {
        if (requestAlert) requestAlert("Upload Failed", "อัปโหลดรูปภาพล้มเหลว: " + err.message);
        else alert("อัปโหลดรูปภาพล้มเหลว: " + err.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // สร้างข้อมูลบันทึกเข้าพอร์ต
    const tradeData = {
      symbol: symbol.toUpperCase(),
      direction,
      tiEntryAlert: parseFloat(tiEntryAlert) || 0,
      entryPrice: pEntry,
      stopLoss: pSl,
      takeProfit: parseFloat(tp) || 0,
      shares: actualShares,
      plannedRisk: activeTab === 'fighter' ? (sharedOrder?.actualRiskDollar || 0) : pRisk, // บันทึกเงิน Risk ของไม้แรกไว้ใช้อ้างอิง RR
      status: 'Open',
      contextScore: 5, // Default ค่อยแก้ตอนปิดดีล
      planAdherenceScore: 100, // Default ค่อยแก้ตอนปิดดีล
      planId: selectedPlan,
      setupName: selectedSetup,
      entryMood: selectedMood,
      imageUrl: imageUrl, // <--- Add image URL
      entryWindow,
      orderType,
      exitScenario
    };

    onSaveTrade(tradeData);
    
    // เคลียร์ค่าฟอร์มบางส่วนเพื่อความสะดวก
    updateShared('symbol', 'AAPL');
    updateShared('tiEntryAlert', '');
    updateShared('entry', '');
    updateShared('stopLoss', '');
    updateShared('tp1', '');
    setCustomShares('');
    setSelectedPlan('');
    setSelectedSetup('');
    setSelectedMood('');
    setEntryWindow('');
    setOrderType('');
    setExitScenario('');
    setTradeImage(null);
    setImagePreview(null);
    setShareInputMode('calculated');
    setShowConfirm(false);
  };

  return (
    <>
      <div className="crypto-card p-5 flex flex-col gap-4 transition-all duration-350 relative">
      
      <div className="pl-1">
        <h3 className="font-extrabold text-brand-primary dark:text-brand-primary border-b border-brand-border dark:border-slate-800/80 pb-2 flex items-center gap-1.5 text-base">
          <span>⚡ Quick Order Widget</span>
        </h3>
        <p className="text-[10px] text-brand-text-secondary mt-1 uppercase tracking-wider font-bold">Sidebar Assistant</p>
      </div>

      {/* Symbol & Direction Toggle */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Symbol</label>
          <input 
            type="text" 
            value={symbol} 
            onChange={e => updateShared('symbol', e.target.value.toUpperCase())} 
            onFocus={(e) => e.target.select()}
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
        {/* Row for TI Entry Alert (Full width or split) */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">TI Entry Alert ($) <span className="text-[9px] text-slate-500">(Day Breakout)</span></label>
          <input onFocus={(e) => e.target.select()}  
            type="number" 
            value={tiEntryAlert} 
            onChange={e => updateShared('tiEntryAlert', e.target.value)} 
            onFocus={(e) => e.target.select()}
            placeholder="152"
            className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900/50 font-mono text-amber-700 dark:text-amber-400 font-bold text-sm focus:outline-none focus:border-amber-500" 
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Entry ($)</label>
            <input onFocus={(e) => e.target.select()}  
              type="number" 
              value={entry} 
              onChange={e => updateShared('entry', e.target.value)} 
              onFocus={(e) => e.target.select()}
              placeholder="150"
              className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Stop Loss ($)</label>
            <input onFocus={(e) => e.target.select()}  
              type="number" 
              value={sl} 
              onChange={e => updateShared('stopLoss', e.target.value)} 
              onFocus={(e) => e.target.select()}
              placeholder="145"
              className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-rose-600 dark:text-rose-400 font-bold text-sm focus:outline-none focus:border-rose-500" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Take Profit ($)</label>
            <input onFocus={(e) => e.target.select()}  
              type="number" 
              value={tp} 
              onChange={e => updateShared('tp1', e.target.value)} 
              onFocus={(e) => e.target.select()}
              placeholder="165"
              className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        {/* Risk Input */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
            <span>Risk Capital Allocation ($)</span>
            {activeTab === 'fighter' ? (
              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">Synced with Fighter</span>
            ) : (
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-normal">Level Min: ${currentRank?.risk1}</span>
            )}
          </div>
          <input 
            type={activeTab === 'fighter' ? "text" : "number"} 
            value={activeTab === 'fighter' ? (sharedOrder?.actualRiskDollar !== undefined ? `$${sharedOrder.actualRiskDollar.toFixed(2)}` : 'Synced') : riskAmount} 
            onChange={e => setRiskAmount(e.target.value)} 
            onFocus={(e) => { if(activeTab !== 'fighter') e.target.select() }}
            disabled={activeTab === 'fighter'}
            placeholder={currentRank?.risk1?.toString()}
            className={`font-mono text-rose-600 dark:text-rose-400 font-bold text-sm focus:outline-none focus:border-indigo-500 p-2.5 rounded border ${
              activeTab === 'fighter' 
                ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-300 dark:border-slate-850 cursor-not-allowed opacity-80' 
                : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800'
            }`} 
          />
        </div>
      </div>

      {/* Forward Testing Fields */}
      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Forward Test: Gap-Up Strategy</div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-slate-500 dark:text-slate-450 font-bold uppercase">Entry Window</label>
          <select value={entryWindow} onChange={(e) => setEntryWindow(e.target.value)} className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500">
            <option value="">-- Select --</option>
            <option value="RTH+Pre/Post-Mkt 4:00-20:00 ET">RTH+Pre/Post-Mkt 4:00-20:00 ET</option>
            <option value="Regular trading Hours 9:30-16:00 ET">Regular trading Hours 9:30-16:00 ET</option>
            <option value="Overnight Trading 20:00-4:00 (T+1) ET">Overnight Trading 20:00-4:00 (T+1) ET</option>
            <option value="24 Hours Trading 20:00-20:00 (T+1) ET">24 Hours Trading 20:00-20:00 (T+1) ET</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-slate-500 dark:text-slate-450 font-bold uppercase">Order Type</label>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500">
              <option value="">-- Select --</option>
              <option value="LMT Limit">LMT Limit</option>
              <option value="MKT Market">MKT Market</option>
              <option value="MOC Market On Close">MOC Market On Close</option>
              <option value="STL Stop Limit">STL Stop Limit</option>
              <option value="STP Stop">STP Stop</option>
              <option value="LIT Lmt-if-Touched">LIT Lmt-if-Touched</option>
              <option value="MIT Mkt-if-Touched">MIT Mkt-if-Touched</option>
              <option value="TSL Trailing Stop Lmt">TSL Trailing Stop Lmt</option>
              <option value="TS Trailing Stop">TS Trailing Stop</option>
              <option value="OCO One-Cancels-the-Other (Take Profit/Stop Loss)">OCO One-Cancels-the-Other (Take Profit/Stop Loss)</option>
              <option value="TWAP TWAP">TWAP TWAP</option>
              <option value="VWAP VWAP">VWAP VWAP</option>
              <option value="POV POV">POV POV</option>
              <option value="ICE Iceberg">ICE Iceberg</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-slate-500 dark:text-slate-450 font-bold uppercase">Exit Scenario</label>
            <select value={exitScenario} onChange={(e) => setExitScenario(e.target.value)} className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500">
              <option value="">-- Select --</option>
              <option value="Gap Up TP">Gap Up TP</option>
              <option value="Gap Down SL">Gap Down SL</option>
              <option value="Survivor (Flat/Bounce)">Survivor (Flat/Bounce)</option>
              <option value="Time Cut">Time Cut</option>
              <option value="Hit TP">Hit TP</option>
              <option value="Hit SL">Hit SL</option>
            </select>
          </div>
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
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${shareInputMode === 'calculated' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >Auto</button>
              <button 
                onClick={() => setShareInputMode('custom')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${shareInputMode === 'custom' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >Custom</button>
            </div>
          </div>
          {shareInputMode === 'calculated' ? (
            <div className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 select-all">{fractionalShares}</div>
          ) : (
            <input 
              type="number"
              value={customShares}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setCustomShares(val);
              }}
              onFocus={(e) => e.target.select()}
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

      {/* Original Save Button (Inside normal flow) */}
      <div className="mt-2">
        <button 
          onClick={handleSave}
          className="w-full bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-white font-extrabold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wide"
        >
          <span>📂 Log to Journal (Save Open)</span>
        </button>
      </div>

      {/* Confirm Modal Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200 rounded-xl">
          <div className="bg-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-full mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">⚠️ วงเงินพอร์ตเกินกำหนด!</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {t('quickOrder.confirmBudget')} (Limit: ${maxBudget.toFixed(2)})
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2.5 rounded-lg transition-all text-xs cursor-pointer"
            >
              {t('quickOrder.cancel')}
            </button>
            <button 
              onClick={performSave}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-lg transition-all text-xs shadow-lg shadow-rose-900/20 dark:shadow-rose-900/50 cursor-pointer"
            >
              {t('quickOrder.confirm')}
            </button>
          </div>

          {/* AI Analytics Integration Fields */}
          <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 w-full text-left">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              {t('quickOrder.aiContext')} <span className="text-amber-500">{t('quickOrder.optional')}</span>
            </span>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">{t('quickOrder.tradingPlan')}</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">{t('quickOrder.noPlan')}</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">{t('quickOrder.setup')}</label>
                <select
                  value={selectedSetup}
                  onChange={(e) => setSelectedSetup(e.target.value)}
                  className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">{t('quickOrder.selectSetup')}</option>
                  {SETUP_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">{t('quickOrder.mood')}</label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">{t('quickOrder.selectMood')}</option>
                  {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            
            {/* Image Upload in Confirm Modal */}
            <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
               <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">{t('quickOrder.attachImage') || 'Attach Chart Image'} <span className="text-amber-500">(Optional)</span></label>
               <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                     const file = e.target.files[0];
                     if (file) {
                        setTradeImage(file);
                        setImagePreview(URL.createObjectURL(file));
                     }
                  }}
                  className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500 w-full file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
               />
               {imagePreview && (
                 <div className="mt-2 relative inline-block rounded overflow-hidden border border-slate-200 dark:border-slate-700 w-full h-32 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                    <button 
                       onClick={() => { setTradeImage(null); setImagePreview(null); }}
                       className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 cursor-pointer text-xs"
                    >
                       ✕
                    </button>
                 </div>
               )}
            </div>

          </div>

          <button onClick={performSave} disabled={isUploading} className={`w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white p-3 rounded-lg font-black text-sm shadow-md shadow-emerald-950/20 active:scale-95 transition-all ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {isUploading ? 'Uploading & Saving...' : '🎯 บันทึกไม้เทรดเข้าพอร์ต (Save Trade)'}
          </button>
        </div>
      )}
    </div>

    {/* 🔥 Floating Action Button (FAB) สำหรับกดบันทึกได้ทุกที่ (แสดงเฉพาะหน้า Fighter) */}
    {activeTab === 'fighter' && (
      <button
        onClick={handleSave}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-full p-4 shadow-[0_8px_30px_rgba(0,82,255,0.4)] flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20 dark:border-white/10 group"
        title="Save Trade"
      >
        <span className="text-xl">💾</span>
        <span className="font-extrabold text-sm uppercase tracking-wider hidden md:block group-hover:block px-2">Log to Journal</span>
      </button>
    )}
    </>
  );
}
