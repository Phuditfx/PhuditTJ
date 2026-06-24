import React, { useState, useMemo } from 'react';

export default function CalendarView({ trades, pnlDisplayMode = 'pnl' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState(null);

  // คำนวณวันในเดือน
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  // จัดกลุ่มออเดอร์ตามวัน
  const tradesByDay = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      const targetDateStr = t.exitDateTime || t.dateTime;
      if (t.status !== 'Closed' || !targetDateStr) return;
      const d = new Date(targetDateStr);
      if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [trades, currentDate]);

  // สรุปผลรวม PnL/RR ของเดือน
  const monthSummary = useMemo(() => {
    let totalPnL = 0;
    let totalRR = 0;
    let totalTrades = 0;
    let winDays = 0;
    let lossDays = 0;
    Object.values(tradesByDay).forEach(dayTrades => {
      const dayPnL = dayTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
      const dayRR = dayTrades.reduce((acc, t) => acc + (parseFloat(t.actualRR) || 0), 0);
      totalPnL += dayPnL;
      totalRR += dayRR;
      totalTrades += dayTrades.length;
      
      const metric = pnlDisplayMode === 'pnl' ? dayPnL : dayRR;
      if (metric > 0) winDays++;
      else if (metric < 0) lossDays++;
    });
    return { totalPnL, totalRR, totalTrades, winDays, lossDays };
  }, [tradesByDay, pnlDisplayMode]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNamesFull = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];

  // Format P/L และ RR
  const formatPnL = (value) => {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${value < 0 ? '-' : '+'}$${formatted}`;
  };

  const formatRR = (value) => {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${value < 0 ? '-' : '+'}${formatted} RR`;
  };

  const renderCells = () => {
    const cells = [];
    // วันที่ว่างก่อนวันแรกของเดือน
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div key={`empty-${i}`} className="aspect-square bg-transparent rounded-lg opacity-30" />
      );
    }
    
    // วันที่ในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTrades = tradesByDay[day] || [];
      const totalPnL = dayTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
      const totalRR = dayTrades.reduce((acc, t) => acc + (parseFloat(t.actualRR) || 0), 0);
      
      const displayValue = pnlDisplayMode === 'pnl' ? totalPnL : totalRR;

      const isWin = displayValue > 0;
      const isLoss = displayValue < 0;
      const hasTrades = dayTrades.length > 0;
      const today = new Date();
      const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

      const bgColor = isWin 
        ? 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-400/40 dark:border-emerald-500/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20' 
        : isLoss 
          ? 'bg-rose-500/10 dark:bg-rose-500/10 border-rose-400/40 dark:border-rose-500/30 hover:bg-rose-500/20 dark:hover:bg-rose-500/20' 
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60';

      cells.push(
        <div 
          key={day} 
          onClick={() => setSelectedDayTrades({ day, trades: dayTrades, totalPnL, totalRR })}
          className={`aspect-square border rounded-lg flex flex-col items-stretch cursor-pointer transition-all duration-200 active:scale-95 relative overflow-hidden group ${bgColor} ${isToday ? 'ring-2 ring-indigo-500/60 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-950' : ''}`}
        >
          {/* วันที่ - มุมขวาบน */}
          <div className="flex justify-end p-1 sm:p-1.5">
            <span className={`text-[10px] sm:text-xs font-bold leading-none ${isToday ? 'bg-indigo-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center' : 'text-slate-400 dark:text-slate-500'}`}>
              {day}
            </span>
          </div>

          {/* P/L or RR - กลาง cell */}
          {hasTrades && (
            <div className="flex-1 flex flex-col items-center justify-center gap-0 px-0.5">
              <span className={`text-[8px] sm:text-[10px] md:text-xs font-black leading-tight truncate max-w-full ${
                isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {pnlDisplayMode === 'pnl' ? formatPnL(totalPnL) : formatRR(totalRR)}
              </span>
              <span className="text-[7px] sm:text-[8px] text-slate-400 dark:text-slate-500 font-semibold leading-tight">
                {dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'}
              </span>
            </div>
          )}

          {/* Hover indicator */}
          <div className="absolute inset-0 bg-white/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full animate-fade-in">
      <div className="crypto-card p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                📅 Trading Calendar
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Visualize your daily performance</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={prevMonth} className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors">
              ◀
            </button>
            <span className="text-sm sm:text-lg font-black text-slate-800 dark:text-slate-200 w-28 sm:w-40 text-center select-none">
              {monthNames[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors">
              ▶
            </button>
          </div>
        </div>

        {/* Month Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 sm:p-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">
              Net {pnlDisplayMode === 'pnl' ? 'P/L' : 'RR'}
            </span>
            <span className={`text-xs sm:text-sm font-black ${
              (pnlDisplayMode === 'pnl' ? monthSummary.totalPnL : monthSummary.totalRR) >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {(pnlDisplayMode === 'pnl' ? monthSummary.totalPnL : monthSummary.totalRR) >= 0 ? '+' : ''}
              {pnlDisplayMode === 'pnl' ? '$' : ''}
              {Math.abs(pnlDisplayMode === 'pnl' ? monthSummary.totalPnL : monthSummary.totalRR).toFixed(2)}
              {pnlDisplayMode === 'rr' ? ' RR' : ''}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 sm:p-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Trades</span>
            <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">{monthSummary.totalTrades}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 sm:p-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Win Days</span>
            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">{monthSummary.winDays}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 sm:p-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Loss Days</span>
            <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">{monthSummary.lossDays}</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day headers — short on mobile, full on desktop */}
          {dayNamesFull.map((d, i) => (
            <div key={d} className="text-center text-[9px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1 sm:py-2">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{dayNamesShort[i]}</span>
            </div>
          ))}
          {renderCells()}
        </div>

      </div>

      {/* Explore Day Modal */}
      {selectedDayTrades && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="crypto-card p-5 sm:p-6 max-w-2xl w-full flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                  🔍 Explore Day: {selectedDayTrades.day} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <p className={`text-[11px] sm:text-[12px] font-bold mt-1 ${
                  (pnlDisplayMode === 'pnl' ? selectedDayTrades.totalPnL : selectedDayTrades.totalRR) > 0 
                    ? 'text-emerald-500' 
                    : ((pnlDisplayMode === 'pnl' ? selectedDayTrades.totalPnL : selectedDayTrades.totalRR) < 0 ? 'text-rose-500' : 'text-slate-500')
                }`}>
                  Net {pnlDisplayMode === 'pnl' ? 'PnL' : 'RR'}: {(pnlDisplayMode === 'pnl' ? selectedDayTrades.totalPnL : selectedDayTrades.totalRR) > 0 ? '+' : ''}
                  {pnlDisplayMode === 'pnl' ? '$' : ''}
                  {Math.abs(pnlDisplayMode === 'pnl' ? selectedDayTrades.totalPnL : selectedDayTrades.totalRR).toFixed(2)}
                  {pnlDisplayMode === 'rr' ? ' RR' : ''} • {selectedDayTrades.trades.length} {selectedDayTrades.trades.length === 1 ? 'trade' : 'trades'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDayTrades(null)} 
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 font-black cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            {selectedDayTrades.trades.length === 0 ? (
              <div className="text-center text-slate-500 py-10 font-bold">
                <span className="text-4xl block mb-2">📭</span>
                No trades recorded on this day.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDayTrades.trades.map(t => (
                  <div key={t.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.direction === 'Long' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {t.direction}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{t.symbol}</span>
                      {(t.exitDateTime || t.dateTime) && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(t.exitDateTime || t.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">
                        En: ${Number(t.entryPrice).toFixed(2)} → Ex: ${Number(t.actualExitPrice).toFixed(2)}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-black text-sm ${t.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.pnl > 0 ? '+' : ''}${parseFloat(t.pnl).toFixed(2)}
                        </span>
                        {(t.actualRR !== undefined && t.actualRR !== null) && (
                          <span className={`text-[10px] font-bold ${(parseFloat(t.actualRR) || 0) > 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-rose-600/70 dark:text-rose-400/70'}`}>
                            {(parseFloat(t.actualRR) || 0) > 0 ? '+' : ''}{(parseFloat(t.actualRR) || 0).toFixed(2)} RR
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
