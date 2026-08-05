import React, { useState, useEffect, useRef } from 'react';
import { simulateAIAssessment } from '../db/journalDB';
import { fetchRealTimePrice } from '../api/priceApi';
import * as XLSX from 'xlsx';
import LightweightChartComponent from './LightweightChartComponent';
import { useLanguage } from '../contexts/LanguageContext';
import { Download } from 'lucide-react';

const TradeRow = React.memo(({
  trade,
  livePrice,
  isVip,
  isFeedbackActive,
  setActiveFeedbackTradeId,
  setChartModalTrade,
  handleOpenEditModal,
  handleOpenCloseModal,
  requestConfirm,
  onDeleteTrade,
  pnlDisplayMode = 'pnl'
}) => {
  const isClosed = trade.status === 'Closed';
  
  return (
    <React.Fragment>
      <tr className={`hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-800 dark:text-slate-200 transition-colors ${isFeedbackActive ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
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
          {trade.tiEntryAlert > 0 && !isClosed && (
            <div className="text-[10px] text-amber-600 dark:text-amber-500 font-bold mb-0.5">TI: ${trade.tiEntryAlert.toFixed(2)}</div>
          )}
          <div className="text-slate-700 dark:text-slate-300 font-bold">
            En: ${Number(trade.entryPrice).toFixed(2)}
            {trade.tiEntryAlert > 0 && !isClosed && (() => {
              const isLong = trade.direction === 'Long';
              const diff = isLong 
                ? trade.tiEntryAlert - trade.entryPrice 
                : trade.entryPrice - trade.tiEntryAlert;
              const pct = (diff / trade.tiEntryAlert) * 100;
              const isPositive = pct >= 0;
              
              return (
                <span className={`ml-1 text-[9px] ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} title="Variance from Day Breakout">
                  ({isPositive ? '+' : ''}{pct.toFixed(2)}%)
                </span>
              );
            })()}
          </div>
          <div className="text-[10px] text-slate-405 dark:text-slate-500">
            {isClosed ? `Ex: $${trade.actualExitPrice.toFixed(2)}` : 'Active'}
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
        <td className={`py-4 px-3 text-right text-sm font-extrabold relative ${
          !isClosed && !livePrice
            ? 'text-slate-400 dark:text-slate-500' 
            : (() => {
                const pnl = isClosed ? parseFloat(trade.pnl || 0) : (trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares);
                return pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
              })()
        }`}>
          <div className={!isVip ? 'blur-sm select-none pointer-events-none' : ''}>
            {(() => {
              let pnlVal = null;
              if (isClosed) {
                pnlVal = parseFloat(trade.pnl || 0);
              } else if (livePrice) {
                pnlVal = trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares;
              }

              if (pnlVal === null) return '-';

              if (pnlDisplayMode === 'rr') {
                let rrToShow = null;
                if (isClosed) {
                  rrToShow = trade.actualRR;
                } else if (livePrice) {
                  const gap = Math.abs(trade.entryPrice - trade.stopLoss);
                  const initialRisk = trade.plannedRisk || (gap * trade.shares);
                  if (initialRisk > 0) rrToShow = pnlVal / initialRisk;
                }
                if (rrToShow === null) return <span className="blur-sm select-none pointer-events-none">***</span>;
                return <span className={!isClosed ? 'animate-pulse' : ''}>{rrToShow >= 0 ? '+' : ''}{rrToShow.toFixed(2)} R</span>;
              }

              return <span className={!isClosed ? 'animate-pulse' : ''}>{pnlVal >= 0 ? '+' : '-'}${Math.abs(pnlVal).toFixed(2)}</span>;
            })()}
          </div>
          {!isVip && (
            <div className="absolute inset-0 flex items-center justify-end z-10 opacity-70">
              <span className="text-xs">🔒</span>
            </div>
          )}
        </td>
        
        {/* Actual RR */}
        <td className="py-4 px-3 text-center relative">
          <div className={!isVip ? 'blur-sm select-none pointer-events-none' : ''}>
            {(() => {
              let rrToShow = null;
              if (isClosed) {
                rrToShow = trade.actualRR;
              } else if (livePrice) {
                const pnl = trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares;
                const gap = Math.abs(trade.entryPrice - trade.stopLoss);
                const initialRisk = trade.plannedRisk || (gap * trade.shares);
                if (initialRisk > 0) {
                  rrToShow = pnl / initialRisk;
                }
              }

              if (rrToShow === null) {
                return <span className="text-slate-500">-</span>;
              }

              return (
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className={`px-2 py-0.5 rounded font-black text-xs ${!isClosed ? 'opacity-80 animate-pulse' : ''} ${
                    rrToShow >= 2 
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : rrToShow >= 0 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' 
                        : 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {rrToShow.toFixed(4)} R
                  </span>
                  {trade.isSplit && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded font-bold cursor-help" title="ไม้แบ่งปิดออเดอร์: RR อ้างอิงจาก Risk ตั้งต้น">
                      SPLIT
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          {!isVip && (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-70">
              <span className="text-xs">🔒</span>
            </div>
          )}
        </td>
        
        {/* Qualitative Analysis */}
        <td className="py-4 px-4 font-sans text-center relative">
          <div className={!isVip ? 'blur-sm select-none pointer-events-none' : ''}>
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
                    onClick={() => setActiveFeedbackTradeId(isFeedbackActive ? null : trade.id)}
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

                {/* Notes Icon */}
                {trade.notes && (
                  <span className="text-[12px] cursor-help ml-1" title={trade.notes}>
                    📝
                  </span>
                )}
              </div>
            )}
          </div>
          {!isVip && (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-70">
              <span className="text-xs">🔒 VIP</span>
            </div>
          )}
        </td>
        
        {/* จัดการปุ่ม Close / Edit / Delete */}
        <td className="py-4 px-4 text-right font-sans sticky right-0 bg-white dark:bg-[#0f172a] shadow-[-8px_0_15px_-5px_rgba(0,0,0,0.1)] z-10 border-l border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-1.5 w-max ml-auto">
            <button
              onClick={() => setChartModalTrade(trade)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-2 py-1 rounded text-xs transition-colors cursor-pointer shadow-sm shadow-sky-900/20"
            >
              Chart
            </button>
            {!isClosed && (
              <button
                onClick={() => handleOpenEditModal(trade)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2 py-1 rounded text-xs transition-colors cursor-pointer shadow-sm shadow-amber-900/20"
              >
                Edit
              </button>
            )}
            {!isClosed ? (
              <button
                onClick={() => handleOpenCloseModal(trade)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            ) : (
              <button
                onClick={() => handleOpenCloseModal(trade)}
                className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-800/80 font-bold px-2 py-1 rounded text-xs transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => {
                requestConfirm(
                  "ลบออเดอร์",
                  "คุณแน่ใจว่าต้องการลบออเดอร์นี้จาก Journal อย่างถาวร?",
                  () => onDeleteTrade(trade.id)
                );
              }}
              className="bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-955/40 text-slate-405 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/40 px-2 py-1 rounded text-xs transition-colors cursor-pointer font-semibold"
            >
              Del
            </button>
          </div>
        </td>
      </tr>
      
      {/* Expanded AI Coach Feedback Row */}
      {isFeedbackActive && (
        <tr>
          <td colSpan="10" className="p-0 border-b-2 border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/20">
            <div className="p-4 border-l-4 border-indigo-500 animate-fade-in shadow-inner">
              <div className="flex justify-between items-center pb-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5">
                  <span>⚡ AI Coach Feedback for {trade.symbol}</span>
                </span>
                <button 
                  onClick={() => setActiveFeedbackTradeId(null)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 text-xs font-bold cursor-pointer"
                >
                  ✕ ปิดข้อแนะนำ
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans mt-1 whitespace-pre-wrap">
                {trade.aiFeedback}
              </p>
              {trade.notes && (
                <div className="mt-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-600 dark:text-slate-400 font-sans whitespace-pre-wrap">
                  <span className="font-bold">📝 หมายเหตุ:</span><br/>{trade.notes}
                </div>
              )}
              <div className="flex gap-4 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/20">
                <span>สภาวะตลาด: <strong className="text-slate-800 dark:text-slate-200 font-mono">{trade.contextScore}/10</strong></span>
                <span>ระดับวินัย: <strong className="text-emerald-600 dark:text-emerald-400">{trade.planAdherence}</strong></span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

// 📱 Mobile Card View Component
const TradeCard = React.memo(({
  trade,
  livePrice,
  isVip,
  isFeedbackActive,
  setActiveFeedbackTradeId,
  setChartModalTrade,
  handleOpenEditModal,
  handleOpenCloseModal,
  requestConfirm,
  onDeleteTrade,
  setViewingImage,
  setSummaryTrade,
  pnlDisplayMode = 'pnl'
}) => {
  const isClosed = trade.status === 'Closed';

  // Calculate PnL
  const pnl = isClosed 
    ? parseFloat(trade.pnl || 0) 
    : (livePrice 
      ? (trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares)
      : null);

  // Calculate RR
  let rrToShow = null;
  if (isClosed) {
    rrToShow = trade.actualRR;
  } else if (livePrice) {
    const livePnl = trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares;
    const gap = Math.abs(trade.entryPrice - trade.stopLoss);
    const initialRisk = trade.plannedRisk || (gap * trade.shares);
    if (initialRisk > 0) rrToShow = livePnl / initialRisk;
  }

  return (
    <div 
      onClick={() => setSummaryTrade && setSummaryTrade(trade)}
      className={`bg-white dark:bg-slate-900/80 border rounded-xl p-4 flex flex-col gap-3 transition-all shadow-sm hover:shadow-md cursor-pointer ${
      isFeedbackActive 
        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20' 
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      {/* Top Row: Symbol + Direction + Date */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight flex items-center">{trade.symbol}
            {(trade.imageUrlBefore || trade.imageUrl) && (
              <button 
                onClick={(e) => { e.stopPropagation(); setViewingImage(trade.imageUrlBefore || trade.imageUrl); }}
                className="ml-1 text-slate-400 hover:text-indigo-500 transition-colors"
                title={trade.pumpStage === 'After Pump (กราฟหลังวิ่ง)' ? "View After Pump Image" : "View Before Pump Image"}
              >
                {trade.pumpStage === 'After Pump (กราฟหลังวิ่ง)' ? '📸' : '🖼️'}
              </button>
            )}
            {trade.imageUrlAfter && (
              <button 
                onClick={(e) => { e.stopPropagation(); setViewingImage(trade.imageUrlAfter); }}
                className="ml-1 text-slate-400 hover:text-emerald-500 transition-colors"
                title="View After Pump Image"
              >
                📸
              </button>
            )}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
            trade.direction === 'Long' 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
          }`}>
            {trade.direction}
          </span>
          {!isClosed && (
            <span className="text-[9px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse">
              OPEN
            </span>
          )}
          {trade.isSplit && (
            <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded font-bold">SPLIT</span>
          )}
        </div>
      </div>

      {/* Middle: Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400 font-semibold">Open:</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">{trade.dateTime ? new Date(trade.dateTime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-semibold">Close:</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">{isClosed && trade.exitDateTime ? new Date(trade.exitDateTime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-semibold">Entry:</span>
          <span className="text-slate-700 dark:text-slate-300 font-bold font-mono">${Number(trade.entryPrice).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-semibold">Exit:</span>
          <span className="text-slate-700 dark:text-slate-300 font-bold font-mono">
            {isClosed ? `$${trade.actualExitPrice.toFixed(2)}` : <span className="text-amber-500 italic">Active</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-rose-400 font-semibold">SL:</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">${trade.stopLoss.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-indigo-400 font-semibold">TP:</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">${trade.takeProfit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-semibold">Shares:</span>
          <span className="text-slate-700 dark:text-slate-300 font-bold font-mono">{trade.shares.toFixed(4)}</span>
        </div>
        <div className="flex justify-between relative">
          <span className="text-slate-400 font-semibold">RR:</span>
          <div className={!isVip ? 'blur-sm select-none' : ''}>
            {rrToShow !== null ? (
              <span className={`font-black font-mono ${
                rrToShow >= 2 ? 'text-emerald-600 dark:text-emerald-400' : rrToShow >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'
              }`}>{rrToShow.toFixed(2)} R</span>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
        </div>
      </div>

      {/* P/L Display */}
      <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${
        pnl !== null && pnl >= 0 
          ? 'bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20' 
          : pnl !== null 
            ? 'bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20'
            : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800'
      }`}>
        <span className="text-[10px] text-slate-400 font-bold uppercase">P/L</span>
        <div className={!isVip ? 'blur-sm select-none' : ''}>
          {pnl !== null ? (
            <span className={`font-mono font-black text-sm ${
              pnlDisplayMode === 'rr'
                ? (rrToShow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                : (pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
            } ${!isClosed ? 'animate-pulse' : ''}`}>
              {pnlDisplayMode === 'rr' 
                ? (rrToShow !== null ? `${rrToShow >= 0 ? '+' : ''}${rrToShow.toFixed(2)} R` : <span className="blur-sm">***</span>)
                : `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`
              }
            </span>
          ) : (
            <span className="text-slate-400 text-sm">-</span>
          )}
        </div>
        {!isVip && <span className="text-xs">🔒</span>}
      </div>

      {/* AI Score + Context (if closed) */}
      {isClosed && isVip && (
        <div className="flex items-center gap-2 flex-wrap">
          {trade.contextScore !== undefined && (
            <span className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-500">
              🌌 {trade.contextScore}/10
            </span>
          )}
          {trade.aiScore && (
            <button
              onClick={() => setActiveFeedbackTradeId(isFeedbackActive ? null : trade.id)}
              className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-900/50 px-2 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              ⚡ AI: {trade.aiScore}/10 ▼
            </button>
          )}
          {trade.planAdherence && (
            <div className={`w-2 h-2 rounded-full ${trade.planAdherenceScore === 100 ? 'bg-emerald-400' : trade.planAdherenceScore === 50 ? 'bg-amber-400' : 'bg-rose-400'}`} title={trade.planAdherence}></div>
          )}
          {trade.notes && <span className="text-[11px] cursor-help" title={trade.notes}>📝</span>}
        </div>
      )}

      {/* AI Feedback Expanded */}
      {isFeedbackActive && (
        <div className="p-3 border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-r-lg animate-fade-in">
          <div className="flex justify-between items-center pb-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">⚡ AI Coach Feedback</span>
            <button onClick={() => setActiveFeedbackTradeId(null)} className="text-slate-400 text-[10px] font-bold cursor-pointer">✕</button>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mt-1">{trade.aiFeedback}</p>
        </div>
      )}

      {/* Bottom: Action Buttons */}
      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <button
          onClick={(e) => { e.stopPropagation(); setChartModalTrade(trade); }}
          className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg text-[11px] transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
        >
          📈 Chart
        </button>
        {!isClosed && (
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(trade); }}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-[11px] transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
          >
            ✏️ Edit
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleOpenCloseModal(trade); }}
          className={`flex-1 font-bold py-2 rounded-lg text-[11px] transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 ${
            !isClosed 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
              : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-800/80'
          }`}
        >
          {!isClosed ? '🚪 Close' : '✏️ Edit'}
        </button>
        <button
          onClick={() => {
            requestConfirm(
              "ลบออเดอร์",
              "คุณแน่ใจว่าต้องการลบออเดอร์นี้จาก Journal อย่างถาวร?",
              () => onDeleteTrade(trade.id)
            );
          }}
          className="bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/40 py-2 px-3 rounded-lg text-[11px] transition-colors cursor-pointer font-semibold"
        >
          🗑️
        </button>
      </div>
    </div>
  );
});

