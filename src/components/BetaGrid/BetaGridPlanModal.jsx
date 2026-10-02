import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Info, Calculator, Check, Lock } from 'lucide-react';
import { generateGridZones } from '../../db/betaGridDB';

const ACCOUNTING_MODES = [
  {
    id: 'NON_FIFO',
    label: 'Non-FIFO (Discrete Zone)',
    badge: 'แนะนำสำหรับ Grid',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    borderActive: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-500 shadow-md shadow-emerald-500/10',
    desc: 'คิดกำไรแยกอิสระรายไม้ตามโซน (Target Sell − Zone Buy Price) ป้องกัน Fake Loss ช่วงตลาดขาลง',
    formula: 'Profit = Target Sell − Zone Buy Price',
  },
  {
    id: 'FIFO',
    label: 'FIFO (First-In, First-Out)',
    badge: 'ตามโบรกเกอร์',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    borderActive: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-500 shadow-md shadow-amber-500/10',
    desc: 'คิดกำไรเทียบกับราคาซื้อ "เข้าก่อน" ตามลำดับ timestamp รองรับ partial sell เป็นเศษหุ้น',
    formula: 'Profit = Target Sell − Oldest Held Buy Price',
  },
  {
    id: 'AVERAGE_COST',
    label: 'Average Cost (ราคาเฉลี่ย)',
    badge: 'แบบกองทุน',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    borderActive: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 dark:border-purple-500 shadow-md shadow-purple-500/10',
    desc: 'คิดกำไรเทียบกับต้นทุนเฉลี่ยของทุกหุ้นที่ถือครองอยู่ (weighted average) อัปเดตทุกครั้งที่ซื้อเพิ่ม',
    formula: 'Profit = Target Sell − Weighted Avg Cost Basis',
  },
];

