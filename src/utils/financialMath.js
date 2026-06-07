/**
 * Calculate All-Time Return (%)
 * @param {number} totalInvested - The total amount of capital invested (Net Deposits)
 * @param {number} currentPortfolioValue - Current total value of the portfolio
 * @returns {number} Growth percentage
 */
export const calculateAllTimeReturn = (totalInvested, currentPortfolioValue) => {
  if (totalInvested === 0) return 0;
  return ((currentPortfolioValue - totalInvested) / totalInvested) * 100;
};

/**
 * Calculate Annual Growth for a given year using starting balance and net deposits.
 * Using a simple Modified Dietz method approximation: 
 * Return = (Ending Value - Starting Value - Net Deposits) / (Starting Value + (Net Deposits / 2))
 * 
 * @param {number} startValue - Value of portfolio at the beginning of the year
 * @param {number} endValue - Value of portfolio at the end of the year
 * @param {number} netDeposits - Total BUY amount minus total SELL amount during the year
 * @returns {number} Annual growth percentage
 */
export const calculateAnnualGrowth = (startValue, endValue, netDeposits) => {
  const adjustedBase = startValue + (netDeposits / 2);
  if (adjustedBase === 0) {
     if (netDeposits > 0 && startValue === 0) {
        // If it's the first year and we only deposited, return simple ROI
        return ((endValue - netDeposits) / netDeposits) * 100;
     }
     return 0;
  }
  
  const returnPct = ((endValue - startValue - netDeposits) / adjustedBase) * 100;
  return returnPct;
};

/**
 * Utility to group transactions by year
 * @param {Array} transactions - Array of transaction objects { type: 'BUY'|'SELL', shares, price, transaction_date }
 * @returns {Object} Grouped object e.g. { '2024': { netDeposits: 5000, buys: 10000, sells: 5000 } }
 */
export const groupTransactionsByYear = (transactions) => {
  const grouped = {};
  
  transactions.forEach(t => {
    const year = new Date(t.transaction_date).getFullYear().toString();
    if (!grouped[year]) {
      grouped[year] = { netDeposits: 0, buys: 0, sells: 0 };
    }
    
    const value = parseFloat(t.shares) * parseFloat(t.price);
    if (t.type === 'BUY') {
      grouped[year].buys += value;
      grouped[year].netDeposits += value;
    } else if (t.type === 'SELL') {
      grouped[year].sells += value;
      grouped[year].netDeposits -= value;
    }
  });
  
  return grouped;
};
