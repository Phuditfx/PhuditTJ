import { create } from 'zustand';
import { 
  getInvestmentPortfolios, 
  getInvestmentPositions, 
  executeRecoupTransaction,
  addInvestmentTransaction
} from '../db/investmentDB';

export const useMoonbagStore = create((set, get) => ({
  userEmail: null,
  portfolios: [],
  selectedPortfolioId: null,
  positions: [],
  livePrices: {},
  loading: false,

  setUserEmail: (email) => {
    if (get().userEmail !== email) {
        set({ userEmail: email });
        get().loadPortfolios(email);
    }
  },
  
  setSelectedPortfolioId: (id) => {
    set({ selectedPortfolioId: id });
    get().loadPositions(id);
  },

  loadPortfolios: async (email) => {
    if (!email) return;
    set({ loading: true });
    try {
      const ports = await getInvestmentPortfolios(email);
      set({ portfolios: ports });
      if (ports.length > 0 && !get().selectedPortfolioId) {
        set({ selectedPortfolioId: ports[0].id });
        await get().loadPositions(ports[0].id);
      }
    } catch (error) {
      console.error("Failed to load portfolios:", error);
    } finally {
      set({ loading: false });
    }
  },

  createPortfolio: async (name) => {
    const { userEmail } = get();
    if (!userEmail || !name) return;
    set({ loading: true });
    try {
      // Assuming createInvestmentPortfolio exists in investmentDB
      const { createInvestmentPortfolio } = await import('../db/investmentDB');
      const newPort = await createInvestmentPortfolio(userEmail, name);
      await get().loadPortfolios(userEmail);
      get().setSelectedPortfolioId(newPort.id);
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  editPortfolio: async (portfolioId, newName) => {
    const { userEmail } = get();
    if (!portfolioId || !newName) return;
    set({ loading: true });
    try {
      const { updateInvestmentPortfolio } = await import('../db/investmentDB');
      await updateInvestmentPortfolio(portfolioId, newName);
      await get().loadPortfolios(userEmail);
    } catch (error) {
      console.error("Failed to edit portfolio:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deletePortfolio: async (portfolioId) => {
    const { userEmail } = get();
    if (!portfolioId) return;
    set({ loading: true });
    try {
      const { deleteInvestmentPortfolio } = await import('../db/investmentDB');
      await deleteInvestmentPortfolio(portfolioId);
      get().setSelectedPortfolioId(null);
      await get().loadPortfolios(userEmail);
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadPositions: async (portfolioId) => {
    const { userEmail } = get();
    if (!userEmail || !portfolioId) return;
    set({ loading: true });
    try {
      const posData = await getInvestmentPositions(userEmail, portfolioId);
      
      const enhancedPositions = posData.map(pos => {
        const currentPrice = parseFloat(pos.current_price || pos.average_cost);
        const currentValue = parseFloat(pos.total_shares) * currentPrice;
        
        // Handle missing DB fields gracefully for old positions
        const status = pos.status || 'ACTIVE';
        const initialInvest = pos.initial_investment != null ? parseFloat(pos.initial_investment) : (parseFloat(pos.average_cost) * parseFloat(pos.total_shares));
        const initialShares = pos.initial_shares != null ? parseFloat(pos.initial_shares) : parseFloat(pos.total_shares);
        const recouped = parseFloat(pos.recouped_amount || 0);

        const remainingPrincipal = initialInvest - recouped;
        // Recoup eligible if Active, has value, hasn't fully recouped, and price is >= 2x average cost
        const isRecoupEligible = status === 'ACTIVE' && currentValue > 0 && remainingPrincipal > 0 && currentPrice >= (parseFloat(pos.average_cost) * 2);
        
        return {
          ...pos,
          status,
          initial_investment: initialInvest,
          initial_shares: initialShares,
          recouped_amount: recouped,
          currentValue,
          remainingPrincipal: Math.max(0, remainingPrincipal),
          isRecoupEligible
        };
      });

      set({ positions: enhancedPositions });
    } catch (error) {
      console.error("Failed to load positions:", error);
    } finally {
      set({ loading: false });
    }
  },

  updateLivePrices: (pricesMap) => {
    set(state => {
      const newLivePrices = { ...state.livePrices, ...pricesMap };
      
      const enhancedPositions = state.positions.map(pos => {
        const cp = parseFloat(pos.current_price);
        const ac = parseFloat(pos.average_cost);
        const dbPrice = !isNaN(cp) ? cp : (!isNaN(ac) ? ac : 0);
        const currentPrice = newLivePrices[pos.ticker] || dbPrice;
        
        const currentValue = parseFloat(pos.total_shares) * currentPrice;
        // Handle missing DB fields gracefully for old positions
        const status = pos.status || 'ACTIVE';
        const initialInvest = pos.initial_investment != null ? parseFloat(pos.initial_investment) : (parseFloat(pos.average_cost) * parseFloat(pos.total_shares));
        const initialShares = pos.initial_shares != null ? parseFloat(pos.initial_shares) : parseFloat(pos.total_shares);
        const recouped = parseFloat(pos.recouped_amount || 0);

        const remainingPrincipal = initialInvest - recouped;
        const isRecoupEligible = status === 'ACTIVE' && currentValue > 0 && remainingPrincipal > 0 && currentPrice >= (parseFloat(pos.average_cost) * 2);
        
        return {
          ...pos,
          status,
          initial_investment: initialInvest,
          initial_shares: initialShares,
          recouped_amount: recouped,
          currentPrice: currentPrice, // override local state
          currentValue,
          remainingPrincipal: Math.max(0, remainingPrincipal),
          isRecoupEligible
        };
      });

      return { livePrices: newLivePrices, positions: enhancedPositions };
    });
  },

  setManualPrice: (ticker, price) => {
    get().updateLivePrices({ [ticker]: parseFloat(price) });
  },

  handleRecoup: async (positionId, currentPrice, customSharesToSell) => {
    const { userEmail, selectedPortfolioId } = get();
    set({ loading: true });
    try {
      const pos = get().positions.find(p => p.id === positionId);
      if (!pos) throw new Error("Position not found");

      const remainingPrincipal = Math.max(0, parseFloat(pos.initial_investment || 0) - parseFloat(pos.recouped_amount || 0));
      // Use user provided shares, or calculate default
      const sharesToSell = customSharesToSell || Math.ceil(remainingPrincipal / currentPrice);
      
      if (sharesToSell > parseFloat(pos.total_shares)) {
        throw new Error("Not enough shares to recoup principal.");
      }

      const { executeRecoupTransaction } = await import('../db/investmentDB');
      await executeRecoupTransaction(userEmail, selectedPortfolioId, positionId, pos.ticker, sharesToSell, currentPrice);
      
      // Reload everything to sync DB
      await get().loadPortfolios(userEmail); 
      await get().loadPositions(selectedPortfolioId);
    } catch (error) {
      console.error("Failed to recoup:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  handleAddTransaction: async (ticker, type, shares, price, notes) => {
    const { userEmail, selectedPortfolioId } = get();
    set({ loading: true });
    try {
      const txDate = new Date().toISOString().split('T')[0];
      await addInvestmentTransaction(userEmail, selectedPortfolioId, ticker, type, shares, price, txDate, notes);
      await get().loadPortfolios(userEmail);
      await get().loadPositions(selectedPortfolioId);
    } catch (error) {
      console.error("Failed to add transaction:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addCash: async (amount) => {
    const { userEmail, selectedPortfolioId } = get();
    if (!userEmail || !selectedPortfolioId || !amount) return;
    set({ loading: true });
    try {
      const { addPortfolioFunding } = await import('../db/investmentDB');
      await addPortfolioFunding(userEmail, selectedPortfolioId, 'DEPOSIT', amount, 'Manual Deposit');
      await get().loadPortfolios(userEmail);
    } catch (error) {
      console.error("Failed to add cash:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));
