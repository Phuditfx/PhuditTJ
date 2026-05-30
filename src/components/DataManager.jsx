import React, { useState, useEffect } from 'react';
import { calculateStorageUsage, saveFeedPosts, saveTrades, savePlans, saveDividends } from '../db/journalDB';
import { Trash2, Download, AlertTriangle, Database, HardDrive, RefreshCw } from 'lucide-react';

export default function DataManager({ currentUser, trades, setTrades, feedPosts, setFeedPosts, plans, setPlans, dividends, setDividends }) {
  const [firebaseSize, setFirebaseSize] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const MAX_LOCAL_SIZE = 5 * 1024 * 1024; // 5MB local storage limit

  const refreshStorageSize = async () => {
    if (!currentUser) return;
    setIsCalculating(true);
    const size = await calculateStorageUsage(currentUser);
    setFirebaseSize(size);
    setIsCalculating(false);
  };

  useEffect(() => {
    refreshStorageSize();
  }, [currentUser, trades, feedPosts, plans, dividends]);

  const usagePercent = Math.min((firebaseSize / MAX_LOCAL_SIZE) * 100, 100);
  
  const getStatusColor = () => {
    if (usagePercent > 90) return 'text-rose-500 bg-rose-500';
    if (usagePercent > 70) return 'text-amber-500 bg-amber-500';
    return 'text-emerald-500 bg-emerald-500';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteFeedPost = (id) => {
    if (window.confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      const updated = feedPosts.filter(p => p.id !== id);
      setFeedPosts(updated);
      saveFeedPosts(currentUser, updated);
    }
  };

  const handleClearAllFeed = () => {
    if (window.confirm('Are you sure you want to delete ALL feed posts? All attached images will be lost.')) {
      setFeedPosts([]);
      saveFeedPosts(currentUser, []);
    }
  };

  const handleClearAllTrades = () => {
      if (window.confirm('Are you sure you want to delete ALL your trades history? This cannot be undone.')) {
        setTrades([]);
        saveTrades(currentUser, []);
      }
  };

  const handleDownloadLogs = () => {
    import('../utils/logger').then(m => m.downloadLogs && m.downloadLogs());
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-500" />
              Data Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your offline backup cache and view your synchronized Subcollections.
            </p>
          </div>
          <button 
            onClick={refreshStorageSize}
            disabled={isCalculating}
            className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh Storage Size"
          >
            <RefreshCw size={20} className={isCalculating ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Storage Meter */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Local Offline Cache Used</span>
              <span className={`text-2xl font-black ${getStatusColor().split(' ')[0]}`}>
                {formatBytes(firebaseSize)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium"> / 5 MB</span>
            </div>
            <span className={`text-xl font-black ${getStatusColor().split(' ')[0]}`}>
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${getStatusColor().split(' ')[1]}`} 
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Feed Posts Manager */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Trading Bulletin (Posts)</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black px-2.5 py-1 rounded-md">
              {feedPosts.length} Items
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
            Posts containing images take up the most storage space. Delete old posts to free up space.
          </p>
          
          <div className="flex-1 overflow-y-auto pr-2 max-h-64 flex flex-col gap-2 mb-4 custom-scrollbar">
            {feedPosts.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm font-medium">No posts found.</div>
            ) : (
              feedPosts.map(post => (
                <div key={post.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col overflow-hidden mr-3">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{post.title || 'Untitled Post'}</span>
                    <span className="text-xs text-slate-500">{post.timestamp} • {post.blocks?.length || 0} blocks</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteFeedPost(post.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex-shrink-0"
                    title="Delete Post"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {feedPosts.length > 0 && (
            <button 
              onClick={handleClearAllFeed}
              className="w-full mt-auto py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800/50"
            >
              <Trash2 size={16} />
              Delete All Posts
            </button>
          )}
        </div>

        {/* Other Data & Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Trades Manager */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Trade History</h3>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black px-2.5 py-1 rounded-md">
                {trades.length} Items
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Individual trades take very little space, but thousands of trades will eventually add up.
            </p>
            {trades.length > 0 && (
              <button 
                onClick={handleClearAllTrades}
                className="w-full py-2.5 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700"
              >
                <Trash2 size={16} />
                Clear All Trades History
              </button>
            )}
          </div>
          
          {/* System Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mt-auto">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                <HardDrive size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Diagnostics</h3>
                <p className="text-xs text-slate-500">Download app logs for debugging</p>
              </div>
            </div>
            <button 
              onClick={handleDownloadLogs}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Download size={16} />
              Download System Logs
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
