export const fetchRealTimePrice = async (symbol) => {
  try {
    // Attempt to use Yahoo Finance API via a free CORS proxy
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`);
    
    const response = await fetch(proxyUrl + targetUrl);
    if (response.ok) {
      const data = await response.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) return price;
    }
  } catch (error) {
    console.warn("API Fetch failed, using fallback mock price", error);
  }

  // Fallback Mock Price based on symbol string length to keep it somewhat stable
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 100 + (hash % 100);
  const variation = (Math.random() * 2 - 1).toFixed(2);
  return parseFloat((basePrice + parseFloat(variation)).toFixed(2));
};

export const fetchHistoricalData = async (symbol) => {
  try {
    // Note: Free CORS proxies might fail or be blocked by Yahoo. 
    // We implement a fallback to mock data immediately below if it fails.
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`);
    
    const response = await fetch(proxyUrl + targetUrl);
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
    console.warn("API Fetch failed, generating mock historical data", error);
  }

  // Fallback: Generate Mock Candlestick Data
  const data = [];
  let time = Math.floor(Date.now() / 1000) - (100 * 24 * 60 * 60); // 100 days ago
  
  // Use symbol hash for a stable start price
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let currentPrice = 100 + (hash % 100);

  for (let i = 0; i < 100; i++) {
    const volatility = currentPrice * 0.02;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    data.push({
      time: time + (i * 24 * 60 * 60),
      open,
      high,
      low,
      close
    });
    
    currentPrice = close;
  }
  
  return data;
};
