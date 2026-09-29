import React, { useState } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';

export default function HoldingsBoard() {
  const { positions, handleRecoup, handleAddTransaction } = useMoonbagStore();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  
  // Recoup State
  const [recoupConfirmPos, setRecoupConfirmPos] = useState(null);
  const [recoupPrice, setRecoupPrice] = useState('');
  const [recoupShares, setRecoupShares] = useState('');

  // Row Trade State
  const [tradePos, setTradePos] = useState(null);
  const [tradeType, setTradeType] = useState('BUY');
  const [tradeShares, setTradeShares] = useState('');
  const [tradePrice, setTradePrice] = useState('');

  const filteredPositions = positions.filter(p => p.status === activeTab);

  const openRecoupModal = (pos) => {
    let rShares = pos.remainingPrincipal / pos.currentPrice;
    if (rShares > pos.total_shares) rShares = pos.total_shares;
    rShares = parseFloat(rShares.toFixed(4)); // Limit to 4 decimal places for cleanliness
    
    setRecoupConfirmPos(pos);
    setRecoupPrice(pos.currentPrice);
    setRecoupShares(rShares);
  };

  const executeRecoup = async (e) => {
    e.preventDefault();
    if (!recoupConfirmPos || !recoupPrice || !recoupShares) return;
    try {
      await handleRecoup(recoupConfirmPos.id, parseFloat(recoupPrice), parseFloat(recoupShares));
      setRecoupConfirmPos(null);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openTradeModal = (pos, type) => {
    setTradePos(pos);
    setTradeType(type);
    setTradeShares(type === 'SELL' ? pos.total_shares : '');
    setTradePrice(pos.currentPrice);
  };

  const executeTrade = async (e) => {
    e.preventDefault();
    if (!tradePos || !tradeShares || !tradePrice) return;
    try {
      await handleAddTransaction(tradePos.ticker, tradeType, tradeShares, tradePrice, 'Row Action');
      setTradePos(null);
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
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200/50 dark:border-slate-700/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Avg Entry</th>
              <th className="px-4 py-3 text-right">Last Price</th>
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
                    <td className="px-4 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ${parseFloat(pos.currentPrice).toFixed(2)}
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
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {activeTab === 'ACTIVE' && (
                          <button 
                            onClick={() => openRecoupModal(pos)}
                            disabled={!isReadyForRecoup}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                              isReadyForRecoup 
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30' 
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isReadyForRecoup ? 'Recoup Capital' : 'Waiting (2x)'}
                          </button>
                        )}
                        {activeTab === 'MOONBAG' && (
                          <span className="text-emerald-500 text-[10px] font-black px-2">RISK FREE 🚀</span>
                        )}
                        {activeTab !== 'CLOSED' && (
                          <>
                            <button onClick={() => openTradeModal(pos, 'BUY')} className="px-2 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-[10px] font-black">BUY</button>
                            <button onClick={() => openTradeModal(pos, 'SELL')} className="px-2 py-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg text-[10px] font-black">SELL</button>
                          </>
                        )}
                      </div>
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
            
            <form onSubmit={executeRecoup} className="space-y-4 mb-6">
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Sell Price</label>
                 <input type="number" step="any" value={recoupPrice} onChange={e=>setRecoupPrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono dark:text-white" required />
               </div>
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Shares to Sell</label>
                 <input type="number" step="any" value={recoupShares} onChange={e=>setRecoupShares(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono dark:text-white text-rose-500" required />
               </div>
               <div className="flex justify-between text-xs font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                 <span>Capital Returned:</span>
                 <span className="font-mono text-emerald-500">+${(parseFloat(recoupShares || 0) * parseFloat(recoupPrice || 0)).toFixed(2)}</span>
               </div>
               
               <div className="flex gap-3 pt-4">
                 <button type="button" onClick={() => setRecoupConfirmPos(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                   Cancel
                 </button>
                 <button type="submit" className="flex-1 py-3 rounded-xl font-black text-white bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all">
                   Confirm
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Row Trade Modal */}
      {tradePos && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-[fade-in_0.2s_ease-out]">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{tradeType} {tradePos.ticker}</h3>
            
            <form onSubmit={executeTrade} className="space-y-4">
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Price</label>
                 <input type="number" step="any" value={tradePrice} onChange={e=>setTradePrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono dark:text-white" required />
               </div>
               <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Shares</label>
                 <input type="number" step="any" value={tradeShares} onChange={e=>setTradeShares(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono dark:text-white" required />
               </div>
               
               <div className="flex gap-3 pt-4">
                 <button type="button" onClick={() => setTradePos(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                   Cancel
                 </button>
                 <button type="submit" className={`flex-1 py-3 rounded-xl font-black text-white shadow-lg transition-all ${tradeType==='BUY'?'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30':'bg-rose-500 hover:bg-rose-400 shadow-rose-500/30'}`}>
                   Confirm {tradeType}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
