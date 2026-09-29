import React, { useState } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';

export default function HoldingsBoard() {
  const { positions, setManualPrice, handleRecoup } = useMoonbagStore();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [recoupConfirmPos, setRecoupConfirmPos] = useState(null);

  const filteredPositions = positions.filter(p => p.status === activeTab);

  const executeRecoup = async () => {
    if (!recoupConfirmPos) return;
    try {
      await handleRecoup(recoupConfirmPos.id, recoupConfirmPos.currentPrice);
      setRecoupConfirmPos(null);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-black/20 overflow-hidden flex flex-col min-h-[500px]">
      
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200/50 dark:border-slate-700/50 p-2 gap-2 bg-slate-50/50 dark:bg-slate-800/50">
        {['ACTIVE', 'MOONBAG', 'CLOSED'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'MOONBAG' ? '🚀 ' : ''}{tab}
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-900/50 text-[10px]">
              {positions.filter(p => p.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto p-4 flex-1">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200/50 dark:border-slate-700/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Avg Entry</th>
              <th className="px-4 py-3 text-right">Live Price</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">{activeTab === 'MOONBAG' ? 'Total Return' : 'Unrealized PnL'}</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredPositions.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-400 font-bold">No {activeTab} positions found.</td></tr>
            ) : (
              filteredPositions.map(pos => {
                const isReadyForRecoup = pos.isRecoupEligible;
                const pnl = pos.currentValue - pos.remainingPrincipal;
                const pnlPct = pos.remainingPrincipal > 0 ? (pnl / pos.remainingPrincipal) * 100 : 0;
                
                return (
                  <tr key={pos.id} className={`transition-colors text-sm hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isReadyForRecoup ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                    <td className="px-4 py-4 font-black text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {pos.ticker}
                        {isReadyForRecoup && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {parseFloat(pos.total_shares).toLocaleString(undefined, {maximumFractionDigits: 4})}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-500">
                      ${parseFloat(pos.average_cost).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {/* Inline Editable Price */}
                      <input 
                        type="number" step="any"
                        value={pos.currentPrice || ''}
                        onChange={(e) => setManualPrice(pos.ticker, e.target.value)}
                        className="w-24 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ${pos.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td className={`px-4 py-4 text-right font-mono font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {activeTab === 'MOONBAG' ? (
                        <div>PURE PROFIT</div>
                      ) : (
                        <>
                          <div>{pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                          <div className="text-[10px] bg-slate-100 dark:bg-slate-800 inline-block px-1.5 rounded">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {activeTab === 'ACTIVE' && (
                        <button 
                          onClick={() => setRecoupConfirmPos(pos)}
                          disabled={!isReadyForRecoup}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${
                            isReadyForRecoup 
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30' 
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isReadyForRecoup ? 'Recoup Capital' : 'Waiting (2x)'}
                        </button>
                      )}
                      {activeTab === 'MOONBAG' && (
                        <span className="text-emerald-500 text-xs font-black">RISK FREE 🚀</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Recoup Confirmation Modal */}
      {recoupConfirmPos && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-[fade-in_0.2s_ease-out]">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Execute Recoup</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Convert <strong className="text-emerald-500">{recoupConfirmPos.ticker}</strong> into a risk-free Moonbag.
            </p>
            
            <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
               <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                 <span>Current Price:</span>
                 <span className="font-mono">${recoupConfirmPos.currentPrice.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                 <span>Shares to Sell:</span>
                 <span className="font-mono text-rose-500">-{Math.ceil(recoupConfirmPos.remainingPrincipal / recoupConfirmPos.currentPrice)}</span>
               </div>
               <div className="flex justify-between text-xs font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                 <span>Capital Returned:</span>
                 <span className="font-mono text-emerald-500">+${(Math.ceil(recoupConfirmPos.remainingPrincipal / recoupConfirmPos.currentPrice) * recoupConfirmPos.currentPrice).toFixed(2)}</span>
               </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRecoupConfirmPos(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={executeRecoup} className="flex-1 py-3 rounded-xl font-black text-white bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
