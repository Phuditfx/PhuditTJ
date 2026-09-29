import React, { useState } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';

export default function MoonbagHeader() {
  const { portfolios, selectedPortfolioId, setSelectedPortfolioId, positions } = useMoonbagStore();
  const [showAddCash, setShowAddCash] = useState(false);

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const cashAvailable = parseFloat(selectedPortfolio?.cash_balance || 0);
  const totalRecouped = parseFloat(selectedPortfolio?.total_recouped || 0);

  const positionsValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
  const totalPortfolioValue = cashAvailable + positionsValue;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/50 dark:border-slate-800/50 pb-6 mb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl filter drop-shadow-md">🚀</span>
          <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
            Moonbag Tracker
          </h2>
          <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black tracking-widest uppercase border border-emerald-500/20 shadow-sm backdrop-blur-sm">PRO</div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-4">Risk-Free Position Strategy</p>
        
        {/* Portfolio Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPortfolioId || ''}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer min-w-[200px] shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800"
          >
            {portfolios.length === 0 && <option value="">Loading...</option>}
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Executive Summary Bar */}
      <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl shadow-slate-200/20 dark:shadow-black/20 flex flex-col justify-center min-w-[160px]">
           <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Value</h3>
           <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
             ${totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
           </div>
        </div>

        <div className="bg-emerald-500/10 dark:bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 shadow-lg shadow-emerald-500/5 flex flex-col justify-center min-w-[160px] relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
           <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Cash Pool</h3>
           <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
             ${cashAvailable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
           </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl shadow-slate-200/20 dark:shadow-black/20 flex flex-col justify-center min-w-[160px]">
           <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Recouped</h3>
           <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
             ${totalRecouped.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
           </div>
        </div>
      </div>
    </div>
  );
}
