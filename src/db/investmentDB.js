import { supabase } from '../supabaseClient';

// Get all positions for a user
export async function getInvestmentPositions(userEmail) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('investment_positions')
    .select('*')
    .eq('user_email', userEmail)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching investment positions:', error);
    return [];
  }
  return data;
}

// Get all transactions for a position
export async function getInvestmentTransactions(positionId) {
  if (!positionId) return [];
  const { data, error } = await supabase
    .from('investment_transactions')
    .select('*')
    .eq('position_id', positionId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching investment transactions:', error);
    return [];
  }
  return data;
}

// Add a new transaction (Buy/Sell)
export async function addInvestmentTransaction(userEmail, ticker, type, shares, price, transactionDate, notes) {
  if (!userEmail || !ticker || !shares || !price) throw new Error("Missing required fields");

  // 1. Check if position exists
  let { data: positions } = await supabase
    .from('investment_positions')
    .select('*')
    .eq('user_email', userEmail)
    .eq('ticker', ticker.toUpperCase());

  let position = positions && positions.length > 0 ? positions[0] : null;

  // 2. If Buy and no position exists, create it
  if (!position) {
    if (type !== 'BUY') throw new Error("Cannot sell a position you don't own");
    
    const { data: newPosition, error: posError } = await supabase
      .from('investment_positions')
      .insert([{
        user_email: userEmail,
        ticker: ticker.toUpperCase(),
        total_shares: shares,
        average_cost: price,
        current_price: price, // initial default
      }])
      .select();

    if (posError) throw posError;
    position = newPosition[0];
  } else {
    // 3. Position exists, calculate new averages or realize PnL
    let newTotalShares = parseFloat(position.total_shares);
    let newAverageCost = parseFloat(position.average_cost);
    let realizedPnl = 0;

    const txShares = parseFloat(shares);
    const txPrice = parseFloat(price);

    if (type === 'BUY') {
      const oldTotalValue = newTotalShares * newAverageCost;
      const newTxValue = txShares * txPrice;
      newTotalShares += txShares;
      newAverageCost = (oldTotalValue + newTxValue) / newTotalShares;
    } else if (type === 'SELL') {
      if (txShares > newTotalShares) throw new Error("Cannot sell more shares than you own");
      
      realizedPnl = (txPrice - newAverageCost) * txShares;
      newTotalShares -= txShares;
      // Average cost stays the same on a sell
    }

    const { error: updateError } = await supabase
      .from('investment_positions')
      .update({
        total_shares: newTotalShares,
        average_cost: newAverageCost,
        updated_at: new Date().toISOString()
      })
      .eq('id', position.id);

    if (updateError) throw updateError;
  }

  // 4. Record the transaction
  let realizedPnlForTx = type === 'SELL' ? (parseFloat(price) - parseFloat(position.average_cost)) * parseFloat(shares) : 0;

  const { error: txError } = await supabase
    .from('investment_transactions')
    .insert([{
      user_email: userEmail,
      position_id: position.id,
      type: type,
      shares: shares,
      price: price,
      transaction_date: transactionDate,
      realized_pnl: realizedPnlForTx,
      notes: notes
    }]);

  if (txError) throw txError;
}

export async function deleteInvestmentPosition(positionId) {
    const { error } = await supabase
        .from('investment_positions')
        .delete()
        .eq('id', positionId);
    if (error) throw error;
}
