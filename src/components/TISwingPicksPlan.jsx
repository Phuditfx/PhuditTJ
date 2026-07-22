import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TISwingPicksPlan() {
  const [weeklyFresh, setWeeklyFresh] = useState(75);
  const [annualAdd, setAnnualAdd] = useState(0);
  const [winRate, setWinRate] = useState(50);
  const [tp, setTp] = useState(15);
  const [sl, setSl] = useState(5);
  const [years, setYears] = useState(5);

  const [results, setResults] = useState({
    sumCapital: '0$',
    sumPortfolio: '0$',
    sumProfit: '0$',
    tableData: [],
    chartData: {
      labels: [],
      datasets: []
    }
  });

  const calculate = () => {
    const wFresh = parseFloat(weeklyFresh) || 0;
    const aAdd = parseFloat(annualAdd) || 0;
    const wRate = parseFloat(winRate) / 100 || 0;
    const tpVal = parseFloat(tp) / 100 || 0;
    const slVal = parseFloat(sl) / 100 || 0;
    const yrs = parseInt(years) || 1;

    // คำนวณค่าคาดหวังเฉลี่ย (Expected Value) ต่อ 1 รอบการลงทุน
    const EV = (wRate * tpVal) - ((1 - wRate) * slVal);
    const profitMultiplier = 1 + EV;

    // สายพานจำลองการถือครอง 4 สัปดาห์
    let pipelines = [0, 0, 0, 0]; 
    let totalInvested = 0;

    let labels = [];
    let investedData = [];
    let portfolioData = [];
    let tableData = [];

    for (let y = 1; y <= yrs; y++) {
      // ปีแรกใช้ทุนเริ่มต้นที่ตั้งไว้, ปีที่ 2 เป็นต้นไปใช้เงินเติมรายปีหารด้วย 52 สัปดาห์
      let weeklyInjection = y === 1 ? wFresh : (aAdd / 52); 

      for (let w = 1; w <= 52; w++) {
        let pIndex = (w - 1) % 4;
        
        // ทุนรอบใหม่ = เงินทุนที่เติมสัปดาห์นี้ + เงินที่ครบกำหนดจากการลงทุนเมื่อ 4 สัปดาห์ก่อน
        let maturedCapital = pipelines[pIndex];
        let capitalToTrade = weeklyInjection + maturedCapital;

        totalInvested += weeklyInjection;

        // เมื่อครบ 4 สัปดาห์ ทุนก้อนนี้จะเติบโตตามสมการ Expected Value และรอทบในรอบถัดไป
        pipelines[pIndex] = capitalToTrade * profitMultiplier;
      }

      let currentPortfolioValue = pipelines.reduce((a, b) => a + b, 0);
      
      labels.push('ปีที่ ' + y);
      investedData.push(totalInvested.toFixed(2));
      portfolioData.push(currentPortfolioValue.toFixed(2));

      let roi = totalInvested > 0 ? ((currentPortfolioValue - totalInvested) / totalInvested) * 100 : 0;

      tableData.push({
        year: y,
        invested: totalInvested,
        portfolio: currentPortfolioValue,
        roi: roi
      });
    }

    const finalPortfolio = parseFloat(portfolioData[portfolioData.length - 1] || 0);
    
    setResults({
      sumCapital: totalInvested.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '$',
      sumPortfolio: finalPortfolio.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '$',
      sumProfit: (finalPortfolio - totalInvested).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '$',
      tableData,
      chartData: {
        labels: labels,
        datasets: [
          {
            label: 'มูลค่าพอร์ต (Portfolio Value)',
            data: portfolioData,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'เงินทุนสะสม (Capital Invested)',
            data: investedData,
            borderColor: '#94a3b8',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4
          }
        ]
      }
    });
  };

  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyFresh, annualAdd, winRate, tp, sl, years]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    },
    plugins: { legend: { labels: { color: '#f8fafc' } } }
  };

  return (
    <div className="font-sarabun text-slate-100 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <span className="text-blue-500">📊</span> เครื่องมือคำนวณแผนการลงทุน (4-Week Compounding Cycle)
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium mt-2">
          จำลองการเติบโตของพอร์ตตามระบบแบ่งไม้ซื้อรายสัปดาห์ และทบต้นทุกๆ 4 สัปดาห์
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar / Inputs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 h-fit">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 border-l-4 border-blue-500 pl-3">
            ตั้งค่าระบบ (Parameters)
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">เงินทุนรายสัปดาห์ ปีที่ 1 ($) (ตัวอย่าง: 75$)</label>
              <input type="number" 
                value={weeklyFresh} onChange={(e) => setWeeklyFresh(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">เติมเงินเข้าพอร์ตต่อปี ตั้งแต่ปีที่ 2 เป็นต้นไป ($)<br/><span className="text-xs font-normal text-slate-500 dark:text-slate-400">(หากไม่เติมเงินเพิ่มเลย ให้ใส่ 0)</span></label>
              <input type="number" step="100"
                value={annualAdd} onChange={(e) => setAnnualAdd(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Win Rate (%)</label>
              <input type="number" 
                value={winRate} onChange={(e) => setWinRate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">เป้าหมายกำไรเฉลี่ยต่อตัว : Take Profit (%)</label>
              <input type="number" 
                value={tp} onChange={(e) => setTp(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">จุดตัดขาดทุน : Stop Loss (%)</label>
              <input type="number" 
                value={sl} onChange={(e) => setSl(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ระยะเวลาจำลองผลลัพธ์ (ปี)</label>
              <input type="number" 
                value={years} onChange={(e) => setYears(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>

            <button onClick={calculate} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors shadow-sm">
              คำนวณผลลัพธ์
            </button>
          </div>
        </div>

        {/* Main Content / Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold">เงินทุนที่ใช้ไปทั้งหมด (Total Capital)</h3>
              <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">{results.sumCapital}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold">มูลค่าพอร์ตสุดท้าย (Final Portfolio)</h3>
              <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-2">{results.sumPortfolio}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold">กำไรสุทธิ (Net Profit)</h3>
              <p className="text-2xl font-black text-blue-500 dark:text-blue-400 mt-2">{results.sumProfit}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-80 relative">
            {results.chartData.labels.length > 0 && (
              <Line data={results.chartData} options={chartOptions} />
            )}
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm font-bold">
                    <th className="py-4 px-6 whitespace-nowrap">สิ้นสุดปีที่</th>
                    <th className="py-4 px-6 whitespace-nowrap">เงินทุนสะสม ($)</th>
                    <th className="py-4 px-6 whitespace-nowrap">มูลค่าพอร์ต ($)</th>
                    <th className="py-4 px-6 whitespace-nowrap">กำไร (%)</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {results.tableData.map((row) => (
                    <tr key={row.year} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors">
                      <td className="py-4 px-6 text-slate-800 dark:text-slate-200">ปีที่ {row.year}</td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{row.invested.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      <td className="py-4 px-6 text-emerald-600 dark:text-emerald-400 font-bold">{row.portfolio.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      <td className={`py-4 px-6 font-bold ${row.roi >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {row.roi > 0 ? '+' : ''}{row.roi.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
