import React, { useState, useEffect } from 'react';
import { 
  getInvestmentPositions, 
  addInvestmentTransaction, 
  deleteInvestmentPosition,
  getInvestmentTransactions,
  getAlphaPicksJournal,
  addAlphaPicksJournal,
  deleteAlphaPicksJournal,
  updateAlphaPicksJournalStatus
} from '../db/investmentDB';
import { useLanguage } from '../contexts/LanguageContext';
import LightweightChartComponent from './LightweightChartComponent';
import InvestmentDashboard from './InvestmentDashboard';

export default function AlphaPickPlanner({ userEmail, isVip, requestAlert, requestConfirm }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'portfolio' | 'journal'
  const [showManual, setShowManual] = useState(false);

  // === PORTFOLIO STATE ===
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [expandedCharts, setExpandedCharts] = useState({});
  const [positionTransactions, setPositionTransactions] = useState({});

  // === JOURNAL STATE ===
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoading, setJournalLoading] = useState(true);
  const [jPickDate, setJPickDate] = useState(new Date().toISOString().split('T')[0]);
  const [jTicker, setJTicker] = useState('');
  const [jEntry, setJEntry] = useState('');
  const [jStopLoss, setJStopLoss] = useState('');
  const [jTarget, setJTarget] = useState('');
  const [jNotes, setJNotes] = useState('');
  const [expandedJournalCharts, setExpandedJournalCharts] = useState({});

  const loadData = async () => {
    if (!userEmail) return;
    setLoading(true);
    setJournalLoading(true);
    try {
      const posData = await getInvestmentPositions(userEmail);
      setPositions(posData);
      const jData = await getAlphaPicksJournal(userEmail);
      setJournalEntries(jData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setJournalLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userEmail]);

  // === PORTFOLIO HANDLERS ===
  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !price) return;
    try {
      await addInvestmentTransaction(
        userEmail, ticker, type, parseFloat(shares), parseFloat(price), transactionDate, notes
      );
      setTicker(''); setShares(''); setPrice(''); setNotes('');
      loadData();
      if (requestAlert) requestAlert("✅ สำเร็จ", "บันทึกรายการเรียบร้อยแล้ว");
    } catch (err) {
      if (requestAlert) requestAlert("❌ ผิดพลาด", `ไม่สามารถบันทึกรายการได้: ${err.message}`);
      else alert("Error: " + err.message);
    }
  };

  const handleDeletePosition = async (id) => {
    const doDelete = async () => {
      try {
        await deleteInvestmentPosition(id);
        loadData();
      } catch (err) { console.error(err); }
    };
    if (requestConfirm) requestConfirm("Delete Position", "แน่ใจหรือไม่ว่าต้องการลบการลงทุนในหุ้นตัวนี้?", doDelete);
    else { if (window.confirm("Are you sure?")) doDelete(); }
  };

  const togglePortfolioChart = async (posId) => {
    if (expandedCharts[posId]) {
      setExpandedCharts(prev => ({ ...prev, [posId]: false }));
      return;
    }
    try {
      const txs = await getInvestmentTransactions(posId);
      setPositionTransactions(prev => ({ ...prev, [posId]: txs }));
      setExpandedCharts(prev => ({ ...prev, [posId]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  // === JOURNAL HANDLERS ===
  const handleAddJournal = async (e) => {
    e.preventDefault();
    if (!jTicker || !jPickDate) return;
    try {
      await addAlphaPicksJournal({
        user_email: userEmail,
        pick_date: jPickDate,
        ticker: jTicker.toUpperCase(),
        entry_alert_price: jEntry ? parseFloat(jEntry) : null,
        stop_loss_price: jStopLoss ? parseFloat(jStopLoss) : null,
        target_price: jTarget ? parseFloat(jTarget) : null,
        notes: jNotes
      });
      setJTicker(''); setJEntry(''); setJStopLoss(''); setJTarget(''); setJNotes('');
      loadData();
      if (requestAlert) requestAlert("✅ สำเร็จ", "บันทึก Alpha Pick เรียบร้อย");
    } catch (err) {
      if (requestAlert) requestAlert("❌ ผิดพลาด", err.message);
    }
  };

  const handleDeleteJournal = async (id) => {
    const doDelete = async () => {
      try {
        await deleteAlphaPicksJournal(id);
        loadData();
      } catch (err) { console.error(err); }
    };
    if (requestConfirm) requestConfirm("Delete Record", "ลบบันทึก Alpha Pick นี้ใช่ไหม?", doDelete);
    else { if (window.confirm("Delete?")) doDelete(); }
  };

  const toggleJournalStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Active' : currentStatus === 'Active' ? 'Closed' : 'Pending';
    try {
      await updateAlphaPicksJournalStatus(id, newStatus);
      loadData();
    } catch (err) { console.error(err); }
  };

  const toggleJournalChart = (id) => {
    setExpandedJournalCharts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isVip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center blur-md opacity-60 select-none pointer-events-none">
        <h2 className="text-2xl font-black">VIP Feature Locked</h2>
      </div>
    );
  }

  const totalInvested = positions.reduce((sum, p) => sum + (parseFloat(p.total_shares) * parseFloat(p.average_cost)), 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏛️</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Alpha Picks Investment</h2>
            <div className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-black tracking-widest uppercase border border-amber-200 dark:border-amber-800/50">PRO</div>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Long-Term DCA Portfolio Tracker & Journal</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Tabs */}
          <div className="flex flex-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-black transition-all whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              📊 DASHBOARD
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-black transition-all whitespace-nowrap ${
                activeTab === 'portfolio' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              💼 PORTFOLIO
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-black transition-all whitespace-nowrap ${
                activeTab === 'journal' 
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              📓 PICKS JOURNAL
            </button>
          </div>

          <button
            onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap"
          >
            <span>📖</span> {showManual ? 'ซ่อนคู่มือ' : 'คู่มือ'}
          </button>
        </div>
      </div>

      {showManual && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-sm animate-fade-in">
          <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
            <span>💡</span> คู่มือการใช้งานระบบพอร์ตระยะยาว (Alpha Picks)
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-indigo-400 mb-4">
            <li><strong>เป้าหมาย:</strong> ใช้สำหรับบันทึกหุ้นที่คุณต้องการถือยาว (Long-Term) เช่น คำแนะนำจาก Seeking Alpha's Alpha Picks (2 ตัวต่อเดือน)</li>
            <li><strong>แท็บ 💼 PORTFOLIO:</strong> สำหรับจดบันทึกการซื้อขายจริง 
              <ul className="list-circle pl-5 mt-1 space-y-1 marker:text-slate-400">
                <li>เมื่อซื้อเพิ่ม (Buy) ระบบจะคำนวณถัวเฉลี่ยต้นทุน (Average Cost) ให้อัตโนมัติ</li>
                <li>เมื่อแบ่งขาย (Sell) ระบบจะรับรู้กำไร (Realized PnL) และหักจำนวนหุ้นออก โดยไม่เปลี่ยนแปลงต้นทุนเฉลี่ยของพอร์ต</li>
              </ul>
            </li>
            <li><strong>แท็บ 📓 PICKS JOURNAL:</strong> สำหรับจดบันทึกแผนและสถิติคำแนะนำจากระบบ (ไม่ต้องมีการซื้อขายจริงก็จดได้) 
              <ul className="list-circle pl-5 mt-1 space-y-1 marker:text-slate-400">
                <li>บันทึก Entry Alert, Stop Loss และ Target เพื่อเก็บสถิติผลงานของหุ้น</li>
              </ul>
            </li>
            <li><strong>ระบบกราฟ (Chart Markers):</strong> กดไอคอน 📈 ท้ายตารางในทั้ง 2 แท็บ เพื่อเปิดดูกราฟราคาหุ้นย้อนหลังพร้อมจุดเข้า-ออกที่ระบบพล็อตให้แบบอัตโนมัติ</li>
          </ul>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <InvestmentDashboard currentUser={userEmail} requestAlert={requestAlert} />
      )}

      {/* PORTFOLIO TAB */}
      {activeTab === 'portfolio' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="crypto-card p-6 w-full lg:w-2/3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                ➕ Add Transaction
              </h3>
              <form onSubmit={handleTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 ${
                      type === 'BUY' 
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                        : 'border-rose-500 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <option value="BUY" className="text-emerald-600 dark:text-emerald-400">BUY (Add More)</option>
                    <option value="SELL" className="text-rose-600 dark:text-rose-400">SELL (Scale Out)</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input 
                    type="date" 
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ticker</label>
                  <input 
                    type="text" 
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="e.g. UBER"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shares</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-mono dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                  <input 
                    type="text" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เหตุผลการเข้าซื้อหรือขาย..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 pt-2">
                  <button 
                    type="submit" 
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-md active:scale-95 text-white ${
                      type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/30'
                    }`}
                  >
                    {type === 'BUY' ? 'RECORD BUY' : 'RECORD SELL'}
                  </button>
                </div>
              </form>
            </div>

            <div className="crypto-card p-6 flex flex-col justify-center items-center gap-2 w-full lg:w-1/3">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Invested Capital</h3>
               <div className="text-3xl font-black text-slate-900 dark:text-white">
                 ${totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
               </div>
            </div>
          </div>

          <div className="w-full">
             <div className="crypto-card p-0 overflow-hidden h-full">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">💼 Current Holdings</h3>
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        <th className="px-6 py-4 whitespace-nowrap">Ticker</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Total Shares</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Average Cost</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Invested Value</th>
                        <th className="px-6 py-4 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading...</td></tr>
                      ) : positions.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">No positions found.</td></tr>
                      ) : (
                        positions.filter(p => parseFloat(p.total_shares) > 0).map((pos) => {
                          const invested = parseFloat(pos.total_shares) * parseFloat(pos.average_cost);
                          const isExpanded = expandedCharts[pos.id];
                          const txs = positionTransactions[pos.id] || [];
                          
                          // Format markers from transactions
                          const chartMarkers = txs.map(tx => ({
                            time: tx.transaction_date,
                            position: tx.type === 'BUY' ? 'belowBar' : 'aboveBar',
                            color: tx.type === 'BUY' ? '#10b981' : '#f43f5e',
                            shape: tx.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                            text: `${tx.type} @ ${tx.price}`
                          }));

                          return (
                            <React.Fragment key={pos.id}>
                              <tr className="transition-colors text-sm hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                  {pos.ticker}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                  {parseFloat(pos.total_shares).toLocaleString(undefined, {maximumFractionDigits: 4})}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                  ${parseFloat(pos.average_cost).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300 font-bold">
                                  ${invested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => togglePortfolioChart(pos.id)} className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="View Chart">
                                      📈
                                    </button>
                                    <button onClick={() => handleDeletePosition(pos.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Delete Entire Position">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800/50">
                                  <td colSpan="5" className="p-4">
                                    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-inner">
                                      <LightweightChartComponent 
                                        symbol={pos.ticker}
                                        entry={parseFloat(pos.average_cost)}
                                        customMarkers={chartMarkers}
                                      />
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500 text-center font-bold">
                                      Line: Average Cost | Markers: Transaction History
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* JOURNAL TAB */}
      {activeTab === 'journal' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Add Pick Form */}
          <div className="crypto-card p-6 border-l-4 border-amber-500">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">📓 Record New Alpha Pick</h3>
            <form onSubmit={handleAddJournal} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="col-span-2 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">PICK DATE</label>
                  <input type="date" value={jPickDate} onChange={e=>setJPickDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none font-mono" required />
                </div>
                <div className="col-span-2 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">TICKER</label>
                  <input type="text" value={jTicker} onChange={e=>setJTicker(e.target.value)} placeholder="TICKER" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none uppercase font-black" required />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-[10px] font-black text-blue-500 mb-1">ENTRY ALERT</label>
                  <input type="number" step="0.01" value={jEntry} onChange={e=>setJEntry(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none" />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-[10px] font-black text-rose-500 mb-1">STOP LOSS</label>
                  <input type="number" step="0.01" value={jStopLoss} onChange={e=>setJStopLoss(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-4">
                 <div className="flex-1">
                   <input type="text" value={jNotes} onChange={e=>setJNotes(e.target.value)} placeholder="Thesis / Notes..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white focus:outline-none" />
                 </div>
                 <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black px-6 rounded-lg transition-colors whitespace-nowrap shadow-md shadow-amber-500/20">
                   + RECORD PICK
                 </button>
              </div>
            </form>
          </div>

          {/* Picks Table */}
          <div className="crypto-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="px-4 py-3 whitespace-nowrap">Pick Date</th>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3 text-right">Entry Alert</th>
                    <th className="px-4 py-3 text-right">Stop Loss</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {journalLoading ? (
                    <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                  ) : journalEntries.length === 0 ? (
                    <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No Alpha Picks logged yet.</td></tr>
                  ) : (
                    journalEntries.map(pick => {
                      const isExpanded = expandedJournalCharts[pick.id];
                      return (
                        <React.Fragment key={pick.id}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                            <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{pick.pick_date}</td>
                            <td className="px-4 py-3 font-black text-slate-900 dark:text-white text-base">{pick.ticker}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{pick.entry_alert_price ? `$${parseFloat(pick.entry_alert_price).toFixed(2)}` : '-'}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{pick.stop_loss_price ? `$${parseFloat(pick.stop_loss_price).toFixed(2)}` : '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                onClick={() => toggleJournalStatus(pick.id, pick.status)}
                                className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase transition-colors ${
                                  pick.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  pick.status === 'Closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}
                              >
                                {pick.status || 'Pending'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={pick.notes}>{pick.notes || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => toggleJournalChart(pick.id)} className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="View Chart">
                                  📈
                                </button>
                                <button onClick={() => handleDeleteJournal(pick.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800/50">
                              <td colSpan="7" className="p-4">
                                <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-inner">
                                  <LightweightChartComponent 
                                    symbol={pick.ticker}
                                    entry={pick.entry_alert_price ? parseFloat(pick.entry_alert_price) : null}
                                    stopLoss={pick.stop_loss_price ? parseFloat(pick.stop_loss_price) : null}
                                    customMarkers={[{
                                      time: pick.pick_date,
                                      position: 'belowBar',
                                      color: '#3b82f6',
                                      shape: 'arrowUp',
                                      text: 'Pick Alert'
                                    }]}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
