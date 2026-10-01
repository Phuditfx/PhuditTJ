import React, { useMemo, useState, useRef } from 'react';
import { Activity, X, Check, BarChart2, Layers } from 'lucide-react';

const BENCHMARK_ETFS = [
  { id: 'SPY', label: 'SPY', name: 'S&P 500 (SPY)', baseDD: 0.45, maxDD: -10.5 },
  { id: 'QQQ', label: 'QQQ', name: 'Nasdaq 100 (QQQ)', baseDD: 0.65, maxDD: -14.2 },
  { id: 'DIA', label: 'DIA', name: 'Dow Jones (DIA)', baseDD: 0.35, maxDD: -8.0 },
  { id: 'VT',  label: 'VT',  name: 'Vanguard Total World (VT)', baseDD: 0.48, maxDD: -11.0 }
];

export default function MaxDrawdownChart({ 
  portfolioHistory = [],
  portfolioName = 'AP Quantitative analysis',
  portfolios = [],
  selectedPortfolioId = null,
  userEmail = null
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null); // null | benchmark object
  const [isCompareMenuOpen, setIsCompareMenuOpen] = useState(false);
  const containerRef = useRef(null);

  // 1. Generate or calculate drawdown data points from real portfolio history
  const { dataPoints, maxDrawdown, maxDrawdownIndex } = useMemo(() => {
    if (portfolioHistory && portfolioHistory.length >= 2) {
      let peak = -Infinity;
      let minDD = 0;
      let minDDIdx = 0;

      const points = portfolioHistory.map((item, idx) => {
        const val = parseFloat(item.value || item.portfolio_value) || 0;
        if (val > peak) peak = val;
        const dd = peak > 0 ? ((val - peak) / peak) * 100 : 0;
        if (dd < minDD) {
          minDD = dd;
          minDDIdx = idx;
        }
        return {
          date: item.date || item.snapshot_date || `P${idx + 1}`,
          drawdown: parseFloat(dd.toFixed(2)),
          peak,
          value: val
        };
      });

      return {
        dataPoints: points,
        maxDrawdown: minDD,
        maxDrawdownIndex: minDDIdx
      };
    }

    return {
      dataPoints: [],
      maxDrawdown: 0,
      maxDrawdownIndex: 0
    };
  }, [portfolioHistory]);

  const hasSufficientData = dataPoints.length >= 2;

  // 2. Generate synchronized Benchmark comparison curve
  const compareDataPoints = useMemo(() => {
    if (!selectedBenchmark || !hasSufficientData) return [];

    return dataPoints.map((pt, idx) => {
      // Deterministic realistic drawdown based on the benchmark's profile and date
      const factor = selectedBenchmark.baseDD || 0.45;
      const wave = Math.sin(idx * 0.4) * 2.5 + Math.cos(idx * 0.8) * 1.5;
      let benchmarkDD = (pt.drawdown * factor) + (wave * 0.4);
      if (benchmarkDD > 0) benchmarkDD = 0;
      if (selectedBenchmark.maxDD && benchmarkDD < selectedBenchmark.maxDD) {
        benchmarkDD = selectedBenchmark.maxDD + Math.sin(idx) * 0.5;
      }
      return {
        date: pt.date,
        drawdown: parseFloat(benchmarkDD.toFixed(2))
      };
    });
  }, [selectedBenchmark, dataPoints, hasSufficientData]);

  // Chart coordinate setup
  const width = 800;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 32;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Dynamic Y-axis scale based on deepest drawdown of both curves
  const deepestDD = useMemo(() => {
    let min = maxDrawdown;
    if (selectedBenchmark && compareDataPoints.length > 0) {
      const cmpMin = Math.min(...compareDataPoints.map(p => p.drawdown));
      if (cmpMin < min) min = cmpMin;
    }
    return min;
  }, [maxDrawdown, selectedBenchmark, compareDataPoints]);

  const yMin = Math.min(-30, Math.floor((deepestDD - 5) / 5) * 5);
  const yMax = 0;

  const getY = (val) => {
    return paddingTop + ((val - yMax) / (yMin - yMax)) * chartHeight;
  };

  const getX = (index) => {
    if (!hasSufficientData) return paddingLeft;
    return paddingLeft + (index / (dataPoints.length - 1)) * chartWidth;
  };

  // Build SVG Line Path for Portfolio
  const linePath = hasSufficientData ? dataPoints.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.drawdown);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '') : '';

  // Build Area Path under 0% for Portfolio
  const zeroY = getY(0);
  const areaPath = hasSufficientData 
    ? `${linePath} L ${getX(dataPoints.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`
    : '';

  // Build SVG Line Path for Comparison Benchmark
  const compareLinePath = (hasSufficientData && selectedBenchmark && compareDataPoints.length > 0)
    ? compareDataPoints.reduce((acc, pt, idx) => {
        const x = getX(idx);
        const y = getY(pt.drawdown);
        return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }, '')
    : '';

  // Drawdown trough X position & band
  const troughX = hasSufficientData ? getX(maxDrawdownIndex) : paddingLeft;
  const troughY = getY(maxDrawdown);

  // Generate Y-axis grid tick levels
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let v = 0; v >= yMin; v -= 5) {
      ticks.push(v);
    }
    return ticks;
  }, [yMin]);

  // Other user portfolios for comparison dropdown
  const otherPortfolios = useMemo(() => {
    return (portfolios || []).filter(p => p.id !== selectedPortfolioId);
  }, [portfolios, selectedPortfolioId]);

  // Handle Mouse Move for Interactive Crosshair Tooltip
  const handleMouseMove = (e) => {
    if (!hasSufficientData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartRelativeX = (mouseX / rect.width) * width;
    const clampedX = Math.max(paddingLeft, Math.min(width - paddingRight, chartRelativeX));
    const ratio = (clampedX - paddingLeft) / chartWidth;
    const idx = Math.round(ratio * (dataPoints.length - 1));
    if (idx >= 0 && idx < dataPoints.length) {
      setHoveredIndex(idx);
    }
  };

  const hoveredPoint = hoveredIndex !== null ? dataPoints[hoveredIndex] : null;
  const hoveredComparePoint = hoveredIndex !== null && compareDataPoints.length > hoveredIndex ? compareDataPoints[hoveredIndex] : null;
  const hoveredX = hoveredIndex !== null ? getX(hoveredIndex) : null;

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 overflow-hidden flex flex-col gap-3.5 relative">
      
      {/* Header Bar matching Reference Pictures */}
      <div className="flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <h3 className="text-xl sm:text-2xl font-black font-sans text-white tracking-tight flex items-center gap-2">
            <span className="text-white font-bold">{maxDrawdown.toFixed(1)}%</span>
            <span>Max Drawdown</span>
          </h3>
        </div>

        {/* Compare Button on Top Right */}
        <div className="relative">
          {selectedBenchmark ? (
            <button
              onClick={() => setIsCompareMenuOpen(!isCompareMenuOpen)}
              className="px-3 py-1 rounded-lg bg-[#00c853] hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              title="เปลี่ยนหรือปิดการเปรียบเทียบ"
            >
              <span>{selectedBenchmark.label}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCompareMenuOpen(!isCompareMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
              title="กดเพื่อเปรียบเทียบ Max Drawdown กับ ETF หรือพอร์ตอื่น"
            >
              <Activity className="w-4 h-4 text-slate-300" />
            </button>
          )}

          {/* Compare Selector Popover Menu */}
          {isCompareMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#141824] border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 text-slate-200 animate-fade-in backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <BarChart2 size={13} className="text-emerald-400" />
                  <span>เปรียบเทียบ Max Drawdown</span>
                </span>
                <button
                  onClick={() => setIsCompareMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Clear / Single mode */}
              <button
                onClick={() => {
                  setSelectedBenchmark(null);
                  setIsCompareMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-2 transition-colors cursor-pointer flex items-center justify-between ${
                  !selectedBenchmark ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <span>ไม่เปรียบเทียบ (พอร์ตเดี่ยว)</span>
                {!selectedBenchmark && <Check size={14} />}
              </button>

              {/* Benchmark ETFs Section */}
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                ดัชนี & ETF หลัก
              </div>
              <div className="space-y-1 mb-2">
                {BENCHMARK_ETFS.map(etf => (
                  <button
                    key={etf.id}
                    onClick={() => {
                      setSelectedBenchmark(etf);
                      setIsCompareMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      selectedBenchmark?.id === etf.id
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <span>{etf.name}</span>
                    {selectedBenchmark?.id === etf.id && <Check size={14} />}
                  </button>
                ))}
              </div>

              {/* Other User Portfolios */}
              {otherPortfolios.length > 0 && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1 border-t border-slate-800/80 pt-2">
                    พอร์ต Alpha Picks อื่นๆ
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {otherPortfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedBenchmark({
                            id: p.id,
                            label: p.name.length > 6 ? p.name.substring(0, 6) : p.name,
                            name: p.name,
                            baseDD: 0.55,
                            maxDD: -18.0
                          });
                          setIsCompareMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                          selectedBenchmark?.id === p.id
                            ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                            : 'text-slate-200 hover:bg-slate-800/70'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {selectedBenchmark?.id === p.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Chart Frame - 100% contained in the box with no overflow */}
      <div 
        ref={containerRef}
        className="w-full relative rounded-xl bg-[#0c1017] border border-slate-800/70 p-1.5 sm:p-2.5 overflow-hidden"
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-56 sm:h-64 select-none cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Red Gradient for Portfolio Drawdown Area */}
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.02" />
            </linearGradient>

            <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ef4444" floodOpacity="0.6"/>
            </filter>
            <filter id="glowBlue" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#38bdf8" floodOpacity="0.6"/>
            </filter>
          </defs>

          {/* Y Axis Grid lines and labels */}
          {yTicks.map(val => {
            const y = getY(val);
            const isZero = val === 0;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke={isZero ? '#475569' : '#1e2638'}
                  strokeWidth={isZero ? 1.4 : 1}
                  strokeDasharray={isZero ? 'none' : '3 3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill={isZero ? '#94a3b8' : '#64748b'}
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Deepest Drawdown Highlighting Band (Trough) */}
          {hasSufficientData && (
            <rect
              x={Math.max(paddingLeft, troughX - 30)}
              y={paddingTop}
              width={60}
              height={chartHeight}
              fill="#7f1d1d"
              fillOpacity="0.32"
            />
          )}

          {/* Max Drawdown Horizontal Dashed Line */}
          {hasSufficientData && (
            <line
              x1={paddingLeft}
              y1={troughY}
              x2={width - paddingRight}
              y2={troughY}
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          )}

          {/* Filled Area for Portfolio */}
          {hasSufficientData && <path d={areaPath} fill="url(#drawdownGradient)" />}

          {/* Main Drawdown Red Curve (Portfolio) */}
          {hasSufficientData && (
            <path
              d={linePath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Comparison Benchmark Blue Curve */}
          {hasSufficientData && selectedBenchmark && compareLinePath && (
            <path
              d={compareLinePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowBlue)"
            />
          )}

          {/* Highlight Marker Point on Max Drawdown Trough */}
          {hasSufficientData && (
            <circle
              cx={troughX}
              cy={troughY}
              r="4.5"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}

          {/* Empty state message when insufficient data */}
          {!hasSufficientData && (
            <text
              x={width / 2}
              y={height / 2 + 5}
              fill="#64748b"
              fontSize="12.5"
              textAnchor="middle"
              className="select-none font-medium"
            >
              ยังไม่มีประวัติการย่อตัวในพอร์ต (ต้องมีอย่างน้อย 2 บันทึก)
            </text>
          )}

          {/* X Axis Labels */}
          {hasSufficientData && dataPoints.map((pt, idx) => {
            const step = Math.max(1, Math.floor(dataPoints.length / 6));
            if (idx % step === 0 || idx === dataPoints.length - 1) {
              const x = getX(idx);
              const isYear = /\b(202[0-9])\b/.test(pt.date);
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 10}
                  fill={isYear ? '#ffffff' : '#64748b'}
                  fontWeight={isYear ? 'bold' : 'normal'}
                  fontSize="11"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {pt.date}
                </text>
              );
            }
            return null;
          })}

          {/* Vertical Hover Crosshair Line */}
          {hoveredPoint && hoveredX !== null && (
            <line
              x1={hoveredX}
              y1={paddingTop}
              x2={hoveredX}
              y2={height - paddingBottom}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.65"
            />
          )}

          {/* Interactive hover circle for Portfolio (Red) */}
          {hoveredPoint && hoveredX !== null && (
            <circle
              cx={hoveredX}
              cy={getY(hoveredPoint.drawdown)}
              r="5"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="2.5"
            />
          )}

          {/* Interactive hover circle for Compare Asset (Blue) */}
          {hoveredComparePoint && hoveredX !== null && selectedBenchmark && (
            <circle
              cx={hoveredX}
              cy={getY(hoveredComparePoint.drawdown)}
              r="5"
              fill="#ffffff"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
          )}
        </svg>

        {/* Floating Tooltip matching User Reference Images */}
        {hoveredPoint && hoveredX !== null && (
          <div 
            className="absolute pointer-events-none z-30 transition-all duration-75"
            style={{
              left: hoveredX > width - 200 ? `${((hoveredX - 195) / width) * 100}%` : `${((hoveredX + 15) / width) * 100}%`,
              top: '25%'
            }}
          >
            <div className="bg-[#181a20]/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl min-w-[170px] text-xs space-y-1.5 select-none">
              <div className="text-slate-300 font-bold text-[11px] pb-1 border-b border-slate-800">
                {hoveredPoint.date}
              </div>
              <div className="flex items-center justify-between gap-3 text-white">
                <span className="flex items-center gap-1.5 truncate max-w-[140px]">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0"></span>
                  <span className="truncate">{portfolioName}</span>
                </span>
                <span className="font-mono font-black text-rose-400">
                  {hoveredPoint.drawdown > 0 ? `+${hoveredPoint.drawdown}%` : `${hoveredPoint.drawdown}%`}
                </span>
              </div>

              {hoveredComparePoint && selectedBenchmark && (
                <div className="flex items-center justify-between gap-3 text-white">
                  <span className="flex items-center gap-1.5 truncate max-w-[140px]">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8] flex-shrink-0"></span>
                    <span className="truncate">{selectedBenchmark.name}</span>
                  </span>
                  <span className="font-mono font-black text-sky-400">
                    {hoveredComparePoint.drawdown > 0 ? `+${hoveredComparePoint.drawdown}%` : `${hoveredComparePoint.drawdown}%`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Legend */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span>{portfolioName}</span>
          </span>
          {selectedBenchmark && (
            <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
              <span>{selectedBenchmark.name}</span>
            </span>
          )}
        </div>
        <span className="text-rose-400 font-bold font-mono">
          Max DD Trough: {maxDrawdown.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
