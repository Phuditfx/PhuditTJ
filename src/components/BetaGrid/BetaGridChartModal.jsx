import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Layers, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Info,
  Maximize2,
  Minimize2,
  Activity,
  Zap,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { fetchHistoricalCandles } from '../../api/priceApi';

export default function BetaGridChartModal({
  isOpen,
  onClose,
  profile,
  livePrice = null,
  onFillZone,
  onHarvestZone
}) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [showOnlyFilled, setShowOnlyFilled] = useState(false);
  const [chartType, setChartType] = useState('candle'); // 'candle' | 'line'
  const [selectedTF, setSelectedTF] = useState('1h'); // '1h' | '4h' | 'D' | 'W' | 'M'
  const [realCandles, setRealCandles] = useState([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);

  const zones = useMemo(() => profile?.zones || [], [profile?.zones]);
  const plan = profile?.plan || {};
  const ticker = profile?.assetTicker || 'TQQQ';

  const filledCount = zones.filter(z => z.status === 'FILLED').length;
  const emptyCount = zones.filter(z => z.status === 'EMPTY').length;

  // Fetch real market historical candles whenever modal is opened or TF/ticker changes
  useEffect(() => {
    if (!isOpen || !ticker) return;
    let isMounted = true;
    setIsLoadingCandles(true);

    fetchHistoricalCandles(ticker, selectedTF)
      .then(data => {
        if (isMounted) {
          if (data && data.length > 0) {
            setRealCandles(data);
          } else {
            setRealCandles([]);
          }
        }
      })
      .catch(err => {
        console.warn('Failed to load real market candles:', err);
        if (isMounted) setRealCandles([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCandles(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, ticker, selectedTF]);

  // 1. Process candles: Use 100% REAL market candles from Yahoo/Webull
  const candles = useMemo(() => {
    if (realCandles && realCandles.length > 0) {
      return realCandles.map((c, idx) => {
        const isLast = idx === realCandles.length - 1;
        const close = isLast && livePrice ? livePrice : c.close;
        const high = Math.max(c.high, close);
        const low = Math.min(c.low, close);
        return {
          index: idx,
          time: c.time,
          open: c.open,
          close: close,
          high: high,
          low: low,
          isUp: close >= c.open
        };
      });
    }

    // Fallback: If offline or API unavailable, generate realistic walk
    const config = {
      '1h': { count: 36, stepPct: 0.003, waveFreq: 0.12 },
      '4h': { count: 32, stepPct: 0.006, waveFreq: 0.10 },
      'D':  { count: 30, stepPct: 0.012, waveFreq: 0.08 },
      'W':  { count: 24, stepPct: 0.022, waveFreq: 0.06 },
      'M':  { count: 18, stepPct: 0.038, waveFreq: 0.05 }
    }[selectedTF] || { count: 32, stepPct: 0.012, waveFreq: 0.08 };

    const count = config.count;
    const currentPrice = livePrice || (plan.upperPrice ? (plan.upperPrice + plan.lowerPrice) / 2 : 30);
    const step = plan.gridStep || 1;
    const maxBound = plan.upperPrice ? plan.upperPrice + step * 1.5 : currentPrice * 1.35;
    const minBound = plan.lowerPrice ? Math.max(0.5, plan.lowerPrice - step * 1.5) : currentPrice * 0.65;

    const rawReversed = [];
    let cur = currentPrice;
    rawReversed.push({ close: cur });

    for (let i = 1; i < count; i++) {
      const wave = Math.sin(i * config.waveFreq * 3.14159) * (step * 0.9);
      const noise = Math.cos(i * 1.7) * (step * 0.3);
      const delta = (wave + noise) * (config.stepPct * 12);
      
      let nextPrice = cur - delta;
      if (nextPrice > maxBound) nextPrice = maxBound - (step * 0.2);
      if (nextPrice < minBound) nextPrice = minBound + (step * 0.2);
      
      rawReversed.push({ close: nextPrice });
      cur = nextPrice;
    }

    const rawChronological = rawReversed.reverse();
    return rawChronological.map((item, idx) => {
      const isLast = idx === count - 1;
      const close = isLast ? currentPrice : item.close;
      const prevClose = idx > 0 ? rawChronological[idx - 1].close : close * 0.995;
      const open = prevClose;
      
      const wickSpread = step * (config.stepPct * 14 + 0.15);
      const high = Math.max(open, close) + Math.abs(Math.sin(idx * 2.3)) * wickSpread;
      const low = Math.min(open, close) - Math.abs(Math.cos(idx * 2.1)) * wickSpread;

      return {
        index: idx,
        open,
        close,
        high,
        low,
        isUp: close >= open
      };
    });
  }, [realCandles, livePrice, plan, selectedTF]);

  // 2. Chart Y-Axis Price Range strictly encompassing BOTH candles AND grid zones
  const { minPrice, maxPrice, priceRange, visibleZones } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 20, maxPrice: 40, priceRange: 20, visibleZones: zones };
    }

    const candleHighs = candles.map(c => c.high);
    const candleLows = candles.map(c => c.low);
    let minC = Math.min(...candleLows);
    let maxC = Math.max(...candleHighs);

    if (livePrice) {
      minC = Math.min(minC, livePrice);
      maxC = Math.max(maxC, livePrice);
    }

    // In macro timeframes (D, W, M), include full grid upper and lower boundaries
    if (selectedTF === 'D' || selectedTF === 'W' || selectedTF === 'M') {
      if (plan.lowerPrice) minC = Math.min(minC, plan.lowerPrice);
      if (plan.upperPrice) maxC = Math.max(maxC, plan.upperPrice);
    }

    // Add 4% padding top and bottom
    const pad = Math.max(0.15, (maxC - minC) * 0.04);
    const finalMin = Math.max(0.01, minC - pad);
    const finalMax = maxC + pad;

    const vz = zones.filter(z => {
      return z.targetSellPrice >= finalMin && z.priceLevel <= finalMax;
    });

    return {
      minPrice: finalMin,
      maxPrice: finalMax,
      priceRange: finalMax - finalMin,
      visibleZones: vz.length > 0 ? vz : zones
    };
  }, [candles, livePrice, plan, selectedTF, zones]);

  // Chart dimensions
  const svgWidth = 840;
  const svgHeight = 480;
  const padLeft = 70;
  const padRight = 140;
  const padTop = 30;
  const padBottom = 40;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getY = (price) => {
    if (priceRange <= 0) return padTop + chartH / 2;
    const ratio = (price - minPrice) / priceRange;
    return padTop + (1 - ratio) * chartH;
  };

  if (!isOpen) return null;

  const currentZone = zones.find(z => livePrice && livePrice >= z.priceLevel && livePrice < z.targetSellPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden text-slate-100">

        {/* Close (X) Button — absolute top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 text-slate-400 hover:text-white hover:bg-slate-700/70 rounded-xl transition-colors cursor-pointer"
          title="ปิด"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <span className="text-2xl font-black font-serif italic">β</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white font-mono tracking-tight">
                  {ticker} <span className="text-indigo-400">({selectedTF})</span> Grid Visualizer Chart
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {zones.length} โซน
                </span>
                {livePrice && (
                  <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                    Live: ${livePrice.toFixed(2)}
                  </span>
                )}
                {realCandles.length > 0 && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>กราฟจริง (Market Data)</span>
                  </span>
                )}
                {isLoadingCandles && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center gap-1 animate-pulse">
                    <RefreshCw size={10} className="animate-spin" />
                    <span>กำลังโหลดแท่งเทียน...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เส้นแนวนอนแสดงระดับราคาซื้อ (Buy) และเป้าหมายขาย (Target Sell) ในแต่ละโซนของกลยุทธ์
              </p>
            </div>
          </div>

          {/* Top Controls: Timeframe + Chart Type */}
          <div className="flex flex-wrap items-center gap-2.5 pr-10">
            {/* Timeframe Selector (1h / 4h / D / W / M) */}
            <div className="flex p-1 rounded-xl bg-slate-800/90 border border-slate-700/70 text-xs font-bold shadow-inner">
              {['1h', '4h', 'D', 'W', 'M'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTF(tf)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-mono font-bold ${
                    selectedTF === tf
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title={`Timeframe ${tf}`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Candle vs Line Toggle */}
            <div className="flex p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold">
              <button
                onClick={() => setChartType('candle')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartType === 'candle'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                แท่งเทียน
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                เส้นราคา
              </button>
            </div>

          </div>
        </div>

        {/* Legend Bar */}
        <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3.5 h-0.5 bg-cyan-400"></span>
              <span>ราคาตลาดปัจจุบัน (Live Market)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3.5 h-1 bg-emerald-500 rounded"></span>
              <span>โซนที่มีหุ้น (FILLED)</span>
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3.5 h-0.5 border-t border-dashed border-indigo-400"></span>
              <span>โซนรอรับ (EMPTY Buy)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-3.5 h-0.5 border-t border-dashed border-emerald-500"></span>
              <span>เป้าขาย (Target Sell)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <span>ถือครอง: <strong className="text-emerald-400">{filledCount}</strong> ไม้</span>
            <span>•</span>
            <span>รอรับ: <strong className="text-indigo-400">{emptyCount}</strong> ไม้</span>
          </div>
        </div>

        {/* Content: Chart + Sidebar */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 min-h-[480px] overflow-hidden">
          
          {/* Main Chart Area */}
          <div className="lg:col-span-3 p-4 flex flex-col justify-between relative bg-[#0b1329] overflow-x-auto custom-scrollbar">
            <div className="min-w-[650px] relative">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-[460px] select-none">
                
                {/* Background Grid */}
                <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="#090d1f" rx={8} />

                {/* Shaded bands for FILLED zones */}
                {visibleZones.map(z => {
                  if (z.status !== 'FILLED') return null;
                  const y1 = getY(z.targetSellPrice);
                  const y2 = getY(z.priceLevel);
                  const h = Math.abs(y2 - y1);
                  return (
                    <rect
                      key={`band_${z.id}`}
                      x={padLeft}
                      y={Math.min(y1, y2)}
                      width={chartW}
                      height={Math.max(2, h)}
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  );
                })}

                {/* Candlesticks or Price Line */}
                {chartType === 'candle' ? (
                  candles.map(c => {
                    const candleW = (chartW / candles.length) * 0.65;
                    const x = padLeft + (c.index / (candles.length - 1)) * (chartW - 20) + 10;
                    const openY = getY(c.open);
                    const closeY = getY(c.close);
                    const highY = getY(c.high);
                    const lowY = getY(c.low);
                    const bodyTop = Math.min(openY, closeY);
                    const bodyH = Math.max(2, Math.abs(closeY - openY));
                    const color = c.isUp ? '#10b981' : '#ef4444';

                    return (
                      <g key={c.index}>
                        {/* Wick */}
                        <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth={1.2} opacity={0.7} />
                        {/* Body */}
                        <rect
                          x={x - candleW / 2}
                          y={bodyTop}
                          width={candleW}
                          height={bodyH}
                          fill={color}
                          rx={1.5}
                        />
                      </g>
                    );
                  })
                ) : (
                  <path
                    d={candles.reduce((acc, c, idx) => {
                      const x = padLeft + (c.index / (candles.length - 1)) * (chartW - 20) + 10;
                      const y = getY(c.close);
                      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }, '')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                )}

                {/* Horizontal Lines for Each Zone */}
                {visibleZones.map(z => {
                  const isFilled = z.status === 'FILLED';
                  const isHovered = hoveredZone?.id === z.id;
                  const buyY = getY(z.priceLevel);
                  const sellY = getY(z.targetSellPrice);

                  return (
                    <g key={z.id} onMouseEnter={() => setHoveredZone(z)} onMouseLeave={() => setHoveredZone(null)}>
                      {/* Target Sell Line */}
                      <line
                        x1={padLeft}
                        y1={sellY}
                        x2={padLeft + chartW}
                        y2={sellY}
                        stroke="#059669"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        opacity={isFilled ? 0.8 : 0.4}
                      />

                      {/* Buy Price Line */}
                      <line
                        x1={padLeft}
                        y1={buyY}
                        x2={padLeft + chartW}
                        y2={buyY}
                        stroke={isFilled ? '#10b981' : '#6366f1'}
                        strokeWidth={isFilled ? 2 : (isHovered ? 1.8 : 1)}
                        strokeDasharray={isFilled ? 'none' : '3 3'}
                        opacity={isFilled ? 0.95 : 0.65}
                      />

                      {/* Right-side Price Axis Badges */}
                      <g transform={`translate(${padLeft + chartW + 8}, ${buyY - 9})`}>
                        <rect
                          width={125}
                          height={18}
                          rx={4}
                          fill={isFilled ? '#065f46' : '#1e1b4b'}
                          stroke={isFilled ? '#10b981' : '#4f46e5'}
                          strokeWidth={1}
                        />
                        <text x={6} y={13} fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          #{z.levelIndex} {isFilled ? 'FILLED' : 'BUY'} ${z.priceLevel.toFixed(2)}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Live Price Horizontal Line */}
                {livePrice && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={getY(livePrice)}
                      x2={padLeft + chartW}
                      y2={getY(livePrice)}
                      stroke="#06b6d4"
                      strokeWidth={2}
                    />
                    <g transform={`translate(${padLeft + chartW + 8}, ${getY(livePrice) - 10})`}>
                      <rect width={125} height={20} rx={5} fill="#0891b2" />
                      <text x={6} y={14} fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="black">
                        📍 LIVE ${livePrice.toFixed(2)}
                      </text>
                    </g>
                  </g>
                )}

                {/* Y-Axis Price Ticks on Left */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const price = minPrice + ratio * priceRange;
                  const y = padTop + (1 - ratio) * chartH;
                  return (
                    <text
                      key={ratio}
                      x={padLeft - 10}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      ${price.toFixed(2)}
                    </text>
                  );
                })}

                {/* X-Axis Time Labels at bottom */}
                {candles.map((c, idx) => {
                  const step = Math.max(1, Math.floor(candles.length / 5));
                  if (idx % step === 0 || idx === candles.length - 1) {
                    const x = candles.length > 1 ? padLeft + (c.index / (candles.length - 1)) * (chartW - 20) + 10 : padLeft + chartW / 2;
                    let label = '';
                    if (c.time) {
                      const d = new Date(typeof c.time === 'number' ? c.time * 1000 : c.time);
                      label = selectedTF === '1h' || selectedTF === '4h'
                        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                    return (
                      <text
                        key={`x_${idx}`}
                        x={x}
                        y={svgHeight - 12}
                        fill="#64748b"
                        fontSize="9.5"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                    );
                  }
                  return null;
                })}
              </svg>
            </div>
          </div>

          {/* Quick Zone Sidebar */}
          <div className="border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/40 flex flex-col max-h-[500px]">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                ระดับราคาในแต่ละโซน
              </span>
              <button
                onClick={() => setShowOnlyFilled(!showOnlyFilled)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  showOnlyFilled
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
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
                      onMouseEnter={() => setHoveredZone(zone)}
                      onMouseLeave={() => setHoveredZone(null)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-cyan-500 bg-cyan-950/40 shadow-sm'
                          : isFilled
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-slate-800/80 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-400">#{zone.levelIndex}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            zone.zoneType === 'ACTION'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {zone.zoneType}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-500 text-white animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-black ${isFilled ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isFilled ? 'FILLED' : 'EMPTY'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 font-mono">
                        <span className="font-bold text-slate-200">
                          ${zone.priceLevel.toFixed(2)} → ${zone.targetSellPrice.toFixed(2)}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          +${profit.toFixed(1)}
                        </span>
                      </div>

                      {/* Action buttons inside sidebar */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60">
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
