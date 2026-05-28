import React, { useMemo } from 'react';
import { RANK_SYSTEM } from '../db/journalDB';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

export default function Dashboard({ 
  accountBalance, 
  initialBalance,
  setInitialBalance,
  targetRR, 
  setTargetRR, 
  trades,
  currentRank 
}) {
  const { t } = useLanguage();
  const [localBalance, setLocalBalance] = React.useState(initialBalance);
  const [localRR, setLocalRR] = React.useState(targetRR);
  const [isBalanceSaved, setIsBalanceSaved] = React.useState(false);
  const [isRRSaved, setIsRRSaved] = React.useState(false);

  React.useEffect(() => {
    setLocalBalance(initialBalance);
  }, [initialBalance]);

  React.useEffect(() => {
    setLocalRR(targetRR);
  }, [targetRR]);

  const closedTrades = trades.filter(t => t.status === 'Closed');
  const totalClosed = closedTrades.length;
  const wins = closedTrades.filter(t => t.pnl > 0);
  const winRate = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;
  const netPnL = trades.reduce((acc, t) => acc + (t.status === 'Closed' ? t.pnl : 0), 0);
  const achievedRR = closedTrades.reduce((acc, t) => acc + (parseFloat(t.actualRR) || 0), 0);
  const rrProgress = targetRR > 0 ? Math.min((achievedRR / targetRR) * 100, 100) : 0;

  const nextRank = RANK_SYSTEM.find(r => r.level === currentRank.level + 1);
  const progressToNext = nextRank 
    ? Math.min((accountBalance / nextRank.minPort) * 100, 100) 
    : 100;

  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;

  const sortedTrades = [...closedTrades].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

  let totalEfficiency = 0;
  let efficiencyCount = 0;

  sortedTrades.forEach(t => {
    const pnl = parseFloat(t.pnl) || 0;
    if (pnl > 0) {
      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      if (currentConsecutiveWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecutiveWins;
      grossProfit += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < 0) {
      currentConsecutiveLosses++;
      currentConsecutiveWins = 0;
      if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses;
      grossLoss += Math.abs(pnl);
      if (pnl < largestLoss) largestLoss = pnl;
    }

    if (t.mfePrice && t.entryPrice) {
      const entry = parseFloat(t.entryPrice);
      const mfe = parseFloat(t.mfePrice);
      const shares = parseFloat(t.shares) || 1;
      const isLong = t.direction === 'Long';
      const mfePnL = isLong ? (mfe - entry) * shares : (entry - mfe) * shares;
      
      if (mfePnL > 0 && pnl > 0) {
        const eff = (pnl / mfePnL) * 100;
        totalEfficiency += Math.min(eff, 100);
        efficiencyCount++;
      } else if (mfePnL > 0 && pnl <= 0) {
        totalEfficiency += 0;
        efficiencyCount++;
      }
    }
  });

  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? Infinity : 0);
  const averageWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const lossesCount = sortedTrades.filter(t => (parseFloat(t.pnl) || 0) < 0).length;
  const averageLoss = lossesCount > 0 ? grossLoss / lossesCount : 0;
  const avgExitEfficiency = efficiencyCount > 0 ? (totalEfficiency / efficiencyCount) : 0;

  const longTrades = closedTrades.filter(t => t.direction === 'Long');
  const shortTrades = closedTrades.filter(t => t.direction === 'Short');
  const longWins = longTrades.filter(t => parseFloat(t.pnl) > 0).length;
  const shortWins = shortTrades.filter(t => parseFloat(t.pnl) > 0).length;
  const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
  const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

  const generateAiInsight = () => {
    if (closedTrades.length === 0) return t('dashboard.noData');
    const recentTrades = sortedTrades.slice(-10);
    const fomoTrades = recentTrades.filter(t => t.entryMood && t.entryMood.includes('FOMO'));
    if (fomoTrades.length >= 3) return t('dashboard.aiFomo');
    const goodPlanTrades = recentTrades.filter(t => t.planAdherenceScore === 100);
    if (goodPlanTrades.length >= Math.floor(recentTrades.length * 0.7)) return t('dashboard.aiPraise');
    if (avgExitEfficiency < 40 && efficiencyCount >= 3) return t('dashboard.aiExit');
    return t('dashboard.aiTip');
  };
  const aiInsightText = generateAiInsight();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const weeklyData = [{ name: 'W1', pnl: 0 }, { name: 'W2', pnl: 0 }, { name: 'W3', pnl: 0 }, { name: 'W4', pnl: 0 }];
  const monthlyMap = {};

  closedTrades.forEach(t => {
    if (!t.dateTime) return;
    const d = new Date(t.dateTime);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      const date = d.getDate();
      if (date <= 7) weeklyData[0].pnl += t.pnl;
      else if (date <= 14) weeklyData[1].pnl += t.pnl;
      else if (date <= 21) weeklyData[2].pnl += t.pnl;
      else weeklyData[3].pnl += t.pnl;
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mStr = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (!monthlyMap[mStr]) monthlyMap[mStr] = 0;
    monthlyMap[mStr] += t.pnl;
  });

  const monthlyData = Object.keys(monthlyMap).map(k => ({ name: k, pnl: monthlyMap[k] })).slice(-6);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="crypto-card p-5 relative overflow-hidden">
          <span className="text-xs text-brand-text-secondary uppercase tracking-wider block">{t('dashboard.accountBalance')}</span>
          <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white mt-2 block">${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <div className="flex justify-between items-center mt-3 text-xs pt-3 border-t border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-500">{t('dashboard.initialBalance')}:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono">$</span>
              <input 
                type="number" 
                value={localBalance} 
                onChange={(e) => {
                  setLocalBalance(e.target.value);
                  setIsBalanceSaved(false);
                }} 
                className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-1 text-right font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-[11px]"
              />
              <button
                onClick={() => {
                  const val = parseFloat(localBalance) || 0;
                  setInitialBalance(val);
                  setLocalBalance(val);
                  setIsBalanceSaved(true);
                  setTimeout(() => setIsBalanceSaved(false), 2000);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${isBalanceSaved ? 'bg-emerald-650 text-white shadow-sm' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'}`}
              >
                {isBalanceSaved ? '✓' : t('dashboard.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="crypto-card p-5 relative overflow-hidden">
          <span className="text-xs text-brand-text-secondary uppercase tracking-wider block">{t('dashboard.winRate')}</span>
          <span className="text-3xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-2 block">{winRate.toFixed(1)}%</span>
          <div className="flex justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60">
            <span>{t('dashboard.closedTrades')}: <strong className="text-slate-700 dark:text-slate-300 font-mono">{totalClosed}</strong></span>
            <span>{t('dashboard.wins')}: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{wins.length}</strong></span>
          </div>
        </div>

        <div className="crypto-card p-5 relative overflow-hidden">
          <span className="text-xs text-brand-text-secondary uppercase tracking-wider block">{t('dashboard.netPerformance')}</span>
          <span className={`text-3xl font-mono font-bold mt-2 block ${netPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
            {netPnL >= 0 ? '+' : '-'}${Math.abs(netPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="flex justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60">
            <span>{t('dashboard.activeTrades')}: <strong className="text-indigo-650 dark:text-indigo-400 font-mono">{trades.filter(t => t.status === 'Open').length}</strong></span>
            <span className={netPnL >= 0 ? 'text-emerald-600 dark:text-emerald-500/80' : 'text-rose-500/80'}>
              {netPnL >= 0 ? t('dashboard.growth') : t('dashboard.drawdown')}
            </span>
          </div>
        </div>

        <div className="crypto-card p-5 relative overflow-hidden">
          <span className="text-xs text-brand-text-secondary uppercase tracking-wider block">{t('dashboard.activeLevel')}</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 block">{currentRank.name}</span>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-450 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60">
            <span>{t('dashboard.level')} {currentRank.level}</span>
            <span className="text-slate-650 dark:text-slate-500 font-mono font-bold">{t('dashboard.riskLimit')}: ${currentRank.risk1}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="crypto-card p-6 flex flex-col justify-between lg:col-span-1">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-550 dark:text-slate-500 uppercase tracking-widest block">{t('dashboard.levelGamification')}</span>
                <h2 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{currentRank.name}</h2>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-mono font-bold text-amber-600 dark:text-amber-400 shadow-md">
                {t('dashboard.level')} {currentRank.level}
              </div>
            </div>
            
            <div className="mt-6 space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.riskLimit1')}:</span>
                <span className="font-mono font-bold text-rose-500 dark:text-rose-450">${currentRank.risk1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.maxRisk')}:</span>
                <span className="font-mono font-bold text-red-650 dark:text-red-500">${currentRank.maxRisk}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.budgetAllocation')}:</span>
                <span className="font-mono font-bold text-indigo-650 dark:text-indigo-400">{currentRank.maxAlloc}%</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            {nextRank ? (
              <div>
                <div className="flex justify-between text-xs text-slate-550 dark:text-slate-500 mb-2 font-semibold">
                  <span>{t('dashboard.progressTo')} {nextRank.name}</span>
                  <span className="font-mono">{progressToNext.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-700"
                    style={{ width: `${progressToNext}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-550 dark:text-slate-500 mt-2 text-center">
                  {t('dashboard.minPortNeeded')} <strong className="text-slate-700 dark:text-slate-400 font-mono">${nextRank.minPort.toLocaleString()}</strong>
                </p>
              </div>
            ) : (
              <div className="text-center text-xs text-emerald-655 dark:text-emerald-400 font-bold py-2 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-900/50 rounded-lg">
                👑 {t('dashboard.immortal')}
              </div>
            )}
          </div>
        </div>

        <div className="crypto-card p-6 flex flex-col justify-between lg:col-span-2 relative overflow-hidden">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🎯 {t('dashboard.monthlyRRTarget')}</span>
                </h3>
                <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">{t('dashboard.rrTrackerDesc')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase text-slate-550 dark:text-slate-500 tracking-wider font-semibold">{t('dashboard.achievedRR')}</div>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {achievedRR.toFixed(4)}
                  </div>
                </div>
                <div className="text-slate-400 dark:text-slate-600 text-2xl">/</div>
                <div className="text-left">
                  <div className="text-[10px] uppercase text-slate-550 dark:text-slate-500 tracking-wider font-semibold">{t('dashboard.targetRR')}</div>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      value={localRR} 
                      onChange={(e) => {
                        setLocalRR(e.target.value);
                        setIsRRSaved(false);
                      }} 
                      className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1 font-mono font-bold text-xl text-center text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => {
                        const val = parseFloat(localRR) || 0;
                        setTargetRR(val);
                        setLocalRR(val);
                        setIsRRSaved(true);
                        setTimeout(() => setIsRRSaved(false), 2000);
                      }}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${isRRSaved ? 'bg-emerald-650 text-white shadow-sm font-sans' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-sans'}`}
                    >
                      {isRRSaved ? '✓' : t('dashboard.save')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-950 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-1000"
                style={{ width: `${rrProgress}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-between px-6 text-xs font-bold text-white drop-shadow-md">
                <span>{rrProgress.toFixed(1)}% {t('dashboard.completed')}</span>
                <span className="font-mono">{t('dashboard.remaining')}: {(Math.max(0, targetRR - achievedRR)).toFixed(4)} RR</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800/60">
              <span className="text-[11px] text-slate-500 block font-semibold">{t('dashboard.planAdherence')}</span>
              <span className="text-lg font-mono font-bold text-indigo-650 dark:text-indigo-400">
                {(closedTrades.reduce((acc, t) => acc + (t.planAdherenceScore || 0), 0) / (totalClosed || 1)).toFixed(0)}%
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800/60">
              <span className="text-[11px] text-slate-500 block font-semibold">{t('dashboard.avgRR')}</span>
              <span className={`text-lg font-mono font-bold ${achievedRR / (totalClosed || 1) >= 0 ? 'text-emerald-650 dark:text-emerald-400' : 'text-rose-500'}`}>
                {(achievedRR / (totalClosed || 1)).toFixed(4)} RR
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800/60 flex items-center justify-center">
              <div className="text-xs font-bold">
                {rrProgress >= 100 ? (
                  <span className="text-emerald-650 dark:text-emerald-400 animate-pulse">🏆 {t('dashboard.targetReached')}</span>
                ) : rrProgress >= 50 ? (
                  <span className="text-indigo-650 dark:text-indigo-400">🔥 {t('dashboard.halfway')}</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">🎯 {t('dashboard.keepGoing')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.profitFactor')}</span>
          <span className="text-xl font-mono font-bold text-sky-500 mt-2 block">{profitFactor === Infinity ? 'MAX' : profitFactor.toFixed(2)}</span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.avgWin')}</span>
          <span className="text-xl font-mono font-bold text-emerald-500 mt-2 block">${averageWin.toFixed(2)}</span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.avgLoss')}</span>
          <span className="text-xl font-mono font-bold text-rose-500 mt-2 block">-${averageLoss.toFixed(2)}</span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.largestWin')}</span>
          <span className="text-xl font-mono font-bold text-emerald-500 mt-2 block">${largestWin.toFixed(2)}</span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.largestLoss')}</span>
          <span className="text-xl font-mono font-bold text-rose-500 mt-2 block">-${Math.abs(largestLoss).toFixed(2)}</span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.streaks')}</span>
          <span className="text-xl font-mono font-bold mt-2 block">
            <span className="text-emerald-500">{maxConsecutiveWins}W</span> <span className="text-slate-500">/</span> <span className="text-rose-500">{maxConsecutiveLosses}L</span>
          </span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.exitEfficiency')}</span>
          <span className={`text-xl font-mono font-bold mt-2 block ${avgExitEfficiency >= 80 ? 'text-emerald-500' : (avgExitEfficiency >= 50 ? 'text-amber-500' : 'text-rose-500')}`}>
            {avgExitEfficiency > 0 ? `${avgExitEfficiency.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{t('dashboard.winRateLS')}</span>
          <div className="flex flex-col mt-2">
            <span className="text-xs font-mono font-bold text-emerald-500">{t('dashboard.long')}: {longWinRate.toFixed(0)}% ({longWins}/{longTrades.length})</span>
            <span className="text-xs font-mono font-bold text-rose-500">{t('dashboard.short')}: {shortWinRate.toFixed(0)}% ({shortWins}/{shortTrades.length})</span>
          </div>
        </div>
        <div className="crypto-card p-4 relative overflow-hidden flex flex-col justify-between lg:col-span-3">
          <span className="text-[10px] text-indigo-500 uppercase font-black tracking-wider block flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
            AI Behavioral Insights
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium leading-relaxed bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
            {aiInsightText}
          </p>
        </div>
      </div>

      {/* 📈 Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Chart */}
        <div className="crypto-card p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">📅 Weekly Performance (This Month)</h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">ผลกำไรสุทธิแยกตามสัปดาห์ (1-4) ประจำเดือนนี้</p>
          <div className="h-48 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
                <Tooltip 
                  cursor={{fill: '#1e293b', opacity: 0.15}}
                  contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                  itemStyle={{fontWeight: 'bold', color: '#ffffff'}}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'PnL']}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="crypto-card p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">📊 Monthly Performance</h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">สรุปผลกำไรสุทธิรายเดือน (สูงสุด 6 เดือนย้อนหลัง)</p>
          <div className="h-48 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
                <Tooltip 
                  cursor={{fill: '#1e293b', opacity: 0.15}}
                  contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                  itemStyle={{fontWeight: 'bold', color: '#ffffff'}}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'PnL']}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🪜 Level Rank Ladder Section (Spacious Comparison Table) */}
      <div className="crypto-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🪜 Level Rank System Ladder</span>
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">ตารางสิทธิ์การจำกัดความเสี่ยงและวงเงินสะสมอิงตามระดับยอดเงินทุนพอร์ต</p>
          </div>
          <div className="flex gap-4 text-xs font-bold font-sans">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span> Active (ยศปัจจุบัน)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-450"></span> Unlocked (ปลดล็อกแล้ว)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-700"></span> Locked (ยังไม่ปลดล็อก)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 text-[11px] font-black uppercase text-slate-550 dark:text-slate-400 tracking-wider">
                <th className="px-5 py-4">Level</th>
                <th className="px-5 py-4">Rank Name</th>
                <th className="px-5 py-4 font-mono">Min Port Balance</th>
                <th className="px-5 py-4 font-mono">Risk Limit (1%)</th>
                <th className="px-5 py-4 font-mono">Max Risk Limit</th>
                <th className="px-5 py-4 font-mono">Max Alloc %</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {RANK_SYSTEM.map((rank) => {
                const isCurrent = rank.level === currentRank.level;
                const isUnlocked = accountBalance >= rank.minPort;

                return (
                  <tr 
                    key={rank.level}
                    className={`transition-colors text-xs font-medium ${
                      isCurrent 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 font-bold border-l-4 border-indigo-600 dark:border-indigo-400' 
                        : isUnlocked 
                          ? 'bg-emerald-500/[0.02] dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-850/40' 
                          : 'bg-slate-100/10 dark:bg-slate-950/5 text-slate-400 dark:text-slate-550'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black font-mono ${
                        isCurrent 
                          ? 'bg-indigo-600 text-white shadow' 
                          : isUnlocked 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        LV.{rank.level}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold">
                      <span className={isCurrent ? 'text-amber-605 dark:text-amber-400 font-extrabold' : isUnlocked ? 'text-slate-850 dark:text-slate-200' : 'text-slate-400 dark:text-slate-550'}>
                        {rank.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      ${rank.minPort.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-rose-600 dark:text-rose-450 font-bold">
                      ${rank.risk1}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-red-500 dark:text-red-400 font-bold">
                      ${rank.maxRisk}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-indigo-600 dark:text-indigo-455 font-bold">
                      {rank.maxAlloc}%
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 dark:bg-indigo-400 text-white text-[9px] uppercase tracking-wider font-extrabold shadow">
                          ⚡ ACTIVE
                        </span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-650 dark:text-emerald-450 text-[9px] uppercase tracking-wider font-bold border border-emerald-500/20">
                          ✓ UNLOCKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider font-bold border border-slate-200 dark:border-slate-800">
                          🔒 LOCKED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