export default function BetaGridPlanModal({
  isOpen,
  onClose,
  onSave,
  existingProfile = null,
  currentLivePrice = null
}) {
  const [name, setName] = useState('');
  const [assetTicker, setAssetTicker] = useState('TQQQ');
  const [initialCashReserve, setInitialCashReserve] = useState('5000');

  // Grid Plan State
  const [upperPrice, setUpperPrice] = useState('36.00');
  const [lowerPrice, setLowerPrice] = useState('24.00');
  const [gridStep, setGridStep] = useState('1.00');

  // Asymmetric Grid Support
  const [actionZoneLowerLimit, setActionZoneLowerLimit] = useState('30.00');
  const [actionZoneShares, setActionZoneShares] = useState('10');
  const [safetyZoneShares, setSafetyZoneShares] = useState('20');

  // Accounting Method — IMMUTABLE after creation
  const [accountingMode, setAccountingMode] = useState('NON_FIFO');
  const isEditMode = Boolean(existingProfile);
  const isModeLocked = isEditMode; // lock after creation

  useEffect(() => {
    if (existingProfile) {
      setName(existingProfile.name || '');
      setAssetTicker(existingProfile.assetTicker || 'TQQQ');
      setInitialCashReserve(String(existingProfile.initialCashReserve || 5000));
      setAccountingMode(existingProfile.accountingMode || 'NON_FIFO');
      if (existingProfile.plan) {
        setUpperPrice(String(existingProfile.plan.upperPrice ?? '36.00'));
        setLowerPrice(String(existingProfile.plan.lowerPrice ?? '24.00'));
        setGridStep(String(existingProfile.plan.gridStep ?? '1.00'));
        setActionZoneLowerLimit(String(existingProfile.plan.actionZoneLowerLimit ?? '30.00'));
        setActionZoneShares(String(existingProfile.plan.actionZoneShares ?? '10'));
        setSafetyZoneShares(String(existingProfile.plan.safetyZoneShares ?? '20'));
      }
    } else {
      const basePrice = currentLivePrice ? Math.round(currentLivePrice) : 30;
      setName(`${assetTicker} Grid Strategy`);
      setUpperPrice(String((basePrice * 1.2).toFixed(2)));
      setLowerPrice(String((basePrice * 0.8).toFixed(2)));
      setGridStep('1.00');
      setActionZoneLowerLimit(String(basePrice.toFixed(2)));
      setActionZoneShares('10');
      setSafetyZoneShares('20');
      setInitialCashReserve('5000');
      setAccountingMode('NON_FIFO');
    }
  }, [existingProfile, isOpen]);

  if (!isOpen) return null;

  const up = parseFloat(upperPrice) || 0;
  const low = parseFloat(lowerPrice) || 0;
  const step = parseFloat(gridStep) || 1;
  const limit = parseFloat(actionZoneLowerLimit) || low;
  const actShares = parseInt(actionZoneShares, 10) || 1;
  const safeShares = parseInt(safetyZoneShares, 10) || 1;

  let previewZones = [];
  let errorMsg = null;

  if (up <= low) {
    errorMsg = 'Upper Price ต้องมีค่ามากกว่า Lower Price';
  } else if (step <= 0) {
    errorMsg = 'Grid Step ต้องมากกว่า 0';
  } else {
    previewZones = generateGridZones({
      upperPrice: up,
      lowerPrice: low,
      gridStep: step,
      actionZoneLowerLimit: limit,
      actionZoneShares: actShares,
      safetyZoneShares: safeShares
    });
  }

  const existingFilledZones = existingProfile?.zones?.filter(z => z.status === 'FILLED') || [];
  const actionZonesCount = previewZones.filter(z => z.zoneType === 'ACTION').length;
  const safetyZonesCount = previewZones.filter(z => z.zoneType === 'SAFETY').length;
  const totalRequiredCapital = previewZones.reduce((s, z) => s + z.capitalRequired, 0);
  const avgProfitPerCycle = previewZones.length > 0
    ? previewZones.reduce((s, z) => s + (z.targetSellPrice - z.priceLevel) * z.sharesAllocated, 0) / previewZones.length
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (errorMsg || previewZones.length === 0) return;

    const plan = {
      upperPrice: up,
      lowerPrice: low,
      gridStep: step,
      actionZoneLowerLimit: limit,
      actionZoneShares: actShares,
      safetyZoneShares: safeShares
    };

    const mergedZones = previewZones.map(newZone => {
      const match = existingFilledZones.find(
        ez => Math.abs(ez.priceLevel - newZone.priceLevel) < 0.001
      );
      if (match) {
        return {
          ...newZone,
          status: 'FILLED',
          filledAt: match.filledAt,
          filledPrice: match.filledPrice,
          sharesAllocated: match.sharesAllocated || newZone.sharesAllocated,
          sharesRemaining: match.sharesRemaining !== undefined ? match.sharesRemaining : (match.sharesAllocated || newZone.sharesAllocated),
          capitalRequired: match.capitalRequired || (newZone.priceLevel * (match.sharesAllocated || newZone.sharesAllocated)),
          targetSellPrice: match.targetSellPrice || newZone.targetSellPrice
        };
      }
      return newZone;
    });

    const outsideFilledZones = existingFilledZones.filter(
      ez => !mergedZones.some(mz => Math.abs(mz.priceLevel - ez.priceLevel) < 0.001)
    );

    const finalZones = [...mergedZones, ...outsideFilledZones].sort((a, b) => b.priceLevel - a.priceLevel);
    finalZones.forEach((z, idx) => {
      z.levelIndex = idx + 1;
    });

    onSave({
      id: existingProfile?.id || `profile_${Date.now()}`,
      name: name.trim() || `${assetTicker.toUpperCase()} Grid`,
      assetTicker: assetTicker.trim().toUpperCase(),
      initialCashReserve: parseFloat(initialCashReserve) || 0,
      accountingMode,
      plan,
      zones: finalZones
    });
    onClose();
  };

  const selectedMode = ACCOUNTING_MODES.find(m => m.id === accountingMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/40 flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
              <span className="text-2xl font-black font-serif italic text-indigo-600 dark:text-indigo-400">β</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {existingProfile ? 'แก้ไข Grid Strategy Plan' : 'สร้าง Grid Strategy Plan ใหม่'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Discrete Zone Tracking & Asymmetric Grid Generator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">

          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Strategy Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น TQQQ Asymmetric Grid"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Asset Ticker
              </label>
              <input
                type="text"
                required
                value={assetTicker}
                onChange={(e) => setAssetTicker(e.target.value.toUpperCase())}
                placeholder="TQQQ, SOXL, SPY"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Initial Cash Reserve ($)
              </label>
              <input
                type="number"
                step="any"
                value={initialCashReserve}
                onChange={(e) => setInitialCashReserve(e.target.value)}
                placeholder="5000"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section: Accounting Method — 3 TAB SELECTOR */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚖️</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  ประเภทการคำนวณกำไร (Accounting Mode)
                </span>
                {isModeLocked && (
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <Lock size={9} />
                    LOCKED — ไม่สามารถเปลี่ยนได้
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedMode?.badgeColor}`}>
                {selectedMode?.badge}
              </span>
            </div>

            {isModeLocked ? (
              /* Locked display when editing */
              <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 flex items-center gap-3">
                <Lock size={18} className="text-slate-400 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedMode?.dot}`}></span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{selectedMode?.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedMode?.desc}</p>
                  <p className="text-[11px] font-mono font-bold text-indigo-500 dark:text-indigo-400 mt-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md inline-block">{selectedMode?.formula}</p>
                </div>
              </div>
            ) : (
              /* 3-Tab selector for new profiles */
              <div className="grid grid-cols-1 gap-3">
                {ACCOUNTING_MODES.map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => setAccountingMode(mode.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                      accountingMode === mode.id
                        ? mode.borderActive
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${mode.dot}`}></span>
                        {mode.label}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${mode.badgeColor}`}>
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal ml-4.5">
                      {mode.desc}
                    </p>
                    <code className="text-[10px] font-mono font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md ml-4 self-start">
                      {mode.formula}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Core Grid Parameters */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-indigo-500" />
              <span className="text-sm font-black text-slate-900 dark:text-white">
                Grid Range & Step Configuration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Upper Price ($) (ราคาสูงสุด)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={upperPrice}
                  onChange={(e) => setUpperPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Lower Price ($) (ราคาต่ำสุด)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lowerPrice}
                  onChange={(e) => setLowerPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Grid Step ($) (ระยะห่างแต่ละไม้)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={gridStep}
                  onChange={(e) => setGridStep(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Asymmetric Grid Configuration */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-cyan-500/5 border border-indigo-500/20 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500" />
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  Asymmetric Grid Support (Action vs Safety Zone)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                PRO STRATEGY
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              แบ่งโซนการซื้อเป็น 2 ช่วง: ช่วงราคาปกติ (Action Zone) ใช้จำนวนหุ้นมาตรฐาน และช่วงราคาย่อลึก (Safety Zone) รับไม้ใหญ่ขึ้นเพื่อเฉลี่ยต้นทุนและเก็บรอบได้น้ำหนักมากขึ้น
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                  Action Zone Lower Limit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={actionZoneLowerLimit}
                  onChange={(e) => setActionZoneLowerLimit(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">ราคาแบ่งเขต Action / Safety</span>
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                  Action Zone Shares (หุ้น/ไม้)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={actionZoneShares}
                  onChange={(e) => setActionZoneShares(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">สำหรับราคา &ge; Lower Limit</span>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-600 dark:text-purple-400 block mb-1">
                  Safety Zone Shares (หุ้น/ไม้)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={safetyZoneShares}
                  onChange={(e) => setSafetyZoneShares(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">สำหรับราคา &lt; Lower Limit</span>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Real-time Calculation Summary */}
          {!errorMsg && previewZones.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-700/60 flex flex-col gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Plan Simulation Breakdown (จำลองผลลัพธ์)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-800 dark:bg-slate-900/80">
                  <span className="text-[11px] text-slate-400 block">Total Zones</span>
                  <span className="text-lg font-black font-mono text-cyan-400">{previewZones.length} ไม้</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 dark:bg-slate-900/80">
                  <span className="text-[11px] text-slate-400 block">Action / Safety</span>
                  <span className="text-lg font-black font-mono text-indigo-400">{actionZonesCount} / {safetyZonesCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 dark:bg-slate-900/80">
                  <span className="text-[11px] text-slate-400 block">Max Capital</span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    ${totalRequiredCapital.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 dark:bg-slate-900/80">
                  <span className="text-[11px] text-slate-400 block">Avg Profit/Cycle</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    +${avgProfitPerCycle.toFixed(2)}
                  </span>
                </div>
              </div>

              {existingFilledZones.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <Check size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>ระบบจะรักษาสถานะไม้ที่ถือครองอยู่เดิม ({existingFilledZones.length} ไม้ FILLED) ไว้ 100% ไม่ถูกลบ</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={Boolean(errorMsg) || previewZones.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-black shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              <span>{existingProfile ? 'บันทึกการแก้ไข' : 'สร้าง Grid Plan ทันที'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
