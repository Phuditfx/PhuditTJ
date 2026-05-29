import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function Analytics({ trades }) {
  const { t } = useLanguage();

  const { pnlCurveData, winLossData, avgWinLossData, totalTrades } = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'Closed').sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    let cumulativePnL = 0;
    const curveData = [];
    let wins = 0;
    let losses = 0;
    let grossWin = 0;
    let grossLoss = 0;

    closedTrades.forEach((t, i) => {
      const pnl = parseFloat(t.pnl) || 0;
      cumulativePnL += pnl;
      
      if (t.dateTime) {
        const d = new Date(t.dateTime);
        curveData.push({
          name: `${d.getDate()}/${d.getMonth()+1}`,
          pnl: cumulativePnL,
          tradeNo: i + 1
        });
      }

      if (pnl > 0) {
        wins++;
        grossWin += pnl;
      } else if (pnl < 0) {
        losses++;
        grossLoss += Math.abs(pnl);
      }
    });

    return {
      pnlCurveData: curveData,
      winLossData: [
        { name: 'Wins', value: wins },
        { name: 'Losses', value: losses }
      ],
      avgWinLossData: [
        { name: 'Avg Win', value: wins > 0 ? grossWin / wins : 0 },
        { name: 'Avg Loss', value: losses > 0 ? grossLoss / losses : 0 }
      ],
      totalTrades: closedTrades.length
    };
  }, [trades]);

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="flex flex-col gap-6">
      
      {/* 📈 PnL Curve */}
      <div className="crypto-card p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">📈 Equity Curve (Cumulative PnL)</h3>
        <p className="text-xs text-slate-550 dark:text-slate-400 mb-6">กราฟแสดงการเติบโตของพอร์ตจากกำไร/ขาดทุนสะสม</p>
        <div className="h-64 w-full text-xs font-mono">
          {pnlCurveData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlCurveData}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                <XAxis dataKey="tradeNo" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                  itemStyle={{fontWeight: 'bold', color: '#ffffff'}}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
                  labelFormatter={(label) => `Trade #${label}`}
                />
                <Area type="monotone" dataKey="pnl" stroke="#4f46e5" fillOpacity={1} fill="url(#colorPnL)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No Data Available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Win Rate Pie */}
        <div className="crypto-card p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">🎯 Win Rate Distribution</h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">สัดส่วนออเดอร์ที่กำไรและขาดทุน</p>
          <div className="h-48 w-full flex items-center justify-center">
            {totalTrades > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                    itemStyle={{fontWeight: 'bold'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No Data Available
              </div>
            )}
          </div>
        </div>

        {/* Avg Win vs Avg Loss */}
        <div className="crypto-card p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">⚖️ Average Win vs Loss</h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">เปรียบเทียบค่าเฉลี่ยกำไรและขาดทุนต่อออเดอร์</p>
          <div className="h-48 w-full">
            {totalTrades > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={avgWinLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name} $${value.toFixed(2)}`}
                  >
                    {avgWinLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#ffffff'}}
                    itemStyle={{fontWeight: 'bold'}}
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No Data Available
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
