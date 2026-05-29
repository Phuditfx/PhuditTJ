import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { fetchHistoricalData } from '../api/priceApi';

// 📅 ตัวแปลงวันที่ระดับสูงสุดเพื่อดักจับทุกประเภทฟอร์แมต (ISO String, Local String, หรือ Timestamp)
const parseToTimestamp = (dateStr) => {
  if (!dateStr) return null;
  
  // หากเป็นตัวเลข Unix Timestamp อยู่แล้ว
  if (typeof dateStr === 'number') {
    return dateStr > 1000000000000 ? Math.floor(dateStr / 1000) : dateStr;
  }
  
  // หากเป็น String ตัวเลข Unix
  if (typeof dateStr === 'string' && /^\d+$/.test(dateStr)) {
    const parsedNum = parseInt(dateStr, 10);
    return parsedNum > 1000000000000 ? Math.floor(parsedNum / 1000) : parsedNum;
  }
  
  // จัดรูปข้อความ String Date (เช่น แทนที่ space ด้วย T สำหรับ iOS/Safari)
  let normalizedStr = dateStr;
  if (typeof dateStr === 'string') {
    normalizedStr = dateStr.trim().replace(' ', 'T');
  }
  
  const parsed = new Date(normalizedStr);
  const timeMs = parsed.getTime();
  
  if (isNaN(timeMs)) {
    // ระบบดักจับ Fallback กรณี YYYY-MM-DD แบบธรรมดา
    const match = normalizedStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      return Math.floor(new Date(y, m, d).getTime() / 1000);
    }
    return null;
  }
  
  return Math.floor(timeMs / 1000);
};

export default function LightweightChartComponent({ symbol, entry, stopLoss, tp1, tp2, tp3, direction = 'Long', entryTime, exitTime }) {
  const chartContainerRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesInstance = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8', // slate-400
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.4)' }, // slate-700/40
        horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        timeVisible: true,
      },
      handleScroll: true,
      handleScale: true,
    });
    
    chartInstance.current = chart;
    
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', // emerald-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    
    seriesInstance.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstance.current = null;
      seriesInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!symbol) return;
      setLoading(true);
      try {
        const data = await fetchHistoricalData(symbol);
        // Only update if component is still mounted and instances are active
        if (seriesInstance.current && chartInstance.current && data && data.length > 0) {
          // Deduplicate and sort data by time to prevent Lightweight Charts crash
          const uniqueDataMap = new Map();
          data.forEach(item => uniqueDataMap.set(item.time, item));
          const sortedData = Array.from(uniqueDataMap.values()).sort((a, b) => a.time - b.time);
          
          seriesInstance.current.setData(sortedData);
          chartInstance.current.timeScale().fitContent();

          // Add Markers for Entry and Exit
          const markers = [];
          
          // Helper to find closest data point in the series
          const findClosestTime = (targetTimeStr) => {
            const targetSec = parseToTimestamp(targetTimeStr);
            if (!targetSec) return null;
            
            let closest = sortedData[0].time;
            let minDiff = Math.abs(sortedData[0].time - targetSec);
            
            for (let i = 1; i < sortedData.length; i++) {
              const diff = Math.abs(sortedData[i].time - targetSec);
              if (diff < minDiff) {
                minDiff = diff;
                closest = sortedData[i].time;
              }
            }
            return closest;
          };

          const exactEntryTime = findClosestTime(entryTime);
          const exactExitTime = findClosestTime(exitTime);
          const isSameCandle = exactEntryTime && exactExitTime && exactEntryTime === exactExitTime;

          if (isSameCandle) {
            // กรณีเข้าออกในแท่งเทียนแท่งเดียวกัน (สีกราฟม่วงเรืองรองผสม สัญลักษณ์ชัดเจน)
            markers.push({
              time: exactEntryTime,
              position: 'belowBar',
              color: '#8b5cf6', // purple-500
              shape: 'circle',
              text: '▲ ENTRY / ▼ EXIT'
            });
          } else {
            // กรณีคนละแท่งเทียน แสดงลูกศรแยกกันสวยงาม
            if (exactEntryTime) {
              markers.push({
                time: exactEntryTime,
                position: 'belowBar', // Entry always below the candle
                color: '#3b82f6', // blue-500 (สีน้ำเงิน)
                shape: 'arrowUp',
                text: 'ENTRY'
              });
            }

            if (exactExitTime) {
              markers.push({
                time: exactExitTime,
                position: 'aboveBar', // Exit always above the candle
                color: '#f59e0b', // amber-500 (สีส้มเหลือง)
                shape: 'arrowDown',
                text: 'EXIT'
              });
            }
          }

          // เรียงเวลาจากน้อยไปมากตามข้อกำหนดของ Lightweight Charts
          markers.sort((a, b) => a.time - b.time);
          
          // ใช้ setTimeout เพื่อหน่วงเวลาให้ DOM และชาร์ตทำการเรนเดอร์แท่งเทียนจนเสร็จสมบูรณ์ ป้องกันปัญหารอยต่อเวลา/การเคลียร์ภาพในช่วงอนิเมชั่น
          setTimeout(() => {
            if (seriesInstance.current) {
              seriesInstance.current.setMarkers(markers);
            }
          }, 150);
        }
      } catch (e) {
        console.error("Error setting chart data:", e);
      }
      setLoading(false);
    };
    
    loadData();
  }, [symbol, entryTime, exitTime, direction]);

  // Ref to hold current price lines
  const priceLinesRef = useRef({});
  const lineStateRef = useRef({});

  useEffect(() => {
    if (!seriesInstance.current || loading) return;
    
    const series = seriesInstance.current;
    const lines = priceLinesRef.current;
    
    // Helper to update or create a line
    const updateLine = (key, price, color, title, style = 2) => {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        if (lines[key]) {
          series.removePriceLine(lines[key]);
          delete lines[key];
          delete lineStateRef.current[key];
        }
        return;
      }
      
      const newState = { price: parsedPrice, color, title, style };
      const oldState = lineStateRef.current[key];
      
      // Avoid calling applyOptions if nothing changed, prevents severe UI lag
      if (oldState && oldState.price === newState.price && oldState.color === newState.color && oldState.title === newState.title && oldState.style === newState.style) {
        return;
      }
      
      lineStateRef.current[key] = newState;

      if (lines[key]) {
        lines[key].applyOptions({
          price: parsedPrice,
          color,
          title,
          lineStyle: style,
        });
      } else {
        lines[key] = series.createPriceLine({
          price: parsedPrice,
          color,
          title,
          lineStyle: style,
          axisLabelVisible: true,
          lineWidth: 2,
        });
      }
    };

    updateLine('entry', entry, '#3b82f6', 'ENTRY'); // blue-500
    updateLine('sl', stopLoss, '#ef4444', 'SL', 1); // red-500, dashed
    updateLine('tp1', tp1, '#10b981', 'TP1 (1R)'); // emerald-500
    updateLine('tp2', tp2, '#059669', 'TP2 (2R)'); // emerald-600
    updateLine('tp3', tp3, '#047857', 'TP3 (3R)'); // emerald-700
    
  }, [entry, stopLoss, tp1, tp2, tp3, loading]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/50 backdrop-blur-sm">
          <div className="text-amber-500 animate-pulse font-bold tracking-widest text-sm">
            LOADING CHART DATA...
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
