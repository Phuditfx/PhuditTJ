import React, { useState, useEffect, useMemo } from 'react';

export default function PortfolioRebalancer() {
  const [assets, setAssets] = useState([
    { id: '1', ticker: 'AAPL', shares: 50, price: 150, targetAlloc: 40 },
    { id: '2', ticker: 'MSFT', shares: 30, price: 310, targetAlloc: 40 },
    { id: '3', ticker: 'TSLA', shares: 10, price: 200, targetAlloc: 20 }
  ]);
  const [newCash, setNewCash] = useState(0);

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

      {/* Main Asset List (Card Grid Layout) */}
      <div className="relative min-h-[300px]">
        
        {!isAllocationValid && (
          <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-20 flex items-start justify-center pt-10 rounded-xl">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-2xl border-2 border-rose-500 text-center max-w-md mx-4 sticky top-10">
                <div className="text-4xl mb-3">🚨</div>
                <h3 className="text-rose-600 dark:text-rose-400 font-black text-xl mb-2">Target Allocation ไม่ถูกต้อง</h3>
                <p className="text-slate-600 dark:text-slate-300 font-medium">สัดส่วนเป้าหมายปัจจุบันคือ <strong>{totalAllocation}%</strong><br/>คุณต้องปรับสัดส่วนเป้าหมาย (Target Alloc) ของสินทรัพย์ทั้งหมดให้รวมกัน <strong>เท่ากับ 100% พอดี</strong> เพื่อให้ระบบคำนวณใหม่ได้</p>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
          {assets.map(asset => {
            const currentVal = asset.shares * asset.price;
            const targetVal = newTotalValue * (asset.targetAlloc / 100);
            const difference = targetVal - currentVal;
            const actionShares = asset.price > 0 ? difference / asset.price : 0;
            
            const isBuy = difference > 1; // 1 dollar threshold
            const isSell = difference < -1;
            
            return (
              <div key={asset.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow relative">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <input 
                    type="text" 
                    value={asset.ticker}
                    onChange={(e) => handleUpdateAsset(asset.id, 'ticker', e.target.value)}
                    className="w-24 font-black text-xl text-slate-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-700 px-1 py-1 uppercase focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="TICKER"
                  />
                  <div className="text-right flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold leading-tight">Current Val</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        ${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button onClick={() => handleRemoveAsset(asset.id)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 font-bold p-1 transition-colors" title="Delete Asset">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body Row 1: Shares & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Shares</label>
                    <input 
                      type="number" min="0" step="any"
                      value={asset.shares}
                      onChange={(e) => handleUpdateAsset(asset.id, 'shares', e.target.value)}
                      className="w-full font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Price ($)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                      <input 
                        type="number" min="0" step="any"
                        value={asset.price}
                        onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value)}
                        className="w-full pl-6 pr-3 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Body Row 2: Target */}
                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Alloc (%)</label>
                    <div className="flex items-center gap-1 w-24">
                      <input 
                        type="number" min="0" max="100" step="any"
                        value={asset.targetAlloc}
                        onChange={(e) => handleUpdateAsset(asset.id, 'targetAlloc', e.target.value)}
                        className="w-full font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-indigo-700 dark:text-indigo-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Value</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      ${targetVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Footer: Action Needed */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Action Needed</span>
                    <div>
                      {isBuy && (
                        <div className="bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 px-3 py-2 rounded-lg text-right shadow-sm">
                          <div className="font-black text-sm uppercase leading-none">Buy {Math.abs(actionShares).toFixed(4)}</div>
                          <div className="text-[10px] font-bold opacity-80 mt-1">+${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                      {isSell && (
                        <div className="bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-400 px-3 py-2 rounded-lg text-right shadow-sm">
                          <div className="font-black text-sm uppercase leading-none">Sell {Math.abs(actionShares).toFixed(4)}</div>
                          <div className="text-[10px] font-bold opacity-80 mt-1">-${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                      {!isBuy && !isSell && (
                        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-4 py-2 rounded-lg font-bold shadow-sm uppercase text-xs">
                          Hold
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
