import React, { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';

export default function MaxDrawdownChart({ portfolioHistory = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Generate or calculate drawdown data points
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
          drawdown: parseFloat(dd.toFixed(1)),
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

  // Chart coordinate setup
  const width = 800;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 32;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Dynamic Y-axis scale based on deepest drawdown (at least -30%)
  const yMin = Math.min(-30, Math.floor((maxDrawdown - 5) / 5) * 5);
  const yMax = 0;

  const getY = (val) => {
    return paddingTop + ((val - yMax) / (yMin - yMax)) * chartHeight;
  };

  const getX = (index) => {
    if (!hasSufficientData) return paddingLeft;
    return paddingLeft + (index / (dataPoints.length - 1)) * chartWidth;
  };

  // Build SVG Line Path
  const linePath = hasSufficientData ? dataPoints.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.drawdown);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '') : '';

  // Build Area Path under 0%
  const zeroY = getY(0);
  const areaPath = hasSufficientData 
    ? `${linePath} L ${getX(dataPoints.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`
    : '';

  // Drawdown trough X position & band
  const troughX = hasSufficientData ? getX(maxDrawdownIndex) : paddingLeft;
  const troughY = getY(maxDrawdown);

  // Generate Y-axis grid tick levels (0, -5, -10, -15, -20, -25, -30, etc.)
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let v = 0; v >= yMin; v -= 5) {
      ticks.push(v);
    }
    return ticks;
  }, [yMin]);

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 overflow-hidden flex flex-col gap-3.5">
      {/* Header Bar matching Reference Picture */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xl sm:text-2xl font-black font-sans text-white tracking-tight flex items-center gap-2">
            <span className="text-white font-bold">{maxDrawdown.toFixed(1)}%</span>
            <span>Max Drawdown</span>
          </h3>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
          <Activity className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      {/* Embedded Chart Frame - 100% contained in the box with no overflow */}
      <div className="w-full relative rounded-xl bg-[#0c1017] border border-slate-800/70 p-1.5 sm:p-2.5 overflow-hidden">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-56 sm:h-64 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Red Gradient for Drawdown Area */}
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.02" />
            </linearGradient>

            <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ef4444" floodOpacity="0.6"/>
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

          {/* Filled Area */}
          {hasSufficientData && <path d={areaPath} fill="url(#drawdownGradient)" />}

          {/* Main Drawdown Red Curve */}
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
            // Pick 5 to 7 evenly spaced labels
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

          {/* Interactive hover circle */}
          {hoveredPoint && (
            <circle
              cx={getX(hoveredPoint.index)}
              cy={getY(hoveredPoint.drawdown)}
              r="5"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>Drawdown แสดงการย่อตัวสูงสุดจากจุดพีคของพอร์ตในช่วงเวลานั้นๆ</span>
        <span className="text-rose-400 font-bold font-mono">
          Max DD Trough: {maxDrawdown.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
