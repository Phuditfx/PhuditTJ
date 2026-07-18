import React, { useState, useEffect } from 'react';

export default function DynamicRiskCalculator() {
  const [portfolio, setPortfolio] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(0.33);
  const [riskAmount, setRiskAmount] = useState(1);
  const [profitGoal, setProfitGoal] = useState(1000);
  const [days, setDays] = useState(20);

  const [rrPerMonth, setRrPerMonth] = useState(0);
  const [rrPerDay, setRrPerDay] = useState(0);
  const [requiredCapital, setRequiredCapital] = useState(0);

  useEffect(() => {
    const p = parseFloat(portfolio) || 0;
    const rp = parseFloat(riskPercent) || 0;
    const r = parseFloat(riskAmount) || 0;
    const pr = parseFloat(profitGoal) || 0;
    const d = parseFloat(days) || 20;

    if (r <= 0 || pr <= 0 || d <= 0 || rp <= 0) {
      setRrPerMonth(0);
      setRrPerDay(0);
      setRequiredCapital(0);
      return;
    }

    const rrMonth = pr / r;
    const rrDay = rrMonth / d;
    const reqCap = r / (rp / 100);

    setRrPerMonth(rrMonth);
    setRrPerDay(rrDay);
    setRequiredCapital(reqCap);
  }, [portfolio, riskPercent, riskAmount, profitGoal, days]);

  let capRatio = 0;
  if (requiredCapital > 0) {
    capRatio = (portfolio / requiredCapital) * 100;
  }
  
  const isSufficient = portfolio >= requiredCapital;
  const barWidth = Math.min(capRatio, 100);

  return (
    <div className="flex-1 w-full flex items-start justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-8 mt-4">
        
        {/* ฝั่ง Input */}
        <div className="flex-1 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-1">Advanced Trading Calculator</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">คำนวณเป้าหมาย RR และประเมิน Buying Power แบบยืดหยุ่น</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1. เงินทุนของพอร์ตปัจจุบัน (Current Capital - USD)</label>
              <input 
                type="number" 
                value={portfolio} 
                onChange={(e) => setPortfolio(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition font-mono"
              />
            </div>

            <div className="p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-500/30 rounded-lg">
              <label className="block text-sm font-medium text-sky-700 dark:text-sky-300 mb-1">2. กำหนด % ความเสี่ยงต่อพอร์ต (Risk %)</label>
              <input 
                type="number" 
                value={riskPercent} 
                onChange={(e) => setRiskPercent(e.target.value)}
                step="0.01" min="0.01"
                onFocus={(e) => e.target.select()}
                className="w-full bg-white dark:bg-slate-950 border border-sky-300 dark:border-sky-500/50 rounded-lg py-2 px-3 text-slate-800 dark:text-white font-semibold text-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">3. กำหนดค่า 1 RR เป็นตัวเงิน (Risk Amount - USD)</label>
              <input 
                type="number" 
                value={riskAmount} 
                onChange={(e) => setRiskAmount(e.target.value)}
                step="0.5"
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">4. เป้าหมายกำไร/เดือน ($)</label>
                <input 
                  type="number" 
                  value={profitGoal} 
                  onChange={(e) => setProfitGoal(e.target.value)}
                  step="100"
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">จำนวนวันเทรด/เดือน</label>
                <input 
                  type="number" 
                  value={days} 
                  onChange={(e) => setDays(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ฝั่ง Output */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">ผลลัพธ์เป้าหมาย RR</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">ต้องทำให้ได้ (ต่อเดือน)</div>
                <div className="text-3xl font-bold text-amber-500 dark:text-amber-400 font-mono">
                  {rrPerMonth % 1 !== 0 ? rrPerMonth.toFixed(1) : rrPerMonth} <span className="text-lg text-slate-400 dark:text-slate-500 font-sans font-normal">RR</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">เฉลี่ยต้องทำ (ต่อวัน)</div>
                <div className="text-3xl font-bold text-amber-500 dark:text-amber-400 font-mono">
                  {rrPerDay % 1 !== 0 ? rrPerDay.toFixed(1) : rrPerDay} <span className="text-lg text-slate-400 dark:text-slate-500 font-sans font-normal">RR</span>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">การประเมินเงินทุนที่ต้องใช้</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">เงินทุนขั้นต่ำ (Required Capital)</div>
                  <div className="text-xs text-sky-600 dark:text-sky-400 mt-1">อิงจากความเสี่ยงไม้ละ {riskPercent || 0}% ของพอร์ต</div>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
                  ${requiredCapital.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>

              {/* แถบสถานะเปรียบเทียบทุน */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    สถานะเงินทุน: <span className={`font-bold ${isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isSufficient ? 'เพียงพอต่อแผน' : 'ทุนไม่พอ'}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    {isSufficient ? `มีทุน ${capRatio.toFixed(0)}% ของขั้นต่ำ` : `ขาดทุนอีก ${(requiredCapital - portfolio).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}$`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`${isSufficient ? 'bg-emerald-500' : 'bg-rose-500'} h-2.5 rounded-full transition-all duration-500`} 
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  {isSufficient 
                    ? <><span className="text-emerald-600 dark:text-emerald-400">✓ ทุนปัจจุบันรองรับแผนนี้ได้</span> คุณมี Buying Power เพียงพอครับ</>
                    : <><span className="text-rose-600 dark:text-rose-400">⚠ คำเตือน:</span> ทุนปัจจุบันรองรับได้แค่ {capRatio.toFixed(1)}% ของแผน ควรเพิ่มทุนหรือลด Risk ($) ลงครับ</>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
