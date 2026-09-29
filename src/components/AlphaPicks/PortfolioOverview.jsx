import React, { useState, useEffect } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';
import { getPortfolioTransactions } from '../../db/investmentDB';

const TYPE_CONFIG = {
  BUY:    { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: '↑' },
  SELL:   { color: 'text-rose-500',    bg: 'bg-rose-500/10',    icon: '↓' },
  RECOUP: { color: 'text-purple-500',  bg: 'bg-purple-500/10',  icon: '⚡' },
};

function StatCard({ label, value, sub, colorClass, icon }) {
  return (
    <div className={`${colorClass} border rounded-2xl p-4 flex flex-col gap-1`}>
      <div className="text-xl">{icon}</div>
      <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{label}</div>
      <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{sub}</div>}
    </div>
  );
}

export default function PortfolioOverview() {
  const { positions, portfolios, selectedPortfolioId } = useMoonbagStore();
  const [txList, setTxList] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const totalRecouped = parseFloat(selectedPortfolio?.total_recouped || 0);

  const activePositions = positions.filter(p => p.status === 'ACTIVE');
  const moonbagPositions = positions.filter(p => p.status === 'MOONBAG');
  const closedPositions = positions.filter(p => p.status === 'CLOSED');

  const openPositions = positions.filter(p => p.status !== 'CLOSED');

  const totalHoldingsValue = openPositions.reduce((sum, p) => sum + (p.currentValue || 0), 0);

  const totalCostBasis = openPositions.reduce((sum, p) => {
    const avgCost = parseFloat(p.average_cost || 0);
    const shares = parseFloat(p.total_shares || 0);
    return sum + (avgCost * shares);
  }, 0);

  const totalPnlAmt = totalHoldingsValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnlAmt / totalCostBasis) * 100 : 0;
  const moonbagFreeValue = moonbagPositions.reduce((sum, p) => sum + (p.currentValue || 0), 0);

  useEffect(() => {
    if (!selectedPortfolioId) return;
    setTxLoading(true);
    getPortfolioTransactions(selectedPortfolioId, 20)
      .then(data => setTxList(data || []))
      .finally(() => setTxLoading(false));
  }, [selectedPortfolioId]);

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ts; }
  };

  return (
    <div className="space-y-4">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="💼"
          label="Total Holdings Value"
          value={`$${totalHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${openPositions.length} open positions`}
          colorClass="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border-indigo-500/20"
        />
        <StatCard
          icon={totalPnlAmt >= 0 ? '📈' : '📉'}
          label="Unrealized PnL"
          value={`${totalPnlAmt >= 0 ? '+' : ''}$${Math.abs(totalPnlAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}% overall`}
          colorClass={`bg-gradient-to-br border ${totalPnlAmt >= 0 ? 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20' : 'from-rose-500/20 to-rose-500/5 border-rose-500/20'}`}
        />
        <StatCard
          icon="⚡"
          label="Capital Recouped"
          value={`$${totalRecouped.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Risk-free capital returned"
          colorClass="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20"
        />
        <StatCard
          icon="🚀"
          label="Moonbag Free Value"
          value={`$${moonbagFreeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${moonbagPositions.length} free-hold positions`}
          colorClass="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20"
        />
      </div>

      {/* Position Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', count: activePositions.length, color: 'text-indigo-500', dot: 'bg-indigo-500', bg: 'bg-indigo-500/5' },
          { label: 'Moonbag 🚀', count: moonbagPositions.length, color: 'text-purple-500', dot: 'bg-purple-500', bg: 'bg-purple-500/5' },
          { label: 'Closed', count: closedPositions.length, color: 'text-slate-400', dot: 'bg-slate-400', bg: 'bg-slate-500/5' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dot}`}></div>
            <div>
              <div className={`text-2xl font-black ${item.color}`}>{item.count}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">📋 Recent Transactions</h3>
          <span className="text-[10px] text-slate-400 font-bold">{txList.length} records</span>
        </div>
        {txLoading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : txList.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm font-bold">No transactions yet</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[400px] overflow-y-auto">
            {txList.map((tx, i) => {
              const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.BUY;
              const ticker = tx.investment_positions?.ticker || '—';
              const txValue = parseFloat(tx.shares || 0) * parseFloat(tx.price || 0);
              return (
                <div key={tx.id || i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-sm gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center text-base font-black ${cfg.color} flex-shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{ticker}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>{tx.type}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold">{formatDateTime(tx.created_at || tx.transaction_date)}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black font-mono text-sm ${cfg.color}`}>
                      {tx.type === 'BUY' ? '-' : '+'}${txValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {parseFloat(tx.shares || 0).toFixed(4)} @ ${parseFloat(tx.price || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
