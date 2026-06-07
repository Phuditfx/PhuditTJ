import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { calculateAllTimeReturn, calculateAnnualGrowth, groupTransactionsByYear } from '../utils/financialMath';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';

export default function InvestmentDashboard({ currentUser, requestAlert }) {
  const [positions, setPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const [posRes, transRes, snapRes] = await Promise.all([
          supabase.from('investment_positions').select('*').eq('user_email', currentUser),
          supabase.from('investment_transactions').select('*').eq('user_email', currentUser).order('transaction_date', { ascending: true }),
          supabase.from('portfolio_snapshots').select('*').eq('user_email', currentUser).order('snapshot_date', { ascending: true })
        ]);
        
        if (posRes.data) setPositions(posRes.data);
        if (transRes.data) setTransactions(transRes.data);
        if (snapRes.data) setSnapshots(snapRes.data);
      } catch (err) {
        console.error("Error fetching investment data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);

  // Derived state
  const totalInvested = useMemo(() => {
    // Assuming 'BUY' adds to invested, 'SELL' reduces (or we track realized profit)
    // For simplicity, we just look at the latest snapshot if available, else calculate from transactions
    if (snapshots.length > 0) {
      return snapshots[snapshots.length - 1].total_invested;
    }
    const grouped = groupTransactionsByYear(transactions);
    return Object.values(grouped).reduce((sum, yr) => sum + yr.netDeposits, 0);
  }, [transactions, snapshots]);

  const totalRealizedPnL = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (parseFloat(t.realized_pnl) || 0), 0);
  }, [transactions]);

  const totalUnrealizedPnL = useMemo(() => {
    return positions.reduce((sum, p) => sum + (parseFloat(p.unrealized_pnl) || 0), 0);
  }, [positions]);

  const currentPortfolioValue = useMemo(() => {
    // Current Value = Total Invested + Realized PnL + Unrealized PnL
    return totalInvested + totalRealizedPnL + totalUnrealizedPnL;
  }, [totalInvested, totalRealizedPnL, totalUnrealizedPnL]);

  const allTimeGrowth = calculateAllTimeReturn(totalInvested, currentPortfolioValue);
  
  // YTD Return
  const ytdGrowth = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const lastYearSnap = snapshots.filter(s => new Date(s.snapshot_date).getFullYear() === currentYear - 1).pop();
    const startValue = lastYearSnap ? lastYearSnap.total_value : 0;
    const thisYearTrans = transactions.filter(t => new Date(t.transaction_date).getFullYear() === currentYear);
    
    let netDeposits = 0;
    thisYearTrans.forEach(t => {
      if (t.type === 'BUY') netDeposits += parseFloat(t.shares) * parseFloat(t.price);
      if (t.type === 'SELL') netDeposits -= parseFloat(t.shares) * parseFloat(t.price);
    });
    
    return calculateAnnualGrowth(startValue, currentPortfolioValue, netDeposits);
  }, [snapshots, transactions, currentPortfolioValue]);

  // Annual Performance Chart Data
  const annualPerformanceData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const grouped = groupTransactionsByYear(transactions);
    const data = [];
    
    const years = Array.from(new Set([...Object.keys(grouped), ...snapshots.map(s => new Date(s.snapshot_date).getFullYear().toString())])).sort();
    
    years.forEach(yr => {
      const yrInt = parseInt(yr);
      const lastYearSnap = snapshots.filter(s => new Date(s.snapshot_date).getFullYear() === yrInt - 1).pop();
      const thisYearSnap = snapshots.filter(s => new Date(s.snapshot_date).getFullYear() === yrInt).pop();
      
      const startValue = lastYearSnap ? parseFloat(lastYearSnap.total_value) : 0;
      let endValue = thisYearSnap ? parseFloat(thisYearSnap.total_value) : 0;
      if (yrInt === currentYear && !thisYearSnap) endValue = currentPortfolioValue;
      
      const yrData = grouped[yr] || { netDeposits: 0 };
      const returnPct = calculateAnnualGrowth(startValue, endValue, yrData.netDeposits);
      
      data.push({
        year: yr,
        return: parseFloat(returnPct.toFixed(2))
      });
    });
    
    return data;
  }, [snapshots, transactions, currentPortfolioValue]);

  // Portfolio Growth Data
  const growthData = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString(),
    invested: parseFloat(s.total_invested),
    value: parseFloat(s.total_value)
  }));
  // Append current if needed
  if (growthData.length === 0 || new Date(growthData[growthData.length-1].date) < new Date()) {
     growthData.push({
       date: new Date().toLocaleDateString(),
       invested: totalInvested,
       value: currentPortfolioValue
     });
  }



  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Analytics...</div>;

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-full overflow-hidden">
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Alpha Picks Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white">
            ${currentPortfolioValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
          </p>
          <p className="text-xs text-slate-400 mt-2">Invested: ${totalInvested.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">Total Net PnL</p>
          <p className={`text-3xl font-black ${(totalRealizedPnL + totalUnrealizedPnL) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {(totalRealizedPnL + totalUnrealizedPnL) > 0 ? '+' : ''}${(totalRealizedPnL + totalUnrealizedPnL).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
          </p>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            R: ${totalRealizedPnL.toFixed(2)} | U: ${totalUnrealizedPnL.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">All-Time Return</p>
          <p className={`text-3xl font-black ${allTimeGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {allTimeGrowth > 0 ? '+' : ''}{allTimeGrowth.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">YTD Return</p>
          <p className={`text-3xl font-black ${ytdGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {ytdGrowth > 0 ? '+' : ''}{ytdGrowth.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Portfolio Growth</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value) => [`$${parseFloat(value).toLocaleString()}`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} name="Total Value" dot={false} />
                <Line type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={2} name="Total Invested" dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Annual Performance (%)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualPerformanceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  cursor={{fill: '#334155', opacity: 0.2}}
                />
                <Bar dataKey="return" name="Return %" radius={[4, 4, 0, 0]}>
                  {
                    annualPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#10b981' : '#f43f5e'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Current Holdings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Shares</th>
                <th className="px-4 py-3">Avg Cost</th>
                <th className="px-4 py-3">Current Price</th>
                <th className="px-4 py-3">Unrealized PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 italic">No open positions found.</td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const currentVal = parseFloat(pos.shares || pos.total_shares) * parseFloat(pos.current_price || pos.average_cost);
                  const costBasis = parseFloat(pos.shares || pos.total_shares) * parseFloat(pos.average_cost);
                  const pnl = currentVal - costBasis;
                  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                  
                  return (
                    <tr key={pos.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{pos.ticker}</td>
                      <td className="px-4 py-3 font-mono">{parseFloat(pos.shares || pos.total_shares).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono">${parseFloat(pos.average_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono">${parseFloat(pos.current_price || pos.average_cost).toFixed(2)}</td>
                      <td className={`px-4 py-3 font-mono font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {pnl > 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
