/**
 * Calculates advanced KPIs for a set of trades (Risk Deviation, Cost Efficiency, Net EV)
 * @param {Array} trades - Array of trade objects. 
 * @returns {Object} Calculated metrics
 */
export const calculateAdvancedKPIs = (trades) => {
  if (!trades || trades.length === 0) {
    return {
      winRate: 0,
      lossRate: 0,
      avgLossRR: 0,
      worstSlippageRR: 0,
      feeDragPercent: 0,
      grossProfitPool: 0,
      totalFeesPaid: 0,
      avgNetWinRR: 0,
      avgNetLossRR: 0,
      netEV: 0,
      totalWins: 0,
      totalLosses: 0,
      totalTrades: 0,
      hasLosingTrades: false
    };
  }

  const closedTrades = trades.filter(t => t.status === 'Closed');
  const totalTrades = closedTrades.length;
  
  if (totalTrades === 0) return calculateAdvancedKPIs([]);

  let totalLossRR = 0;
  let worstSlippageRR = 0;
  let grossProfitPool = 0;
  let totalFeesPaid = 0;
  let totalWinRR = 0;
  let totalWins = 0;
  let totalLosses = 0;

  closedTrades.forEach(trade => {
    const pnl = parseFloat(trade.pnl) || 0;
    const costs = parseFloat(trade.costs) || 0;
    const actualRR = parseFloat(trade.actualRR) || 0;

    // Fees sum across ALL trades
    totalFeesPaid += costs;

    if (pnl > 0) {
      // Winning trade
      totalWins++;
      totalWinRR += actualRR;
      // grossPnL = pnl (net) + costs
      grossProfitPool += (pnl + costs);
    } else if (pnl < 0) {
      // Losing trade
      totalLosses++;
      totalLossRR += actualRR;
      
      if (actualRR < worstSlippageRR) {
        worstSlippageRR = actualRR;
      }
    }
  });

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) : 0;
  const lossRate = totalTrades > 0 ? (totalLosses / totalTrades) : 0;
  
  const avgLossRR = totalLosses > 0 ? (totalLossRR / totalLosses) : 0;
  const avgNetWinRR = totalWins > 0 ? (totalWinRR / totalWins) : 0;
  
  // Make avgNetLossRR positive for the formula: (Win Rate * Avg Net Win RR) - (Loss Rate * Avg Net Loss RR)
  const avgNetLossRR = Math.abs(avgLossRR);

  const feeDragPercent = grossProfitPool > 0 ? (totalFeesPaid / grossProfitPool) * 100 : 0;
  const netEV = (winRate * avgNetWinRR) - (lossRate * avgNetLossRR);

  return {
    winRate: winRate * 100,
    lossRate: lossRate * 100,
    avgLossRR,
    worstSlippageRR,
    feeDragPercent,
    grossProfitPool,
    totalFeesPaid,
    avgNetWinRR,
    avgNetLossRR,
    netEV,
    totalWins,
    totalLosses,
    totalTrades,
    hasLosingTrades: totalLosses > 0
  };
};
