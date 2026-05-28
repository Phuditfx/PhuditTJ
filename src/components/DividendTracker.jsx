import React, { useState, useMemo } from 'react';

export default function DividendTracker({ dividends = [], onSaveDividend, onDeleteDividend }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [exDate, setExDate] = useState('');
  const [payDate, setPayDate] = useState('');
  const [amount, setAmount] = useState('');

  const handleSave = () => {
    if (!symbol.trim() || !amount) return;
    onSaveDividend({
      id: 'div-' + Date.now(),
      symbol: symbol.toUpperCase(),
      exDate,
      payDate,
      amount: parseFloat(amount),
      createdAt: new Date().toISOString()
    });
    setSymbol('');
    setExDate('');
    setPayDate('');
    setAmount('');
    setShowAddForm(false);
  };

  const totalDividends = useMemo(() => {
    return dividends.reduce((acc, d) => acc + (parseFloat(d.amount) || 0), 0);
  }, [dividends]);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="crypto-card p-6 flex flex-col gap-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              💰 Dividend Tracker
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Track your passive income streams</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            {showAddForm ? 'Cancel' : '+ Add Dividend'}
          </button>
        </div>

        {/* Total Cashflow Box */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl flex justify-between items-center">
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Total Passive Income</span>
          <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-500">
            ${totalDividends.toFixed(2)}
          </span>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Symbol</label>
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-emerald-500 text-sm font-mono uppercase"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Ex-Dividend Date</label>
                <input 
                  type="date" 
                  value={exDate}
                  onChange={(e) => setExDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Pay Date</label>
                <input 
                  type="date" 
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Amount ($)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-emerald-500 text-sm font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg text-sm cursor-pointer shadow-sm">
                Save Record
              </button>
            </div>
          </div>
        )}

        {/* Dividends List */}
        {dividends.length === 0 && !showAddForm ? (
          <div className="text-center py-10">
            <span className="text-4xl block mb-2">💸</span>
            <h3 className="text-slate-600 dark:text-slate-400 font-bold">No Dividends Recorded</h3>
            <p className="text-sm text-slate-500 mt-1">Start tracking your passive income journey.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Symbol</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ex-Date</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pay Date</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {dividends.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(div => (
                  <tr key={div.id} className="border-b border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{div.symbol}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{div.exDate || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{div.payDate || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +${parseFloat(div.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => {
                          if (window.confirm('Delete this dividend record?')) onDeleteDividend(div.id);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
