import React, { useState, useEffect } from 'react';
import { getPennyStocks } from '../db/journalDB';
import VipLockScreen from './VipLockScreen';
import OwnerPennyStocksManager from './OwnerPennyStocksManager';

export default function PennyStocksTab({ userEmail, requestAlert, requestConfirm }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getPennyStocks();
      setPosts(data);
    } catch (e) {
      console.error(e);
      requestAlert("Error", "ไม่สามารถดึงข้อมูล Penny Stocks ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in px-2 sm:px-0">
      
      {/* Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 sm:p-8 overflow-hidden shadow-2xl shadow-indigo-900/20 border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">VIP Exclusive</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="text-4xl">🪙</span> Penny Stocks Pro
            </h2>
            <p className="text-indigo-200 mt-2 text-sm sm:text-base max-w-xl leading-relaxed">
              โพสต์หุ้นเก็งกำไรพิเศษ (Penny Stocks) สำหรับเทรดสัปดาห์นี้หรือวันพรุ่งนี้ คัดกรองและวิเคราะห์โดย Phudit
            </p>
          </div>
        </div>
      </div>

      {/* Owner Management Section */}
      {userEmail === 'phudit.mahawongsanan@gmail.com' && (
        <div className="mb-8">
          <OwnerPennyStocksManager 
            currentUser={userEmail} 
            requestAlert={requestAlert} 
            requestConfirm={requestConfirm} 
            onUpdate={fetchPosts}
          />
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">ยังไม่มีโพสต์ Penny Stocks</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              ตอนนี้ยังไม่มีโพสต์หุ้นใหม่ กรุณารออัปเดตในเร็วๆ นี้
            </p>
          </div>
        ) : (
          posts.map((post) => {
            let postData = null;
            try {
              if (post.analysis_text && typeof post.analysis_text === 'string' && post.analysis_text.startsWith('{')) {
                postData = JSON.parse(post.analysis_text);
              }
            } catch (e) {
              // ignore
            }
            const isNewFormat = postData && postData.is_new_format;

            return (
              <div key={post.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:border-slate-700">
                {/* Post Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/30 shrink-0">
                        P
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Phudit Trader</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(post.created_at).toLocaleString('th-TH', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isNewFormat && (
                        <>
                          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/50">
                            {postData.day_of_week}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800/50">
                            {postData.week_of_month}
                          </span>
                        </>
                      )}
                      <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Penny Stock
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {post.title}
                  </h3>
                </div>
                
                {isNewFormat ? (
                  /* New Format Content */
                  <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 space-y-6">
                    {postData.stocks && postData.stocks.map((stock, idx) => (
                      <div key={stock.id || idx} className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        
                        {/* Stock Header */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
                            {stock.ticker}
                          </h4>
                          
                          <div className="flex flex-wrap gap-2">
                            {stock.pattern && (
                              <span className="text-xs font-bold px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800/50">
                                🎨 {stock.pattern}
                              </span>
                            )}
                            {stock.setup && (
                              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                                🎯 {stock.setup}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Analysis Text */}
                        {stock.description && (
                          <div className="mb-5">
                            <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <span>📝</span> แผนการเทรด
                            </h5>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                              {stock.description}
                            </div>
                          </div>
                        )}

                        {/* Images */}
                        {stock.images && stock.images.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <span>🖼️</span> กราฟประกอบ
                            </h5>
                            <div className="flex flex-wrap gap-4">
                              {stock.images.map((imgUrl, imgIdx) => (
                                <div key={imgIdx} className="w-full sm:w-auto flex-1 min-w-[250px] max-w-[500px]">
                                  <img 
                                    src={imgUrl} 
                                    alt={`Chart ${stock.ticker} ${imgIdx+1}`}
                                    className="w-full h-auto rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:opacity-95 transition-opacity object-cover"
                                    onClick={() => window.open(imgUrl, '_blank')}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                ) : (
                  /* Old Format Content */
                  <>
                    {post.chart_image && (
                      <div className="w-full bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/60 p-4 sm:p-8 flex justify-center">
                        <img 
                          src={post.chart_image} 
                          alt="Chart" 
                          className="max-w-full h-auto rounded-xl shadow-md border border-slate-200 dark:border-slate-800 cursor-zoom-in hover:opacity-95 transition-opacity"
                          onClick={() => window.open(post.chart_image, '_blank')}
                        />
                      </div>
                    )}

                    {post.analysis_text && (
                      <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-indigo-500">📝</span>
                          <h4 className="font-bold text-slate-800 dark:text-white">แผนการเทรด (Analysis)</h4>
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                          {post.analysis_text}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
