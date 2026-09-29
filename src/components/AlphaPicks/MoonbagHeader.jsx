import React, { useState } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';

export default function MoonbagHeader() {
  const { portfolios, selectedPortfolioId, setSelectedPortfolioId, positions, createPortfolio, editPortfolio, deletePortfolio, addCash } = useMoonbagStore();
  const [showAddCash, setShowAddCash] = useState(false);
  const [showNewPort, setShowNewPort] = useState(false);
  const [showEditPort, setShowEditPort] = useState(false);
  
  const [newPortName, setNewPortName] = useState('');
  const [editPortName, setEditPortName] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const cashAvailable = parseFloat(selectedPortfolio?.cash_balance || 0);
  const totalRecouped = parseFloat(selectedPortfolio?.total_recouped || 0);

  const positionsValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
  const totalPortfolioValue = cashAvailable + positionsValue;

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    if (!newPortName.trim()) return;
    await createPortfolio(newPortName);
    setNewPortName('');
    setShowNewPort(false);
  };

  const handleEditPortfolio = async (e) => {
    e.preventDefault();
    if (!editPortName.trim() || !selectedPortfolioId) return;
    await editPortfolio(selectedPortfolioId, editPortName);
    setEditPortName('');
    setShowEditPort(false);
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolioId) return;
    if (confirm("Are you sure you want to delete this portfolio? This cannot be undone.")) {
      await deletePortfolio(selectedPortfolioId);
    }
  };

  const handleAddCash = async (e) => {
    e.preventDefault();
    if (!cashAmount || isNaN(cashAmount)) return;
    await addCash(parseFloat(cashAmount));
    setCashAmount('');
    setShowAddCash(false);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/50 dark:border-slate-800/50 pb-6 mb-6 relative">
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
          <button onClick={() => setShowNewPort(true)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-xl transition-colors" title="Create Portfolio">
            ➕
          </button>
          {selectedPortfolioId && (
            <>
              <button onClick={() => setShowEditPort(true)} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-xl transition-colors" title="Edit Portfolio">
                ✏️
              </button>
              <button onClick={handleDeletePortfolio} className="p-2 bg-rose-100 text-rose-500 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-xl transition-colors" title="Delete Portfolio">
                🗑️
              </button>
            </>
          )}
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
           <div className="flex justify-between items-center mb-1">
             <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Cash Pool</h3>
             <button onClick={() => setShowAddCash(true)} className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-bold shadow-sm hover:bg-emerald-400 z-10 relative">ADD</button>
           </div>
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

      {/* Modals */}
      {showNewPort && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-black mb-4 dark:text-white">Create New Portfolio</h3>
            <form onSubmit={handleCreatePortfolio}>
              <input type="text" value={newPortName} onChange={e=>setNewPortName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 font-bold dark:text-white" placeholder="Portfolio Name..." autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewPort(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-black bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditPort && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-black mb-4 dark:text-white">Edit Portfolio Name</h3>
            <form onSubmit={handleEditPortfolio}>
              <input type="text" value={editPortName} onChange={e=>setEditPortName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 font-bold dark:text-white" placeholder="New Portfolio Name..." autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowEditPort(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-black bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCash && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-black mb-4 dark:text-white text-emerald-500">Add Cash to Pool</h3>
            <form onSubmit={handleAddCash}>
              <input type="number" step="any" value={cashAmount} onChange={e=>setCashAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 font-mono font-bold dark:text-white" placeholder="0.00" autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddCash(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">Deposit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
