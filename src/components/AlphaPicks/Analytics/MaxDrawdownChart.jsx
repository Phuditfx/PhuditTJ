import React, { useMemo, useState } from 'react';
import { TrendingDown, Activity, Calendar } from 'lucide-react';

export default function MaxDrawdownChart({ portfolioHistory = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Generate or calculate drawdown data points
  const { dataPoints, maxDrawdown, maxDrawdownIndex } = useMemo(() => {
    // Calculate drawdown purely from actual portfolio history
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
          date: item.date || item.snapshot_date || `T${idx + 1}`,
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

  // SVG dimensions
  const width = 800;
  const height = 260;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const yMin = -30;
  const yMax = 0;

  const getX = (index) => {
    if (!hasSufficientData) return paddingLeft;
    return paddingLeft + (index / (dataPoints.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    return paddingTop + ((val - yMax) / (yMin - yMax)) * chartHeight;
  };

  // Build SVG path
  const linePath = hasSufficientData ? dataPoints.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.drawdown);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '') : '';

  // Build Area Path under 0%
  const zeroY = getY(0);
  const areaPath = hasSufficientData 
    ? `${linePath} L ${getX(dataPoints.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`
    : '';

  // Drawdown trough X position
  const troughX = hasSufficientData ? getX(maxDrawdownIndex) : paddingLeft;
  const troughY = getY(maxDrawdown);

  return (
    <div className="bg-[#12161f] text-slate-100 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/30 overflow-hidden flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight flex items-center gap-2">
            <span className="text-rose-500 font-bold">{maxDrawdown.toFixed(1)}%</span>
            <span>Max Drawdown</span>
          </h3>
        </div>

        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
          <TrendingDown className="w-4 h-4 text-rose-500" />
        </div>
      </div>

      {/* SVG Drawdown Chart */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[650px] relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 select-none">
            <defs>
              {/* Red Gradient for Drawdown Area */}
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#450a0a" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Y Axis Grid lines and labels */}
            {[0, -5, -10, -15, -20, -25, -30].map(val => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke={val === 0 ? '#475569' : '#1e293b'}
                    strokeWidth={val === 0 ? 1.5 : 1}
                    strokeDasharray={val === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* Deepest Drawdown Highlighting Band */}
            {hasSufficientData && troughX && (
              <rect
                x={troughX - 25}
                y={paddingTop}
                width={50}
                height={chartHeight}
                fill="#7f1d1d"
                fillOpacity="0.25"
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

            {/* Red Line */}
            {hasSufficientData && (
              <path
                d={linePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Highlight point on max drawdown */}
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
                fontSize="13"
                textAnchor="middle"
                className="select-none font-medium"
              >
                ยังไม่มีข้อมูลประวัติการย่อตัวในพอร์ต (ต้องมีอย่างน้อย 2 บันทึก)
              </text>
            )}

            {/* X Axis Labels */}
            {dataPoints.map((pt, idx) => {
              if (idx % 3 === 0 || idx === dataPoints.length - 1) {
                const x = getX(idx);
                return (
                  <text
                    key={idx}
                    x={x}
                    y={height - 12}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
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
              <g>
                <circle
                  cx={getX(hoveredPoint.index)}
                  cy={getY(hoveredPoint.drawdown)}
                  r="5"
                  fill="#ffffff"
                  stroke="#ef4444"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>Drawdown แสดงการย่อตัวสูงสุดจากจุดพีคของพอร์ตในช่วงเวลานั้นๆ</span>
        <span className="text-rose-400 font-bold font-mono">Max DD Trough: {maxDrawdown.toFixed(1)}%</span>
      </div>
    </div>
  );
}
