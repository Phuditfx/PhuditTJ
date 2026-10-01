import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  X, 
  Maximize2, 
  TrendingUp, 
  Layers, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Info,
  Sliders,
  Eye,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';

export default function BetaGridChartModal({
  isOpen,
  onClose,
  profile,
  livePrice = null,
  onFillZone,
  onHarvestZone
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showOnlyFilled, setShowOnlyFilled] = useState(false);
  const [candleType, setCandleType] = useState('candle'); // 'candle' | 'line'

  const zones = useMemo(() => profile?.zones || [], [profile?.zones]);
  const plan = profile?.plan || {};
  const ticker = profile?.assetTicker || 'TQQQ';

  // Calculate stats
  const filledCount = zones.filter(z => z.status === 'FILLED').length;
  const emptyCount = zones.filter(z => z.status === 'EMPTY').length;

  useEffect(() => {
    if (!isOpen || !chartContainerRef.current) return;

    // Detect dark mode
    const isDark = document.documentElement.classList.contains('dark') || 
                   window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Clean up previous instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0b1329' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#64748b',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.7)' },
        horzLines: { color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.7)' },
      },
      crosshair: {
        vertLine: {
          color: isDark ? '#64748b' : '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: isDark ? '#64748b' : '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
        timeVisible: true,
      },
    });

    chartInstanceRef.current = chart;

    // Generate realistic historical daily candles centering around current price / grid bounds
    const basePrice = livePrice || (plan.upperPrice ? (plan.upperPrice + plan.lowerPrice) / 2 : 30);
    const dayCount = 60;
    const candleData = [];
    const now = new Date();
    let currentBarClose = basePrice * 0.92;

    for (let i = dayCount; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const timeStr = d.toISOString().split('T')[0];

      // Simulated walk oscillating toward current price
      const volatility = basePrice * 0.02;
      const targetDiff = (basePrice - currentBarClose) / (i + 1);
      const open = currentBarClose;
      const change = targetDiff + (Math.random() - 0.48) * volatility;
      const close = Math.max(1, open + change);
      const high = Math.max(open, close) + Math.random() * (volatility * 0.6);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.6);

      currentBarClose = i === 0 && livePrice ? livePrice : close;

      candleData.push({
        time: timeStr,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(currentBarClose.toFixed(2)),
      });
    }

    let mainSeries;
    if (candleType === 'candle') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      mainSeries.setData(candleData);
    } else {
      mainSeries = chart.addLineSeries({
        color: '#6366f1',
        lineWidth: 2,
      });
      mainSeries.setData(candleData.map(c => ({ time: c.time, value: c.close })));
    }

    // Add Horizontal Price Lines for Grid Zones
    zones.forEach(zone => {
      const isFilled = zone.status === 'FILLED';
      const isAction = zone.zoneType === 'ACTION';

      // 1. Buy Price Line
      mainSeries.createPriceLine({
        price: zone.priceLevel,
        color: isFilled ? '#10b981' : (isAction ? '#6366f1' : '#a855f7'),
        lineWidth: isFilled ? 2 : 1,
        lineStyle: isFilled ? LineStyle.Solid : LineStyle.Dotted,
        axisLabelVisible: true,
        title: `#${zone.levelIndex} ${isFilled ? '🟢 FILLED' : '🔵 BUY'} $${zone.priceLevel.toFixed(2)} (${zone.sharesAllocated} sh)`,
      });

      // 2. Target Sell Price Line
      mainSeries.createPriceLine({
        price: zone.targetSellPrice,
        color: '#059669',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: `#${zone.levelIndex} SELL $${zone.targetSellPrice.toFixed(2)}`,
      });
    });

    // Add Grid Bounds Reference Lines
    if (plan.upperPrice) {
      mainSeries.createPriceLine({
        price: plan.upperPrice,
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.LargeDashed,
        axisLabelVisible: true,
        title: `⚡ UPPER GRID ($${plan.upperPrice.toFixed(2)})`,
      });
    }

    if (plan.lowerPrice) {
      mainSeries.createPriceLine({
        price: plan.lowerPrice,
        color: '#8b5cf6',
        lineWidth: 2,
        lineStyle: LineStyle.LargeDashed,
        axisLabelVisible: true,
        title: `🛡️ LOWER GRID ($${plan.lowerPrice.toFixed(2)})`,
      });
    }

    // Add Live Price Line
    if (livePrice) {
      mainSeries.createPriceLine({
        price: livePrice,
        color: '#06b6d4',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `📍 LIVE: $${livePrice.toFixed(2)}`,
      });
    }

    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, zones, livePrice, plan.upperPrice, plan.lowerPrice, candleType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl shadow-black/40 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <span className="text-xl font-black font-serif italic">β</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                  {ticker} Grid Visualizer Chart
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {zones.length} โซน
                </span>
                {livePrice && (
                  <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    Live: ${livePrice.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เส้นแนวนอนแสดงระดับราคาซื้อ (Buy) และเป้าหมายขาย (Target Sell) ในแต่ละโซนของกลยุทธ์
              </p>
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center gap-2">
            {/* Candle/Line Switcher */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <button
                onClick={() => setCandleType('candle')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  candleType === 'candle'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                แท่งเทียน
              </button>
              <button
                onClick={() => setCandleType('line')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  candleType === 'line'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                เส้นกราฟ
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-0.5 bg-[#06b6d4]"></span>
              <span>ราคาตลาดปัจจุบัน (Live Market)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-0.5 bg-[#10b981]"></span>
              <span>โซนที่มีหุ้น (FILLED)</span>
            </span>
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-3 h-0.5 border-t border-dashed border-[#6366f1]"></span>
              <span>โซนรอรับ (EMPTY Buy)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-3 h-0.5 border-t border-dashed border-[#059669]"></span>
              <span>เป้าขายทำกำไร (Target Sell)</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-[#f59e0b]"></span>
              <span>กรอบบน (Upper Bound)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              ถือครอง {filledCount} / {zones.length} ไม้
            </span>
          </div>
        </div>

        {/* Main Content: Chart (70%) + Quick Zone List (30%) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 min-h-[480px] overflow-hidden">
          {/* Chart Canvas Area */}
          <div className="lg:col-span-3 p-4 flex flex-col justify-between relative bg-white dark:bg-[#0b1329]">
            <div ref={chartContainerRef} className="w-full h-full min-h-[440px] rounded-2xl overflow-hidden" />
          </div>

          {/* Quick Zone Sidebar */}
          <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col max-h-[480px]">
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                ระดับราคาในแต่ละโซน
              </span>
              <button
                onClick={() => setShowOnlyFilled(!showOnlyFilled)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  showOnlyFilled
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {showOnlyFilled ? 'เฉพาะที่มีหุ้น' : 'ทุกโซน'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
              {zones
                .filter(z => !showOnlyFilled || z.status === 'FILLED')
                .map(zone => {
                  const isFilled = zone.status === 'FILLED';
                  const isCurrent = livePrice && livePrice >= zone.priceLevel && livePrice < zone.targetSellPrice;
                  const profit = (zone.targetSellPrice - zone.priceLevel) * zone.sharesAllocated;

                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30 shadow-sm'
                          : isFilled
                            ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-500">#{zone.levelIndex}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            zone.zoneType === 'ACTION'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          }`}>
                            {zone.zoneType}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-500 text-white animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-black ${isFilled ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {isFilled ? 'FILLED' : 'EMPTY'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ${zone.priceLevel.toFixed(2)} → ${zone.targetSellPrice.toFixed(2)}
                        </span>
                        <span className="text-emerald-500 font-bold">
                          +${profit.toFixed(1)}
                        </span>
                      </div>

                      {/* Action buttons inside sidebar */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-800/40">
                        <span className="text-[10px] text-slate-400">
                          {zone.sharesAllocated} หุ้น
                        </span>
                        {isFilled ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onHarvestZone && onHarvestZone(zone);
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                          >
                            <DollarSign size={10} />
                            <span>ขาย</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFillZone && onFillZone(zone);
                            }}
                            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                          >
                            <ShoppingBag size={10} />
                            <span>ซื้อ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
