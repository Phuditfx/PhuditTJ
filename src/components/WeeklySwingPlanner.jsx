import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie } from 'recharts';
import { getWeeklyPicks, saveWeeklyPick, updateWeeklyPickStatus, deleteWeeklyPick } from '../db/journalDB';
import { useLanguage } from '../contexts/LanguageContext';

export default function WeeklySwingPlanner({ userEmail, isVip, requestAlert, requestConfirm }) {
  const { t } = useLanguage();
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [ticker, setTicker] = useState('');
  const [sector, setSector] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [floatSize, setFloatSize] = useState('Medium');
  const [shortInterest, setShortInterest] = useState('Low');
  
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  const [weekStartDate, setWeekStartDate] = useState(getStartOfWeek());

  const loadPicks = async () => {
    if (!userEmail) return;
    setLoading(true);
    const data = await getWeeklyPicks(userEmail);
    setPicks(data);
    setLoading(false);
  };

  const SECTOR_MAP = {
    'AAPL': 'Technology', 'MSFT': 'Technology', 'NVDA': 'Technology', 'TSLA': 'Consumer Cyclical', 
    'AMZN': 'Consumer Cyclical', 'META': 'Communication', 'GOOGL': 'Communication', 'AMD': 'Technology', 
    'JPM': 'Financial', 'V': 'Financial', 'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'XOM': 'Energy', 
    'PG': 'Consumer Defensive', 'HD': 'Consumer Cyclical', 'MA': 'Financial', 'CVX': 'Energy',
    'ABBV': 'Healthcare', 'MRK': 'Healthcare', 'PEP': 'Consumer Defensive', 'KO': 'Consumer Defensive',
    'AVGO': 'Technology', 'COST': 'Consumer Defensive', 'WMT': 'Consumer Defensive', 'TMO': 'Healthcare',
    'CSCO': 'Technology', 'MCD': 'Consumer Cyclical', 'CRM': 'Technology', 'ABT': 'Healthcare',
    'NFLX': 'Communication', 'ORCL': 'Technology', 'NKE': 'Consumer Cyclical', 'INTC': 'Technology',
    'DIS': 'Communication', 'BA': 'Industrials', 'GE': 'Industrials', 'CAT': 'Industrials',
    'QCOM': 'Technology', 'VZ': 'Communication', 'T': 'Communication', 'PFE': 'Healthcare',
    'BAC': 'Financial', 'C': 'Financial', 'WFC': 'Financial', 'UBER': 'Technology',
    'PLTR': 'Technology', 'ARM': 'Technology', 'SMCI': 'Technology', 'COIN': 'Financial'
  };

  useEffect(() => {
    if (ticker && ticker.length > 0) {
      const upperTicker = ticker.toUpperCase();
      if (SECTOR_MAP[upperTicker]) {
        setSector(SECTOR_MAP[upperTicker]);
      }
    }
  }, [ticker]);

  const calculateAIScore = (entry, sl, floatSz, si) => {
    let score = 5; 
    const risk = entry - sl;
    if (risk > 0) {
      const riskPct = (risk / entry) * 100;
      if (riskPct < 5) score += 2; 
      else if (riskPct > 15) score -= 2; 
    }
    if (floatSz === 'Small') score += 1; 
    else if (floatSz === 'Large') score -= 1; 
    if (si === 'High') score += 2; 
    return Math.max(1, Math.min(10, Math.floor(score)));
  };

  useEffect(() => {
    loadPicks();
  }, [userEmail]);

  const handleAddPick = async (e) => {
    e.preventDefault();
    if (!ticker || !entryPrice || !stopLoss) return;
    
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const aiScore = calculateAIScore(entry, stop, floatSize, shortInterest);

    try {
      await saveWeeklyPick(userEmail, {
        week_start_date: weekStartDate,
        ticker: ticker.toUpperCase(),
        sector: sector || 'Other',
        entry_alert_price: entry,
        stop_loss_price: stop,
        float_size: floatSize,
        short_interest_level: shortInterest,
        technical_score: aiScore,
        status: 'Pending'
      });
      
      // Reset form
      setTicker('');
      setSector('');
      setEntryPrice('');
      setStopLoss('');
      
      loadPicks();
    } catch (err) {
      console.error(err);
      if (requestAlert) {
        requestAlert("❌ บันทึกไม่สำเร็จ", `รายละเอียด: ${err.message || err.details || JSON.stringify(err)}`);
      } else {
        alert("Failed to save pick: " + (err.message || "Unknown error"));
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateWeeklyPickStatus(id, userEmail, newStatus);
      setPicks(picks.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      console.error(err);
      if (requestAlert) {
        requestAlert("❌ อัปเดตไม่สำเร็จ", "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
      }
    }
  };

  const handleDelete = async (id) => {
    const doDelete = async () => {
      try {
        await deleteWeeklyPick(id, userEmail);
        setPicks(picks.filter(p => p.id !== id));
      } catch (err) {
        console.error(err);
      }
    };
    
    if (requestConfirm) {
      requestConfirm("Delete Pick", "Are you sure you want to delete this pick?", doDelete);
    } else {
      if (!window.confirm("Are you sure you want to delete this pick?")) return;
      doDelete();
    }
  };

  // Analytics Calculation
  const totalPicks = picks.length;
  
  // 1. Trigger Rate
  const triggeredStatuses = ['Triggered-Active', 'Win', 'Loss', 'Breakeven'];
  const triggeredCount = picks.filter(p => triggeredStatuses.includes(p.status)).length;
  const triggerRate = totalPicks > 0 ? (triggeredCount / totalPicks) * 100 : 0;

  const triggerPieData = [
    { name: 'Triggered', value: triggeredCount, color: '#6366f1' },
    { name: 'Pending', value: totalPicks - triggeredCount, color: '#cbd5e1' }
  ];

  // 2. Win Rate overall
  const completedStatuses = ['Win', 'Loss', 'Breakeven'];
  const completedPicks = picks.filter(p => completedStatuses.includes(p.status));
  const wins = completedPicks.filter(p => p.status === 'Win').length;
  const overallWinRate = completedPicks.length > 0 ? (wins / completedPicks.length) * 100 : 0;

  // 3. Win Rate by Sector
  const sectorData = useMemo(() => {
    const map = {};
    picks.forEach(p => {
      if (!completedStatuses.includes(p.status)) return;
      if (!map[p.sector]) map[p.sector] = { total: 0, wins: 0 };
      map[p.sector].total += 1;
      if (p.status === 'Win') map[p.sector].wins += 1;
    });
    return Object.keys(map).map(sector => ({
      name: sector,
      winRate: (map[sector].wins / map[sector].total) * 100,
      total: map[sector].total
    })).sort((a, b) => b.winRate - a.winRate);
  }, [picks]);

  // 4. Performance by Float Size
  const floatData = useMemo(() => {
    const map = { Small: { total: 0, wins: 0 }, Medium: { total: 0, wins: 0 }, Large: { total: 0, wins: 0 } };
    picks.forEach(p => {
      if (!completedStatuses.includes(p.status)) return;
      const f = p.float_size || 'Medium';
      if (!map[f]) map[f] = { total: 0, wins: 0 };
      map[f].total += 1;
      if (p.status === 'Win') map[f].wins += 1;
    });
    return Object.keys(map).map(size => ({
      name: size,
      winRate: map[size].total > 0 ? (map[size].wins / map[size].total) * 100 : 0,
      total: map[size].total
    }));
  }, [picks]);

  if (!isVip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center blur-md opacity-60 select-none pointer-events-none">
        <h2 className="text-2xl font-black">VIP Feature Locked</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📈 TI Weekly Swing Planner</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            บันทึกการเทรดหุ้น TI Swing Picks ประจำสัปดาห์ และวิเคราะห์ประสิทธิภาพของระบบ
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold border border-indigo-100 dark:border-indigo-800/50">
          Total Logs: {totalPicks} | Win Rate: {overallWinRate.toFixed(1)}%
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Section */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="crypto-card p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              ➕ Add Weekly Pick
            </h3>
            <form onSubmit={handleAddPick} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Week Start (Monday)</label>
                <input 
                  type="date" 
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ticker</label>
                  <input 
                    type="text" 
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="e.g. TSLA"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sector</label>
                  <input 
                    type="text" 
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. Tech"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entry Alert ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stop Loss ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Float Size</label>
                  <select 
                    value={floatSize}
                    onChange={(e) => setFloatSize(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Short Interest</label>
                  <select 
                    value={shortInterest}
                    onChange={(e) => setShortInterest(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-start gap-2">
                <span className="text-lg">🤖</span>
                <span>
                  <strong>AI Tech Score</strong> จะถูกคำนวณให้อัตโนมัติ (1-10) จากความคุ้มค่าของระยะ Stop Loss, ขนาดหุ้น (Float) และแรงสะสมของ Short Interest
                </span>
              </div>

              <button 
                type="submit"
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
              >
                Save Pick
              </button>
            </form>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="crypto-card p-5 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 absolute top-4 left-5 uppercase tracking-wider">Trigger Rate</h3>
            <div className="h-32 w-full mt-6 flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={triggerPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    stroke="none"
                  >
                    {triggerPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                    itemStyle={{fontWeight: 'bold', color: '#ffffff'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex items-center justify-center inset-0 pointer-events-none">
                <span className="font-bold text-xl text-slate-900 dark:text-white">{triggerRate.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">หุ้นที่แตะ Entry Alert Price</p>
          </div>

          <div className="crypto-card p-5 md:col-span-2 relative overflow-hidden">
             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Win Rate by Sector</h3>
             <div className="h-32 w-full text-xs font-mono">
               {sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={35} />
                    <Tooltip 
                      cursor={{fill: '#1e293b', opacity: 0.1}}
                      contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                      itemStyle={{fontWeight: 'bold', color: '#ffffff'}}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Win Rate']}
                    />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]} fill="#10b981">
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? '#10b981' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-slate-400">No data</div>
               )}
             </div>
          </div>

          <div className="crypto-card p-5 md:col-span-3 relative overflow-hidden">
             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Performance by Float Size</h3>
             <div className="h-36 w-full text-xs font-mono">
               {floatData.some(d => d.total > 0) ? (
                 <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={floatData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" tickLine={false} axisLine={false} width={60} />
                    <Tooltip 
                      cursor={{fill: '#1e293b', opacity: 0.1}}
                      contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                      itemStyle={{fontWeight: 'bold', color: '#ffffff'}}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Win Rate']}
                    />
                    <Bar dataKey="winRate" radius={[0, 4, 4, 0]} barSize={20}>
                      {floatData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#6366f1" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-slate-400">No data</div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="crypto-card p-6 mt-2 overflow-hidden">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📋 Weekly Journal Log</h3>
        
        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
            </div>
          </div>
        ) : picks.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No picks recorded yet. Add your first weekly pick above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 text-[11px] font-black uppercase text-slate-550 dark:text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Week Start</th>
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Setup</th>
                  <th className="px-4 py-3 font-mono">Entry Alert</th>
                  <th className="px-4 py-3 font-mono">Stop Loss</th>
                  <th className="px-4 py-3 text-center">Tech Score</th>
                  <th className="px-4 py-3 text-center">Status / Result</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                {picks.map((pick) => {
                  return (
                    <tr key={pick.id} className="transition-colors text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {pick.week_start_date}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {pick.ticker}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {pick.sector}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        Float: <span className="font-bold text-slate-700 dark:text-slate-300">{pick.float_size}</span><br/>
                        SI: <span className="font-bold text-slate-700 dark:text-slate-300">{pick.short_interest_level}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        ${Number(pick.entry_alert_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-500 dark:text-rose-400">
                        ${Number(pick.stop_loss_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800">
                          {pick.technical_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select 
                          value={pick.status || 'Pending'} 
                          onChange={(e) => handleStatusChange(pick.id, e.target.value)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                            pick.status === 'Win' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' :
                            pick.status === 'Loss' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' :
                            pick.status === 'Breakeven' ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' :
                            pick.status === 'Triggered-Active' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50' :
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                          }`}
                        >
                          <option value="Pending" className="text-slate-900 bg-white dark:text-white dark:bg-slate-800">Pending</option>
                          <option value="Triggered-Active" className="text-slate-900 bg-white dark:text-white dark:bg-slate-800">Triggered-Active</option>
                          <option value="Win" className="text-slate-900 bg-white dark:text-white dark:bg-slate-800">Win</option>
                          <option value="Loss" className="text-slate-900 bg-white dark:text-white dark:bg-slate-800">Loss</option>
                          <option value="Breakeven" className="text-slate-900 bg-white dark:text-white dark:bg-slate-800">Breakeven</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDelete(pick.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Delete Pick"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
