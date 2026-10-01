import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar({ activeTab, setActiveTab, accountId, setAccountId, globalDateRange, setGlobalDateRange, isVip, isTiPicks, isAlphaPicks, isPennyStocks, isOwner, accounts, setShowAccountModal, setShowManual, hasNewFeedPost, isMobileView }) {
  const { t } = useLanguage();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempSelectedYear, setTempSelectedYear] = useState('');
  const [tempSelectedMonth, setTempSelectedMonth] = useState('');
  
  const [isEditMode, setIsEditMode] = useState(false);
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const dragGroup = useRef(null);

  const formatMonthLabel = (val) => {
    if (!val || !val.startsWith('MONTH-')) return 'Custom Month';
    const parts = val.split('-');
    if (parts.length !== 3) return 'Custom Month';
    const date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const DEFAULT_NAV_ITEMS = [
    { id: 'dashboard', icon: '📊', label: t('app.dashboard', 'Overview').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'journal', icon: '📓', label: t('app.journal', 'Trades Table').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'feed', icon: '📰', label: t('app.feed', 'Trading Bulletin').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },

    { id: 'fighter', icon: '⚡', label: t('app.fighter', 'Trade Simulator').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
  ];

  const DEFAULT_VIP_ITEMS = [
    { id: 'positionSizing', icon: '🛡️', label: 'Position Sizing & Risk' },
    { id: 'weeklyPicks', icon: '🎯', label: 'TI Weekly Picks' },
    { id: 'alphaPicks', icon: '🏛️', label: 'Alpha Picks Inv.' },
    { id: 'betaGrid', icon: 'β', label: t('app.betaGrid', 'Beta Grid Trading').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'swing', icon: '📐', label: 'Swing Calculator' },
    { id: 'calendar', icon: '📅', label: t('app.calendar', 'Calendars').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'plans', icon: '📝', label: t('app.plans', 'Plans & Playbooks').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'pennyStocks', icon: '🪙', label: 'Penny Stocks Pro' },
  ];

  const [navOrder, setNavOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phudit_sidebar_nav_order')) || []; } catch { return []; }
  });

  const [vipOrder, setVipOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phudit_sidebar_vip_order')) || []; } catch { return []; }
  });

  const getOrderedItems = (defaultItems, order) => {
    let ordered = [];
    const currentMap = new Map(defaultItems.map(i => [i.id, i]));
    if (order.length > 0) {
      ordered = order
        .filter(id => id !== 'portfolioRebalancer')
        .map(id => id === 'dividends' ? 'betaGrid' : id)
        .map(id => currentMap.get(id))
        .filter(Boolean);
    }
    defaultItems.forEach(item => {
      if (!ordered.find(m => m.id === item.id)) ordered.push(item);
    });
    return ordered;
  };

  const navItems = getOrderedItems(DEFAULT_NAV_ITEMS, navOrder);
  const vipItems = getOrderedItems(DEFAULT_VIP_ITEMS, vipOrder);

  const handleSort = (group) => {
    if (dragGroup.current !== group || dragItem.current === null || dragOverItem.current === null) return;
    
    let items = group === 'nav' ? [...navItems] : [...vipItems];
    const draggedItemContent = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItemContent);
    
    const newOrder = items.map(i => i.id);
    if (group === 'nav') {
      setNavOrder(newOrder);
      localStorage.setItem('phudit_sidebar_nav_order', JSON.stringify(newOrder));
    } else {
      setVipOrder(newOrder);
      localStorage.setItem('phudit_sidebar_vip_order', JSON.stringify(newOrder));
    }
    
    dragItem.current = dragOverItem.current;
  };

  const checkAccess = (tabId) => {
    if (isVip) return true;
    if (isTiPicks && ['positionSizing', 'weeklyPicks', 'swing', 'calendar', 'plans'].includes(tabId)) return true;
    if (isAlphaPicks && ['alphaPicks', 'plans', 'betaGrid'].includes(tabId)) return true;
    if (tabId === 'betaGrid') return isVip || isAlphaPicks;
    if (tabId === 'pennyStocks') return isPennyStocks;
    return false;
  };

  return (
    <>
    <aside className={`w-full ${!isMobileView ? 'lg:w-64 flex-shrink-0 lg:sticky lg:top-24' : ''} flex flex-col gap-5`}>
      
      {/* Account Selector */}
      {!isMobileView && (
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 shadow-xl shadow-slate-200/10 dark:shadow-black/20 flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
            {t('common.tradingAccount', 'Trading Account')}
          </label>
          <button 
            onClick={() => setShowAccountModal(true)}
            className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded-lg transition-colors"
          >
            ⚙️ Manage
          </button>
        </div>
        <select 
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm"
        >
          <option value="all_accounts">🌐 All Accounts (Total)</option>
          {accounts && accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>
      )}

      {/* Date Range Filter */}
      {!isMobileView && (
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 shadow-xl shadow-slate-200/10 dark:shadow-black/20">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
          {t('common.dateRange', 'Date Range')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['1W', '1M', 'YTD', 'All'].map(range => (
            <button
              key={range}
              onClick={() => setGlobalDateRange(range)}
              className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                globalDateRange === range
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-transparent shadow-md shadow-indigo-500/25'
                  : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              {range}
            </button>
          ))}
          <button
            onClick={() => {
              if (globalDateRange.startsWith('MONTH-')) {
                const parts = globalDateRange.split('-');
                setTempSelectedYear(parts[1]);
                setTempSelectedMonth(parts[2].padStart(2, '0'));
              } else {
                setTempSelectedYear(new Date().getFullYear().toString());
                setTempSelectedMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
              }
              setShowMonthPicker(true);
            }}
            className={`col-span-2 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              globalDateRange.startsWith('MONTH-')
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-transparent shadow-md shadow-indigo-500/25'
                : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            {globalDateRange.startsWith('MONTH-') ? formatMonthLabel(globalDateRange) : 'Custom Month'}
          </button>
        </div>
      </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 flex justify-between items-center group">
          <span>{t('common.mainMenu', 'Main Menu')}</span>
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className={`transition-opacity text-xs ${isEditMode ? 'text-indigo-500 font-bold opacity-100' : 'text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100'}`} 
            title="Edit Menu Order"
          >
            {isEditMode ? 'Done' : '⚙️ Edit'}
          </button>
        </div>
        
        {navItems.map((item, index) => (
          <button
            key={item.id}
            draggable={isEditMode}
            onDragStart={(e) => { dragGroup.current = 'nav'; dragItem.current = index; }}
            onDragEnter={(e) => { if (dragGroup.current === 'nav') dragOverItem.current = index; }}
            onDragEnd={() => { handleSort('nav'); dragGroup.current = null; dragItem.current = null; dragOverItem.current = null; }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => { if (!isEditMode) setActiveTab(item.id); }}
            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isEditMode ? 'cursor-move hover:bg-white/50 dark:hover:bg-slate-800/50' : 'cursor-pointer'} ${
              activeTab === item.id && !isEditMode
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <span className="text-lg filter drop-shadow-sm">{item.icon}</span>
            <span className="flex-1 text-left font-bold">{item.label}</span>
            {item.id === 'feed' && hasNewFeedPost && !isEditMode && (
              <span className="absolute top-3 left-8 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></span>
            )}
            {isEditMode && <span className="text-slate-400">≡</span>}
          </button>
        ))}

        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-1 px-3 flex items-center gap-1.5">
          <span>👑</span>
          <span>Pro Features</span>
        </div>
        {vipItems.map((item, index) => {
          const hasPermission = checkAccess(item.id);
          return (
          <button
            key={item.id}
            draggable={isEditMode}
            onDragStart={(e) => { dragGroup.current = 'vip'; dragItem.current = index; }}
            onDragEnter={(e) => { if (dragGroup.current === 'vip') dragOverItem.current = index; }}
            onDragEnd={() => { handleSort('vip'); dragGroup.current = null; dragItem.current = null; dragOverItem.current = null; }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => { if (!isEditMode) setActiveTab(item.id); }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isEditMode ? 'cursor-move hover:bg-white/50 dark:hover:bg-slate-800/50' : 'cursor-pointer'} ${
              activeTab === item.id && !isEditMode
                ? hasPermission
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 text-slate-400 shadow-inner'
                : hasPermission
                  ? 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-indigo-600 dark:hover:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 hover:text-slate-500 dark:hover:text-slate-400'
            }`}
          >
            <span className="text-lg filter drop-shadow-sm">{item.icon}</span>
            <span className="flex-1 text-left font-bold">{item.label}</span>
            {!hasPermission && !isEditMode && (
              <span className="text-[10px] ml-auto opacity-60 text-amber-500">🔒</span>
            )}
            {isEditMode && <span className="text-slate-400 ml-auto">≡</span>}
          </button>
        )})}

        {isOwner && (
          <>
            <button
              onClick={() => setActiveTab('data')}
              className={`mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                activeTab === 'data'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30'
                  : 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <span className="text-lg">⚙️</span>
              <span>Data Management</span>
            </button>
            <button
              onClick={() => setActiveTab('owner')}
              className={`mt-1.5 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                activeTab === 'owner'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30'
                  : 'border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <span className="text-lg">👑</span>
              <span>Owner Dashboard</span>
            </button>
          </>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex flex-col gap-2">
          <button 
            onClick={() => setShowManual && setShowManual(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50"
          >
            <span className="text-sm">📖</span>
            <span>{t('app.manual', 'User Manual')}</span>
          </button>
        </div>
      </nav>

    </aside>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#0B1121]/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/60 dark:border-slate-800/80 relative animate-fade-in">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Select Month & Year</h3>
            <div className="flex gap-3 mb-6">
              <select
                value={tempSelectedMonth}
                onChange={(e) => setTempSelectedMonth(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0');
                  const date = new Date(2000, i, 1);
                  return <option key={m} value={m}>{date.toLocaleDateString('en-US', { month: 'long' })}</option>;
                })}
              </select>
              <select
                value={tempSelectedYear}
                onChange={(e) => setTempSelectedYear(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
                  const y = (2020 + i).toString();
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowMonthPicker(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (tempSelectedYear && tempSelectedMonth) {
                    setGlobalDateRange(`MONTH-${tempSelectedYear}-${tempSelectedMonth}`);
                  }
                  setShowMonthPicker(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/30 transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
