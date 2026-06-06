import React, { useState, useEffect } from 'react';
import { getInvestmentPositions, addInvestmentTransaction, deleteInvestmentPosition } from '../db/investmentDB';
import { useLanguage } from '../contexts/LanguageContext';

export default function AlphaPickPlanner({ userEmail, isVip, requestAlert, requestConfirm }) {
  const { t } = useLanguage();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Transaction Form State
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [showManual, setShowManual] = useState(false);

  const loadPositions = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const data = await getInvestmentPositions(userEmail);
      setPositions(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPositions();
  }, [userEmail]);

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !price) return;

    try {
      await addInvestmentTransaction(
        userEmail,
        ticker,
        type,
        parseFloat(shares),
        parseFloat(price),
        transactionDate,
        notes
      );
      
      // Reset form (except date and type)
      setTicker('');
      setShares('');
      setPrice('');
      setNotes('');
      
      // Reload positions to reflect updated DCA or realized PnL
      loadPositions();
      
      if (requestAlert) requestAlert("✅ สำเร็จ", "บันทึกรายการเรียบร้อยแล้ว");
    } catch (err) {
      console.error(err);
      if (requestAlert) {
        requestAlert("❌ ผิดพลาด", `ไม่สามารถบันทึกรายการได้: ${err.message}`);
      } else {
        alert("Error: " + err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    const doDelete = async () => {
      try {
        await deleteInvestmentPosition(id);
        loadPositions();
      } catch (err) {
        console.error(err);
      }
    };
    
    if (requestConfirm) {
      requestConfirm("Delete Position", "คุณแน่ใจหรือไม่ว่าต้องการลบการลงทุนในหุ้นตัวนี้ ประวัติธุรกรรมทั้งหมดของหุ้นนี้จะถูกลบไปด้วย?", doDelete);
    } else {
      if (!window.confirm("Are you sure?")) return;
      doDelete();
    }
  };

  if (!isVip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center blur-md opacity-60 select-none pointer-events-none">
        <h2 className="text-2xl font-black">VIP Feature Locked</h2>
      </div>
    );
  }

  // Calculate Portfolio Totals
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
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Long-Term DCA Portfolio Tracker</p>
        </div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
        >
          <span>📖</span> {showManual ? 'ซ่อนคู่มือ' : 'คู่มือการใช้งาน'}
        </button>
      </div>

      {showManual && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-sm animate-fade-in">
          <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
            <span>💡</span> คู่มือการใช้งานระบบพอร์ตระยะยาว (Alpha Picks)
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-indigo-400">
            <li><strong>เป้าหมาย:</strong> ใช้สำหรับบันทึกหุ้นที่คุณต้องการถือยาว (Long-Term) เช่น คำแนะนำจาก Seeking Alpha's Alpha Picks (2 ตัวต่อเดือน)</li>
            <li><strong>ระบบ DCA (Buy):</strong> เมื่อคุณทยอยซื้อหุ้นตัวเดิมในราคาใหม่ ระบบจะนำไปคำนวณถัวเฉลี่ยต้นทุน (Average Cost) ให้อัตโนมัติด้วยสูตร <code>[(จำนวนหุ้นเดิม*ต้นทุนเดิม) + (จำนวนหุ้นใหม่*ราคาซื้อ)] / จำนวนหุ้นรวม</code></li>
            <li><strong>ระบบ Scale Out (Sell):</strong> เมื่อคุณแบ่งขายทำกำไร ระบบจะตัดจำนวนหุ้นออกตามที่ขาย และนำไปบันทึก Realized PnL (กำไรที่รับรู้แล้ว) ให้ <strong>โดยที่ต้นทุนเฉลี่ยของหุ้นที่เหลืออยู่จะไม่เปลี่ยน</strong></li>
            <li>ข้อมูลส่วนนี้แยกเด็ดขาดจาก Swing Planner และ Trade Journal ทำให้การคำนวณไม่ตีกัน</li>
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-6">
        
        {/* Form Section */}
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

        {/* Portfolio Table Section */}
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
                      <th className="px-6 py-4 text-center w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading...</td>
                      </tr>
                    ) : positions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                          No investment positions found. Start buying shares!
                        </td>
                      </tr>
                    ) : (
                      positions.filter(p => parseFloat(p.total_shares) > 0).map((pos) => {
                        const invested = parseFloat(pos.total_shares) * parseFloat(pos.average_cost);
                        return (
                          <tr key={pos.id} className="transition-colors text-sm hover:bg-slate-50 dark:hover:bg-slate-900/40">
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
                              <button 
                                onClick={() => handleDelete(pos.id)}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                title="Delete Entire Position"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
        
      </div>
    </div>
  );
}
