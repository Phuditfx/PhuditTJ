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

  const handleUpdateAsset = (id, field, value) => {
    const val = parseFloat(value);
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: isNaN(val) && field !== 'ticker' ? '' : (field === 'ticker' ? value.toUpperCase() : val) } : a));
  };

  const handleRemoveAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleAddAsset = () => {
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
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in text-slate-900">
      
      {/* Header section with Seeking Alpha vibe */}
      <div className="mb-8 border-b-2 border-orange-500 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <span className="text-orange-500">⚖️</span> Portfolio Rebalancer
        </h1>
        <p className="text-slate-600 mt-2 font-medium">
          Align your current holdings with your target portfolio allocation strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Summary Cards */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm col-span-1 lg:col-span-1 border-l-4 border-l-slate-400">
          <p className="text-sm font-bold text-slate-500 uppercase">Current Total Value</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            ${currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm col-span-1 lg:col-span-1 border-l-4 border-l-emerald-500">
          <p className="text-sm font-bold text-slate-500 uppercase">New Cash to Add</p>
          <div className="mt-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input 
              type="number" 
              value={newCash}
              onChange={(e) => setNewCash(e.target.value)}
              className="w-full pl-6 pr-3 py-1.5 bg-emerald-50 text-emerald-900 font-black text-xl rounded border-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm col-span-1 lg:col-span-1 border-l-4 border-l-indigo-500">
          <p className="text-sm font-bold text-slate-500 uppercase">Target Total Value</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">
            ${newTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`rounded-xl p-5 border shadow-sm col-span-1 lg:col-span-1 border-l-4 ${totalAllocation === 100 ? 'bg-white border-slate-200 border-l-emerald-500' : 'bg-rose-50 border-rose-200 border-l-rose-500'}`}>
          <p className="text-sm font-bold text-slate-500 uppercase">Total Allocation</p>
          <p className={`text-2xl font-black mt-1 ${totalAllocation === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalAllocation}%
          </p>
          {totalAllocation !== 100 && (
            <p className="text-xs text-rose-600 font-bold mt-1">Must equal exactly 100%</p>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3">Asset Ticker</th>
                <th className="px-4 py-3">Current Shares</th>
                <th className="px-4 py-3">Current Price</th>
                <th className="px-4 py-3">Current Value</th>
                <th className="px-4 py-3">Target Alloc %</th>
                <th className="px-4 py-3">Target Value</th>
                <th className="px-4 py-3 text-right">Action Needed</th>
                <th className="px-4 py-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(asset => {
                const currentVal = asset.shares * asset.price;
                const targetVal = newTotalValue * (asset.targetAlloc / 100);
                const difference = targetVal - currentVal;
                const actionShares = asset.price > 0 ? difference / asset.price : 0;
                
                const isBuy = difference > 1; // 1 dollar threshold
                const isSell = difference < -1;
                
                return (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <input 
                        type="text" 
                        value={asset.ticker}
                        onChange={(e) => handleUpdateAsset(asset.id, 'ticker', e.target.value)}
                        className="w-20 font-black text-slate-900 border border-slate-200 rounded px-2 py-1 uppercase"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" min="0" step="any"
                        value={asset.shares}
                        onChange={(e) => handleUpdateAsset(asset.id, 'shares', e.target.value)}
                        className="w-20 font-medium text-slate-900 border border-slate-200 rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                          type="number" min="0" step="any"
                          value={asset.price}
                          onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value)}
                          className="w-24 pl-5 font-medium text-slate-900 border border-slate-200 rounded py-1"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      ${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" min="0" max="100" step="any"
                          value={asset.targetAlloc}
                          onChange={(e) => handleUpdateAsset(asset.id, 'targetAlloc', e.target.value)}
                          className={`w-20 font-bold border rounded px-2 py-1 ${totalAllocation !== 100 ? 'bg-rose-50 border-rose-300 text-rose-700' : 'border-slate-200 text-indigo-700'}`}
                        />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600">
                      ${targetVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isBuy && (
                        <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-md inline-block text-right">
                          <div className="font-black text-sm">BUY {Math.abs(actionShares).toFixed(4)} shares</div>
                          <div className="text-xs font-bold opacity-80">+${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                      {isSell && (
                        <div className="bg-rose-100 text-rose-800 px-3 py-1.5 rounded-md inline-block text-right">
                          <div className="font-black text-sm">SELL {Math.abs(actionShares).toFixed(4)} shares</div>
                          <div className="text-xs font-bold opacity-80">-${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                      {!isBuy && !isSell && (
                        <div className="text-slate-400 font-bold px-3 py-1.5">No Action</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleRemoveAsset(asset.id)} className="text-rose-400 hover:text-rose-600 font-bold p-1">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Add New Row */}
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3">
                  <input 
                    type="text" placeholder="Ticker" value={newTicker} onChange={(e) => setNewTicker(e.target.value)}
                    className="w-20 font-bold text-slate-900 border border-slate-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input 
                    type="number" placeholder="Shares" value={newShares} onChange={(e) => setNewShares(e.target.value)}
                    className="w-20 font-medium text-slate-900 border border-slate-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input 
                    type="number" placeholder="Price $" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                    className="w-24 font-medium text-slate-900 border border-slate-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs italic">Auto-calculated</td>
                <td className="px-4 py-3">
                  <input 
                    type="number" placeholder="Target %" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
                    className="w-20 font-bold text-slate-900 border border-slate-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3"></td>
                <td colSpan="2" className="px-4 py-3 text-right">
                  <button 
                    onClick={handleAddAsset}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-4 rounded-md shadow-sm transition-colors"
                  >
                    + Add Asset
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
