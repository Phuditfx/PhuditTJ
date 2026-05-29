import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { fetchHistoricalData } from '../api/priceApi';

// 📅 ตัวแปลงวันที่ระดับสูงสุดเพื่อดักจับทุกประเภทฟอร์แมต (ISO String, Local String, Timestamp Object, หรือ Unix Number)
const parseToTimestamp = (dateStr) => {
  if (!dateStr) return null;
  
  // ดักจับกรณีเป็น Object (เช่น Firestore Timestamp, Date object)
  if (typeof dateStr === 'object') {
    if (typeof dateStr.seconds === 'number') {
      return dateStr.seconds;
    }
    if (typeof dateStr._seconds === 'number') {
      return dateStr._seconds;
    }
    if (typeof dateStr.toDate === 'function') {
      try {
        return Math.floor(dateStr.toDate().getTime() / 1000);
      } catch (e) {}
    }
    if (dateStr instanceof Date) {
      return Math.floor(dateStr.getTime() / 1000);
    }
  }

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
  } else {
    normalizedStr = String(dateStr);
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

export default function LightweightChartComponent({ symbol, entry, stopLoss, tp1, tp2, tp3, direction = 'Long', entryTime, exitTime, status }) {
  const chartContainerRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesInstance = useRef(null);
  const markersPluginRef = useRef(null);
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
      markersPluginRef.current = null;
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!symbol) return;
      setLoading(true);
      try {
        console.log(`[Chart Debug] Fetching historical data for symbol: ${symbol}`);
        const data = await fetchHistoricalData(symbol);
        
        // Only update if component is still mounted and instances are active
        if (seriesInstance.current && chartInstance.current && data && data.length > 0) {
          // Deduplicate and sort data by time to prevent Lightweight Charts crash
          const uniqueDataMap = new Map();
          data.forEach(item => uniqueDataMap.set(item.time, item));
          const sortedData = Array.from(uniqueDataMap.values()).sort((a, b) => a.time - b.time);
          
          console.log(`[Chart Debug] Loaded ${sortedData.length} daily bars. First timestamp: ${sortedData[0].time}, Last timestamp: ${sortedData[sortedData.length - 1].time}`);
          
          seriesInstance.current.setData(sortedData);
          chartInstance.current.timeScale().fitContent();

          // Add Markers for Entry and Exit
          const markers = [];
          
          // Helper to find closest data point in the series
          const findClosestTime = (targetTimeStr, label) => {
            const targetSec = parseToTimestamp(targetTimeStr);
            console.log(`[Chart Debug] parseToTimestamp(${label}: ${targetTimeStr}) => ${targetSec}`);
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
            console.log(`[Chart Debug] findClosestTime(${label}) closest bar: ${closest} (Diff: ${Math.abs(closest - targetSec)}s)`);
            return closest;
          };

          const exactEntryTime = findClosestTime(entryTime, 'entryTime');
          let exactExitTime = findClosestTime(exitTime, 'exitTime');

          // Fallback: If it is closed but exitTime is missing (old trade), use the last available bar
          if (!exactExitTime && status === 'Closed' && sortedData.length > 0) {
            exactExitTime = sortedData[sortedData.length - 1].time;
            console.log(`[Chart Debug] Trade is Closed but exitTime is missing. Fallback to last bar: ${exactExitTime}`);
          }

          if (exactEntryTime) {
            console.log(`[Chart Debug] Adding Entry marker at candle: ${exactEntryTime}`);
            markers.push({
              time: exactEntryTime,
              position: direction === 'Short' ? 'aboveBar' : 'belowBar',
              color: direction === 'Short' ? '#ef4444' : '#3b82f6',
              shape: direction === 'Short' ? 'arrowDown' : 'arrowUp',
              text: 'ENTRY'
            });
          }

          if (exactExitTime) {
            console.log(`[Chart Debug] Adding Exit marker at candle: ${exactExitTime}`);
            markers.push({
              time: exactExitTime,
              position: direction === 'Short' ? 'belowBar' : 'aboveBar',
              color: direction === 'Short' ? '#10b981' : '#f59e0b',
              shape: direction === 'Short' ? 'arrowUp' : 'arrowDown',
              text: 'EXIT'
            });
          }

          // เรียงเวลาจากน้อยไปมากตามข้อกำหนดของ Lightweight Charts
          markers.sort((a, b) => a.time - b.time);
          console.log('[Chart Debug] Final Markers Array:', markers);
          
          // โทรเรียกเซ็ตมาร์กเกอร์ทันที และดักรอบเวลาหลายระดับเพื่อแก้ปัญหา canvas ทับซ้อน/animation paint
          if (seriesInstance.current) {
            if (!markersPluginRef.current) {
              markersPluginRef.current = createSeriesMarkers(seriesInstance.current, []);
            }
            markersPluginRef.current.setMarkers(markers);
          }
          
          // ลำดับการรันที่ 1: 50ms
          setTimeout(() => {
            if (markersPluginRef.current) {
              markersPluginRef.current.setMarkers(markers);
            }
          }, 50);
          
          // ลำดับการรันที่ 2: 150ms
          setTimeout(() => {
            if (markersPluginRef.current) {
              markersPluginRef.current.setMarkers(markers);
            }
          }, 150);

          // ลำดับการรันที่ 3: 400ms
          setTimeout(() => {
            if (markersPluginRef.current) {
              markersPluginRef.current.setMarkers(markers);
            }
          }, 400);

          // ลำดับการรันที่ 4: 800ms
          setTimeout(() => {
            if (markersPluginRef.current) {
              markersPluginRef.current.setMarkers(markers);
            }
          }, 800);
        } else {
          console.warn('[Chart Debug] Data loading skipped or empty. seriesInstance:', !!seriesInstance.current, 'chartInstance:', !!chartInstance.current, 'data length:', data?.length);
        }
      } catch (e) {
        console.error("[Chart Debug] Error setting chart data:", e);
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
