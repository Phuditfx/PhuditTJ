export const fetchOHLCData = async (ticker) => {
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
    
    const proxies = [
      { url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=true`, type: 'allorigins' },
      { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, type: 'raw' }
    ];

    let data = null;
    
    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy.url);
        if (!response.ok) continue;
        
        if (proxy.type === 'allorigins') {
          const proxyData = await response.json();
          if (proxyData && proxyData.contents) {
            data = JSON.parse(proxyData.contents);
            break;
          }
        } else {
          data = await response.json();
          if (data && data.chart) {
            break;
          }
        }
      } catch (err) {
        console.warn(`OHLC proxy ${proxy.type} failed for ${ticker}`);
      }
    }
    
    if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('Invalid data structure from Yahoo Finance or all proxies failed');
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
  
  const recentTRs = trueRanges.slice(-period);
  if (recentTRs.length < period) return null;
  
  const sumTR = recentTRs.reduce((sum, tr) => sum + tr, 0);
  return sumTR / period;
};

export const calculateTrailingStop = async (ticker, highestPriceReached) => {
  const ohlc = await fetchOHLCData(ticker);
  if (!ohlc) return null;
  
  const atr = calculateATR(ohlc, 14);
  if (!atr) return null;
  
  const trailingSL = highestPriceReached - (atr * 1.5);
  
  return {
    atr: atr,
    trailingSL: trailingSL,
    currentPrice: ohlc[ohlc.length - 1].close
  };
};

export const fetchLivePrices = async (tickersArray) => {
  if (!tickersArray || tickersArray.length === 0) return {};
  
  try {
    const pricesMap = {};
    const fetchPromises = tickersArray.map(async (ticker) => {
      try {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        
        const proxies = [
          { url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=true`, type: 'allorigins' },
          { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, type: 'raw' }
        ];

        let data = null;
        
        for (const proxy of proxies) {
          try {
            const response = await fetch(proxy.url);
            if (!response.ok) continue;
            
            if (proxy.type === 'allorigins') {
              const proxyData = await response.json();
              if (proxyData && proxyData.contents) {
                data = JSON.parse(proxyData.contents);
                break;
              }
            } else {
              data = await response.json();
              if (data && data.chart) {
                break;
              }
            }
          } catch (err) {
            console.warn(`Live price proxy ${proxy.type} failed for ${ticker}`);
          }
        }
        
        if (data && data.chart && data.chart.result && data.chart.result.length > 0) {
          const result = data.chart.result[0];
          const meta = result.meta;
          if (meta && meta.regularMarketPrice) {
            pricesMap[ticker] = meta.regularMarketPrice;
          } else {
            const quote = result.indicators.quote[0];
            if (quote && quote.close) {
              const closePrices = quote.close.filter(p => p !== null);
              if (closePrices.length > 0) {
                pricesMap[ticker] = closePrices[closePrices.length - 1];
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch live price for ${ticker}`, err);
      }
    });

    await Promise.all(fetchPromises);
    return pricesMap;
  } catch (error) {
    console.error('Error fetching live prices:', error);
    return {};
  }
};
