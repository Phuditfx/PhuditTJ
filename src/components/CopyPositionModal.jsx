import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function CopyPositionModal({ 
  trade, 
  accounts = [], 
  initialBalances = {}, 
  globalTrades = [], 
  onClose, 
  onCopy 
}) {
  const [targetAccountId, setTargetAccountId] = useState('default');
  const [sizingMode, setSizingMode] = useState('Risk($)'); // Budget, Risk($), Risk(%)
  const [inputValue, setInputValue] = useState('');
  
  const [calculatedShares, setCalculatedShares] = useState(0);
  const [requiredBudget, setRequiredBudget] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default account selection on load (exclude current account if possible, or just default)
  useEffect(() => {
    if (accounts.length > 0) {
      const otherAccounts = accounts.filter(acc => acc.id !== trade.accountId);
      if (otherAccounts.length > 0) {
        setTargetAccountId(otherAccounts[0].id);
      } else {
        setTargetAccountId('default');
      }
    }
  }, [accounts, trade.accountId]);

  // Calculate target account balance
  const targetAccountBalance = React.useMemo(() => {
    const initBal = parseFloat(initialBalances[targetAccountId]) || 0;
    const netPnL = globalTrades.reduce((acc, t) => {
      const tAcc = t.accountId || 'default';
      if (tAcc === targetAccountId && t.status === 'Closed') {
        return acc + (parseFloat(t.pnl) || 0);
      }
      return acc;
    }, 0);
    return initBal + netPnL;
  }, [targetAccountId, initialBalances, globalTrades]);

  // Calculate shares when inputs change
  useEffect(() => {
    let shares = 0;
    const pEntry = parseFloat(trade.entryPrice) || 0;
    const pStopLoss = parseFloat(trade.stopLoss) || 0;
    const pVal = parseFloat(inputValue) || 0;
    const gapDistance = Math.abs(pEntry - pStopLoss);

    setErrorMsg('');

    if (pEntry > 0 && pVal > 0) {
      if (sizingMode === 'Budget') {
        shares = Math.floor(pVal / pEntry);
      } else if (sizingMode === 'Risk($)' && gapDistance > 0) {
        shares = Math.floor(pVal / gapDistance);
      } else if (sizingMode === 'Risk(%)' && gapDistance > 0) {
        shares = Math.floor((targetAccountBalance * (pVal / 100)) / gapDistance);
      }

      if ((sizingMode === 'Risk($)' || sizingMode === 'Risk(%)') && gapDistance === 0) {
        setErrorMsg('กรุณาระบุ Stop Loss ในออเดอร์ต้นทางก่อนเพื่อคำนวณความเสี่ยง');
      }
    }

    setCalculatedShares(shares);
    setRequiredBudget(shares * pEntry);

  }, [sizingMode, inputValue, trade.entryPrice, trade.stopLoss, targetAccountBalance]);

  const handleCopy = () => {
    if (calculatedShares <= 0) {
      setErrorMsg('กรุณาระบุขนาด Size หรือความเสี่ยงที่มากกว่า 0');
      return;
    }
    if (requiredBudget > targetAccountBalance) {
      setErrorMsg('จำนวนเงินลงทุนเกินกว่ายอดพอร์ตปลายทาง');
      return;
    }

    const gap = Math.abs(trade.entryPrice - (trade.stopLoss || 0));
    const plannedRisk = calculatedShares * gap;

    const newTrade = {
      ...trade,
      id: uuidv4(),
      accountId: targetAccountId,
      status: 'Open',
      dateTime: new Date().toISOString(), // Copy at current time
      shares: calculatedShares,
      plannedRisk: plannedRisk > 0 ? plannedRisk : trade.plannedRisk,
      // Remove closing details
      exitDateTime: null,
      actualExitPrice: null,
      pnl: null,
      actualRR: null,
      aiScore: null,
      aiFeedback: null,
      contextScore: null,
      planAdherence: null,
      planAdherenceScore: null
    };

    onCopy(newTrade);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
            📋 Copy Position
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Trade Source Preview */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">{trade.symbol}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                trade.direction === 'Long' 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
              }`}>
                {trade.direction}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Entry</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-300">${parseFloat(trade.entryPrice).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">SL</span>
                <span className="font-bold font-mono text-rose-500">${parseFloat(trade.stopLoss).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">TP</span>
                <span className="font-bold font-mono text-indigo-500">${parseFloat(trade.takeProfit).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Target Account Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Account (ปลายทาง)</label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="default">Default Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <div className="text-xs text-slate-500 mt-1 flex justify-between">
              <span>ยอดพอร์ตที่เลือก:</span>
              <span className="font-bold font-mono">${targetAccountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Sizing Mode Selection */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sizing Mode (รูปแบบการลงทุน)</label>
            <div className="grid grid-cols-3 gap-2">
              {['Budget', 'Risk($)', 'Risk(%)'].map(mode => (
                <button
                  key={mode}
                  onClick={() => { setSizingMode(mode); setInputValue(''); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                    sizingMode === mode 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Value Input */}
          <div className="flex flex-col gap-1.5 mt-2 relative">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ระบุ {sizingMode === 'Budget' ? 'งบลงทุน ($)' : sizingMode === 'Risk($)' ? 'ความเสี่ยงขาดทุน ($)' : 'ความเสี่ยงขาดทุน (%)'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={sizingMode === 'Budget' ? 'เช่น 1000' : sizingMode === 'Risk($)' ? 'เช่น 50' : 'เช่น 1'}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 pl-8 rounded-lg text-sm focus:outline-none focus:border-purple-500 font-mono font-bold"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                {sizingMode === 'Risk(%)' ? '%' : '$'}
              </span>
            </div>
          </div>

          {/* Calculation Result */}
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 p-3 rounded-xl mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-purple-600/70 dark:text-purple-400/70 uppercase block mb-1">Shares (จำนวนหุ้น)</span>
                <span className="font-mono font-black text-lg text-purple-700 dark:text-purple-400">{calculatedShares.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-600/70 dark:text-purple-400/70 uppercase block mb-1">Required Budget (ทุนที่ใช้)</span>
                <span className={`font-mono font-black text-lg ${requiredBudget > targetAccountBalance ? 'text-rose-500' : 'text-purple-700 dark:text-purple-400'}`}>
                  ${requiredBudget.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded border border-rose-200 dark:border-rose-500/20 text-center animate-shake">
              ⚠️ {errorMsg}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={onClose}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={calculatedShares <= 0 || requiredBudget > targetAccountBalance}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/30 flex items-center gap-2"
          >
            📋 Confirm Copy Position
          </button>
        </div>
      </div>
    </div>
  );
}
