import React, { useState, useEffect, useMemo } from 'react';

export default function PortfolioRebalancer() {
  const [assets, setAssets] = useState([
    { id: '1', ticker: 'AAPL', shares: 50, price: 150, targetAlloc: 40 },
    { id: '2', ticker: 'MSFT', shares: 30, price: 310, targetAlloc: 40 },
    { id: '3', ticker: 'TSLA', shares: 10, price: 200, targetAlloc: 20 }
  ]);
  const [newCash, setNewCash] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // New row input state
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const currentTotalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.shares * asset.price), 0);
  }, [assets]);

  const newTotalValue = currentTotalValue + (parseFloat(newCash) || 0);

  const totalAllocation = useMemo(() => {
    return assets.reduce((sum, asset) => sum + parseFloat(asset.targetAlloc || 0), 0);
  }, [assets]);

  const isAllocationValid = totalAllocation === 100;

  const handleUpdateAsset = (id, field, value) => {
    const val = parseFloat(value);
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: isNaN(val) && field !== 'ticker' ? '' : (field === 'ticker' ? value.toUpperCase() : val) } : a));
  };

  const handleRemoveAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!newTicker || !newPrice) return;
    const nShares = parseFloat(newShares) || 0;
    const nPrice = parseFloat(newPrice) || 0;
    const nTarget = parseFloat(newTarget) || 0;
    
    setAssets([...assets, {
      id: Date.now().toString(),
      ticker: newTicker.toUpperCase(),
      shares: nShares,
      price: nPrice,
      targetAlloc: nTarget
    }]);

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

  // Ensure current page is valid when assets are deleted
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header section */}
      <div className="mb-8 border-b-2 border-orange-500 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">
          <span className="text-orange-500">⚖️</span> Portfolio Rebalancer
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
          คำนวณและปรับสัดส่วนพอร์ตหุ้นของคุณให้ตรงกับเป้าหมายการลงทุน (Target Allocation)
        </p>
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
          <span>➕</span> เพิ่มสินทรัพย์ใหม่ (Add Asset)
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
                    <td className="px-3 py-1">
                      <input 
                        type="text" 
                        value={asset.ticker}
                        onChange={(e) => handleUpdateAsset(asset.id, 'ticker', e.target.value)}
                        className="w-16 font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 px-1 py-0.5 uppercase focus:border-orange-500 focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <input 
                        type="number" min="0" step="any"
                        value={asset.shares}
                        onChange={(e) => handleUpdateAsset(asset.id, 'shares', e.target.value)}
                        className="w-20 text-right font-medium text-slate-900 dark:text-white bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded px-1 py-0.5 focus:border-orange-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <input 
                        type="number" min="0" step="any"
                        value={asset.price}
                        onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value)}
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
                          onChange={(e) => handleUpdateAsset(asset.id, 'targetAlloc', e.target.value)}
                          className="w-full text-center font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-orange-600 dark:text-orange-400 focus:border-orange-500 focus:outline-none"
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
                      <button onClick={() => handleRemoveAsset(asset.id)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 font-bold p-1 transition-colors" title="Delete Asset">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
