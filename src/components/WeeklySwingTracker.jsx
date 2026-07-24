import React, { useState, useEffect } from 'react';

export function WeeklySwingRulebook() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 lg:p-10 text-slate-800 dark:text-slate-200 animate-fade-in space-y-8">
      <div className="border-b-2 border-indigo-500 pb-4">
        <h2 className="text-3xl font-black flex items-center gap-3">
          <span className="text-indigo-500">📖</span> กฎและแผนระบบสวิงเทรด (TI Swing Picks)
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">คู่มือฉบับสมบูรณ์อ้างอิงตามเอกสาร solid-swing-trading-thai.md</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-3">1. การคัดกรองและการเข้าซื้อ (Entry System)</h3>
        <ul className="list-disc pl-6 space-y-3 marker:text-slate-400">
          <li><strong>รับโพยหุ้น:</strong> รับรายชื่อหุ้น 5 ตัวต่อสัปดาห์จาก TI Swing Picks</li>
          <li><strong>จุดเข้าซื้อ (Trigger):</strong> จะเข้าซื้อก็ต่อเมื่อราคาทะลุจุดแนวต้าน (Breakout) เท่านั้น โดยอาจมองหารูปแบบการเบรกเอาต์แบบไซด์เวย์ (Sideways Breakout) หรือการเบรกเอาต์แบบธง (Flag Breakout)</li>
          <li><strong>เทคนิคการซื้อ:</strong> เพื่อให้ได้จุดเข้าที่ดี ควรพิจารณาซื้อที่ราคาปิดของวันที่มีสัญญาณเบรกเอาต์ชัดเจน แทนการไล่ราคาซื้อในวันถัดไปที่อาจเปิดกระโดด</li>
          <li><strong>ข้อควรระวังก่อนเข้า:</strong> ตรวจสอบวันประกาศผลประกอบการเสมอ และ <span className="text-rose-500 font-bold underline">หลีกเลี่ยงการเข้าซื้อ</span> หากใกล้ถึงวันประกาศงบ</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 border-l-4 border-amber-500 pl-3">2. การบริหารเงินทุน (Position Sizing & Compounding)</h3>
        <ul className="list-disc pl-6 space-y-3 marker:text-slate-400">
          <li><strong>เงินทุนเริ่มต้น:</strong> เริ่มต้นที่ $0 และคำนวณเงินซื้อต่อหุ้น = (ทุนที่มีทั้งหมด / 5)</li>
          <li><strong>การเติมเงิน:</strong> เติมเงินเข้าพอร์ตตามต้องการต่อสัปดาห์ (ใช้ตามจริงเฉพาะตัวที่เบรกเอาต์แนวต้าน) แนะนำที่ 5$ ต่อสัปดาห์</li>
          <li><strong>การทบต้น (Snowball Effect):</strong> เมื่อขายหุ้นออก (ไม่ว่าจะด้วยเงื่อนไขใด) ให้นำกำไร/ขาดทุน ไปทบรวมกับเงินทุนเดิม เพื่อเป็นขนาดไม้ที่ใหญ่ขึ้นในสัปดาห์ถัดๆ ไป (ทบต้นไปเรื่อยๆ)</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 border-l-4 border-rose-500 pl-3">3. ระบบทางออกและการตัดขาดทุน (Exit & Risk Management)</h3>
        <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg font-medium">คุณมีระบบความคุ้มครองที่รัดกุมมาก โดยสามารถแบ่งชั้นการออกได้ดังนี้ครับ:</p>
        <ul className="list-disc pl-6 space-y-3 marker:text-slate-400">
          <li><strong>ทางออกที่ 1 (Technical Stop):</strong> หากราคายังไม่ชนระดับขาดทุน 10% แต่แท่งเทียนรายวันปิดต่ำกว่าเส้นค่าเฉลี่ยเคลื่อนที่ 10 วัน (10-day SMA) ให้ออกทันที เพราะถือว่าโมเมนตัมกำลังชะลอตัว หรือหากการเบรกเอาต์ล้มเหลว ก็สามารถใช้ขอบล่างของกรอบราคาที่เพิ่งทะลุมาเป็นจุดตัดขาดทุนได้</li>
          <li><strong>ทางออกที่ 2 (Hard Stop Loss):</strong> ตั้งจุดตัดขาดทุนตายตัวที่ 10% ของเงินลงทุนในหุ้นตัวนั้นๆ (เช่น ลงทุน 10$ ขาดทุน 1$ ตัดทิ้งทันที) เพื่อจำกัดความเสี่ยงสูงสุด</li>
          <li><strong>ทางออกที่ 3 (Time Stop):</strong> <span className="text-amber-600 dark:text-amber-400 font-bold">ถือครองสูงสุดไม่เกิน 4 สัปดาห์</span> หากครบกำหนดแล้วราคาไม่ไปไหนให้ขายออกเพื่อนำเงินทุนไปหมุนเวียนในรอบถัดไป</li>
          <li><strong>ทางออกที่ 4 (Earnings Stop):</strong> จะไม่มีการถือสถานะสวิงเทรดข้ามช่วงประกาศผลประกอบการเด็ดขาด หากใกล้ถึงวันประกาศงบให้พิจารณาปิดสถานะก่อน</li>
          <li><strong>การทำกำไร (Take Profit):</strong> เมื่อหุ้นวิ่งขึ้นไปสร้างกำไร ควรตั้งเป้าหมายที่ให้อัตราส่วนความเสี่ยงต่อผลตอบแทนอย่างน้อย 1:2 (เช่น เสี่ยงขาดทุน 10% ควรคาดหวังกำไรที่ 20%)</li>
        </ul>
      </section>

      <section className="space-y-4 bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50 mt-6">
        <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400">✅ คำแนะนำสำหรับการประเมินผล</h3>
        <p className="text-sm">
          เพื่อให้การประเมินผลระบบนี้เป็นไปอย่างแม่นยำในระยะยาว แนะนำให้บันทึกผลลัพธ์ในหน้า Tracker และเมื่อครบกำหนด 4 สัปดาห์ หรือมีการตัดขาดทุน/ทำกำไร ให้นำผลลัพธ์และข้อสังเกตที่ได้มาทบทวนเพื่อปรับปรุงรอบการลงทุนในเดือนต่อๆ ไปครับ
        </p>
      </section>
    </div>
  );
}

