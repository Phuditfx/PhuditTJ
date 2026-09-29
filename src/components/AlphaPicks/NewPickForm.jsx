import React, { useState } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';

export default function NewPickForm() {
  const { handleAddTransaction } = useMoonbagStore();
  const [isOpen, setIsOpen] = useState(false);
  
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('BUY');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !price) return;
    try {
      await handleAddTransaction(ticker, type, shares, price, 'Manual Entry');
      setTicker(''); setShares(''); setPrice('');
      setIsOpen(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="mb-6 px-6 py-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-sm font-black text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
      >
        <span>➕</span> ADD NEW TRANSACTION
      </button>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 mb-6 animate-[fade-in_0.2s_ease-out]">
      <div className="flex justify-between items-center mb-4">
         <h3 className="text-lg font-black text-slate-900 dark:text-white">Record Transaction</h3>
         <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-rose-500">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-32">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ticker</label>
          <input type="text" value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. AAPL" required />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Shares</label>
          <input type="number" step="any" value={shares} onChange={e=>setShares(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0.00" required />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Price ($)</label>
          <input type="number" step="any" value={price} onChange={e=>setPrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0.00" required />
        </div>
        <button type="submit" className={`w-full md:w-auto px-8 py-3 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 ${type==='BUY'?'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30':'bg-rose-500 hover:bg-rose-400 shadow-rose-500/30'}`}>
          EXECUTE
        </button>
      </form>
    </div>
  );
}
