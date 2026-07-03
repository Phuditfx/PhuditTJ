import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { calculateAllTimeReturn, calculateAnnualGrowth, groupTransactionsByYear } from '../utils/financialMath';
import { updateInvestmentPosition, addPortfolioFunding } from '../db/investmentDB';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';

export default function InvestmentDashboard({ currentUser, requestAlert, portfolioId }) {
  const [positions, setPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit Position State
  const [editingPosition, setEditingPosition] = useState(null);
  const [editForm, setEditForm] = useState({ ticker: '', totalShares: '', averageCost: '' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Manage Cash Modal State
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashType, setCashType] = useState('DEPOSIT');
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        let posQuery = supabase.from('investment_positions').select('*').eq('user_email', currentUser);
        let transQuery = supabase.from('investment_transactions').select('*').eq('user_email', currentUser).order('transaction_date', { ascending: true });
        let snapQuery = supabase.from('portfolio_snapshots').select('*').eq('user_email', currentUser).order('snapshot_date', { ascending: true });
        let portQuery = supabase.from('investment_portfolios').select('cash_balance').eq('user_email', currentUser);
        if (portfolioId) {
            posQuery = posQuery.eq('portfolio_id', portfolioId);
            transQuery = transQuery.eq('portfolio_id', portfolioId);
            snapQuery = snapQuery.eq('portfolio_id', portfolioId);
            portQuery = portQuery.eq('id', portfolioId).single();
        } else {
            portQuery = portQuery.limit(1).single();
        }

        const [posRes, transRes, snapRes, portRes] = await Promise.all([posQuery, transQuery, snapQuery, portQuery]);
        
        if (posRes.data) setPositions(posRes.data);
        if (transRes.data) setTransactions(transRes.data);
        if (snapRes.data) setSnapshots(snapRes.data);
        if (portRes.data) setCashBalance(parseFloat(portRes.data.cash_balance) || 0);
      } catch (err) {
        console.error("Error fetching investment data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, portfolioId, refreshTrigger]);

  const handleEditClick = (pos) => {
    setEditingPosition(pos);
    setEditForm({
      ticker: pos.ticker,
      totalShares: pos.total_shares || pos.shares || '',
      averageCost: pos.average_cost || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPosition) return;
    try {
      await updateInvestmentPosition(editingPosition.id, {
        ticker: editForm.ticker.toUpperCase(),
        total_shares: parseFloat(editForm.totalShares),
        average_cost: parseFloat(editForm.averageCost)
      });
      setEditingPosition(null);
      setRefreshTrigger(prev => prev + 1); // trigger reload
      if (requestAlert) requestAlert("✅ สำเร็จ", "แก้ไขข้อมูลหุ้นเรียบร้อยแล้ว");
    } catch (err) {
      if (requestAlert) requestAlert("❌ ผิดพลาด", err.message);
    }
  };

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    if (!cashAmount || isNaN(cashAmount) || parseFloat(cashAmount) <= 0) {
      if (requestAlert) requestAlert("❌ ผิดพลาด", "กรุณาระบุจำนวนเงินให้ถูกต้อง");
      return;
    }
    try {
      await addPortfolioFunding(currentUser, portfolioId, cashType, parseFloat(cashAmount), cashNotes);
      setShowCashModal(false);
      setCashAmount('');
      setCashNotes('');
      setRefreshTrigger(prev => prev + 1);
      if (requestAlert) requestAlert("✅ สำเร็จ", "ทำรายการเรียบร้อยแล้ว");
    } catch (err) {
      if (requestAlert) requestAlert("❌ ผิดพลาด", err.message);
    }
  };

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
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Alpha Picks Dashboard</h2>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Cash:</span>
            <span className="text-lg font-black text-slate-800 dark:text-white">${cashBalance.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          </div>
          <button 
            onClick={() => setShowCashModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-all text-sm"
          >
            Manage Cash
          </button>
        </div>
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
          <div className="h-64 min-h-[256px] w-full">
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
          <div className="h-64 min-h-[256px] w-full">
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>💼</span> Current Holdings
          </h3>
          <p className="text-xs text-slate-500 mt-1">รายการหุ้นที่ถือครองในพอร์ตปัจจุบัน (เลื่อนซ้าย-ขวาเพื่อดูข้อมูลทั้งหมด)</p>
        </div>
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap min-w-[700px]">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-5 py-4">Ticker</th>
                <th className="px-5 py-4">Shares</th>
                <th className="px-5 py-4">Avg Cost</th>
                <th className="px-5 py-4">Current Price</th>
                <th className="px-5 py-4">Unrealized PnL</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {positions.filter(p => parseFloat(p.shares || p.total_shares) > 0).length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500 italic">No open positions found.</td>
                </tr>
              ) : (
                positions.filter(p => parseFloat(p.shares || p.total_shares) > 0).map((pos) => {
                  const currentVal = parseFloat(pos.shares || pos.total_shares) * parseFloat(pos.current_price || pos.average_cost);
                  const costBasis = parseFloat(pos.shares || pos.total_shares) * parseFloat(pos.average_cost);
                  const pnl = currentVal - costBasis;
                  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                  
                  return (
                    <tr key={pos.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                      <td className="px-5 py-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                          {pos.ticker.substring(0,2)}
                        </div>
                        {pos.ticker}
                      </td>
                      <td className="px-5 py-4 font-mono font-medium">{parseFloat(pos.shares || pos.total_shares).toFixed(4)}</td>
                      <td className="px-5 py-4 font-mono font-medium">${parseFloat(pos.average_cost).toFixed(2)}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">${parseFloat(pos.current_price || pos.average_cost).toFixed(2)}</td>
                      <td className={`px-5 py-4 font-mono font-black ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        <div className="flex flex-col">
                          <span>{pnl > 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                          <span className={`text-[10px] ${pnl >= 0 ? 'text-emerald-500/80 dark:text-emerald-500/60' : 'text-rose-500/80 dark:text-rose-500/60'}`}>
                            {pnl > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => handleEditClick(pos)}
                          className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white rounded-lg transition-colors"
                          title="Edit Position"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Position Modal */}
      {editingPosition && (
        <div className="fixed inset-0 bg-slate-900/90 dark:bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>✏️ แก้ไขข้อมูล (Holdings)</span>
              </h3>
              <button onClick={() => setEditingPosition(null)} className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ticker</label>
                <input 
                  type="text" 
                  required
                  value={editForm.ticker}
                  onChange={(e) => setEditForm({...editForm, ticker: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Shares</label>
                <input onFocus={(e) => e.target.select()}  
                  type="number" 
                  step="any"
                  required
                  value={editForm.totalShares}
                  onChange={(e) => setEditForm({...editForm, totalShares: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Average Cost</label>
                <input onFocus={(e) => e.target.select()}  
                  type="number" 
                  step="any"
                  required
                  value={editForm.averageCost}
                  onChange={(e) => setEditForm({...editForm, averageCost: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingPosition(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              Manage Cash (ฝาก/ถอน)
            </h3>
            <form onSubmit={handleCashSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                <select 
                  value={cashType}
                  onChange={(e) => setCashType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DEPOSIT" className="text-emerald-600">DEPOSIT (ฝากเงิน)</option>
                  <option value="WITHDRAWAL" className="text-rose-600">WITHDRAWAL (ถอนเงิน)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                <input 
                  type="text" 
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCashModal(false)}
                  className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
