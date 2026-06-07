export const fetchOHLCData = async (ticker) => {
  try {
    // Yahoo Finance v8 chart API using allorigins proxy to bypass CORS
    // Requesting 1 month of daily data to get enough days for ATR14
    const url = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`);
    const proxyUrl = `https://api.allorigins.win/get?url=${url}`;
    
    const response = await fetch(proxyUrl);
    const proxyData = await response.json();
    
    if (!proxyData || !proxyData.contents) {
      throw new Error('Failed to fetch data from proxy');
    }
    
    const data = JSON.parse(proxyData.contents);
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('Invalid data structure from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const quote = result.indicators.quote[0];
    const timestamp = result.timestamp;
    
    const ohlc = timestamp.map((t, index) => ({
      date: new Date(t * 1000),
      open: quote.open[index],
      high: quote.high[index],
      low: quote.low[index],
      close: quote.close[index]
    })).filter(day => day.high !== null && day.low !== null && day.close !== null); // Filter out empty days
    
    return ohlc;
  } catch (error) {
    console.error(`Error fetching OHLC data for ${ticker}:`, error);
    return null;
  }
};

export const calculateATR = (ohlcData, period = 14) => {
  if (!ohlcData || ohlcData.length < period + 1) {
    console.warn('Not enough data to calculate ATR');
    return null;
  }
  
  const trueRanges = [];
  
  // Calculate True Range for each day starting from the second day
  for (let i = 1; i < ohlcData.length; i++) {
    const currentHigh = ohlcData[i].high;
    const currentLow = ohlcData[i].low;
    const previousClose = ohlcData[i - 1].close;
    
    const tr1 = currentHigh - currentLow;
    const tr2 = Math.abs(currentHigh - previousClose);
    const tr3 = Math.abs(currentLow - previousClose);
    
    const tr = Math.max(tr1, tr2, tr3);
    trueRanges.push(tr);
  }
  
  // Get the most recent `period` true ranges
  const recentTRs = trueRanges.slice(-period);
  
  if (recentTRs.length < period) return null;
  
  const sumTR = recentTRs.reduce((sum, tr) => sum + tr, 0);
  const atr = sumTR / period;
  
  return atr;
};

export const calculateTrailingStop = async (ticker, highestPriceReached) => {
  const ohlc = await fetchOHLCData(ticker);
  if (!ohlc) return null;
  
  const atr = calculateATR(ohlc, 14);
  if (!atr) return null;
  
  // current trailing SL formula: highest price - 1.5 * ATR14
  const trailingSL = highestPriceReached - (atr * 1.5);
  
  return {
    atr: atr,
    trailingSL: trailingSL,
    currentPrice: ohlc[ohlc.length - 1].close // return current price for convenience
  };
};

export const fetchLivePrices = async (tickersArray) => {
  if (!tickersArray || tickersArray.length === 0) return {};
  
  try {
    const symbols = tickersArray.join(',');
    const url = encodeURIComponent(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`);
    const proxyUrl = `https://api.allorigins.win/get?url=${url}`;
    
    const response = await fetch(proxyUrl);
    const proxyData = await response.json();
    
    if (!proxyData || !proxyData.contents) {
      throw new Error('Failed to fetch data from proxy');
    }
    
    const data = JSON.parse(proxyData.contents);
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
      throw new Error('Invalid data structure from Yahoo Finance');
    }
    
    const pricesMap = {};
    data.quoteResponse.result.forEach(quote => {
      pricesMap[quote.symbol] = quote.regularMarketPrice;
    });
    
    return pricesMap;
  } catch (error) {
    console.error('Error fetching live prices:', error);
    return {};
  }
};
