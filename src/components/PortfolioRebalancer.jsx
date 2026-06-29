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
      <div className="mb-8 border-b-2 border-orange-500 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">
            <span className="text-orange-500">⚖️</span> Portfolio Rebalancer
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
            คำนวณและปรับสัดส่วนพอร์ตหุ้นของคุณให้ตรงกับเป้าหมายการลงทุน (Target Allocation)
          </p>
        </div>
        
        {/* Portfolio Selector */}
        <div className="flex flex-col gap-1 w-full md:w-64">
          <label className="text-xs font-bold text-slate-500 uppercase">เลือกพอร์ตลงทุน (Alpha Picks)</label>
          <select
            value={selectedPortfolioId}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-1 border-l-4 border-l-slate-400 dark:border-l-slate-600">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">มูลค่าพอร์ตปัจจุบัน (Current)</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-1 border-l-4 border-l-emerald-500">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">เติมเงินสดใหม่ (New Cash)</p>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input 
              type="number" 
              value={newCash}
              onChange={(e) => setNewCash(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-black text-xl rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-1 border-l-4 border-l-indigo-500">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">มูลค่าพอร์ตเป้าหมาย (Target)</p>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
            ${newTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`rounded-xl p-5 border shadow-sm col-span-1 lg:col-span-1 border-l-4 transition-colors ${isAllocationValid ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 border-l-rose-500 animate-pulse'}`}>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">สัดส่วนรวม (Total Allocation)</p>
          <p className={`text-2xl font-black mt-1 ${isAllocationValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totalAllocation}%
          </p>
          {!isAllocationValid && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">⚠️ ต้องเท่ากับ 100% พอดี</p>
          )}
        </div>
      </div>

      {/* Add New Asset Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-4 flex items-center gap-2">
          <span>➕</span> เพิ่มสินทรัพย์ใหม่เพื่อจำลอง (Simulate Add Asset)
        </h3>
        <form onSubmit={handleAddAsset} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ticker</label>
            <input 
              type="text" required placeholder="AAPL" value={newTicker} onChange={(e) => setNewTicker(e.target.value)}
              className="w-full font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Shares (จำนวน)</label>
            <input 
              type="number" min="0" step="any" placeholder="0" value={newShares} onChange={(e) => setNewShares(e.target.value)}
              className="w-full font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Price ($)</label>
            <input 
              type="number" min="0" step="any" required placeholder="150" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
              className="w-full font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target (%)</label>
            <input 
              type="number" min="0" max="100" step="any" placeholder="10" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
              className="w-full font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Target Allocation Warning */}
      {!isAllocationValid && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-500 rounded-xl p-4 mb-6 shadow-sm flex items-start gap-4 animate-pulse">
          <div className="text-3xl">🚨</div>
          <div>
            <h3 className="text-rose-600 dark:text-rose-400 font-black text-lg mb-1">Target Allocation ไม่ถูกต้อง</h3>
            <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">
              สัดส่วนเป้าหมายปัจจุบันคือ <strong>{totalAllocation}%</strong><br/>
              คุณต้องปรับสัดส่วนเป้าหมาย (Target Alloc) ของสินทรัพย์ทั้งหมดในตารางให้รวมกัน <strong>เท่ากับ 100% พอดี</strong> เพื่อให้ระบบคำนวณใหม่ได้
            </p>
          </div>
        </div>
      )}

      {/* Main Asset List (Compact Table Layout) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mb-6">
        
        {/* Table Header Controls */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            Asset List <span className="ml-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{assets.length} items</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Show</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
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
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-extrabold">
              <tr>
                <th className="px-3 py-2">SYMBOL</th>
                <th className="px-3 py-2 text-right">CURR. SHARES</th>
                <th className="px-3 py-2 text-right">CURR. PRICE ($)</th>
                <th className="px-3 py-2 text-right">CURR. VALUE ($)</th>
                <th className="px-3 py-2 text-center">TARGET ALLOC (%)</th>
                <th className="px-3 py-2 text-right">TARGET VALUE ($)</th>
                <th className="px-3 py-2 text-right">ACTION NEEDED</th>
                <th className="px-3 py-2 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {paginatedAssets.map(asset => {
                const currentVal = asset.shares * asset.price;
                const targetVal = newTotalValue * (asset.targetAlloc / 100);
                const difference = targetVal - currentVal;
                const actionShares = asset.price > 0 ? difference / asset.price : 0;
                
                const isBuy = difference > 1; // 1 dollar threshold
                const isSell = difference < -1;
                
                return (
                  <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-1 relative">
                      {asset.isDb && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-indigo-500 rounded-r-full" title="Synced from DB"></div>}
                      <input 
                        type="text" 
                        value={asset.ticker}
                        onChange={(e) => handleUpdateAsset(asset.id, 'ticker', e.target.value, asset.isDb)}
                        disabled={asset.isDb}
                        className={`w-16 ml-1 font-black text-slate-900 dark:text-white bg-transparent border-b px-1 py-0.5 uppercase focus:outline-none transition-colors ${asset.isDb ? 'border-transparent opacity-70 cursor-not-allowed' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-orange-500'}`}
                      />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <input 
                        type="number" min="0" step="any"
                        value={asset.shares}
                        onChange={(e) => handleUpdateAsset(asset.id, 'shares', e.target.value, asset.isDb)}
                        disabled={asset.isDb}
                        className={`w-20 text-right font-medium text-slate-900 dark:text-white bg-transparent border rounded px-1 py-0.5 focus:outline-none ${asset.isDb ? 'border-transparent opacity-70 cursor-not-allowed' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-orange-500'}`}
                      />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <input 
                        type="number" min="0" step="any"
                        value={asset.price}
                        onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value, asset.isDb)}
                        className="w-20 text-right font-medium text-slate-900 dark:text-white bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded px-1 py-0.5 focus:border-orange-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1 text-right font-medium text-slate-700 dark:text-slate-300">
                      ${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-1">
                      <div className="flex items-center justify-center gap-1 mx-auto w-16">
                        <input 
                          type="number" min="0" max="100" step="any"
                          value={asset.targetAlloc}
                          onChange={(e) => handleUpdateAsset(asset.id, 'targetAlloc', e.target.value, asset.isDb)}
                          className={`w-full text-center font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-orange-600 dark:text-orange-400 focus:border-orange-500 focus:outline-none ${asset.isDb ? 'ring-1 ring-indigo-500/30' : ''}`}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-1 text-right font-bold text-slate-800 dark:text-slate-200">
                      ${targetVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-1 text-right">
                      {isBuy && (
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          Buy {Math.abs(actionShares).toFixed(4)} <span className="opacity-75 font-normal text-xs">(+${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                        </div>
                      )}
                      {isSell && (
                        <div className="font-bold text-rose-600 dark:text-rose-400">
                          Sell {Math.abs(actionShares).toFixed(4)} <span className="opacity-75 font-normal text-xs">(-${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                        </div>
                      )}
                      {!isBuy && !isSell && (
                        <div className="font-bold text-slate-400">
                          Hold
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <button onClick={() => handleRemoveAsset(asset.id, asset.isDb)} className={`font-bold p-1 transition-colors ${asset.isDb ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400'}`} title={asset.isDb ? "Cannot delete synced DB asset here" : "Delete Asset"}>
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
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
