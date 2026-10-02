import { create } from 'zustand';
import { 
  getInvestmentPortfolios, 
  getInvestmentPositions, 
  executeRecoupTransaction,
  addInvestmentTransaction,
  deleteTransactionAndRecalculate,
  editTransactionAndRecalculate,
  batchUpdatePositionsPrices,
  auditAndRecalculatePortfolioPositions
} from '../db/investmentDB';
import { fetchLivePrices } from '../utils/riskManagement';


export const useMoonbagStore = create((set, get) => ({
  userEmail: null,
  portfolios: [],
  selectedPortfolioId: null,
  positions: [],
  livePrices: {},
  loading: false,
  isFetchingPrices: false,
  lastPriceUpdated: null,
  isAuditing: false,

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
    const { userEmail, livePrices } = get();
    if (!userEmail || !portfolioId) return;
    set({ loading: true });
    try {
      const posData = await getInvestmentPositions(userEmail, portfolioId);
      
      const enhancedPositions = (posData || []).map(pos => {
        // Use livePrices in memory if available, otherwise pos.current_price, otherwise pos.average_cost
        const memPrice = livePrices[pos.ticker];
        const cp = (memPrice !== undefined && !isNaN(memPrice)) ? memPrice : parseFloat(pos.current_price);
        const ac = parseFloat(pos.average_cost);
        const currentPrice = !isNaN(cp) && cp > 0 ? cp : (!isNaN(ac) ? ac : 0);
        
        const currentValue = parseFloat(pos.total_shares) * currentPrice;
        
        // Handle missing DB fields gracefully for old positions
        const status = pos.status || 'ACTIVE';
        const initialInvest = (pos.initial_investment && parseFloat(pos.initial_investment) > 0)
          ? parseFloat(pos.initial_investment)
          : (parseFloat(pos.average_cost) * parseFloat(pos.total_shares));
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
          currentPrice,
          currentValue,
          remainingPrincipal: Math.max(0, remainingPrincipal),
          isRecoupEligible
        };
      });

      set({ positions: enhancedPositions });

      // Automatically trigger live price refresh for positions in this portfolio
      if (enhancedPositions.length > 0) {
        setTimeout(() => {
          get().refreshLivePrices();
        }, 50);
      }
    } catch (error) {
      console.error("Failed to load positions:", error);
    } finally {
      set({ loading: false });
    }
  },

  refreshLivePrices: async () => {
    const { positions } = get();
    if (!positions || positions.length === 0) return;

    const uniqueTickers = [...new Set(positions.map(p => p.ticker).filter(Boolean))];
    if (uniqueTickers.length === 0) return;

    set({ isFetchingPrices: true });
    try {
      const pricesMap = await fetchLivePrices(uniqueTickers);
      if (pricesMap && Object.keys(pricesMap).length > 0) {
        // 1. Update store state with latest prices & recalculate values
        get().updateLivePrices(pricesMap);

        // 2. Persist current_price and unrealized_pnl to Supabase
        const updates = [];
        get().positions.forEach(pos => {
          const livePrice = pricesMap[pos.ticker];
          if (livePrice !== undefined && !isNaN(livePrice)) {
            const avgCost = parseFloat(pos.average_cost) || 0;
            const shares = parseFloat(pos.total_shares) || 0;
            const unrealizedPnl = shares * (livePrice - avgCost);
            updates.push({
              id: pos.id,
              current_price: livePrice,
              unrealized_pnl: unrealizedPnl
            });
          }
        });

        if (updates.length > 0) {
          await batchUpdatePositionsPrices(updates);
        }

        set({ lastPriceUpdated: new Date() });
      }
    } catch (err) {
      console.warn("Failed to refresh live prices in Alpha Picks:", err);
    } finally {
      set({ isFetchingPrices: false });
    }
  },

  updateLivePrices: (pricesMap) => {
    set(state => {
      const newLivePrices = { ...state.livePrices, ...pricesMap };
      
      const enhancedPositions = state.positions.map(pos => {
        const memPrice = newLivePrices[pos.ticker];
        const cp = (memPrice !== undefined && !isNaN(memPrice)) ? memPrice : parseFloat(pos.current_price);
        const ac = parseFloat(pos.average_cost);
        const currentPrice = !isNaN(cp) && cp > 0 ? cp : (!isNaN(ac) ? ac : 0);
        
        const currentValue = parseFloat(pos.total_shares) * currentPrice;
        // Handle missing DB fields gracefully for old positions
        const status = pos.status || 'ACTIVE';
        const initialInvest = (pos.initial_investment && parseFloat(pos.initial_investment) > 0)
          ? parseFloat(pos.initial_investment)
          : (parseFloat(pos.average_cost) * parseFloat(pos.total_shares));
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

  setManualPrice: async (ticker, price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return;
    get().updateLivePrices({ [ticker]: numPrice });
    try {
      const updates = [];
      get().positions.forEach(pos => {
        if (pos.ticker === ticker) {
          const avg = parseFloat(pos.average_cost) || 0;
          const sh = parseFloat(pos.total_shares) || 0;
          updates.push({
            id: pos.id,
            current_price: numPrice,
            unrealized_pnl: sh * (numPrice - avg)
          });
        }
      });
      if (updates.length > 0) {
        await batchUpdatePositionsPrices(updates);
      }
    } catch (e) {
      console.warn("Failed to persist manual price:", e);
    }
  },

  auditAndSyncPortfolio: async () => {
    const { userEmail, selectedPortfolioId } = get();
    if (!userEmail || !selectedPortfolioId) throw new Error("Missing user or portfolio");
    set({ isAuditing: true });
    try {
      const auditRes = await auditAndRecalculatePortfolioPositions(userEmail, selectedPortfolioId);
      await get().loadPortfolios(userEmail);
      await get().loadPositions(selectedPortfolioId);
      await get().refreshLivePrices();
      return auditRes;
    } catch (error) {
      console.error("Audit and sync error:", error);
      throw error;
    } finally {
      set({ isAuditing: false });
    }
  },

  handleRecoup: async (positionId, currentPrice, customSharesToSell) => {
    const { userEmail, selectedPortfolioId } = get();
    console.log('[handleRecoup] Called with:', { positionId, currentPrice, customSharesToSell, userEmail, selectedPortfolioId });
    
    if (!userEmail) throw new Error("ไม่พบข้อมูลผู้ใช้ (userEmail) กรุณาล็อกอินใหม่");
    if (!selectedPortfolioId) throw new Error("ไม่ได้เลือกพอร์ตฟอลิโอ กรุณาเลือกพอร์ตก่อน");
    
    set({ loading: true });
    try {
      const pos = get().positions.find(p => p.id === positionId);
      if (!pos) throw new Error("Position not found");

      const remainingPrincipal = Math.max(0, parseFloat(pos.initial_investment || pos.average_cost * pos.total_shares || 0) - parseFloat(pos.recouped_amount || 0));
      const sharesToSell = customSharesToSell || (remainingPrincipal / currentPrice);
      
      console.log('[handleRecoup] Pos data:', pos);
      console.log('[handleRecoup] remainingPrincipal:', remainingPrincipal, 'sharesToSell:', sharesToSell);
      
      if (sharesToSell > parseFloat(pos.total_shares)) {
        throw new Error(`ไม่มีหุ้นพอ: ต้องการขาย ${sharesToSell.toFixed(4)} แต่มีแค่ ${parseFloat(pos.total_shares).toFixed(4)}`);
      }

      const { executeRecoupTransaction } = await import('../db/investmentDB');
      console.log('[handleRecoup] Calling executeRecoupTransaction...');
      await executeRecoupTransaction(userEmail, selectedPortfolioId, positionId, pos.ticker, sharesToSell, currentPrice);
      console.log('[handleRecoup] Success! Reloading data...');
      
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
    console.log('[handleAddTransaction] Called with:', { ticker, type, shares, price, userEmail, selectedPortfolioId });
    
    if (!userEmail) throw new Error("ไม่พบข้อมูลผู้ใช้ (userEmail) กรุณาล็อกอินใหม่");
    if (!selectedPortfolioId) throw new Error("ไม่ได้เลือกพอร์ตฟอลิโอ กรุณาเลือกพอร์ตก่อน");
    
    set({ loading: true });
    try {
      const txDate = new Date().toISOString().split('T')[0];
      console.log('[handleAddTransaction] Calling addInvestmentTransaction...');
      await addInvestmentTransaction(userEmail, selectedPortfolioId, ticker, type, parseFloat(shares), parseFloat(price), txDate, notes);
      console.log('[handleAddTransaction] Success! Reloading data...');
      await get().loadPortfolios(userEmail);
      await get().loadPositions(selectedPortfolioId);
    } catch (error) {
      console.error("Failed to add transaction:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  handleDeleteTransaction: async (transactionId) => {
    const { userEmail, selectedPortfolioId } = get();
    if (!userEmail || !selectedPortfolioId) throw new Error('Missing user or portfolio');
    set({ loading: true });
    try {
      await deleteTransactionAndRecalculate(userEmail, selectedPortfolioId, transactionId);
      await get().loadPortfolios(userEmail);
      await get().loadPositions(selectedPortfolioId);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  handleEditTransaction: async (transactionId, newShares, newPrice) => {
    const { userEmail, selectedPortfolioId } = get();
    if (!userEmail || !selectedPortfolioId) throw new Error('Missing user or portfolio');
    set({ loading: true });
    try {
      await editTransactionAndRecalculate(userEmail, selectedPortfolioId, transactionId, parseFloat(newShares), parseFloat(newPrice));
      await get().loadPortfolios(userEmail);
      await get().loadPositions(selectedPortfolioId);
    } catch (error) {
      console.error('Failed to edit transaction:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  manageCash: async (amount, type) => {
    const { userEmail, selectedPortfolioId } = get();
    if (!userEmail || !selectedPortfolioId || !amount) return;
    set({ loading: true });
    try {
      const { addPortfolioFunding } = await import('../db/investmentDB');
      await addPortfolioFunding(userEmail, selectedPortfolioId, type, amount, `Manual ${type}`);
      await get().loadPortfolios(userEmail);
    } catch (error) {
      console.error("Failed to manage cash:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));
