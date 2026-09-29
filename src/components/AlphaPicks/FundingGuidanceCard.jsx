import React from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';

export default function FundingGuidanceCard() {
  const { portfolios, selectedPortfolioId } = useMoonbagStore();
  
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const cashAvailable = parseFloat(selectedPortfolio?.cash_balance || 0);
  const monthlyBudget = parseFloat(selectedPortfolio?.monthly_budget || 1000); // Default to 1000 if not set
  
  const progressPct = Math.min(100, (cashAvailable / monthlyBudget) * 100);
  const isFunded = cashAvailable >= monthlyBudget;

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 mb-6 relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        
        {/* Funding Status */}
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span>🎯</span> Next Month Funding Guidance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Monthly Budget: ${monthlyBudget.toLocaleString()}</p>
            </div>
            <div className={`text-sm font-black ${isFunded ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isFunded ? 'Ready for Picks' : 'Needs Funding'}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ease-out relative ${isFunded ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
              style={{ width: `${progressPct}%` }}
            >
               {/* Shimmer effect */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
            <span>$0</span>
            <span>${cashAvailable.toLocaleString(undefined, {maximumFractionDigits:0})} / ${monthlyBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* Smart Allocation Suggestion (Mockup data based on cash) */}
        <div className="w-full md:w-1/3 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50">
           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Smart Allocation</h4>
           <div className="space-y-3">
             <div>
               <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                 <span>Recouped Reinvestment</span>
                 <span className="text-emerald-500">40%</span>
               </div>
               <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 w-[40%]"></div>
               </div>
             </div>
             <div>
               <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                 <span>New Fresh Capital</span>
                 <span className="text-blue-500">60%</span>
               </div>
               <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[60%]"></div>
               </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