// 🖥️ Desktop Card View Component (visible on PC)
const DesktopTradeCard = React.memo(({
  trade,
  livePrice,
  isVip,
  isFeedbackActive,
  setActiveFeedbackTradeId,
  setChartModalTrade,
  handleOpenEditModal,
  handleOpenCloseModal,
  requestConfirm,
  onDeleteTrade,
  setViewingImage,
  setSummaryTrade,
  pnlDisplayMode = 'pnl'
}) => {
  const { t } = useLanguage();
  const isClosed = trade.status === 'Closed';

  // Calculate PnL
  const pnl = isClosed 
    ? parseFloat(trade.pnl || 0) 
    : (livePrice 
      ? (trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares)
      : null);

  // Calculate RR
  let rrToShow = null;
  if (isClosed) {
    rrToShow = trade.actualRR;
  } else if (livePrice) {
    const livePnl = trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares;
    const gap = Math.abs(trade.entryPrice - trade.stopLoss);
    const initialRisk = trade.plannedRisk || (gap * trade.shares);
    if (initialRisk > 0) rrToShow = livePnl / initialRisk;
  }

  // Format date nicely
  const formattedDate = trade.dateTime 
    ? new Date(trade.dateTime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) 
    : '-';

  return (
    <div 
      onClick={() => setSummaryTrade && setSummaryTrade(trade)}
      className={`bg-white dark:bg-[#0f172a]/90 border rounded-xl p-5 flex flex-col gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
        isFeedbackActive 
          ? 'border-indigo-500 dark:border-indigo-700 ring-2 ring-indigo-500/10' 
          : 'border-slate-200 dark:border-slate-800/80'
      }`}>
      {/* 🚀 Header: Symbol, Direction, Status */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/40">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight font-sans flex items-center">
            {trade.symbol}
            {(trade.imageUrlBefore || trade.imageUrl) && (
              <button 
                onClick={(e) => { e.stopPropagation(); setViewingImage(trade.imageUrlBefore || trade.imageUrl); }}
                className="ml-2 text-slate-400 hover:text-indigo-500 transition-colors text-base"
                title={trade.pumpStage === 'After Pump (กราฟหลังวิ่ง)' ? "View After Pump Image" : "View Before Pump Image"}
              >
                {trade.pumpStage === 'After Pump (กราฟหลังวิ่ง)' ? '📸' : '🖼️'}
              </button>
            )}
            {trade.imageUrlAfter && (
              <button 
                onClick={(e) => { e.stopPropagation(); setViewingImage(trade.imageUrlAfter); }}
                className="ml-2 text-slate-400 hover:text-emerald-500 transition-colors text-base"
                title="View After Pump Image"
              >
                📸
              </button>
            )}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-black font-sans ${
            trade.direction === 'Long' 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
          }`}>
            {trade.direction}
          </span>
          {!isClosed ? (
            <span className="text-[9px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse font-sans">
              OPEN
            </span>
          ) : (
            <span className="text-[9px] bg-slate-50 dark:bg-slate-800/30 text-slate-500 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded font-bold font-sans">
              CLOSED
            </span>
          )}
          {trade.isSplit && (
            <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold font-sans">
              SPLIT
            </span>
          )}
        </div>
      </div>

      {/* 📊 Content Grid (2 Columns) */}
      <div className="grid grid-cols-[1fr_1.8fr] gap-4 py-1 mt-1">
        {/* Col 1: Position Info (Left) */}
        <div className="flex flex-col gap-2 border-r border-slate-100 dark:border-slate-800/40 pr-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold">Shares</span>
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
              {trade.shares.toFixed(4)}
            </span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold">Open Date</span>
            <span className="text-[10.5px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 tracking-tighter">
              {formattedDate}
            </span>
          </div>
          <div className="flex flex-col mt-1.5">
            <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold">Close Date</span>
            <span className="text-[10.5px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 tracking-tighter">
              {isClosed ? (trade.exitDateTime || trade.dateTime ? new Date(trade.exitDateTime || trade.dateTime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-') : '-'}
            </span>
          </div>
          {trade.tiEntryAlert > 0 && !isClosed && (
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-600 dark:text-amber-500 uppercase font-semibold">TI Trigger</span>
              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-500 mt-0.5">
                ${trade.tiEntryAlert.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Col 2: Pricing & Profit (Right) */}
        <div className="flex flex-col justify-between">
          {/* Row 1: Prices & Stop/Target */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold">Prices</span>
              <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5 flex flex-col gap-0.5">
                <div className="flex justify-between gap-1.5">
                  <span className="text-slate-400 font-semibold">Entry:</span>
                  <span>${Number(trade.entryPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-1.5">
                  <span className="text-slate-400 font-semibold">Exit:</span>
                  <span>
                    {isClosed ? `$${trade.actualExitPrice.toFixed(2)}` : <span className="text-amber-500 font-normal italic">Active</span>}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold">Stop/Target</span>
              <div className="text-xs font-bold font-mono mt-0.5 flex flex-col gap-0.5">
                <div className="flex justify-between text-rose-600 dark:text-rose-400/80">
                  <span>SL:</span>
                  <span>${trade.stopLoss.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400/80">
                  <span>TP:</span>
                  <span>${trade.takeProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Net P/L & Risk Reward */}
          <div className="grid grid-cols-2 gap-3 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/40">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold text-center mb-1">Net P/L</span>
              <div className={`py-1 px-2 rounded-lg relative text-center flex items-center justify-center border ${
                pnl !== null && pnl >= 0 
                  ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20' 
                  : pnl !== null 
                    ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}>
                <div className={`w-full ${!isVip ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  {pnl !== null ? (
                    <span className={`font-mono font-black text-[13px] ${
                      pnlDisplayMode === 'rr'
                        ? (rrToShow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                        : (pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                    } ${!isClosed ? 'animate-pulse' : ''}`}>
                      {pnlDisplayMode === 'rr'
                        ? (rrToShow !== null ? `${rrToShow >= 0 ? '+' : ''}${rrToShow.toFixed(2)} R` : <span className="blur-sm">***</span>)
                        : `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`
                      }
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[13px] font-mono">-</span>
                  )}
                </div>
                {!isVip && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 opacity-70">
                    <span className="text-[10px]" title="VIP Only">🔒 VIP</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-semibold text-center mb-1">Risk Reward</span>
              <div className={`text-center flex justify-center items-center ${!isVip ? 'blur-sm select-none pointer-events-none' : ''}`}>
                {rrToShow !== null ? (
                  <span className={`py-1 px-2 w-full rounded-lg font-black text-[13px] font-mono inline-block border ${
                    rrToShow >= 2 
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-250/20' 
                      : rrToShow >= 0 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800' 
                        : 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-250/20'
                  }`}>
                    {rrToShow.toFixed(2)} R
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono text-[13px]">-</span>
                )}
              </div>
              {!isVip && (
                <div className="text-[9px] text-slate-400 text-center font-bold mt-0.5">🔒 VIP</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🛠️ Bottom Action Buttons Bar */}
      <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/40 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isVip) {
              if (requestAlert) requestAlert("VIP Only", "คุณสมบัตินี้สำหรับสมาชิก VIP เท่านั้น");
              else alert("คุณสมบัตินี้สำหรับสมาชิก VIP เท่านั้น");
              return;
            }
            setChartModalTrade(trade);
          }}
          className={`flex-1 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 ${
            isVip 
              ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-955/20' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
          }`}
          title={isVip ? "ดูชาร์ตกราฟ" : "VIP Only"}
        >
          📈 Chart {!isVip && '🔒'}
        </button>
        {!isClosed && (
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(trade); }}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm shadow-amber-955/20 flex items-center justify-center gap-1"
            title="แก้ไขการตั้งค่า"
          >
            ✏️ Edit
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleOpenCloseModal(trade); }}
          className={`flex-1 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 ${
            !isClosed 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-955/20' 
              : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-850 hover:bg-indigo-100 dark:hover:bg-indigo-850/80'
          }`}
          title={!isClosed ? 'ปิดออเดอร์' : 'แก้ไขเวลาปิด/ราคาปิด'}
        >
          {!isClosed ? 'Close' : 'Edit'}
        </button>
        <button
          onClick={() => {
            requestConfirm(
              "ลบออเดอร์",
              "คุณแน่ใจว่าต้องการลบออเดอร์นี้จาก Journal อย่างถาวร?",
              () => onDeleteTrade(trade.id)
            );
          }}
          className="bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-955/40 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-250 py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer font-bold"
          title="ลบออเดอร์"
        >
          Del
        </button>
      </div>

      {/* 🌌 Footer Row: Market Context & Notes & AI Coach Button */}
      {isClosed && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 mt-1 flex-wrap">
          {/* Quality Stats */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-sans">
            {trade.contextScore !== undefined && (
              <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400 font-bold" title="สภาวะตลาด">
                🌌 {trade.contextScore}/10
              </span>
            )}
            {trade.planAdherence && (
              <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5" title="ระดับวินัย">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  trade.planAdherenceScore === 100 
                    ? 'bg-emerald-400' 
                    : trade.planAdherenceScore === 50 
                      ? 'bg-amber-400' 
                      : 'bg-rose-400'
                }`}></span>
                {trade.planAdherence}
              </span>
            )}
            {trade.notes && (
              <span className="text-xs cursor-help inline-flex" title={trade.notes}>
                📝
              </span>
            )}
          </div>

          {/* Glowing AI Coach Button */}
          {trade.aiScore && isVip && (
            <button
              onClick={() => setActiveFeedbackTradeId(isFeedbackActive ? null : trade.id)}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900 dark:hover:to-purple-900 border border-indigo-200 dark:border-indigo-900/50 px-2.5 py-1.5 rounded-lg text-[11px] text-indigo-600 dark:text-indigo-400 font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:shadow-indigo-100/50"
              title="คลิกดูคำแนะนำจาก AI Coach"
            >
              <span>⚡ AI Review: {trade.aiScore}/10</span>
              <span className="text-[9px] text-indigo-400">{isFeedbackActive ? '▲' : '▼'}</span>
            </button>
          )}
        </div>
      )}

      {/* ⚡ AI Coach Feedback Box (Optimized sizing & padding) */}
      {isFeedbackActive && isVip && (
        <div className="border-t border-dashed border-indigo-200 dark:border-indigo-850 pt-3.5 mt-2 animate-fade-in w-full">
          <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/15 dark:to-purple-950/10 p-3.5 rounded-lg border border-indigo-100/60 dark:border-indigo-900/30 w-full relative">
            <div className="flex justify-between items-center pb-2 border-b border-indigo-100/40 dark:border-indigo-900/20 mb-2">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5">
                <span>⚡ AI Coach Feedback</span>
              </span>
              <button 
                onClick={() => setActiveFeedbackTradeId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans break-words whitespace-pre-wrap">
              {trade.aiFeedback}
            </p>

            {trade.notes && (
              <div className="mt-2.5 p-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-600 dark:text-slate-400 font-sans whitespace-pre-wrap">
                <span className="font-bold text-slate-500">📝 Notes:</span><br/>{trade.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default function TradeJournalTable({ currentUser, trades, onUpdateTrade, onAddTrade, onDeleteTrade, onClearAllTrades, onDeleteTradesByDateRange, onImportData, onExportJSON, requestConfirm, requestPrompt, requestAlert, plans = [], setups = [], isVip, pnlDisplayMode = 'pnl', accounts = [] }) {
  const { t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('Open'); // All, Open, Closed
  const [searchSymbol, setSearchSymbol] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('RR'); // Date, RR
  const [livePrices, setLivePrices] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Image Upload States

  // Backward compatibility
  const [tradeImage, setTradeImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterStartDate, filterEndDate, searchSymbol, trades]);

  // โหลดราคาปัจจุบันของออเดอร์ที่ยังเปิดอยู่
  useEffect(() => {
    let isMounted = true;
    const loadLivePrices = async () => {
      const openTrades = trades.filter(t => t.status === 'Open');
      const symbols = [...new Set(openTrades.map(t => t.symbol))];
      if (symbols.length === 0) return;

      const prices = { ...livePrices };
      for (const sym of symbols) {
        try {
          const price = await fetchRealTimePrice(sym);
          if (price && isMounted) {
            prices[sym] = price;
          }
        } catch (e) {
          console.warn("Failed to fetch price for", sym);
        }
      }
      if (isMounted) {
        setLivePrices(prices);
      }
    };
    loadLivePrices();
    
    const interval = setInterval(loadLivePrices, 60000); // อัปเดตทุก 1 นาที
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [trades]);
  
  // สถานะสำหรับ Modal ปิดออเดอร์และดูกราฟ
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [chartModalTrade, setChartModalTrade] = useState(null);
  
  const chartRef = useRef(null);
  const handleDownloadChart = () => {
    if (chartRef.current && chartModalTrade) {
      const canvas = chartRef.current.takeScreenshot();
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const symbol = chartModalTrade.symbol;
        
        ctx.save();
        ctx.font = 'bold 120px sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.15)'; // slate-400 with 15% opacity
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.fillText(symbol, 0, 0);
        ctx.restore();

        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${symbol}_${new Date().toISOString().split('T')[0]}.png`;
        a.click();
      }
    }
  };

  const [editingOpenTrade, setEditingOpenTrade] = useState(null);
  const [exitPrice, setExitPrice] = useState('');
  const [editExitTime, setEditExitTime] = useState('');
  const [mfePrice, setMfePrice] = useState('');
  const [maePrice, setMaePrice] = useState('');
  
  // State สำหรับ Summary Modal
  const [summaryTrade, setSummaryTrade] = useState(null);

  // State สำหรับ Edit Open Trade
  const [editEntry, setEditEntry] = useState('');
  const [editSL, setEditSL] = useState('');
  const [editTP, setEditTP] = useState('');
  const [editShares, setEditShares] = useState('');
  const [closeShares, setCloseShares] = useState('');
  const [notes, setNotes] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  
  // AI/Analytics Editing Fields
  const [editPlan, setEditPlan] = useState('');
  const [editSetup, setEditSetup] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editPumpStage, setEditPumpStage] = useState('');
  const [editAccountId, setEditAccountId] = useState('default');

  const SETUP_OPTIONS = setups && setups.length > 0 ? setups : ['Day Breakout', 'Pullback/Dip', 'Reversal', 'Trend Following', 'Range Trading'];
  const MOOD_OPTIONS = ['🟢 มั่นใจ/ทำตามแผน', '🔵 ปกติ/เป็นกลาง', '🔴 ใช้อารมณ์/FOMO', '🟣 กังวล/ลังเล', '🟠 เหนื่อยล้า/พักผ่อนน้อย'];
  const PUMP_STAGE_OPTIONS = ['Before Pump (กราฟก่อนวิ่ง)', 'After Pump (กราฟหลังวิ่ง)'];
  
  // Context Score Survey States
  const [qMarketTrend, setQMarketTrend] = useState(1); 
  const [qRelativeStrength, setQRelativeStrength] = useState(1); 
  const [qSetupQuality, setQSetupQuality] = useState(1); 
  const [qVolumeLiquidity, setQVolumeLiquidity] = useState(1); 
  const [qCatalystNews, setQCatalystNews] = useState(1); 
  
  const [planAdherence, setPlanAdherence] = useState("100% (Perfect Execution: ทำตามแผนเป๊ะ)");
  const [aiResult, setAiResult] = useState(null); // { aiScore, aiFeedback }

  const [costs, setCosts] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [customExitReason, setCustomExitReason] = useState('');
  const [mistakeTags, setMistakeTags] = useState([]);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');

  const EXIT_REASONS = ['Hit SL', 'Hit TP', 'Time Cut', 'Manual TP', 'Panic Sell', 'Other (ระบุเอง)'];
  const MISTAKE_OPTIONS = ['None', 'FOMO', 'Chasing', 'Hesitation', 'Moved SL', 'Overleveraged', 'Revenge Trading'];

  const toggleMistakeTag = (tag) => {
    if (tag === 'None') {
      setMistakeTags(['None']);
      return;
    }
    setMistakeTags(prev => {
      const filtered = prev.filter(t => t !== 'None');
      if (filtered.includes(tag)) {
        return filtered.filter(t => t !== tag);
      } else {
        return [...filtered, tag];
      }
    });
  };

  const calculateContextScore = () => Math.min(10, Math.max(0, qMarketTrend + qRelativeStrength + qSetupQuality + qVolumeLiquidity + qCatalystNews));

  // สถานะสำหรับการดูรายละเอียดข้อเสนอแนะ AI ของออเดอร์ที่ปิดแล้ว
  const [activeFeedbackTradeId, setActiveFeedbackTradeId] = useState(null);



  // ตัวกรองและค้นหาข้อมูล
  const baseFilteredTrades = trades.filter(trade => {
    const matchesStatus = filterStatus === 'All' || trade.status === filterStatus;
    const matchesSearch = trade.symbol.toLowerCase().includes(searchSymbol.toLowerCase());
    
    let matchesDateRange = true;
    if ((filterStartDate || filterEndDate) && trade.dateTime) {
      const d = new Date(trade.dateTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const tradeDateStr = `${year}-${month}-${day}`;
      
      if (filterStartDate && tradeDateStr < filterStartDate) matchesDateRange = false;
      if (filterEndDate && tradeDateStr > filterEndDate) matchesDateRange = false;
    }
    
    return matchesStatus && matchesSearch && matchesDateRange;
  });

  const getTradeRR = (trade) => {
    if (trade.status === 'Closed') {
      return typeof trade.actualRR === 'number' ? trade.actualRR : parseFloat(trade.actualRR) || null;
    } else {
      const livePrice = livePrices[trade.symbol];
      if (!livePrice) return null;
      const livePnl = trade.direction === 'Long' ? (livePrice - trade.entryPrice) * trade.shares : (trade.entryPrice - livePrice) * trade.shares;
      const gap = Math.abs(trade.entryPrice - trade.stopLoss);
      const initialRisk = trade.plannedRisk || (gap * trade.shares);
      return initialRisk > 0 ? livePnl / initialRisk : null;
    }
  };

  const filteredTrades = [...baseFilteredTrades].sort((a, b) => {
    if (sortBy === 'RR') {
      const rrA = getTradeRR(a);
      const rrB = getTradeRR(b);

      const validA = rrA !== null && !isNaN(rrA);
      const validB = rrB !== null && !isNaN(rrB);

      // Put null or NaN at the bottom
      if (!validA && validB) return 1;
      if (validA && !validB) return -1;
      if (!validA && !validB) return new Date(b.dateTime || 0) - new Date(a.dateTime || 0);

      // Group: Open trades top, Closed trades bottom
      if (a.status === 'Open' && b.status === 'Closed') return -1;
      if (a.status === 'Closed' && b.status === 'Open') return 1;

      // Both valid, same status, sort descending by RR
      if (rrA !== rrB) return rrB - rrA;
    }
    
    // Default or fallback: sort by Date descending
    return new Date(b.dateTime || 0) - new Date(a.dateTime || 0);
  });

  // Export to CSV (replaces old handleExportExcel which just created an unstyled xlsx file)
  const handleExportCSV = () => {
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
    const csv = XLSX.utils.sheet_to_csv(ws);
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const exportFileDefaultName = 'TradeJournal_Export.csv';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Export to JSON
  const handleExportJSON = () => {
    const doExport = () => {
      if (onExportJSON) {
        onExportJSON();
      } else {
        // Fallback just in case
        const dataStr = JSON.stringify(filteredTrades, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'TradeJournal_Backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    };

    if (requestConfirm) {
      requestConfirm(
        "ยืนยันการดาวน์โหลด Backup",
        "ไฟล์ JSON นี้คือ 'Full Backup' ซึ่งจะรวมข้อมูลของ 'ทุกบัญชี (พอร์ต)' และ 'ทุกช่วงเวลา' เพื่อใช้สำหรับการสำรองและกู้คืนระบบ (ไม่ได้กรองข้อมูลตามตาราง)\n\nคุณต้องการดาวน์โหลดไฟล์นี้ใช่หรือไม่?",
        () => doExport()
      );
    } else {
      if (window.confirm("ไฟล์ JSON นี้คือ 'Full Backup' ซึ่งจะรวมข้อมูลของทุกพอร์ตและทุกช่วงเวลา\n\nคุณต้องการดาวน์โหลดใช่หรือไม่?")) {
        doExport();
      }
    }
  };

  // Import JSON File
  const fileInputRef = React.useRef(null);
  
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (requestConfirm) {
      requestConfirm(
        "ยืนยันการอัปโหลด",
        "⚠️ ยืนยันการอัปโหลด? ข้อมูลการเทรดปัจจุบันจะถูก 'เขียนทับ' ด้วยข้อมูลจากไฟล์ทั้งหมด!",
        () => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              if (file.name.endsWith('.json')) {
                const importedData = JSON.parse(evt.target.result);
                if (importedData) {
                  if (onImportData) onImportData(importedData);
                  if (requestAlert) requestAlert("สำเร็จ", "✅ นำเข้าข้อมูลการเทรดเรียบร้อยแล้ว");
                } else {
                  if (requestAlert) requestAlert("ข้อผิดพลาด", "รูปแบบไฟล์ JSON ไม่ถูกต้อง");
                }
              } else {
                if (requestAlert) requestAlert("ข้อผิดพลาด", "กรุณาเลือกไฟล์ Backup ที่เป็นนามสกุล .json เท่านั้นครับ");
              }
            } catch (err) {
              if (requestAlert) requestAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการอ่านไฟล์: " + err.message);
            }
          };
          reader.readAsText(file);
        }
      );
    }
    // reset input
    e.target.value = null;
  };

  // โหลดราคาปัจจุบันของออเดอร์ที่ยังเปิดอยู่
  const handleOpenEditModal = (trade) => {
    setEditingOpenTrade(trade);
    setEditEntry(trade.entryPrice ? trade.entryPrice.toString() : '');
    setEditSL(trade.stopLoss ? trade.stopLoss.toString() : '');
    setEditTP(trade.takeProfit ? trade.takeProfit.toString() : '');
    setEditShares(trade.shares ? trade.shares.toString() : '');
    setEditPlan(trade.planId || '');
    setEditSetup(trade.setupName || '');
    setEditMood(trade.entryMood || '');
    setEditPumpStage(trade.pumpStage || '');
    setEditAccountId(trade.accountId || 'default');
  };

  const handleConfirmEditOpen = () => {
    if (!editEntry || !editSL || !editTP || !editShares) {
      if (requestAlert) requestAlert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลให้ครบถ้วน");
      else alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const updated = {
      ...editingOpenTrade,
      entryPrice: parseFloat(editEntry),
      stopLoss: parseFloat(editSL),
      takeProfit: parseFloat(editTP),
      shares: parseFloat(editShares),
      planId: editPlan,
      setupName: editSetup,
      entryMood: editMood,
      pumpStage: editPumpStage,
      accountId: editAccountId
    };
    onUpdateTrade(updated);
    setEditingOpenTrade(null);
  };

  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // เปิด Modal ปิดออเดอร์ (หรือแก้ไข)
  const handleOpenCloseModal = async (trade) => {
    setSelectedTrade(trade);
    if (trade.status === 'Closed') {
      setExitPrice(trade.actualExitPrice ? trade.actualExitPrice.toString() : trade.entryPrice.toString());
      setCloseShares(trade.shares.toString());
      setNotes(trade.notes || '');
      setMfePrice(trade.mfePrice ? trade.mfePrice.toString() : '');
      setMaePrice(trade.maePrice ? trade.maePrice.toString() : '');
      setQMarketTrend(trade.qMarketTrend !== undefined ? trade.qMarketTrend : 1);
      setQRelativeStrength(trade.qRelativeStrength !== undefined ? trade.qRelativeStrength : 1);
      setQSetupQuality(trade.qSetupQuality !== undefined ? trade.qSetupQuality : 2);
      setPlanAdherence(trade.planAdherence || "ตามแผนส่วนตัว (+100%)");
      setAiResult(trade.aiScore ? { aiScore: trade.aiScore, aiFeedback: trade.aiFeedback } : null);
      setEditPlan(trade.planId || '');
      setEditSetup(trade.setupName || '');
      setEditMood(trade.entryMood || '');
      setEditPumpStage(trade.pumpStage || '');
      setEditAccountId(trade.accountId || 'default');
      setEditExitTime(trade.exitDateTime ? formatDateTimeLocal(trade.exitDateTime) : formatDateTimeLocal(new Date().toISOString()));
      
      setCosts(trade.costs !== undefined ? trade.costs.toString() : '');
      const isCustomReason = trade.exitReason && !EXIT_REASONS.includes(trade.exitReason);
      setExitReason(isCustomReason ? 'Other (ระบุเอง)' : (trade.exitReason || ''));
      setCustomExitReason(isCustomReason ? trade.exitReason : '');
      setMistakeTags(trade.mistakeTags || []);
      setWhatWentWell(trade.whatWentWell || '');
      setLessonLearned(trade.lessonLearned || '');
      

      
      // Backward compat
      setTradeImage(null);
      setImagePreview(trade.imageUrlBefore || trade.imageUrl || null);
    } else {
      setExitPrice('...'); // แสดงจุดไข่ปลาไว้ก่อนระหว่างโหลด
      setCloseShares(trade.shares.toString()); // ตั้งค่าเริ่มต้นเป็นจำนวนหุ้นทั้งหมด
      setNotes(trade.notes || '');
      setMfePrice('');
      setMaePrice('');
      setQMarketTrend(1);
      setQRelativeStrength(1);
      setQSetupQuality(2);
      setPlanAdherence("ตามแผนส่วนตัว (+100%)");
      setAiResult(null);
      setEditPlan(trade.planId || '');
      setEditSetup(trade.setupName || '');
      setEditMood(trade.entryMood || '');
      setEditPumpStage(trade.pumpStage || '');
      setEditAccountId(trade.accountId || 'default');
      setEditExitTime(formatDateTimeLocal(new Date().toISOString()));
      setCosts('');
      setExitReason('');
      setCustomExitReason('');
      setMistakeTags([]);
      setWhatWentWell('');
      setLessonLearned('');
      

      
      // Backward compat
      setTradeImage(null);
      setImagePreview(trade.imageUrlBefore || trade.imageUrl || null);

      setIsFetchingPrice(true);
      const livePrice = await fetchRealTimePrice(trade.symbol);
      setIsFetchingPrice(false);
      
      if (livePrice) {
        setExitPrice(livePrice.toString());
      } else {
        setExitPrice(trade.entryPrice.toString());
      }
    }
  };

  // เรียกจำลองประเมินผลอัจฉริยะด้วย AI
  const handleAIAssess = () => {
    const pExit = parseFloat(exitPrice) || 0;
    if (pExit <= 0) {
      if (requestAlert) requestAlert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกราคาปิดจริง (Actual Exit Price) ให้ถูกต้องก่อนรัน AI");
      else alert("กรุณากรอกราคาปิดจริง (Actual Exit Price) ให้ถูกต้องก่อนรัน AI");
      return;
    }

    // คิดคะแนนวินัยตามข้อเลือก
    let score = 100;
    if (planAdherence.includes("100%")) score = 100;
    else if (planAdherence.includes("80%")) score = 80;
    else if (planAdherence.includes("50%")) score = 50;
    else if (planAdherence.includes("20%")) score = 20;
    else score = 0;

    // คำนวณ PnL ล่วงหน้าเพื่อนำไปประเมิน
    const shares = parseFloat(closeShares) || parseFloat(selectedTrade.shares);
    const entry = parseFloat(selectedTrade.entryPrice);
    const sl = parseFloat(selectedTrade.stopLoss);
    const isLong = selectedTrade.direction === 'Long';
    const pnl = isLong ? (pExit - entry) * shares : (entry - pExit) * shares;
    
    const currentContextScore = calculateContextScore();

    const mockTradeForAI = {
      ...selectedTrade,
      actualExitPrice: pExit,
      pnl,
      planAdherenceScore: score,
      contextScore: currentContextScore
    };

    const assessment = simulateAIAssessment(mockTradeForAI);
    setAiResult(assessment);
  };

  // ยืนยันปิดออเดอร์
  const handleConfirmClose = async () => {
    const pExit = parseFloat(exitPrice) || 0;
    if (pExit <= 0) {
      if (requestAlert) requestAlert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกราคาปิดจริง (Actual Exit Price) ให้ถูกต้องก่อน");
      else alert("กรุณากรอกราคาปิดจริง (Actual Exit Price) ให้ถูกต้องก่อน");
      return;
    }

    if (!exitReason || (exitReason === 'Other (ระบุเอง)' && !customExitReason.trim())) {
      if (requestAlert) requestAlert("ข้อมูลไม่ครบถ้วน", "กรุณาระบุ Exit Reason");
      else alert("กรุณาระบุ Exit Reason");
      return;
    }

    const isPlanPerfect = planAdherence.includes("100%");
    if (!isPlanPerfect && (mistakeTags.length === 0 || (mistakeTags.length === 1 && mistakeTags.includes('None')))) {
      if (requestAlert) requestAlert("ข้อมูลไม่ครบถ้วน", "เมื่อทำไม่ได้ตามแผน 100% จำเป็นต้องระบุ Mistake Tags (ห้ามเป็น None)");
      else alert("เมื่อทำไม่ได้ตามแผน 100% จำเป็นต้องระบุ Mistake Tags (ห้ามเป็น None)");
      return;
    }

    // คิดคะแนนวินัยตามข้อเลือก
    let score = 100;
    if (planAdherence.includes("100%")) score = 100;
    else if (planAdherence.includes("80%")) score = 80;
    else if (planAdherence.includes("50%")) score = 50;
    else if (planAdherence.includes("20%")) score = 20;
    else score = 0;

    const sharesToClose = parseFloat(closeShares) || 0;
    const originalShares = parseFloat(selectedTrade.shares);
    
    if (sharesToClose <= 0 || sharesToClose > originalShares) {
      if (requestAlert) requestAlert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกจำนวนหุ้นที่ต้องการปิดให้ถูกต้อง (ต้องไม่เกินจำนวนหุ้นที่มีอยู่)");
      else alert("กรุณากรอกจำนวนหุ้นที่ต้องการปิดให้ถูกต้อง (ต้องไม่เกินจำนวนหุ้นที่มีอยู่)");
      return;
    }

    // Upload Images if new ones are selected
    let finalImageUrl = selectedTrade.imageUrl || selectedTrade.imageUrlBefore || null;

    if (tradeImage && currentUser) {
      setIsUploading(true);
      try {
        const { uploadTradeImage } = await import('../db/journalDB');
        finalImageUrl = await uploadTradeImage(tradeImage, currentUser);
      } catch (err) {
        if (requestAlert) requestAlert("Upload Failed", "อัปโหลดรูปภาพล้มเหลว: " + err.message);
        else alert("อัปโหลดรูปภาพล้มเหลว: " + err.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const entry = parseFloat(selectedTrade.entryPrice);
    const sl = parseFloat(selectedTrade.stopLoss);
    const isLong = selectedTrade.direction === 'Long';
    const pnl = isLong ? (pExit - entry) * sharesToClose : (entry - pExit) * sharesToClose;

    // คำนวณ RR ที่ทำได้จริง (แก้ไขให้คำนวณจาก PnL / Risk ตั้งต้น)
    let actualRR = 0;
    const gap = Math.abs(entry - sl);
    // กรณีออเดอร์เก่าไม่มี plannedRisk จะคำนวณ Risk จาก gap * จำนวนหุ้นตั้งต้น
    const initialRisk = selectedTrade.plannedRisk || (gap * originalShares);
    
    if (initialRisk > 0) {
      actualRR = pnl / initialRisk;
    }

    const currentContextScore = calculateContextScore();

    // หากยังไม่ได้กด AI Assess ให้ทำการประเมินก่อน
    let finalAI = aiResult;
    if (!finalAI) {
      const mockTradeForAI = {
        ...selectedTrade,
        actualExitPrice: pExit,
        pnl,
        planAdherenceScore: score,
        contextScore: currentContextScore
      };
      finalAI = simulateAIAssessment(mockTradeForAI);
    }

    const updatedTrade = {
      ...selectedTrade,
      shares: sharesToClose,
      actualExitPrice: pExit,
      exitDateTime: editExitTime ? new Date(editExitTime).toISOString() : (selectedTrade.exitDateTime || new Date().toISOString()),
      status: 'Closed',
      pnl,
      actualRR,
      mfePrice: mfePrice ? parseFloat(mfePrice) : null,
      maePrice: maePrice ? parseFloat(maePrice) : null,
      contextScore: currentContextScore,
      qMarketTrend,
      qRelativeStrength,
      qSetupQuality,
      planAdherence,
      planAdherenceScore: score,
      aiScore: finalAI.aiScore,
      aiFeedback: finalAI.aiFeedback,
      notes,
      accountId: editAccountId,
      planId: editPlan,
      setupName: editSetup,
      entryMood: editMood,
      pumpStage: editPumpStage,
      costs: costs ? parseFloat(costs) : 0,
      exitReason: exitReason === 'Other (ระบุเอง)' ? customExitReason.trim() : exitReason,
      mistakeTags,
      whatWentWell,
      lessonLearned,
      imageUrl: finalImageUrl
    };

    onUpdateTrade(updatedTrade);
    
    // แบ่งไม้เทรด (Split Trade) ถ้ายอดที่ปิดน้อยกว่ายอดที่มี
    if (sharesToClose < originalShares) {
      const remainingShares = originalShares - sharesToClose;
      const splitTrade = {
        ...selectedTrade,
        id: 't-' + Date.now() + '-split', // สร้าง ID ใหม่
        shares: remainingShares,
        isSplit: true,
        status: 'Open',
        actualExitPrice: null,
        pnl: 0,
        actualRR: 0,
        aiScore: null,
        aiFeedback: '',
        notes: selectedTrade.notes ? selectedTrade.notes + '\n[ไม้แบ่งปิดออเดอร์]' : '[ไม้แบ่งปิดออเดอร์]'
      };
      if (onAddTrade) {
        onAddTrade(splitTrade);
      }
    }

    setSelectedTrade(null);
  };

  return (
    <div className="crypto-card p-6 flex flex-col gap-6 transition-all duration-300">
      
      {/* ส่วนหัวของตาราง พร้อมตัวค้นหาและปุ่มเลือกฟิลเตอร์ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800/85 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📓 {t('journal.title')}</span>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
              {filteredTrades.length} {t('journal.trades')}
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

          {/* ฟิลเตอร์วันที่ (Start Date - End Date) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <div className="flex items-center gap-1 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 h-[32px]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">From</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer w-[110px]"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 h-[32px]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">To</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer w-[110px]"
              />
            </div>

            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold px-1"
                title="ล้างตัวกรองวันที่"
              >
                ✕
              </button>
            )}

            {(filterStartDate && filterEndDate) && (
              <button
                onClick={() => {
                  requestConfirm(
                    "ลบข้อมูลตามช่วงเวลา",
                    `⚠️ ยืนยันการลบประวัติการเทรดทั้งหมดตั้งแต่ ${filterStartDate} ถึง ${filterEndDate} อย่างถาวร? (ไม่สามารถกู้คืนได้)`,
                    () => {
                      if (onDeleteTradesByDateRange) {
                        onDeleteTradesByDateRange(filterStartDate, filterEndDate);
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }
                    }
                  );
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/20 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer h-[32px] flex items-center gap-1 shadow-sm"
                title={`ลบประวัติการเทรดตั้งแต่ ${filterStartDate} ถึง ${filterEndDate}`}
              >
                🗑️ ลบช่วงนี้
              </button>
            )}
          </div>

          {/* การเรียงลำดับ */}
          <div className="flex bg-slate-55 dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800">
            {['Date', 'RR'].map((sortType) => (
              <button
                key={sortType}
                onClick={() => setSortBy(sortType)}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  sortBy === sortType 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {sortType === 'Date' ? '📅 Date' : '🔥 RR'}
              </button>
            ))}
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

          {/* ปุ่ม Export/Import */}
          <div className="flex gap-1.5">
            <button
              onClick={handleExportJSON}
              className="bg-sky-50 dark:bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ JSON เพื่อสำรองข้อมูล"
            >
              📥 Backup All (JSON)
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="ดาวน์โหลดข้อมูลเป็นไฟล์ CSV เพื่อดูใน Excel"
            >
              📊 CSV
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportFileChange} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="อัปโหลดไฟล์ JSON กลับเข้ามาในระบบเพื่อกู้คืนข้อมูล"
            >
              📤 Restore Backup
            </button>
          </div>

          {/* ปุ่ม Clear Log */}
          <button
            onClick={() => {
              if (requestConfirm) {
                requestConfirm(
                  "ยืนยันการลบ",
                  "⚠️ ยืนยันการลบประวัติการเทรดทั้งหมดอย่างถาวร? (ไม่สามารถกู้คืนได้)",
                  () => { if (onClearAllTrades) onClearAllTrades(); }
                );
              } else if (window.confirm("⚠️ ยืนยันการลบประวัติการเทรดทั้งหมดอย่างถาวร? (ไม่สามารถกู้คืนได้)")) {
                if (onClearAllTrades) onClearAllTrades();
              }
            }}
            className="bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            🗑️ Clear All Logs
          </button>
        </div>
      </div>

      {(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentTrades = filteredTrades.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);

        return (
          <>
            {/* 📱 Mobile Card View (visible < md) */}
            <div className="md:hidden flex flex-col gap-3">
              {filteredTrades.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                  {t('journal.noTradesFilter')}
                </div>
              ) : (
                currentTrades.map((trade) => {
                  const isFeedbackActive = activeFeedbackTradeId === trade.id;
                  return (
                    <TradeCard
                      key={trade.id}
                      setViewingImage={setViewingImage}
                      trade={trade}
                      livePrice={livePrices[trade.symbol]}
                      isVip={isVip}
                      isFeedbackActive={isFeedbackActive}
                      setActiveFeedbackTradeId={setActiveFeedbackTradeId}
                      setChartModalTrade={setChartModalTrade}
                      setSummaryTrade={setSummaryTrade}
                      handleOpenEditModal={handleOpenEditModal}
                      handleOpenCloseModal={handleOpenCloseModal}
                      requestConfirm={requestConfirm}
                      onDeleteTrade={onDeleteTrade}
                      pnlDisplayMode={pnlDisplayMode}
                    />
                  );
                })
              )}
            </div>
            {/* 🖥️ Desktop Cards Grid View (visible >= md) */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredTrades.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 font-semibold italic bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  {t('journal.noTradesFilter')}
                </div>
              ) : (
                currentTrades.map((trade) => {
                  const isFeedbackActive = activeFeedbackTradeId === trade.id;
                  
                  return (
                    <DesktopTradeCard
                      key={trade.id}
                      setViewingImage={setViewingImage}
                      trade={trade}
                      livePrice={livePrices[trade.symbol]}
                      isVip={isVip}
                      isFeedbackActive={isFeedbackActive}
                      setActiveFeedbackTradeId={setActiveFeedbackTradeId}
                      setChartModalTrade={setChartModalTrade}
                      setSummaryTrade={setSummaryTrade}
                      handleOpenEditModal={handleOpenEditModal}
                      handleOpenCloseModal={handleOpenCloseModal}
                      requestConfirm={requestConfirm}
                      onDeleteTrade={onDeleteTrade}
                    />
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {filteredTrades.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <span>แสดง</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                  <span>รายการต่อหน้า</span>
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                    ทั้งหมด {filteredTrades.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        return <span key={`ellipsis-${p}`} className="text-slate-400">...</span>;
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-md text-[11px] font-bold transition-all flex items-center justify-center ${
                            currentPage === p
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {viewingImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-fade-in" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Full Size Trade" className="w-full h-auto max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-zoom-out" />
          <button className="absolute top-4 right-4 text-white hover:text-rose-400 font-bold text-xl cursor-pointer">✕</button>
        </div>
      )}

      {/* 🚪 MODAL ปิดออเดอร์ (Close Trade Modal) */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="crypto-card max-w-2xl w-full flex flex-col relative max-h-[90vh] md:max-h-[85vh] overflow-hidden">
            
            {/* Header Modal */}
            <div className="p-5 md:p-6 pb-4 md:pb-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-850 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-emerald-650 dark:text-emerald-400">
                  {selectedTrade.status === 'Closed' ? '✏️ Edit Trade Setup' : '🚪 Close Trade Setup'} - {selectedTrade.symbol}
                </h3>
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
            <div className="p-5 md:p-6 py-4 md:py-5 flex-1 overflow-y-auto flex flex-col gap-4 md:gap-5">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Actual Exit Price */}
                <div className="flex flex-col gap-1.5 flex-1 relative">
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold flex justify-between">
                    <span>Actual Exit Price ($)</span>
                    {isFetchingPrice && <span className="text-[9px] text-amber-500 animate-pulse">Fetching Live Price...</span>}
                  </label>
                  <input onFocus={(e) => e.target.select()}  
                    type="number"
                    value={exitPrice}
                    onChange={(e) => {
                      setExitPrice(e.target.value);
                      setAiResult(null); // เคลียร์ผลลัพธ์ AI เดิมเพื่อให้ประเมินใหม่
                    }}
                    placeholder="ราคาปิด..."
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                {/* Costs */}
                <div className="flex flex-col gap-1.5 flex-1 relative">
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Costs ($)</label>
                  <input onFocus={(e) => e.target.select()}  
                    type="number"
                    value={costs}
                    onChange={(e) => setCosts(e.target.value)}
                    placeholder="ค่าธรรมเนียม..."
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>

                {/* Shares to Close */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Shares to Close</label>
                  <input onFocus={(e) => e.target.select()}  
                    type="number"
                    value={closeShares}
                    onChange={(e) => {
                      setCloseShares(e.target.value);
                      setAiResult(null);
                    }}
                    placeholder="จำนวนหุ้น..."
                    max={selectedTrade.shares}
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Exit Date / Time */}
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold flex justify-between">
                  <span>Actual Exit Date / Time</span>
                  <span className="text-[9px] text-slate-400">(Optional for old trades)</span>
                </label>
                <input 
                  type="datetime-local"
                  value={editExitTime}
                  onChange={(e) => setEditExitTime(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              {/* Trading Account */}
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Trading Account</label>
                <select
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                >
                  <option value="default">Default Account</option>
                  {accounts && accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {/* MFE / MAE Section */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex flex-col gap-1.5 flex-1 relative">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex justify-between" title="Maximum Favorable Excursion (ราคาสูงสุดที่ทำกำไรได้ระหว่างถือออเดอร์)">
                    <span>MFE Price ($)</span>
                  </label>
                  <input onFocus={(e) => e.target.select()}  
                    type="number"
                    value={mfePrice}
                    onChange={(e) => setMfePrice(e.target.value)}
                    placeholder="ราคาพีคฝั่งกำไร..."
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-emerald-600 dark:text-emerald-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 relative">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex justify-between" title="Maximum Adverse Excursion (ราคาต่ำสุดที่ขาดทุนระหว่างถือออเดอร์)">
                    <span>MAE Price ($)</span>
                  </label>
                  <input onFocus={(e) => e.target.select()}  
                    type="number"
                    value={maePrice}
                    onChange={(e) => setMaePrice(e.target.value)}
                    placeholder="ราคาพีคฝั่งขาดทุน..."
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-rose-600 dark:text-rose-500 focus:outline-none focus:border-rose-500 text-sm"
                  />
                </div>
              </div>

              {/* Context (Plan, Setup, Mood, Stage) */}
              <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  🤖 Context (Plan, Setup, Exit Reason, Mood, Stage)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Trading Plan</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- No Plan Selected --</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Pump Stage</label>
                    <select
                      value={editPumpStage}
                      onChange={(e) => setEditPumpStage(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Stage --</option>
                      {PUMP_STAGE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Setup / Strategy</label>
                    <select
                      value={editSetup}
                      onChange={(e) => setEditSetup(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Select Setup --</option>
                      {SETUP_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Exit Reason</label>
                    <select
                      value={exitReason}
                      onChange={(e) => setExitReason(e.target.value)}
                      className={`bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500 ${!exitReason ? 'border-rose-400 dark:border-rose-500/50' : ''}`}
                    >
                      <option value="">-- Select Reason --</option>
                      {EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Mental State</label>
                    <select
                      value={editMood}
                      onChange={(e) => setEditMood(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Select Mood --</option>
                      {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                {exitReason === 'Other (ระบุเอง)' && (
                  <input
                    type="text"
                    value={customExitReason}
                    onChange={(e) => setCustomExitReason(e.target.value)}
                    placeholder="ระบุเหตุผลในการออก..."
                    className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500 w-full mt-1"
                  />
                )}
              </div>

              {/* Context Images Upload Section (Before/After Pump) */}
              {/* Context Images Upload Section */}
              <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  📸 Context Charts <span className="text-amber-500">(Optional)</span>
                </span>
                
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                       const file = e.target.files[0];
                       if (file) {
                          setTradeImage(file);
                          setImagePreview(URL.createObjectURL(file));
                       }
                    }}
                    className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500 w-full file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  {imagePreview && (
                    <div className="mt-2 relative inline-block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 w-full bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-2">
                       <img src={imagePreview} alt="Trade Context" className="max-h-[200px] max-w-full object-contain rounded" />
                       {(tradeImage || selectedTrade.imageUrl) && (
                         <button 
                           onClick={() => {
                             if (!tradeImage && window.confirm("ต้องการลบรูปภาพนี้ออกจากบันทึกเทรดหรือไม่? (จะต้องกดปุ่ม Save เพื่อยืนยันอีกครั้ง)")) {
                               setTradeImage(null); 
                               setImagePreview(null);
                               selectedTrade.imageUrl = null;
                             } else if (tradeImage) {
                               setTradeImage(null);
                               setImagePreview(selectedTrade.imageUrl || null);
                             }
                           }}
                           className="absolute top-3 right-3 bg-rose-600/90 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-rose-500 cursor-pointer shadow-lg z-10"
                           title="ลบรูปภาพ"
                         >
                           ✕
                         </button>
                       )}
                    </div>
                  )}
                </div>
              </div>

              {/* Context Score Survey */}
              <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center border-b border-slate-250 dark:border-slate-800 pb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Context Score Survey</span>
                  <span className="font-mono font-bold text-indigo-650 dark:text-indigo-400 text-sm">{calculateContextScore()} / 10</span>
                </div>
                
                <div className="flex flex-col gap-3.5 mt-1">
                  {/* Market Trend */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">
                      1. แนวโน้มตลาด (Market Trend)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 0.5, 1, 1.5, 2].map((val) => {
                        const active = qMarketTrend === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => { setQMarketTrend(val); setAiResult(null); }}
                            className={`py-1.5 px-1 rounded-lg text-[10px] transition-all font-sans cursor-pointer border text-center flex items-center justify-center min-h-[30px] ${
                              active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-400 dark:border-indigo-500/50 shadow-sm font-bold scale-[1.05]' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-450 border-slate-200 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Relative Strength */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">
                      2. ความแข็งแกร่ง (Relative Strength)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 0.5, 1, 1.5, 2].map((val) => {
                        const active = qRelativeStrength === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => { setQRelativeStrength(val); setAiResult(null); }}
                            className={`py-1.5 px-1 rounded-lg text-[10px] transition-all font-sans cursor-pointer border text-center flex items-center justify-center min-h-[30px] ${
                              active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-400 dark:border-indigo-500/50 shadow-sm font-bold scale-[1.05]' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-450 border-slate-200 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Setup Quality */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">
                      3. รูปแบบกราฟ (Setup Quality)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 0.5, 1, 1.5, 2].map((val) => {
                        const active = qSetupQuality === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => { setQSetupQuality(val); setAiResult(null); }}
                            className={`py-1.5 px-1 rounded-lg text-[10px] transition-all font-sans cursor-pointer border text-center flex items-center justify-center min-h-[30px] ${
                              active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-400 dark:border-indigo-500/50 shadow-sm font-bold scale-[1.05]' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-450 border-slate-200 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Volume/Liquidity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">
                      4. ปริมาณการซื้อขาย (Volume/Liquidity)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 0.5, 1, 1.5, 2].map((val) => {
                        const active = qVolumeLiquidity === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => { setQVolumeLiquidity(val); setAiResult(null); }}
                            className={`py-1.5 px-1 rounded-lg text-[10px] transition-all font-sans cursor-pointer border text-center flex items-center justify-center min-h-[30px] ${
                              active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-400 dark:border-indigo-500/50 shadow-sm font-bold scale-[1.05]' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-450 border-slate-200 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Catalyst/News */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">
                      5. ปัจจัยหนุน (Catalyst/News)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 0.5, 1, 1.5, 2].map((val) => {
                        const active = qCatalystNews === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => { setQCatalystNews(val); setAiResult(null); }}
                            className={`py-1.5 px-1 rounded-lg text-[10px] transition-all font-sans cursor-pointer border text-center flex items-center justify-center min-h-[30px] ${
                              active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-400 dark:border-indigo-500/50 shadow-sm font-bold scale-[1.05]' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-450 border-slate-200 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Adherence Selection (Dropdown) */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Plan Adherence (วินัยการเล่น)</label>
                <select
                  value={planAdherence}
                  onChange={(e) => {
                    setPlanAdherence(e.target.value);
                    setAiResult(null);
                  }}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-sans text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="100% (Perfect Execution: ทำตามแผนเป๊ะ)">100% (Perfect Execution: ทำตามแผนเป๊ะ)</option>
                  <option value="80% (Minor Deviation: ผิดแผนเล็กน้อยแต่รับได้)">80% (Minor Deviation: ผิดแผนเล็กน้อยแต่รับได้)</option>
                  <option value="50% (Half Plan/Half Emotion: ครึ่งตามแผน ครึ่งใช้อารมณ์)">50% (Half Plan/Half Emotion: ครึ่งตามแผน ครึ่งใช้อารมณ์)</option>
                  <option value="20% (Mostly Emotion: ใช้อารมณ์เป็นหลัก)">20% (Mostly Emotion: ใช้อารมณ์เป็นหลัก)</option>
                  <option value="0% (Pure FOMO/No Plan: เทรดมั่ว ไม่มีแผน)">0% (Pure FOMO/No Plan: เทรดมั่ว ไม่มีแผน)</option>
                </select>
              </div>

              {/* Mistake Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center gap-2">
                  Mistake Tags (ข้อผิดพลาด)
                  {!planAdherence.includes("100%") && <span className="text-[10px] text-rose-500 font-bold">*จำเป็น</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MISTAKE_OPTIONS.map(tag => {
                    const isActive = mistakeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleMistakeTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border cursor-pointer ${
                          isActive 
                            ? tag === 'None' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review Text Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">What went well (สิ่งที่ทำได้ดี)</label>
                  <textarea 
                    value={whatWentWell}
                    onChange={(e) => setWhatWentWell(e.target.value)}
                    placeholder="วันนี้คุณทำอะไรได้ดีบ้าง..."
                    rows="2"
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-xs resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Lesson Learned (บทเรียนที่ได้)</label>
                  <textarea 
                    value={lessonLearned}
                    onChange={(e) => setLessonLearned(e.target.value)}
                    placeholder="บทเรียนที่ได้จากออเดอร์นี้..."
                    rows="2"
                    className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-xs resize-none"
                  />
                </div>
              </div>

              {/* Notes Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Notes (หมายเหตุ)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="บันทึกเพิ่มเติม (ถ้ามี)..."
                  rows="2"
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-xs resize-none"
                />
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
                <div className="crypto-card p-4 flex flex-col gap-2 animate-fade-in mt-1">
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
            <div className="p-4 md:px-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                onClick={() => setSelectedTrade(null)}
                className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={isUploading || (() => {
                  if (!exitPrice || parseFloat(exitPrice) <= 0) return true;
                  if (!exitReason || (exitReason === 'Other (ระบุเอง)' && !customExitReason.trim())) return true;
                  const isPlanPerfect = planAdherence.includes("100%");
                  if (!isPlanPerfect && (mistakeTags.length === 0 || (mistakeTags.length === 1 && mistakeTags.includes('None')))) return true;
                  return false;
                })()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 disabled:dark:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-200 dark:disabled:text-slate-500 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                {isUploading ? 'Uploading & Saving...' : (selectedTrade.status === 'Closed' ? 'Save Changes 💾' : 'Confirm Close Trade 🚪')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📈 Chart View Modal */}
      {chartModalTrade && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="crypto-card p-6 max-w-4xl w-full flex flex-col gap-4 relative h-[80vh]">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3">
              <div>
                <h3 className="text-lg font-bold text-sky-600 dark:text-sky-400 flex items-center gap-2">
                  <span>📈 Live Chart View: {chartModalTrade.symbol}</span>
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                  Dir: {chartModalTrade.direction} | Entry: ${chartModalTrade.entryPrice} | SL: ${chartModalTrade.stopLoss} | TP: ${chartModalTrade.takeProfit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadChart}
                  title="Download Chart"
                  className="p-2 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={() => setChartModalTrade(null)} 
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 font-black cursor-pointer text-sm p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full rounded-sm overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0a0a] relative">
              <LightweightChartComponent 
                ref={chartRef}
                symbol={chartModalTrade.symbol}
                entry={chartModalTrade.entryPrice}
                stopLoss={chartModalTrade.stopLoss}
                tp1={ (() => {
                   const ePrice = parseFloat(chartModalTrade.entryPrice) || 0;
                   const sLoss = parseFloat(chartModalTrade.stopLoss) || 0;
                   const gap = Math.abs(ePrice - sLoss);
                   if (gap > 0) {
                     return chartModalTrade.direction === 'Long' ? ePrice + gap : ePrice - gap;
                   }
                   return chartModalTrade.takeProfit;
                })()}
                entryTime={chartModalTrade.dateTime}
                exitTime={chartModalTrade.exitDateTime}
                direction={chartModalTrade.direction}
                status={chartModalTrade.status}
                actualExitPrice={chartModalTrade.actualExitPrice}
                tp2={ (() => {
                   const ePrice = parseFloat(chartModalTrade.entryPrice) || 0;
                   const sLoss = parseFloat(chartModalTrade.stopLoss) || 0;
                   const gap = Math.abs(ePrice - sLoss);
                   if (gap > 0) {
                     return chartModalTrade.direction === 'Long' ? ePrice + gap * 2 : ePrice - gap * 2;
                   }
                   return '';
                })()}
                tp3={ (() => {
                   const ePrice = parseFloat(chartModalTrade.entryPrice) || 0;
                   const sLoss = parseFloat(chartModalTrade.stopLoss) || 0;
                   const gap = Math.abs(ePrice - sLoss);
                   if (gap > 0) {
                     return chartModalTrade.direction === 'Long' ? ePrice + gap * 3 : ePrice - gap * 3;
                   }
                   return '';
                })()}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✏️ Edit Open Trade Modal */}
      {editingOpenTrade && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="crypto-card max-w-sm w-full flex flex-col relative max-h-[90vh] md:max-h-[85vh] overflow-hidden">
            
            <div className="p-5 md:p-6 pb-4 md:pb-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-850 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  ✏️ Edit Entry Setup
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                  {editingOpenTrade.symbol} • {editingOpenTrade.direction}
                </p>
              </div>
              <button 
                onClick={() => setEditingOpenTrade(null)} 
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 font-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 md:p-6 py-4 md:py-5 flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Entry Price ($)</label>
                <input onFocus={(e) => e.target.select()}  
                  type="number"
                  value={editEntry}
                  onChange={(e) => setEditEntry(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Stop Loss ($)</label>
                <input onFocus={(e) => e.target.select()}  
                  type="number"
                  value={editSL}
                  onChange={(e) => setEditSL(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Take Profit 1 ($) (Optional)</label>
                <input onFocus={(e) => e.target.select()}  
                  type="number"
                  value={editTP}
                  onChange={(e) => setEditTP(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Shares (Position Size)</label>
                <input onFocus={(e) => e.target.select()}  
                  type="number"
                  value={editShares}
                  onChange={(e) => setEditShares(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              
              {/* AI Analytics Integration Fields */}
              <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 mt-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  🤖 Context (Plan, Setup, Mood, Stage)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Trading Plan</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- No Plan Selected --</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Setup / Strategy</label>
                    <select
                      value={editSetup}
                      onChange={(e) => setEditSetup(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Select Setup --</option>
                      {SETUP_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Mental State</label>
                    <select
                      value={editMood}
                      onChange={(e) => setEditMood(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Select Mood --</option>
                      {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Pump Stage</label>
                    <select
                      value={editPumpStage}
                      onChange={(e) => setEditPumpStage(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Stage --</option>
                      {PUMP_STAGE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-550 dark:text-slate-450 font-bold uppercase">Trading Account</label>
                    <select
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="default">Default Account</option>
                      {accounts && accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 md:px-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                onClick={() => setEditingOpenTrade(null)}
                className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEditOpen}
                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Save Updates 💾
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 Order Summary Modal */}
      {summaryTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSummaryTrade(null)}></div>
          <div className="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-2xl">{summaryTrade.symbol}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    summaryTrade.direction === 'Long' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                  }`}>
                    {summaryTrade.direction}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    summaryTrade.status === 'Closed'
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 animate-pulse'
                  }`}>
                    {summaryTrade.status}
                  </span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {summaryTrade.dateTime ? new Date(summaryTrade.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                </p>
              </div>
              <button 
                onClick={() => setSummaryTrade(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Entry Price</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">${parseFloat(summaryTrade.entryPrice).toFixed(4)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Exit Price</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{summaryTrade.status === 'Closed' ? `$${parseFloat(summaryTrade.actualExitPrice || summaryTrade.entryPrice).toFixed(4)}` : '-'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">PnL</p>
                  <p className={`text-lg font-black ${
                    !summaryTrade.pnl || summaryTrade.pnl == 0 ? 'text-slate-500' :
                    parseFloat(summaryTrade.pnl) > 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {summaryTrade.pnl !== undefined ? (parseFloat(summaryTrade.pnl) > 0 ? '+' : '') + `$${parseFloat(summaryTrade.pnl).toFixed(2)}` : '-'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Risk / Reward</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{summaryTrade.actualRR ? `${parseFloat(summaryTrade.actualRR).toFixed(2)}R` : '-'}</p>
                </div>
              </div>

              {/* Context & Setup */}
              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <span className="text-lg">🧠</span> Trade Context
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Setup / Strategy</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{summaryTrade.setupName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Mental State</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{summaryTrade.entryMood || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Pump Stage</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{summaryTrade.pumpStage || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Plan Adherence</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{summaryTrade.planAdherence || '-'}</span>
                  </div>
                </div>
                {summaryTrade.notes && (
                  <div className="mt-4 pt-4 border-t border-indigo-200/50 dark:border-indigo-800/50">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Notes</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{summaryTrade.notes}</p>
                  </div>
                )}
              </div>

              {/* AI Feedback */}
              {summaryTrade.aiFeedback && (
                <div className="bg-slate-900 dark:bg-slate-800 text-white p-5 rounded-xl border border-slate-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h3 className="text-sm font-black text-indigo-300 mb-3 flex items-center gap-2">
                    <span className="text-lg">🤖</span> AI Coach Feedback
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl font-black">{summaryTrade.aiScore}<span className="text-sm text-slate-400">/10</span></div>
                    <div className="h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${summaryTrade.aiScore >= 8 ? 'bg-emerald-500' : summaryTrade.aiScore >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${(summaryTrade.aiScore / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{summaryTrade.aiFeedback}</p>
                </div>
              )}

              {/* Attached Image */}
              {(summaryTrade.imageUrl || summaryTrade.imageUrlBefore) && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">Attached Image</h3>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-zoom-in" onClick={() => setViewingImage(summaryTrade.imageUrl || summaryTrade.imageUrlBefore)}>
                    <img 
                      src={summaryTrade.imageUrl || summaryTrade.imageUrlBefore} 
                      alt="Trade Chart" 
                      className="w-full h-auto max-h-[300px] object-contain"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