export function WeeklySwingTracker({ userEmail, picks, onPicksChange, requestAlert, requestConfirm }) {
  const [totalCapital, setTotalCapital] = useState(0);
  const [transactionAmount, setTransactionAmount] = useState(5);
  
  // Trades state from localStorage for tracking realized PnL and exit dates
  const [tradeRecords, setTradeRecords] = useState({});

  useEffect(() => {
    if (userEmail) {
      const storedCapital = localStorage.getItem(`swingCapital_${userEmail}`);
      if (storedCapital) setTotalCapital(parseFloat(storedCapital));

      const storedRecords = localStorage.getItem(`swingTrades_${userEmail}`);
      if (storedRecords) setTradeRecords(JSON.parse(storedRecords));
    }
  }, [userEmail]);

  const saveCapital = (amount) => {
    setTotalCapital(amount);
    localStorage.setItem(`swingCapital_${userEmail}`, amount.toString());
  };

  const saveTradeRecords = (records) => {
    setTradeRecords(records);
    localStorage.setItem(`swingTrades_${userEmail}`, JSON.stringify(records));
  };

  const handleAddCapital = () => {
    const amount = parseFloat(transactionAmount) || 0;
    saveCapital(totalCapital + amount);
  };

  const calculateExpiry = (weekStartStr) => {
    if (!weekStartStr) return null;
    const date = new Date(weekStartStr);
    date.setDate(date.getDate() + 28); // 4 weeks
    return date;
  };

  const handleUpdateTrade = (pickId, field, value) => {
    const current = tradeRecords[pickId] || {};
    const updated = { ...current, [field]: value };
    const newRecords = { ...tradeRecords, [pickId]: updated };
    saveTradeRecords(newRecords);
  };

  const handleCloseTrade = (pickId) => {
    const current = tradeRecords[pickId] || {};
    if (current.isClosed) return; // Already closed

    const realizedPnL = parseFloat(current.pnl) || 0;
    const capitalInvested = parseFloat(current.capitalInvested) || 0;
    const totalReturn = capitalInvested + realizedPnL;
    
    const doClose = () => {
      // Update Trade Record
      const updated = { ...current, isClosed: true };
      const newRecords = { ...tradeRecords, [pickId]: updated };
      saveTradeRecords(newRecords);

      // Update Capital (Snowball)
      saveCapital(totalCapital + totalReturn);
      
      if (requestAlert) {
        requestAlert("✅ Trade Closed Successfully", `Returned $${capitalInvested.toFixed(2)} capital and $${realizedPnL.toFixed(2)} P/L (Total: $${totalReturn.toFixed(2)}) to your Snowball Capital.`);
      } else {
        alert(`Trade closed! Returned $${totalReturn.toFixed(2)} to your Snowball Capital.`);
      }
    };

    if (requestConfirm) {
      requestConfirm(
        "Confirm Close Trade", 
        `Are you sure you want to close this trade? This will return $${capitalInvested.toFixed(2)} capital + $${realizedPnL.toFixed(2)} P/L (Total $${totalReturn.toFixed(2)}) to your Snowball Capital.`, 
        doClose
      );
    } else {
      if (window.confirm(`Are you sure you want to close this trade? This will return $${totalReturn.toFixed(2)} to your Snowball Capital.`)) {
        doClose();
      }
    }
  };

  const handleReopenTrade = (pickId) => {
    const current = tradeRecords[pickId] || {};
    if (!current.isClosed) return; // Already open

    const realizedPnL = parseFloat(current.pnl) || 0;
    const capitalInvested = parseFloat(current.capitalInvested) || 0;
    const totalReturn = capitalInvested + realizedPnL;

    const doReopen = () => {
      // Update Trade Record
      const updated = { ...current, isClosed: false };
      const newRecords = { ...tradeRecords, [pickId]: updated };
      saveTradeRecords(newRecords);

      // Revert Capital (Snowball)
      saveCapital(totalCapital - totalReturn);
      
      if (requestAlert) {
        requestAlert("🔓 Trade Reopened", `Subtracted $${totalReturn.toFixed(2)} from your Snowball Capital to allow editing.`);
      } else {
        alert(`Trade reopened! Subtracted $${totalReturn.toFixed(2)} from your Snowball Capital.`);
      }
    };

    if (requestConfirm) {
      requestConfirm(
        "Confirm Edit Closed Trade", 
        `Are you sure you want to reopen this trade? This will subtract $${totalReturn.toFixed(2)} from your Snowball Capital.`, 
        doReopen
      );
    } else {
      if (window.confirm(`Are you sure you want to reopen this trade? This will subtract $${totalReturn.toFixed(2)} from your Snowball Capital.`)) {
        doReopen();
      }
    }
  };

  // Only show Triggered-Active or completed picks in Tracker
  const trackedPicks = picks.filter(p => ['Triggered-Active', 'Win', 'Loss', 'Breakeven'].includes(p.status));
  const suggestedSize = totalCapital > 0 ? totalCapital / 5 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Snowball Capital Manager */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-6 shadow-lg border-t-4 border-emerald-500">
        <h3 className="text-xl font-bold text-white mb-4">💰 Snowball Capital Manager</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Total Available Capital</p>
            <div className="text-5xl font-black text-emerald-400 mb-2">${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm text-slate-300">
              Suggested Buying Power (Div 5): <strong className="text-amber-400">${suggestedSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / stock</strong>
            </p>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-xl flex flex-col justify-center">
            <label className="block text-sm font-bold text-slate-300 mb-2">Deposit Capital (e.g. Weekly Top-up)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number"
                  step="0.01"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button 
                onClick={handleAddCapital}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                + Add
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Added capital will be included in the compounding formula.</p>
          </div>
        </div>
      </div>

      {/* Trades Tracker Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">📊 Active & Recent Trades Tracker</h3>
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded font-bold">{trackedPicks.length} Trades</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="p-4">Ticker</th>
                <th className="p-4">Week Start</th>
                <th className="p-4">Status</th>
                <th className="p-4 w-32">Capital Invested ($)</th>
                <th className="p-4 w-32">Profit and Loss ($)</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {trackedPicks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No active trades. Change a pick's status to "Triggered-Active" in the Planner tab to track it here.
                  </td>
                </tr>
              ) : (
                trackedPicks.map(pick => {
                  const expiry = calculateExpiry(pick.week_start_date);
                  const isExpired = expiry && new Date() > expiry;
                  const record = tradeRecords[pick.id] || {};
                  
                  return (
                    <tr key={pick.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold">
                        <div className="flex flex-col">
                          <span className="text-base">{pick.ticker}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{pick.sector}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span>{pick.week_start_date}</span>
                          {expiry && (
                            <span className={`text-[10px] ${isExpired ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                              Exp: {expiry.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          record.isClosed ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                          pick.status === 'Triggered-Active' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                        }`}>
                          {record.isClosed ? 'CLOSED (Settled)' : pick.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <input 
                          type="number"
                          step="0.01"
                          disabled={record.isClosed}
                          value={record.capitalInvested !== undefined ? record.capitalInvested : ''}
                          onChange={(e) => handleUpdateTrade(pick.id, 'capitalInvested', e.target.value)}
                          placeholder="e.g. 1000"
                          className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="number"
                          step="0.01"
                          disabled={record.isClosed}
                          value={record.pnl !== undefined ? record.pnl : ''}
                          onChange={(e) => handleUpdateTrade(pick.id, 'pnl', e.target.value)}
                          placeholder="e.g. 5.50 or -2.00"
                          className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="p-4">
                        {record.isClosed ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold text-xs">✓ Settled</span>
                            <button 
                              onClick={() => handleReopenTrade(pick.id)}
                              className="text-[10px] text-slate-400 hover:text-indigo-500 underline transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleCloseTrade(pick.id)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 px-3 py-1 rounded text-xs font-bold transition-colors"
                          >
                            Close & Compound
                          </button>
                        )}
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
  );
}
