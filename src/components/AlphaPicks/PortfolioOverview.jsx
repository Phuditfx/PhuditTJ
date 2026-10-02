import React, { useState, useEffect, useCallback } from 'react';
import { useMoonbagStore } from '../../hooks/useMoonbagStore';
import { getPortfolioTransactions } from '../../db/investmentDB';
import { Pencil, Trash2, Check, X, Clock, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG = {
  BUY:    { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: '↑' },
  SELL:   { color: 'text-rose-500',    bg: 'bg-rose-500/10',    icon: '↓' },
  RECOUP: { color: 'text-purple-500',  bg: 'bg-purple-500/10',  icon: '⚡' },
};

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isWithinEditWindow(createdAt) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

function minutesAgo(createdAt) {
  if (!createdAt) return null;
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diff < 1) return 'เพิ่งบันทึก';
  return `${diff} นาทีที่แล้ว`;
}

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
  const { positions, portfolios, selectedPortfolioId, handleDeleteTransaction, handleEditTransaction } = useMoonbagStore();
  const [txList, setTxList] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  // Delete confirm state
  const [deletingTxId, setDeletingTxId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit modal state
  const [editingTx, setEditingTx] = useState(null); // full tx object
  const [editShares, setEditShares] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionError, setActionError] = useState('');

  // Re-render ticker for live countdown
  const [tick, setTick] = useState(0);

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const totalRecouped = parseFloat(selectedPortfolio?.total_recouped || 0);

  const activePositions = positions.filter(p => p.status === 'ACTIVE');
  const moonbagPositions = positions.filter(p => p.status === 'MOONBAG');
  const closedPositions = positions.filter(p => p.status === 'CLOSED');
  const openPositions = positions.filter(p => p.status !== 'CLOSED');

  const totalHoldingsValue = openPositions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalCostBasis = openPositions.reduce((sum, p) => {
    return sum + (parseFloat(p.average_cost || 0) * parseFloat(p.total_shares || 0));
  }, 0);
  const totalPnlAmt = totalHoldingsValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnlAmt / totalCostBasis) * 100 : 0;
  const moonbagFreeValue = moonbagPositions.reduce((sum, p) => sum + (p.currentValue || 0), 0);

  const loadTxList = useCallback(() => {
    if (!selectedPortfolioId) return;
    setTxLoading(true);
    getPortfolioTransactions(selectedPortfolioId, 30)
      .then(data => setTxList(data || []))
      .finally(() => setTxLoading(false));
  }, [selectedPortfolioId]);

  useEffect(() => {
    loadTxList();
  }, [loadTxList]);

  // Tick every 30s to re-evaluate which transactions are still within the edit window
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ts; }
  };

  // ── Delete ──
  const handleConfirmDelete = async () => {
    if (!deletingTxId) return;
    setIsDeleting(true);
    setActionError('');
    try {
      await handleDeleteTransaction(deletingTxId);
      setDeletingTxId(null);
      loadTxList();
    } catch (err) {
      setActionError(err.message || 'เกิดข้อผิดพลาดขณะลบ');
      setDeletingTxId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Edit ──
  const openEditModal = (tx) => {
    setEditingTx(tx);
    setEditShares(String(parseFloat(tx.shares || 0)));
    setEditPrice(String(parseFloat(tx.price || 0)));
    setActionError('');
  };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    if (!editingTx || !editShares || !editPrice) return;
    setIsSavingEdit(true);
    setActionError('');
    try {
      await handleEditTransaction(editingTx.id, editShares, editPrice);
      setEditingTx(null);
      loadTxList();
    } catch (err) {
      setActionError(err.message || 'เกิดข้อผิดพลาดขณะแก้ไข');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Computed preview value for edit modal
  const editPreviewValue = (parseFloat(editShares) || 0) * (parseFloat(editPrice) || 0);

  return (
    <div className="space-y-4">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="💼" label="Total Holdings Value"
          value={`$${totalHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${openPositions.length} open positions`}
          colorClass="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border-indigo-500/20"
        />
        <StatCard
          icon={totalPnlAmt >= 0 ? '📈' : '📉'} label="Unrealized PnL"
          value={`${totalPnlAmt >= 0 ? '+' : ''}$${Math.abs(totalPnlAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}% overall`}
          colorClass={`bg-gradient-to-br border ${totalPnlAmt >= 0 ? 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20' : 'from-rose-500/20 to-rose-500/5 border-rose-500/20'}`}
        />
        <StatCard
          icon="⚡" label="Capital Recouped"
          value={`$${totalRecouped.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Risk-free capital returned"
          colorClass="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20"
        />
        <StatCard
          icon="🚀" label="Moonbag Free Value"
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

      {/* Global action error banner */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold animate-fade-in">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError('')} className="p-0.5 hover:text-rose-800 cursor-pointer">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">📋 Recent Transactions</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Clock size={10} />
              แก้ไข/ลบได้ใน 15 นาที
            </span>
            <span className="text-[10px] text-slate-400 font-bold">{txList.length} records</span>
          </div>
        </div>

        {txLoading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : txList.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm font-bold">No transactions yet</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[500px] overflow-y-auto">
            {txList.map((tx, i) => {
              const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.BUY;
              const ticker = tx.investment_positions?.ticker || '—';
              const txValue = parseFloat(tx.shares || 0) * parseFloat(tx.price || 0);
              const canEdit = tx.type !== 'RECOUP' && isWithinEditWindow(tx.created_at);
              const isRecentLabel = canEdit ? minutesAgo(tx.created_at) : null;
              const isDeleteConfirming = deletingTxId === tx.id;

              return (
                <div
                  key={tx.id || i}
                  className={`flex items-center px-4 py-3 transition-colors text-sm gap-3 ${
                    isDeleteConfirming
                      ? 'bg-rose-50/80 dark:bg-rose-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Left: icon + info */}
                  <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center text-base font-black ${cfg.color} flex-shrink-0`}>
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>{ticker}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>{tx.type}</span>
                      {isRecentLabel && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                          <Clock size={8} />
                          {isRecentLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-bold">{formatDateTime(tx.created_at || tx.transaction_date)}</div>
                  </div>

                  {/* Right: value + action buttons */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className={`font-black font-mono text-sm ${cfg.color}`}>
                      {tx.type === 'BUY' ? '-' : '+'}${txValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {parseFloat(tx.shares || 0).toFixed(4)} @ ${parseFloat(tx.price || 0).toFixed(2)}
                    </div>

                    {/* Action buttons — only within 15 min window */}
                    {canEdit && !isDeleteConfirming && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          onClick={() => openEditModal(tx)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-black transition-all cursor-pointer border border-indigo-200/50 dark:border-indigo-800/50"
                          title="แก้ไขรายการนี้ (ราคา/จำนวนหุ้น)"
                        >
                          <Pencil size={10} />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          onClick={() => setDeletingTxId(tx.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[10px] font-black transition-all cursor-pointer border border-rose-200/50 dark:border-rose-800/50"
                          title="ลบรายการนี้"
                        >
                          <Trash2 size={10} />
                          <span>ลบ</span>
                        </button>
                      </div>
                    )}

                    {/* Delete inline confirmation */}
                    {isDeleteConfirming && (
                      <div className="flex items-center gap-1.5 mt-0.5 animate-fade-in">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">ยืนยันลบ?</span>
                        <button
                          onClick={handleConfirmDelete}
                          disabled={isDeleting}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            <Check size={10} />
                          )}
                          <span>ลบ</span>
                        </button>
                        <button
                          onClick={() => setDeletingTxId(null)}
                          disabled={isDeleting}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black transition-all cursor-pointer"
                        >
                          <X size={10} />
                          <span>ยกเลิก</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Transaction Modal ── */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl shadow-black/40 w-full max-w-sm animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-md ${TYPE_CONFIG[editingTx.type]?.bg} ${TYPE_CONFIG[editingTx.type]?.color} font-black`}>
                    {editingTx.type}
                  </span>
                  <span>{editingTx.investment_positions?.ticker || '—'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-bold">
                  แก้ไขรายการนี้ — ระบบจะคำนวณ position ใหม่อัตโนมัติ
                </p>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="flex flex-col gap-4">
              {/* Shares */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  จำนวนหุ้น (Shares)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={editShares}
                  onChange={e => setEditShares(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  ราคา ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Preview total value */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500">มูลค่ารวม (Total Value)</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  ${editPreviewValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Error */}
              {actionError && (
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle size={13} />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setEditingTx(null); setActionError(''); }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>ยืนยันแก้ไข</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
