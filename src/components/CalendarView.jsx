import React, { useState, useMemo } from 'react';

export default function CalendarView({ trades }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState(null);

  // คำนวณวันในเดือน
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  // จัดกลุ่มออเดอร์ตามวัน
  const tradesByDay = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      if (t.status !== 'Closed' || !t.dateTime) return;
      const d = new Date(t.dateTime);
      if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [trades, currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCells = () => {
    const cells = [];
    // วันที่ว่างก่อนวันแรกของเดือน
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-transparent p-2 min-h-[100px]"></div>);
    }
    
    // วันที่ในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTrades = tradesByDay[day] || [];
      const totalPnL = dayTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
      const isWin = totalPnL > 0;
      const isLoss = totalPnL < 0;
      const pnlColor = isWin ? 'text-emerald-500' : (isLoss ? 'text-rose-500' : 'text-slate-400');
      const bgColor = isWin ? 'bg-emerald-500/10 border-emerald-500/30' : (isLoss ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800');

      cells.push(
        <div 
          key={day} 
          onClick={() => setSelectedDayTrades({ day, trades: dayTrades, totalPnL })}
          className={`p-2 min-h-[100px] border rounded-lg flex flex-col gap-1 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${bgColor}`}
        >
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{day}</span>
          {dayTrades.length > 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <span className={`text-[10px] md:text-lg font-mono font-black truncate w-full text-center ${pnlColor}`}>
                {totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </span>
              <span className="text-[8px] md:text-[10px] text-slate-500 font-bold mt-1 truncate">{dayTrades.length} Trades</span>
            </div>
          )}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="crypto-card p-6 flex flex-col gap-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              📅 Trading Calendar
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Visualize your daily performance</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              &lt; Prev
            </button>
            <span className="text-lg font-black text-slate-800 dark:text-slate-200 w-32 text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              Next &gt;
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-black text-slate-400 uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
          {renderCells()}
        </div>

      </div>

      {/* Explore Day Modal */}
      {selectedDayTrades && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="crypto-card p-6 max-w-2xl w-full flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3">
              <div>
                <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  🔍 Explore Day: {selectedDayTrades.day} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <p className={`text-[12px] font-bold mt-1 ${selectedDayTrades.totalPnL > 0 ? 'text-emerald-500' : (selectedDayTrades.totalPnL < 0 ? 'text-rose-500' : 'text-slate-500')}`}>
                  Net PnL: {selectedDayTrades.totalPnL > 0 ? '+' : ''}${selectedDayTrades.totalPnL.toFixed(2)}
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
                No trades recorded on this day.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDayTrades.trades.map(t => (
                  <div key={t.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.direction === 'Long' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {t.direction}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{t.symbol}</span>
                    </div>
                    <div className={`font-mono font-black text-sm ${t.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.pnl > 0 ? '+' : ''}${parseFloat(t.pnl).toFixed(2)}
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
