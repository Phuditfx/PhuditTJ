import React, { useState, useEffect, useMemo } from 'react';
import { getInvestmentPortfolios, getInvestmentPositions, updateInvestmentPositionTargetAlloc } from '../db/investmentDB';
import { fetchLivePrices } from '../utils/riskManagement';

export default function PortfolioRebalancer({ currentUser, requestAlert }) {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [loading, setLoading] = useState(false);

  const [dbAssets, setDbAssets] = useState([]);
  const [tempAssets, setTempAssets] = useState([]);
  const [livePrices, setLivePrices] = useState({});

  const [newCash, setNewCash] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // New row input state
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newTarget, setNewTarget] = useState('');

  // Fetch portfolios on mount
  useEffect(() => {
    if (!currentUser) return;
    const fetchPorts = async () => {
      try {
        const ports = await getInvestmentPortfolios(currentUser);
        setPortfolios(ports);
        if (ports.length > 0) {
          setSelectedPortfolioId(ports[0].id);
        }
      } catch (err) {
        console.error('Failed to load portfolios', err);
      }
    };
    fetchPorts();
  }, [currentUser]);

  // Fetch positions and live prices when portfolio changes
  useEffect(() => {
    if (!currentUser || !selectedPortfolioId) {
      setDbAssets([]);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      try {
        const positions = await getInvestmentPositions(currentUser, selectedPortfolioId);
        const filteredPositions = positions.filter(p => parseFloat(p.total_shares) > 0);
        
        // Map DB positions to our asset format
        const mappedAssets = filteredPositions.map(p => ({
          id: p.id,
          isDb: true,
          ticker: p.ticker,
          shares: parseFloat(p.total_shares),
          price: parseFloat(p.current_price || p.average_cost || 0),
          targetAlloc: parseFloat(p.target_alloc || 0)
        }));
        setDbAssets(mappedAssets);
        
        // Fetch live prices
        const tickers = mappedAssets.map(a => a.ticker);
        if (tickers.length > 0) {
          const prices = await fetchLivePrices(tickers);
          setLivePrices(prices);
        }
      } catch (err) {
        console.error('Failed to load positions', err);
        if (requestAlert) requestAlert('❌ Error', 'ไม่สามารถโหลดข้อมูลพอร์ตได้');
      }
      setLoading(false);
    };
    loadData();
  }, [currentUser, selectedPortfolioId, requestAlert]);

  // Combine assets and apply live prices
  const assets = useMemo(() => {
    const combined = [...dbAssets, ...tempAssets];
    return combined.map(a => {
      if (livePrices[a.ticker] !== undefined) {
        return { ...a, price: livePrices[a.ticker] };
      }
      return a;
    });
  }, [dbAssets, tempAssets, livePrices]);

  const currentTotalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.shares * asset.price), 0);
  }, [assets]);

  const newTotalValue = currentTotalValue + (parseFloat(newCash) || 0);

  const totalAllocation = useMemo(() => {
    return assets.reduce((sum, asset) => sum + parseFloat(asset.targetAlloc || 0), 0);
  }, [assets]);

  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.01;

  const handleUpdateAsset = async (id, field, value, isDb) => {
    const val = parseFloat(value);
    const parsedValue = isNaN(val) && field !== 'ticker' ? '' : (field === 'ticker' ? value.toUpperCase() : val);

    if (isDb) {
      if (field === 'targetAlloc') {
        setDbAssets(dbAssets.map(a => a.id === id ? { ...a, targetAlloc: parsedValue } : a));
        try {
          await updateInvestmentPositionTargetAlloc(id, parsedValue || 0);
        } catch (err) {
          console.error('Failed to update target alloc in DB', err);
        }
      }
      if (field === 'price') {
         // Allow overriding price locally for simulation
         const asset = dbAssets.find(a => a.id === id);
         if (asset) {
           setLivePrices(prev => ({ ...prev, [asset.ticker]: parsedValue }));
         }
      }
    } else {
      setTempAssets(tempAssets.map(a => a.id === id ? { ...a, [field]: parsedValue } : a));
      if (field === 'price') {
        const asset = tempAssets.find(a => a.id === id);
        if (asset) {
          setLivePrices(prev => ({ ...prev, [asset.ticker]: parsedValue }));
        }
      }
    }
  };

  const handleRemoveAsset = (id, isDb) => {
    if (isDb) {
      if (requestAlert) requestAlert('❌ ไม่อนุญาต', 'ไม่สามารถลบหุ้นจริงจากหน้านี้ได้ กรุณาไปทำรายการ SELL ในหน้า Alpha Picks');
      return;
    }
    setTempAssets(tempAssets.filter(a => a.id !== id));
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!newTicker || !newPrice) return;
    const nShares = parseFloat(newShares) || 0;
    const nPrice = parseFloat(newPrice) || 0;
    const nTarget = parseFloat(newTarget) || 0;
    
    const tickerUpper = newTicker.toUpperCase();
    
    setTempAssets([...tempAssets, {
      id: `temp-${Date.now()}`,
      isDb: false,
      ticker: tickerUpper,
      shares: nShares,
      price: nPrice,
      targetAlloc: nTarget
    }]);

    setLivePrices(prev => ({ ...prev, [tickerUpper]: nPrice }));

    setNewTicker('');
    setNewShares('');
    setNewPrice('');
    setNewTarget('');
  };

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(assets.length / itemsPerPage);
  const paginatedAssets = useMemo(() => {
    if (itemsPerPage === 'All') return assets;
    const start = (currentPage - 1) * itemsPerPage;
    return assets.slice(start, start + itemsPerPage);
  }, [assets, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header section */}
      <div className="mb-8 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/50 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md">⚖️</span>
            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
              Portfolio Rebalancer
            </h1>
            <div className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-black tracking-widest uppercase border border-indigo-500/20 shadow-sm backdrop-blur-sm">
              OPTIMIZER
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs font-bold uppercase tracking-wider">
            คำนวณและปรับสัดส่วนพอร์ตหุ้นของคุณให้ตรงกับเป้าหมายการลงทุน (Target Allocation)
          </p>
        </div>
        
        {/* Portfolio Selector */}
        <div className="flex flex-col gap-1.5 w-full md:w-64 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-lg shadow-slate-200/10 dark:shadow-black/20">
          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">เลือกพอร์ตลงทุน (Alpha Picks)</label>
          <select
            value={selectedPortfolioId}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
            disabled={loading}
          >
            {portfolios.length === 0 && <option value="">No Portfolios Available</option>}
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        <div className="relative overflow-hidden rounded-3xl p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-slate-200/10 dark:shadow-black/20 transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-400/10 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">มูลค่าพอร์ตปัจจุบัน</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            ${currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">CURRENT VALUE</div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 border border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-white/60 to-white/60 dark:from-emerald-500/10 dark:via-slate-900/60 dark:to-slate-900/60 backdrop-blur-xl shadow-xl shadow-emerald-500/5 dark:shadow-black/20 transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">เติมเงินสดใหม่ (New Cash)</p>
          <div className="mt-1.5 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 font-bold">$</span>
            <input onFocus={(e) => e.target.select()}  
              type="number" step="any" 
              value={newCash}
              onChange={(e) => setNewCash(e.target.value)}
              className="w-full pl-7 pr-3 py-1 bg-white/70 dark:bg-slate-950/80 text-emerald-600 dark:text-emerald-400 font-black text-xl rounded-xl border border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            />
          </div>
          <div className="mt-1.5 text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider">AVAILABLE POOL</div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 border border-indigo-500/20 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-white/60 to-white/60 dark:from-indigo-500/10 dark:via-slate-900/60 dark:to-slate-900/60 backdrop-blur-xl shadow-xl shadow-indigo-500/5 dark:shadow-black/20 transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">มูลค่าพอร์ตเป้าหมาย</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5 tracking-tight">
            ${newTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-[10px] font-bold text-indigo-400/80 uppercase tracking-wider">TARGET VALUE</div>
        </div>

        <div className={`relative overflow-hidden rounded-3xl p-5 border backdrop-blur-xl shadow-xl transition-all hover:scale-[1.01] ${
          isAllocationValid 
            ? 'border-emerald-500/20 dark:border-emerald-500/30 bg-white/60 dark:bg-slate-900/60 shadow-slate-200/10 dark:shadow-black/20' 
            : 'border-rose-500/40 bg-rose-500/10 shadow-rose-500/10 animate-pulse'
        }`}>
          <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">สัดส่วนรวม (Total Allocation)</p>
          <p className={`text-2xl font-black mt-1.5 tracking-tight ${isAllocationValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totalAllocation}%
          </p>
          {!isAllocationValid ? (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-2 uppercase tracking-wide">⚠️ ต้องเท่ากับ 100% พอดี</p>
          ) : (
            <div className="mt-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">BALANCED 100%</div>
          )}
        </div>
      </div>

      {/* Add New Asset Form */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-3xl shadow-xl shadow-slate-200/10 dark:shadow-black/20 p-6 mb-6">
        <h3 className="text-xs font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>➕</span> เพิ่มสินทรัพย์ใหม่เพื่อจำลอง (Simulate Add Asset)
        </h3>
        <form onSubmit={handleAddAsset} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ticker</label>
            <input 
              type="text" required placeholder="AAPL" value={newTicker} onChange={(e) => setNewTicker(e.target.value)}
              className="w-full font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Shares (จำนวน)</label>
            <input onFocus={(e) => e.target.select()}  
              type="number" min="0" step="any" placeholder="0" value={newShares} onChange={(e) => setNewShares(e.target.value)}
              className="w-full font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Price ($)</label>
            <input onFocus={(e) => e.target.select()}  
              type="number" min="0" step="any" required placeholder="150" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
              className="w-full font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target (%)</label>
            <input onFocus={(e) => e.target.select()}  
              type="number" min="0" max="100" step="any" placeholder="10" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
              className="w-full font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Target Allocation Warning */}
      {!isAllocationValid && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-6 shadow-lg shadow-rose-500/5 flex items-start gap-4">
          <div className="text-2xl">🚨</div>
          <div>
            <h3 className="text-rose-600 dark:text-rose-400 font-black text-sm mb-1 uppercase tracking-wider">Target Allocation ไม่ถูกต้อง</h3>
            <p className="text-slate-700 dark:text-slate-300 font-medium text-xs">
              สัดส่วนเป้าหมายปัจจุบันคือ <strong>{totalAllocation}%</strong> — คุณต้องปรับสัดส่วนเป้าหมาย (Target Alloc) ของสินทรัพย์ทั้งหมดให้รวมกัน <strong>เท่ากับ 100% พอดี</strong>
            </p>
          </div>
        </div>
      )}

      {/* Main Asset List (Compact Table Layout) */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-3xl shadow-xl shadow-slate-200/10 dark:shadow-black/20 overflow-hidden mb-6">
        
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Asset List
            </span>
            <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
              {assets.length} items
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Show</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading positions...</div>
          ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/70 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-800/60 uppercase text-[10px] tracking-wider font-extrabold">
              <tr>
                <th className="px-4 py-3">SYMBOL</th>
                <th className="px-4 py-3 text-right">CURR. SHARES</th>
                <th className="px-4 py-3 text-right">CURR. PRICE ($)</th>
                <th className="px-4 py-3 text-right">CURR. VALUE ($)</th>
                <th className="px-4 py-3 text-center">TARGET ALLOC (%)</th>
                <th className="px-4 py-3 text-right">TARGET VALUE ($)</th>
                <th className="px-4 py-3 text-right">ACTION NEEDED</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {paginatedAssets.map(asset => {
                const currentVal = asset.shares * asset.price;
                const targetVal = newTotalValue * (asset.targetAlloc / 100);
                const difference = targetVal - currentVal;
                const actionShares = asset.price > 0 ? difference / asset.price : 0;
                
                const isBuy = difference > 1; // 1 dollar threshold
                const isSell = difference < -1;
                
                return (
                  <tr key={asset.id} className="hover:bg-indigo-500/[0.03] dark:hover:bg-indigo-500/[0.04] transition-colors">
                    <td className="px-4 py-2 relative">
                      {asset.isDb && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-500/50" title="Synced from DB"></div>}
                      <input 
                        type="text" 
                        value={asset.ticker}
                        onChange={(e) => handleUpdateAsset(asset.id, 'ticker', e.target.value, asset.isDb)}
                        disabled={asset.isDb}
                        className={`w-16 ml-1 font-black text-slate-900 dark:text-white bg-transparent border-b px-1 py-0.5 uppercase focus:outline-none transition-colors ${asset.isDb ? 'border-transparent opacity-70 cursor-not-allowed' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500'}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input onFocus={(e) => e.target.select()}  
                        type="number" min="0" step="any"
                        value={asset.shares}
                        onChange={(e) => handleUpdateAsset(asset.id, 'shares', e.target.value, asset.isDb)}
                        disabled={asset.isDb}
                        className={`w-20 text-right font-semibold text-slate-900 dark:text-white bg-transparent border rounded-lg px-1.5 py-0.5 focus:outline-none ${asset.isDb ? 'border-transparent opacity-70 cursor-not-allowed' : 'border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400 focus:border-indigo-500'}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input onFocus={(e) => e.target.select()}  
                        type="number" min="0" step="any"
                        value={asset.price}
                        onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value, asset.isDb)}
                        className="w-20 text-right font-semibold text-slate-900 dark:text-white bg-transparent border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400 rounded-lg px-1.5 py-0.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-300">
                      ${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1 mx-auto w-16">
                        <input onFocus={(e) => e.target.select()}  
                          type="number" min="0" max="100" step="any"
                          value={asset.targetAlloc}
                          onChange={(e) => handleUpdateAsset(asset.id, 'targetAlloc', e.target.value, asset.isDb)}
                          className={`w-full text-center font-black bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg px-1 py-0.5 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${asset.isDb ? 'ring-1 ring-indigo-500/30' : ''}`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">
                      ${targetVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isBuy && (
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black">BUY</span>
                          <span>{Math.abs(actionShares).toFixed(4)}</span> 
                          <span className="opacity-75 font-normal text-xs">(+${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                        </div>
                      )}
                      {isSell && (
                        <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center justify-end gap-1">
                          <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-black">SELL</span>
                          <span>{Math.abs(actionShares).toFixed(4)}</span> 
                          <span className="opacity-75 font-normal text-xs">(-${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                        </div>
                      )}
                      {!isBuy && !isSell && (
                        <div className="font-bold text-slate-400 text-xs">
                          HOLD
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => handleRemoveAsset(asset.id, asset.isDb)} className={`font-bold p-1 rounded transition-colors ${asset.isDb ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-500/10'}`} title={asset.isDb ? "Cannot delete synced DB asset here" : "Delete Asset"}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              {assets.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">No assets in portfolio. Add new assets above or select another portfolio.</td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        {itemsPerPage !== 'All' && totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200/50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 flex justify-between items-center backdrop-blur-md">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
