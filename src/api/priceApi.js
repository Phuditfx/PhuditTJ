export const fetchRealTimePrice = async (symbol) => {
  try {
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`);
    
    const response = await fetch(proxyUrl + targetUrl, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data.contents) {
        const parsed = JSON.parse(data.contents);
        const price = parsed.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) return price;
      }
    }
  } catch (error) {
    console.warn("API Fetch failed for real time price:", error);
  }

  return null;
};

export const fetchHistoricalData = async (symbol) => {
  try {
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`);
    
    const response = await fetch(proxyUrl + targetUrl, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data.contents) {
        const parsed = JSON.parse(data.contents);
        const result = parsed.chart?.result?.[0];
        if (result && result.timestamp && result.indicators.quote[0].open) {
          const timestamps = result.timestamp;
          const quote = result.indicators.quote[0];
          
          const chartData = [];
          for (let i = 0; i < timestamps.length; i++) {
            if (quote.open[i] !== null) {
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
    }
  } catch (error) {
    console.warn("API Fetch failed for historical data:", error);
  }

  return [];
};
