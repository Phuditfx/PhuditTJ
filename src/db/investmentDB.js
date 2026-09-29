import { supabase } from '../supabaseClient';

// ----------------------------------------------------
// PORTFOLIOS
// ----------------------------------------------------

export async function getInvestmentPortfolios(userEmail) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('investment_portfolios')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching portfolios:', error);
    return [];
  }
  return data;
}

export async function createInvestmentPortfolio(userEmail, name, description = '') {
  if (!userEmail || !name) throw new Error("Missing required fields");
  const { data, error } = await supabase
    .from('investment_portfolios')
    .insert([{ user_email: userEmail, name, description }])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateInvestmentPortfolio(portfolioId, newName) {
  const { data, error } = await supabase
    .from('investment_portfolios')
    .update({ name: newName })
    .eq('id', portfolioId)
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteInvestmentPortfolio(portfolioId) {
  const { error } = await supabase
    .from('investment_portfolios')
    .delete()
    .eq('id', portfolioId);
  if (error) throw error;
  return true;
}

// ----------------------------------------------------
// POSITIONS & TRANSACTIONS
// ----------------------------------------------------

export async function getInvestmentPositions(userEmail, portfolioId = null) {
  if (!userEmail) return [];
  let query = supabase
    .from('investment_positions')
    .select('*')
    .eq('user_email', userEmail)
    .order('updated_at', { ascending: false });
    
  if (portfolioId) {
    query = query.eq('portfolio_id', portfolioId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching investment positions:', error);
    return [];
  }
  return data;
}

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

export async function addInvestmentTransaction(userEmail, portfolioId, ticker, type, shares, price, transactionDate, notes) {
  if (!userEmail || !portfolioId || !ticker || !shares || !price) throw new Error("Missing required fields");

  // 1. Check if position exists
  let { data: positions } = await supabase
    .from('investment_positions')
    .select('*')
    .eq('user_email', userEmail)
    .eq('portfolio_id', portfolioId)
    .eq('ticker', ticker.toUpperCase());

  let position = positions && positions.length > 0 ? positions[0] : null;

  // 2. If Buy and no position exists, create it
  if (!position) {
    if (type !== 'BUY') throw new Error("Cannot sell a position you don't own");
    
    const { data: newPosition, error: posError } = await supabase
      .from('investment_positions')
      .insert([{
        user_email: userEmail,
        portfolio_id: portfolioId,
        ticker: ticker.toUpperCase(),
        total_shares: shares,
        average_cost: price,
        current_price: price, // initial default
        status: 'ACTIVE',
        initial_investment: parseFloat(shares) * parseFloat(price),
        initial_shares: parseFloat(shares),
        recouped_amount: 0
      }])
      .select();

    if (posError) throw posError;
    
    if (newPosition && newPosition.length > 0) {
      position = newPosition[0];
    } else {
      // Fallback: fetch it again if select() didn't return data
      const { data: refetch } = await supabase
        .from('investment_positions')
        .select('*')
        .eq('user_email', userEmail)
        .eq('portfolio_id', portfolioId)
        .eq('ticker', ticker.toUpperCase());
      if (refetch && refetch.length > 0) {
        position = refetch[0];
      } else {
        throw new Error("Failed to create new position.");
      }
    }
  } else {
    // 3. Position exists, calculate new averages or realize PnL
    let newTotalShares = parseFloat(position.total_shares);
    let newAverageCost = parseFloat(position.average_cost);
    let realizedPnl = 0;

    const txShares = parseFloat(shares);
    const txPrice = parseFloat(price);

    let newInitialInvest = parseFloat(position.initial_investment || 0);
    let newInitialShares = parseFloat(position.initial_shares || 0);

    if (type === 'BUY') {
      const oldTotalValue = newTotalShares * newAverageCost;
      const newTxValue = txShares * txPrice;
      newTotalShares += txShares;
      newAverageCost = (oldTotalValue + newTxValue) / newTotalShares;
      newInitialInvest += newTxValue;
      newInitialShares += txShares;
    } else if (type === 'SELL') {
      if (txShares > newTotalShares) throw new Error("Cannot sell more shares than you own");
      
      realizedPnl = (txPrice - newAverageCost) * txShares;
      newTotalShares -= txShares;
      // Average cost stays the same on a sell
    }

    let newStatus = position.status || 'ACTIVE';
    if (newTotalShares <= 0) {
      newStatus = 'CLOSED';
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('investment_positions')
      .update({
        total_shares: newTotalShares,
        average_cost: newAverageCost,
        initial_investment: newInitialInvest,
        initial_shares: newInitialShares,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', position.id)
      .select();

    if (updateError) throw updateError;
    if (!updatedData || updatedData.length === 0) {
      throw new Error("Update failed. Please check Supabase RLS policies for UPDATE on investment_positions.");
    }
  }

  // 4. Record the transaction
  let realizedPnlForTx = type === 'SELL' ? (parseFloat(price) - parseFloat(position.average_cost)) * parseFloat(shares) : 0;

  const { error: txError } = await supabase
    .from('investment_transactions')
    .insert([{
      user_email: userEmail,
      portfolio_id: portfolioId,
      position_id: position.id,
      type: type,
      shares: shares,
      price: price,
      transaction_date: transactionDate,
      realized_pnl: realizedPnlForTx,
      notes: notes
    }]);

  if (txError) throw txError;

  // 5. Update Portfolio Cash Balance
  const transactionValue = parseFloat(shares) * parseFloat(price);
  
  // Fetch current portfolio balance
  const { data: portData, error: portFetchErr } = await supabase
    .from('investment_portfolios')
    .select('cash_balance')
    .eq('id', portfolioId)
    .single();
    
  if (!portFetchErr && portData) {
    let currentCash = parseFloat(portData.cash_balance) || 0;
    if (type === 'BUY') {
      currentCash -= transactionValue;
    } else if (type === 'SELL') {
      currentCash += transactionValue;
    }
    
    const { data: updatedData, error: updateErr } = await supabase
      .from('investment_portfolios')
      .update({ cash_balance: currentCash })
      .eq('id', portfolioId)
      .select();
      
    if (updateErr) throw updateErr;
    if (!updatedData || updatedData.length === 0) {
      throw new Error("Update failed. Please check Supabase RLS policies for UPDATE on investment_portfolios.");
    }
  }
}

export async function executeRecoupTransaction(userEmail, portfolioId, positionId, ticker, sharesToSell, currentPrice) {
  // 1. Fetch position
  const { data: posData, error: posErr } = await supabase
    .from('investment_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (posErr || !posData) throw new Error("Position not found");
  
  const remainingShares = parseFloat(posData.total_shares) - sharesToSell;
  const recoupedAmount = sharesToSell * currentPrice;

  // 2. Update Position to MOONBAG
  const { data: updatedData, error: updatePosErr } = await supabase
    .from('investment_positions')
    .update({
      total_shares: remainingShares,
      average_cost: 0, // Cost basis is now 0 (fully de-risked)
      recouped_amount: parseFloat(posData.recouped_amount || 0) + recoupedAmount,
      status: remainingShares > 0 ? 'MOONBAG' : 'CLOSED',
      updated_at: new Date().toISOString()
    })
    .eq('id', positionId)
    .select();

  if (updatePosErr) throw updatePosErr;
  if (!updatedData || updatedData.length === 0) {
    throw new Error("Update failed. Please check Supabase RLS policies for UPDATE on investment_positions.");
  }

  // 3. Record RECOUP Transaction
  const { error: txErr } = await supabase
    .from('investment_transactions')
    .insert([{
      user_email: userEmail,
      portfolio_id: portfolioId,
      position_id: positionId,
      type: 'RECOUP',
      shares: sharesToSell,
      price: currentPrice,
      transaction_date: new Date().toISOString().split('T')[0],
      realized_pnl: (currentPrice - parseFloat(posData.average_cost)) * sharesToSell,
      notes: 'Recoup Capital (Risk-Free Transition)'
    }]);

  if (txErr) throw txErr;

  // 4. Return Capital to Cash Pool
  const { data: portData } = await supabase
    .from('investment_portfolios')
    .select('cash_balance, total_recouped')
    .eq('id', portfolioId)
    .single();
    
  if (portData) {
    const currentCash = parseFloat(portData.cash_balance || 0);
    const totalRecouped = parseFloat(portData.total_recouped || 0);
    
    const { data: updatedData, error: updateErr } = await supabase
      .from('investment_portfolios')
      .update({ 
        cash_balance: currentCash + recoupedAmount,
        total_recouped: totalRecouped + recoupedAmount
      })
      .eq('id', portfolioId)
      .select();
      
    if (updateErr) throw updateErr;
    if (!updatedData || updatedData.length === 0) {
      throw new Error("Update failed. Please check Supabase RLS policies for UPDATE on investment_portfolios.");
    }
  }
}

export async function deleteInvestmentPosition(positionId) {
    const { error } = await supabase
        .from('investment_positions')
        .delete()
        .eq('id', positionId);
    if (error) throw error;
}

export async function updateInvestmentPosition(id, updateData) {
  const { error } = await supabase
    .from('investment_positions')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateInvestmentPositionTargetAlloc(id, targetAlloc) {
  const { error } = await supabase
    .from('investment_positions')
    .update({ target_alloc: targetAlloc, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function applyStockSplit(positionId, ratio) {
  if (!positionId || !ratio || isNaN(ratio) || ratio <= 0) throw new Error("Invalid split ratio");

  // Fetch current position
  const { data: position, error: fetchErr } = await supabase
    .from('investment_positions')
    .select('total_shares, average_cost')
    .eq('id', positionId)
    .single();

  if (fetchErr) throw fetchErr;

  const newShares = parseFloat(position.total_shares) * ratio;
  const newCost = parseFloat(position.average_cost) / ratio;

  // Update position only, keep transaction history intact
  const { error: updateErr } = await supabase
    .from('investment_positions')
    .update({
      total_shares: newShares,
      average_cost: newCost,
      updated_at: new Date().toISOString()
    })
    .eq('id', positionId);

  if (updateErr) throw updateErr;
}


// ----------------------------------------------------
// ALPHA PICKS JOURNAL (Plan & Stats)
// ----------------------------------------------------

export async function getAlphaPicksJournal(userEmail, portfolioId = null) {
  if (!userEmail) return [];
  let query = supabase
    .from('alpha_picks_journal')
    .select('*')
    .eq('user_email', userEmail)
    .order('pick_date', { ascending: false });
    
  if (portfolioId) {
    query = query.eq('portfolio_id', portfolioId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching alpha picks journal:', error);
    return [];
  }
  return data;
}

export async function addAlphaPicksJournal(journalData) {
  const { error } = await supabase
    .from('alpha_picks_journal')
    .insert([journalData]);
  if (error) throw error;
}

export async function deleteAlphaPicksJournal(id) {
  const { error } = await supabase
    .from('alpha_picks_journal')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateAlphaPicksJournalStatus(id, newStatus) {
  const { error } = await supabase
    .from('alpha_picks_journal')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateAlphaPicksJournalData(id, updateData) {
  const { error } = await supabase
    .from('alpha_picks_journal')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateInvestmentPositionPnL(id, pnl, currentPrice) {
  const { error } = await supabase
    .from('investment_positions')
    .update({ unrealized_pnl: pnl, current_price: currentPrice, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Error updating position PnL:', error);
}

export async function updateAlphaPickJournalPnL(id, pnl) {
  const { error } = await supabase
    .from('alpha_picks_journal')
    .update({ unrealized_pnl: pnl, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Error updating journal PnL:', error);
}

// ----------------------------------------------------
// PORTFOLIO FUNDING (Cash Balance)
// ----------------------------------------------------

export async function addPortfolioFunding(userEmail, portfolioId, type, amount, notes = '') {
  if (!userEmail || !portfolioId || !type || !amount) throw new Error("Missing required fields for funding");

  // 1. Record history
  const { error: txError } = await supabase
    .from('portfolio_funding_history')
    .insert([{
      user_email: userEmail,
      portfolio_id: portfolioId,
      type: type,
      amount: amount,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: notes
    }]);

  if (txError) throw txError;

  // 2. Update Cash Balance
  const { data: portData, error: portFetchErr } = await supabase
    .from('investment_portfolios')
    .select('cash_balance')
    .eq('id', portfolioId)
    .single();

  if (portFetchErr) throw portFetchErr;

  let currentCash = parseFloat(portData.cash_balance) || 0;
  if (type === 'DEPOSIT') {
    currentCash += parseFloat(amount);
  } else if (type === 'WITHDRAWAL') {
    currentCash -= parseFloat(amount);
  }

  const { error: updateError } = await supabase
    .from('investment_portfolios')
    .update({ cash_balance: currentCash })
    .eq('id', portfolioId);

  if (updateError) throw updateError;
}

export async function getPortfolioFundingHistory(portfolioId) {
  if (!portfolioId) return [];
  const { data, error } = await supabase
    .from('portfolio_funding_history')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching funding history:', error);
    return [];
  }
  return data;
}
