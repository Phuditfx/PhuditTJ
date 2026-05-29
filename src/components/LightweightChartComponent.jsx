import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { fetchHistoricalData } from '../api/priceApi';

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
            if (!targetTimeStr) return null;
            const targetSec = Math.floor(new Date(targetTimeStr).getTime() / 1000);
            if (isNaN(targetSec)) return null;
            
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
          if (exactEntryTime) {
            markers.push({
              time: exactEntryTime,
              position: direction === 'Long' ? 'belowBar' : 'aboveBar',
              color: '#3b82f6', // blue-500
              shape: direction === 'Long' ? 'arrowUp' : 'arrowDown',
              text: 'ENTRY',
              size: 2
            });
          }

          const exactExitTime = findClosestTime(exitTime);
          if (exactExitTime) {
            // Determine if exit was profitable (very naive check based on entry price)
            const isWin = direction === 'Long' ? (tp1 && entry < tp1) : (tp1 && entry > tp1);
            markers.push({
              time: exactExitTime,
              position: direction === 'Long' ? 'aboveBar' : 'belowBar',
              color: '#f59e0b', // amber-500
              shape: direction === 'Long' ? 'arrowDown' : 'arrowUp',
              text: 'EXIT',
              size: 2
            });
          }

          // Sort markers by time (required by lightweight-charts)
          markers.sort((a, b) => a.time - b.time);
          
          if (markers.length > 0) {
            seriesInstance.current.setMarkers(markers);
          }
        }
      } catch (e) {
        console.error("Error setting chart data:", e);
      }
      setLoading(false);
    };
    
    loadData();
  }, [symbol]);

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
