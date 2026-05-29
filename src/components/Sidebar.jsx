import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar({ activeTab, setActiveTab, accountId, setAccountId, globalDateRange, setGlobalDateRange, isVip, isOwner }) {
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { id: 'dashboard', icon: '📊', label: 'Overview' },
    { id: 'journal', icon: '📓', label: 'Trades Table' },
    { id: 'analytics', icon: '📈', label: 'Analytics & Stats' },
    { id: 'fighter', icon: '⚡', label: 'Trade Simulator' },
  ];

  const VIP_ITEMS = [
    { id: 'calendar', icon: '📅', label: 'Calendars' },
    { id: 'plans', icon: '📝', label: 'Plans & Playbooks' },
    { id: 'dividends', icon: '💰', label: 'Dividends' },
  ];

  const ACCOUNTS = [
    { id: 'default', name: 'Main Account' },
    { id: 'acc2', name: 'Challenge Acc' },
    { id: 'acc3', name: 'Swing Portfolio' }
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-24">
      
      {/* Account Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Trading Account
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {ACCOUNTS.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Date Range
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
          Main Menu
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

        {isVip && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2 px-3">
              Pro Features
            </div>
            {VIP_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-900/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </>
        )}

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
      </nav>

    </aside>
  );
}
