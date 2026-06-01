import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar({ activeTab, setActiveTab, accountId, setAccountId, globalDateRange, setGlobalDateRange, isVip, isOwner, accounts, setShowAccountModal, setShowManual }) {
  const { t } = useLanguage();
  const NAV_ITEMS = [
    { id: 'dashboard', icon: '📊', label: t('app.dashboard', 'Overview').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'journal', icon: '📓', label: t('app.journal', 'Trades Table').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'feed', icon: '📰', label: t('app.feed', 'Trading Bulletin').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'analytics', icon: '📈', label: t('app.analytics', 'Analytics & Stats').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'fighter', icon: '⚡', label: t('app.fighter', 'Trade Simulator').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'data', icon: '⚙️', label: t('app.data', 'Data Management').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
  ];

  const VIP_ITEMS = [
    { id: 'swing', icon: '📐', label: 'Swing Calculator' },
    { id: 'calendar', icon: '📅', label: t('app.calendar', 'Calendars').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'plans', icon: '📝', label: t('app.plans', 'Plans & Playbooks').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
    { id: 'dividends', icon: '💰', label: t('app.dividends', 'Dividends').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') },
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-24">
      
      {/* Account Selector */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
            {t('common.tradingAccount', 'Trading Account')}
          </label>
          <button 
            onClick={() => setShowAccountModal(true)}
            className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded"
          >
            ⚙️ Manage
          </button>
        </div>
        <select 
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
        >
          {accounts && accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          {t('common.dateRange', 'Date Range')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['1W', '1M', 'YTD', 'All'].map(range => (
            <button
              key={range}
              onClick={() => setGlobalDateRange(range)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                globalDateRange === range
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
          {t('common.mainMenu', 'Main Menu')}
        </div>
        
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {/* VIP Items — always visible, locked for non-VIP */}
        <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest mt-4 mb-2 px-3 flex items-center gap-1.5">
          <span>👑</span>
          <span>Pro Features</span>
        </div>
        {VIP_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === item.id
                ? isVip
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-900/20'
                  : 'bg-indigo-950/80 text-indigo-300 shadow-md'
                : isVip
                  ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {!isVip && (
              <span className="text-[10px] ml-auto opacity-60 text-amber-500">🔒</span>
            )}
          </button>
        ))}

        {isOwner && (
          <button
            onClick={() => setActiveTab('owner')}
            className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
              activeTab === 'owner'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                : 'border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <span className="text-lg">👑</span>
            <span>Owner Dashboard</span>
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <button 
            onClick={() => setShowManual && setShowManual(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35 border border-slate-200 dark:border-slate-700"
          >
            <span className="text-sm">📖</span>
            <span>{t('app.manual', 'User Manual')}</span>
          </button>
        </div>
      </nav>

    </aside>
  );
}
