import React, { useState, useEffect } from 'react';
import { useMoonbagStore } from '../hooks/useMoonbagStore';
import MoonbagHeader from './AlphaPicks/MoonbagHeader';
import FundingGuidanceCard from './AlphaPicks/FundingGuidanceCard';
import NewPickForm from './AlphaPicks/NewPickForm';
import HoldingsBoard from './AlphaPicks/HoldingsBoard';
import PortfolioRebalancer from './PortfolioRebalancer';

export default function AlphaPickPlanner({ userEmail, isVip, requestAlert, requestConfirm, initialSubTab = 'portfolio' }) {
  const { setUserEmail, loading, selectedPortfolioId, setSelectedPortfolioId } = useMoonbagStore();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  useEffect(() => {
    if (userEmail) {
      setUserEmail(userEmail);
    }
  }, [userEmail, setUserEmail]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  if (!isVip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center blur-md opacity-60 select-none pointer-events-none">
        <h2 className="text-2xl font-black">VIP Feature Locked</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto pb-10 px-2 sm:px-0">
      
      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-[#0B1121] transition-colors"></div>
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 via-emerald-500/5 to-transparent -z-10 pointer-events-none"></div>
      
      {/* Top Navigation & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <img src="/alphapicks.png" alt="Alpha Picks" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/25 filter drop-shadow-sm flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                Alpha Picks Inv.
              </h1>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-black tracking-widest uppercase backdrop-blur-sm">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              Long-Term Investment & Portfolio Rebalancing Engine
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Buttons */}
        <div className="flex p-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 shadow-lg shadow-slate-200/10 dark:shadow-black/20 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeSubTab === 'portfolio'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <img src="/alphapicks.png" alt="Alpha Picks" className="w-4 h-4 rounded object-cover inline-block" />
            <span>พอร์ตลงทุน & Moonbag</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rebalancer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeSubTab === 'rebalancer'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>⚖️</span>
            <span>Portfolio Rebalancer</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Holdings & Moonbag */}
      {activeSubTab === 'portfolio' && (
        <div className="flex flex-col gap-2 animate-fade-in">
          <MoonbagHeader />
          <FundingGuidanceCard />
          <NewPickForm />
          <HoldingsBoard isLoading={loading} />
        </div>
      )}

      {/* Tab 2: Portfolio Rebalancer */}
      {activeSubTab === 'rebalancer' && (
        <div className="animate-fade-in">
          <PortfolioRebalancer 
            currentUser={userEmail} 
            requestAlert={requestAlert}
            initialPortfolioId={selectedPortfolioId}
            onPortfolioChange={(id) => setSelectedPortfolioId(id)}
          />
        </div>
      )}
      
    </div>
  );
}
