export const fetchRealTimePrice = async (symbol) => {
  try {
    const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=1d&interval=1m`;
    
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) return price;
    }
  } catch (error) {
    console.warn("API Fetch failed for real time price:", error);
  }

  return null;
};

export const fetchHistoricalData = async (symbol) => {
  try {
    const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`;
    
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result && result.timestamp && result.indicators.quote[0].open) {
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];
        
        const chartData = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (
            timestamps[i] !== null &&
            quote.open[i] !== null && 
            quote.high[i] !== null && 
            quote.low[i] !== null && 
            quote.close[i] !== null
          ) {
            chartData.push({
              time: timestamps[i],
              open: quote.open[i],
              high: quote.high[i],
              low: quote.low[i],
              close: quote.close[i],
            });
          }
        }
        return chartData;
      }
    }
  } catch (error) {
    console.warn("API Fetch failed for historical data:", error);
  }

  return [];
};

export const fetchATR60m = async (symbol) => {
  try {
    const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=5d&interval=60m`;
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result && result.indicators.quote[0].high) {
        const quote = result.indicators.quote[0];
        const high = quote.high;
        const low = quote.low;
        const close = quote.close;
        
        let trList = [];
        for (let i = 1; i < high.length; i++) {
          if (high[i] === null || low[i] === null || close[i-1] === null) continue;
          const hl = high[i] - low[i];
          const hc = Math.abs(high[i] - close[i - 1]);
          const lc = Math.abs(low[i] - close[i - 1]);
          const tr = Math.max(hl, hc, lc);
          trList.push(tr);
        }

        if (trList.length < 14) return null;

        // Calculate Simple Moving Average (SMA) of TR for the last 14 candles
        const last14TR = trList.slice(-14);
        const atr = last14TR.reduce((sum, val) => sum + val, 0) / 14;
        
        return atr;
      }
    }
  } catch (error) {
    console.warn("API Fetch failed for ATR60m:", error);
  }
  return null;
};
