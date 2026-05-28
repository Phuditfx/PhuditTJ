export const fetchRealTimePrice = async (symbol) => {
  try {
    const proxyUrl = 'https://corsproxy.io/?';
    const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`);
    
    const response = await fetch(proxyUrl + targetUrl, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) return price;
    }
  } catch (error) {
    console.warn("API Fetch failed for real time price:", error);
  }

  // Fallback
  return 150.0 + (Math.random() * 10 - 5);
};

export const fetchHistoricalData = async (symbol) => {
  try {
    const proxyUrl = 'https://corsproxy.io/?';
    const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`);
    
    const response = await fetch(proxyUrl + targetUrl, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
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
  } catch (error) {
    console.warn("API Fetch failed for historical data:", error);
  }

  // Fallback Dummy Data if Yahoo / Proxy blocks the request
  console.log("Using dummy fallback data for chart...");
  return generateDummyData();
};

const generateDummyData = () => {
  const data = [];
  let currentPrice = 150;
  let currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() - 1); // ย้อนกลับไป 1 เดือน

  for (let i = 0; i < 30; i++) {
    const open = currentPrice + (Math.random() * 4 - 2);
    const high = open + (Math.random() * 3);
    const low = open - (Math.random() * 3);
    const close = Math.random() > 0.5 ? high - Math.random() : low + Math.random();

    data.push({
      time: Math.floor(currentDate.getTime() / 1000), // Unix timestamp
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });

    currentPrice = close;
    currentDate.setDate(currentDate.getDate() + 1); // วันถัดไป
  }

  return data;
};
