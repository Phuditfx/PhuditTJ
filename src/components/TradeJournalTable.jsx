import React, { useState } from 'react';
import { simulateAIAssessment } from '../db/journalDB';
import * as XLSX from 'xlsx';

export default function TradeJournalTable({ trades, onUpdateTrade, onDeleteTrade, onClearAllTrades, onDeleteTradesByMonth }) {
  const [filterStatus, setFilterStatus] = useState('All'); // All, Open, Closed
  const [searchSymbol, setSearchSymbol] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  
  // สถานะสำหรับ Modal ปิดออเดอร์
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [exitPrice, setExitPrice] = useState('');
  const [contextScore, setContextScore] = useState(7);
  const [planAdherence, setPlanAdherence] = useState("ตามแผนส่วนตัว (+100%)");
  const [aiResult, setAiResult] = useState(null); // { aiScore, aiFeedback }

  // สถานะสำหรับการดูรายละเอียดข้อเสนอแนะ AI ของออเดอร์ที่ปิดแล้ว
  const [activeFeedbackTradeId, setActiveFeedbackTradeId] = useState(null);

  // คำนวณเดือนทั้งหมดที่มีข้อมูล
  const availableMonths = [...new Set(trades.map(t => {
    if (!t.dateTime) return null;
    const d = new Date(t.dateTime);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).filter(Boolean))].sort().reverse();

  // ตัวกรองและค้นหาข้อมูล
  const filteredTrades = trades.filter(trade => {
    const matchesStatus = filterStatus === 'All' || trade.status === filterStatus;
    const matchesSearch = trade.symbol.toLowerCase().includes(searchSymbol.toLowerCase());
    
    let matchesMonth = true;
    if (filterMonth !== 'All' && trade.dateTime) {
      const d = new Date(trade.dateTime);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = mStr === filterMonth;
    }
    
    return matchesStatus && matchesSearch && matchesMonth;
  });

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredTrades.map(t => ({
      'Date/Time': t.dateTime ? new Date(t.dateTime).toLocaleString() : '',
      'Symbol': t.symbol,
      'Direction': t.direction,
      'Entry Price': t.entryPrice,
      'Exit Price': t.actualExitPrice || '',
      'Stop Loss': t.stopLoss,
      'Take Profit': t.takeProfit,
      'Shares': t.shares,
      'PnL ($)': t.pnl,
      'Actual RR': t.actualRR || 0,
      'Context Score': t.contextScore || '',
      'AI Score': t.aiScore || '',
      'Plan Adherence': t.planAdherence || '',
      'Status': t.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trades");
    XLSX.writeFile(wb, "TradeJournal_Export.xlsx");
  };

  // เปิด Modal ปิดออเดอร์
  const handleOpenCloseModal = (trade) => {
    setSelectedTrade(trade);
    setExitPrice(trade.entryPrice.toString()); // ตั้งค่าเริ่มต้นเป็นราคาเข้าซื้อ
    setContextScore(7);
    setPlanAdherence("ตามแผนส่วนตัว (+100%)");
    setAiResult(null);
  };

  // เรียกจำลองประเมินผลอัจฉริยะด้วย AI
  const handleAIAssess = () => {
    const pExit = parseFloat(exitPrice) || 0;
    if (pExit <= 0) {
      alert("กรุณากรอกราคาปิดจริง (Actual Exit Price) ให้ถูกต้องก่อนรัน AI");
      return;
    }

    // คิดคะแนนวินัยตามข้อเลือก
    let score = 100;
    if (planAdherence.includes("FOMO") || planAdherence.includes("อารมณ์")) {
      score = 0;
    } else if (planAdherence.includes("บางส่วน")) {
      score = 50;
    }

    // คำนวณ PnL ล่วงหน้าเพื่อนำไปประเมิน
    const shares = parseFloat(selectedTrade.shares);
    const entry = parseFloat(selectedTrade.entryPrice);
    const sl = parseFloat(selectedTrade.stopLoss);
    const isLong = selectedTrade.direction === 'Long';
    const pnl = isLong ? (pExit - entry) * shares : (entry - pExit) * shares;

    const mockTradeForAI = {
      ...selectedTrade,
      actualExitPrice: pExit,
      pnl,
      planAdherenceScore: score,
      contextScore: parseInt(contextScore) || 7
    };

    const assessment = simulateAIAssessment(mockTradeForAI);
    setAiResult(assessment);
  };

  // ยืนยันปิดออเดอร์
  const handleConfirmClose = () => {
    const pExit = parseFloat(exitPrice) || 0;
    if (pExit <= 0) {
      alert("กรุณากรอกราคาปิดจริง (Actual Exit Price) ให้ถูกต้องก่อน");
      return;
    }

    // คิดคะแนนวินัยตามข้อเลือก
    let score = 100;
    if (planAdherence.includes("FOMO") || planAdherence.includes("อารมณ์")) {
      score = 0;
    } else if (planAdherence.includes("บางส่วน")) {
      score = 50;
    }

    const shares = parseFloat(selectedTrade.shares);
    const entry = parseFloat(selectedTrade.entryPrice);
    const sl = parseFloat(selectedTrade.stopLoss);
    const isLong = selectedTrade.direction === 'Long';
    const pnl = isLong ? (pExit - entry) * shares : (entry - pExit) * shares;

    // คำนวณ RR ที่ทำได้จริง
    let actualRR = 0;
    const gap = Math.abs(entry - sl);
    if (gap > 0) {
      actualRR = isLong ? (pExit - entry) / gap : (entry - pExit) / gap;
    }

    // หากยังไม่ได้กด AI Assess ให้ทำการประเมินก่อน
    let finalAI = aiResult;
    if (!finalAI) {
      const mockTradeForAI = {
        ...selectedTrade,
        actualExitPrice: pExit,
        pnl,
        planAdherenceScore: score,
        contextScore: parseInt(contextScore) || 7
      };
      finalAI = simulateAIAssessment(mockTradeForAI);
    }

    const updatedTrade = {
      ...selectedTrade,
      actualExitPrice: pExit,
      status: 'Closed',
      pnl,
      actualRR,
      contextScore: parseInt(contextScore) || 7,
      planAdherence,
      planAdherenceScore: score,
      aiScore: finalAI.aiScore,
      aiFeedback: finalAI.aiFeedback
    };

    onUpdateTrade(updatedTrade);
    setSelectedTrade(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg flex flex-col gap-6 transition-all duration-300">
      
      {/* ส่วนหัวของตาราง พร้อมตัวค้นหาและปุ่มเลือกฟิลเตอร์ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800/85 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📓 Trade Journal Entries</span>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
              {filteredTrades.length} Trades
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ประวัติการยิงออเดอร์ วิเคราะห์ระยะ RR และการถอดบทเรียนทางจิตวิทยา</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto items-end md:items-center justify-end">
          {/* ค้นหา */}
          <input 
            type="text"
            placeholder="ค้นหา Symbol..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            className="bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 font-mono text-sm text-indigo-600 dark:text-indigo-300 focus:outline-none focus:border-indigo-500 uppercase placeholder-slate-400 dark:placeholder-slate-600 sm:w-40"
          />

          {/* ฟิลเตอร์เดือน */}
          <div className="flex items-center gap-1.5">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer h-[32px]"
            >
              <option value="All">ทุกเดือน</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {filterMonth !== 'All' && (
              <button
                onClick={() => {
                  if (window.confirm(`⚠️ ยืนยันการลบประวัติการเทรดทั้งหมดของเดือน ${filterMonth} อย่างถาวร? (ไม่สามารถกู้คืนได้)`)) {
                    if (onDeleteTradesByMonth) {
                      onDeleteTradesByMonth(filterMonth);
                      setFilterMonth('All');
                    }
                  }
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/20 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer h-[32px] flex items-center gap-1 shadow-sm"
                title={`ลบประวัติการเทรดทั้งหมดของเดือน ${filterMonth}`}
              >
                🗑️ ลบเดือน {filterMonth}
              </button>
            )}
          </div>

          {/* ฟิลเตอร์สถานะ */}
          <div className="flex bg-slate-55 dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800">
            {['All', 'Open', 'Closed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* ปุ่ม Export Excel */}
          <button
            onClick={handleExportExcel}
            className="bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            📊 Export Excel
          </button>

          {/* ปุ่ม Clear Log */}
          <button
            onClick={() => {
              if (window.confirm("⚠️ ยืนยันการลบประวัติการเทรดทั้งหมดอย่างถาวร? (ไม่สามารถกู้คืนได้)")) {
                if (onClearAllTrades) onClearAllTrades();
              }
            }}
            className="bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            🗑️ Clear All Logs
          </button>
        </div>
      </div>

      {/* ตารางแสดงออเดอร์ */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <th className="py-3 px-4">Date/Time</th>
              <th className="py-3 px-3">Symbol</th>
              <th className="py-3 px-3">Dir</th>
              <th className="py-3 px-3 text-right">Entry / Exit</th>
              <th className="py-3 px-3 text-right">SL / TP</th>
              <th className="py-3 px-3 text-right">Shares</th>
              <th className="py-3 px-3 text-right">PnL ($)</th>
              <th className="py-3 px-3 text-center">Actual RR</th>
              <th className="py-3 px-4 text-center">Qualitative Analysis</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                  ไม่มีประวัติออเดอร์ตามเงื่อนไขตัวกรอง
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade) => {
                const isClosed = trade.status === 'Closed';
                
                return (
                  <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-800 dark:text-slate-200 transition-colors">
                    {/* วันเวลา */}
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-sans">
                      {trade.dateTime ? new Date(trade.dateTime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}
                    </td>
                    
                    {/* หุ้น */}
                    <td className="py-4 px-3 font-bold text-slate-900 dark:text-white text-sm font-sans uppercase">
                      {trade.symbol}
                    </td>
                    
                    {/* ทิศทาง */}
                    <td className="py-4 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        trade.direction === 'Long' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    
                    {/* ราคาเข้า/ออก */}
                    <td className="py-4 px-3 text-right">
                      <div className="text-slate-700 dark:text-slate-300 font-bold">${trade.entryPrice.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-405 dark:text-slate-500">
                        {isClosed ? `Exit: $${trade.actualExitPrice.toFixed(2)}` : 'Active'}
                      </div>
                    </td>
                    
                    {/* SL/TP */}
                    <td className="py-4 px-3 text-right text-slate-400">
                      <div className="text-rose-600 dark:text-rose-400/80">SL: ${trade.stopLoss.toFixed(2)}</div>
                      <div className="text-indigo-650 dark:text-indigo-400/80">TP: ${trade.takeProfit.toFixed(2)}</div>
                    </td>
                    
                    {/* หุ้นเศษ */}
                    <td className="py-4 px-3 text-right text-slate-700 dark:text-slate-300 font-bold">
                      {trade.shares.toFixed(4)}
                    </td>
                    
                    {/* PnL ($) */}
                    <td className={`py-4 px-3 text-right text-sm font-extrabold ${
                      !isClosed 
                        ? 'text-slate-400 dark:text-slate-500' 
                        : trade.pnl >= 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {!isClosed ? '-' : `${trade.pnl >= 0 ? '+' : '-'}$${Math.abs(trade.pnl).toFixed(2)}`}
                    </td>
                    
                    {/* Actual RR */}
                    <td className="py-4 px-3 text-center">
                      {!isClosed ? (
                        <span className="text-slate-500">-</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded font-black text-xs ${
                          trade.actualRR >= 2 
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                            : trade.actualRR >= 0 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' 
                              : 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        }`}>
                          {trade.actualRR.toFixed(4)} R
                        </span>
                      )}
                    </td>
                    
                    {/* Qualitative Analysis */}
                    <td className="py-4 px-4 font-sans text-center">
                      {!isClosed ? (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">รอประเมินผลปิดไม้</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {/* Context Score */}
                          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-500 dark:text-slate-400">
                            🌌 {trade.contextScore}/10
                          </div>

                          {/* AI Score */}
                          {trade.aiScore && (
                            <button
                              onClick={() => setActiveFeedbackTradeId(activeFeedbackTradeId === trade.id ? null : trade.id)}
                              className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-900/50 px-2 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400 font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                              title="คลิกเพื่อเปิดดู AI รีวิว"
                            >
                              <span>⚡ AI: {trade.aiScore}/10</span>
                              <span className="text-[9px] text-slate-500">▼</span>
                            </button>
                          )}

                          {/* Plan Adherence Indicator */}
                          <div className={`w-2 h-2 rounded-full ${
                            trade.planAdherenceScore === 100 
                              ? 'bg-emerald-400' 
                              : trade.planAdherenceScore === 50 
                                ? 'bg-amber-400' 
                                : 'bg-rose-400'
                          }`} title={trade.planAdherence}></div>
                        </div>
                      )}
                    </td>
                    
                    {/* จัดการปุ่ม Close / Delete */}
                    <td className="py-4 px-4 text-right font-sans">
                      <div className="flex justify-end gap-2">
                        {!isClosed && (
                          <button
                            onClick={() => handleOpenCloseModal(trade)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm("คุณแน่ใจว่าต้องการลบออเดอร์นี้จาก Journal?")) {
                              onDeleteTrade(trade.id);
                            }
                          }}
                          className="bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-955/40 text-slate-405 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/40 px-2 py-1 rounded text-xs transition-colors cursor-pointer font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 🔮 แสดงข้อความฟีดแบ็ก AI ในหน้าต่างยืดหดได้ */}
      {activeFeedbackTradeId && (
        (() => {
          const t = trades.find(tr => tr.id === activeFeedbackTradeId);
          if (!t) return null;
          return (
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-lg flex flex-col gap-2 relative animate-fade-in glow-card-indigo">
              <div className="flex justify-between items-center border-b border-indigo-200 dark:border-indigo-900/40 pb-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5">
                  <span>⚡ AI Coach Feedback for {t.symbol}</span>
                </span>
                <button 
                  onClick={() => setActiveFeedbackTradeId(null)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 text-xs font-bold cursor-pointer"
                >
                  ✕ ปิดข้อแนะนำ
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans mt-1">
                {t.aiFeedback}
              </p>
              <div className="flex gap-4 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/20">
                <span>สภาวะตลาด: <strong className="text-slate-800 dark:text-slate-200 font-mono">{t.contextScore}/10</strong></span>
                <span>ระดับวินัย: <strong className="text-emerald-600 dark:text-emerald-400">{t.planAdherence}</strong></span>
              </div>
            </div>
          );
        })()
      )}

      {/* 🚪 MODAL ปิดออเดอร์ (Close Trade Modal) */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 relative glow-card-emerald">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3">
              <div>
                <h3 className="text-lg font-bold text-emerald-650 dark:text-emerald-400">🚪 Close Trade Setup - {selectedTrade.symbol}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                  {selectedTrade.direction} • {selectedTrade.shares.toFixed(4)} Shares
                </p>
              </div>
              <button 
                onClick={() => setSelectedTrade(null)} 
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 font-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Inputs Form */}
            <div className="flex flex-col gap-4">
              {/* Actual Exit Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Actual Exit Price ($)</label>
                <input 
                  type="number"
                  value={exitPrice}
                  onChange={(e) => {
                    setExitPrice(e.target.value);
                    setAiResult(null); // เคลียร์ผลลัพธ์ AI เดิมเพื่อให้ประเมินใหม่
                  }}
                  placeholder="กรอกราคาปิดออเดอร์..."
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Context Score Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 uppercase font-semibold">Context Score (Market Setup)</span>
                  <span className="font-mono font-bold text-indigo-650 dark:text-indigo-400">{contextScore} / 10</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={contextScore}
                  onChange={(e) => {
                    setContextScore(parseInt(e.target.value));
                    setAiResult(null);
                  }}
                  className="w-full accent-indigo-500 h-1 bg-slate-100 dark:bg-slate-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <span>🔴 ตลาดแย่มาก</span>
                  <span>🟡 ตลาดปานกลาง</span>
                  <span>🟢 ตลาดสมบูรณ์แบบ</span>
                </div>
              </div>

              {/* Plan Adherence Selection (Dropdown) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Plan Adherence (วินัยการเล่น)</label>
                <select
                  value={planAdherence}
                  onChange={(e) => {
                    setPlanAdherence(e.target.value);
                    setAiResult(null);
                  }}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-sans text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="เทรดตาม Teacher's (Ajarn) Live (+100%)">เทรดตาม Teacher's (Ajarn) Live (ถือว่าทำตามแผน 100%)</option>
                  <option value="ตามแผนส่วนตัว (+100%)">ตามแผนการเทรดส่วนตัว (ทำตามลิมิตและเป้าหมาย 100%)</option>
                  <option value="ตามแผนบ้างบางส่วน (+50%)">ตามแผนบ้างบางส่วน (มีแหกกฎลิมิตเล็กน้อย 50%)</option>
                  <option value="เทรดด้วยอารมณ์/FOMO (0%)">เทรดหลุดแผน/เทรดด้วยอารมณ์ FOMO ไล่ราคา (0%)</option>
                </select>
              </div>
            </div>

            {/* AI Assessment Button and Panel */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAIAssess}
                className="bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-950/20"
              >
                <span>⚡ AI ASSESS (จำลองประเมินความคิดความอ่าน)</span>
              </button>

              {aiResult && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-lg flex flex-col gap-2 glow-card-indigo animate-fade-in mt-1">
                  <div className="flex justify-between items-center border-b border-indigo-200 dark:border-indigo-900/40 pb-2">
                    <span className="font-bold text-indigo-650 dark:text-indigo-400 text-xs">🤖 AI Coach Evaluation</span>
                    <span className="bg-indigo-500 text-white font-mono font-black text-xs px-2 py-0.5 rounded shadow">
                      Score: {aiResult.aiScore}/10
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {aiResult.aiFeedback}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 pt-4 mt-2">
              <button
                onClick={() => setSelectedTrade(null)}
                className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Confirm Close Trade 🚪
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
