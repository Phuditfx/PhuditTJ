import React, { useState, useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, ReferenceLine } from 'recharts';

export default function PortfolioProjection({ trades, initialBalance, fundingHistory = [] }) {
  const [monthsAhead, setMonthsAhead] = useState(6);

  const closedTrades = useMemo(() => trades.filter(t => t.status === 'Closed').sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)), [trades]);

  // --- Portfolio Growth Graph Logic ---
  const growthData = useMemo(() => {
    let data = [];
    const sumFunding = fundingHistory.reduce((acc, curr) => {
      const amt = parseFloat(curr.amount) || 0;
      return curr.type === 'withdrawal' ? acc - amt : acc + amt;
    }, 0);
    let runningBalance = initialBalance - sumFunding;

    if (closedTrades.length === 0 && fundingHistory.length === 0) {
      return [{ date: new Date().toISOString().split('T')[0], balance: initialBalance }];
    }

    const events = [];
    closedTrades.forEach(t => {
      if (t.dateTime) {
        events.push({ date: new Date(t.dateTime), type: 'trade', amount: parseFloat(t.pnl) || 0, id: t.id });
      }
    });
    fundingHistory.forEach(f => {
      if (f.date) {
        const amt = f.type === 'withdrawal' ? -Math.abs(parseFloat(f.amount)) : Math.abs(parseFloat(f.amount));
        events.push({ date: new Date(f.date), type: 'funding', amount: amt, id: f.id });
      }
    });

    events.sort((a, b) => a.date - b.date);

    // Initial point
    if (events.length > 0) {
      const firstDate = new Date(events[0].date);
      firstDate.setDate(firstDate.getDate() - 1);
      data.push({
        date: firstDate.toISOString().split('T')[0],
        balance: runningBalance,
        timestamp: firstDate.getTime()
      });
    }

    events.forEach(ev => {
      runningBalance += ev.amount;
      const dateStr = ev.date.toISOString().split('T')[0];
      
      // If same date exists, update it, otherwise add new
      const existing = data.find(d => d.date === dateStr);
      if (existing) {
        existing.balance = runningBalance;
      } else {
        data.push({
          date: dateStr,
          balance: runningBalance,
          timestamp: ev.date.getTime()
        });
      }
    });

    return data;
  }, [closedTrades, initialBalance, fundingHistory]);


  // --- System Projection Graph Logic (Monte Carlo + Statistical) ---
  const projectionData = useMemo(() => {
    if (closedTrades.length < 5) return [];

    const wins = closedTrades.filter(t => (parseFloat(t.pnl) || 0) > 0);
    const winRate = wins.length / closedTrades.length;
    
    let grossProfit = 0;
    let grossLoss = 0;
    closedTrades.forEach(t => {
      const pnl = parseFloat(t.pnl) || 0;
      if (pnl > 0) grossProfit += pnl;
      else grossLoss += Math.abs(pnl);
    });

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const lossesCount = closedTrades.length - wins.length;
    const avgLoss = lossesCount > 0 ? grossLoss / lossesCount : 0;

    // Calculate trades per month
    const firstDate = new Date(closedTrades[0].dateTime);
    const lastDate = new Date(closedTrades[closedTrades.length - 1].dateTime);
    const msDiff = lastDate - firstDate;
    const monthsDiff = Math.max(1, msDiff / (1000 * 60 * 60 * 24 * 30.44));
    const tradesPerMonth = Math.round(closedTrades.length / monthsDiff);

    const currentBalance = growthData.length > 0 ? growthData[growthData.length - 1].balance : initialBalance;
    const expectedValuePerTrade = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    
    const data = [];
    let currentDate = new Date();
    data.push({
      month: 0,
      dateLabel: currentDate.toISOString().split('T')[0].slice(0, 7),
      statProjection: currentBalance,
      mcBest: currentBalance,
      mcMedian: currentBalance,
      mcWorst: currentBalance
    });

    // Monte Carlo simulation setup
    const iterations = 100;
    const mcResults = Array(iterations).fill(currentBalance);

    for (let m = 1; m <= monthsAhead; m++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      
      // Statistical
      const expectedMonthlyPnL = expectedValuePerTrade * tradesPerMonth;
      const statBalance = currentBalance + (expectedMonthlyPnL * m);

      // Monte Carlo
      for (let i = 0; i < iterations; i++) {
        for (let t = 0; t < tradesPerMonth; t++) {
          const isWin = Math.random() < winRate;
          // Randomize win/loss size based on historical averages +- 20%
          const winSize = avgWin * (0.8 + Math.random() * 0.4);
          const lossSize = avgLoss * (0.8 + Math.random() * 0.4);
          mcResults[i] += isWin ? winSize : -lossSize;
        }
      }

      // Calculate Percentiles
      const sortedMC = [...mcResults].sort((a, b) => a - b);
      const worst = sortedMC[Math.floor(iterations * 0.1)]; // 10th percentile
      const median = sortedMC[Math.floor(iterations * 0.5)]; // 50th percentile
      const best = sortedMC[Math.floor(iterations * 0.9)]; // 90th percentile

      data.push({
        month: m,
        dateLabel: currentDate.toISOString().split('T')[0].slice(0, 7),
        statProjection: Math.max(0, statBalance),
        mcBest: Math.max(0, best),
        mcMedian: Math.max(0, median),
        mcWorst: Math.max(0, worst)
      });
    }

    return data;
  }, [closedTrades, monthsAhead, growthData, initialBalance]);


  const formatCurrency = (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Portfolio Growth Graph */}
      <div className="crypto-card p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <span>📈 Portfolio Growth</span>
        </h3>
        <p className="text-xs text-slate-550 dark:text-slate-400 mb-6">
          แสดงการเติบโตของพอร์ตจากผลกำไรและประวัติการฝาก/ถอน
        </p>

        <div className="h-72 min-h-[288px] w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growthData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#64748b" 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatCurrency} 
              />
              <Tooltip 
                contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                itemStyle={{fontWeight: 'bold'}}
                formatter={(value) => [formatCurrency(value), 'Balance']}
                labelStyle={{color: '#94a3b8', marginBottom: '4px'}}
              />
              <Area 
                type="stepAfter" 
                dataKey="balance" 
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Projection Graph */}
      <div className="crypto-card p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔮 Future System Projection</span>
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              คาดการณ์การเติบโตล่วงหน้าด้วย Statistical & Monte Carlo Simulation
            </p>
          </div>

          {/* Time Controls */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex gap-2">
              {[6, 12, 24, 36].map(m => (
                <button
                  key={m}
                  onClick={() => setMonthsAhead(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${monthsAhead === m ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {m >= 12 ? `${m/12}Y` : `${m}M`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase w-12">Months:</span>
              <input 
                type="range" 
                min="1" 
                max="36" 
                value={monthsAhead} 
                onChange={(e) => setMonthsAhead(parseInt(e.target.value))}
                className="w-full md:w-32 accent-indigo-600"
              />
              <span className="text-xs font-mono font-bold w-6 text-right text-indigo-600 dark:text-indigo-400">{monthsAhead}</span>
            </div>
          </div>
        </div>

        {closedTrades.length < 5 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/60">
            <span className="text-4xl mb-3">🎲</span>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Not enough data</p>
            <p className="text-xs text-slate-500 mt-1">ต้องมีประวัติการเทรด (ปิดแล้ว) อย่างน้อย 5 ออเดอร์ เพื่อให้ AI คำนวณความน่าจะเป็นได้แม่นยำ</p>
          </div>
        ) : (
          <div className="h-80 min-h-[320px] w-full text-xs font-mono relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projectionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMonteCarlo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#64748b" 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis 
                  stroke="#64748b" 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={formatCurrency} 
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                  itemStyle={{fontWeight: 'bold'}}
                  formatter={(value, name) => {
                    const labels = {
                      mcBest: 'Best Case (90%)',
                      mcMedian: 'Median (MC)',
                      mcWorst: 'Worst Case (10%)',
                      statProjection: 'Expected Avg'
                    };
                    return [formatCurrency(value), labels[name] || name];
                  }}
                  labelStyle={{color: '#94a3b8', marginBottom: '4px'}}
                />
                
                {/* Monte Carlo Range Shading & Lines - Best to Worst */}
                <Area 
                  type="monotone" 
                  dataKey="mcBest" 
                  stroke="#10b981" 
                  strokeWidth={1} 
                  strokeDasharray="3 3"
                  fill="#10b981" 
                  fillOpacity={0.1} 
                  activeDot={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="mcWorst" 
                  stroke="#ef4444" 
                  strokeWidth={1} 
                  strokeDasharray="3 3"
                  fill="var(--color-bg-mask)" 
                  fillOpacity={1} 
                  activeDot={false}
                />
                
                {/* The expected average line */}
                <Line type="monotone" dataKey="statProjection" stroke="#3b82f6" strokeWidth={3} dot={false} />
                
                <ReferenceLine x={projectionData[0]?.dateLabel} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#64748b', fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="absolute top-0 left-10 flex gap-4 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-blue-500"></div>
                <span className="text-slate-600 dark:text-slate-300 font-sans font-bold">Expected Growth</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-500"></div>
                <span className="text-slate-600 dark:text-slate-300 font-sans font-bold">Best Case (90%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-red-500 border-t border-dashed border-red-500"></div>
                <span className="text-slate-600 dark:text-slate-300 font-sans font-bold">Worst Case (10%)</span>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
