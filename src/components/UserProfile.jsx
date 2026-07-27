import React, { useState } from 'react';
import { UserCircle2, Clock, ArrowLeft, Crown, BarChart2, FileText, MessageSquare, Download } from 'lucide-react';

function ImageLightbox({ src, onClose }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt="Full size"
          className="w-full h-auto max-h-[90vh] object-contain rounded-xl shadow-2xl"
        />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const response = await fetch(src);
                const blob = await response.blob();
                const filename = `Image_${new Date().toISOString().split('T')[0]}.png`;
                
                if (navigator.share) {
                  const file = new File([blob], filename, { type: blob.type || 'image/png' });
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                      await navigator.share({
                        files: [file],
                        title: filename,
                      });
                      return;
                    } catch (shareErr) {
                      console.log('Share cancelled or failed', shareErr);
                    }
                  }
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100);
              } catch (err) {
                console.error('Failed to download image', err);
                const a = document.createElement('a');
                a.href = src;
                a.download = `Image_${new Date().toISOString().split('T')[0]}.png`;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
            className="bg-black/60 hover:bg-black/80 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors shadow-lg"
            title="Download Image"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClose}
            className="bg-black/60 hover:bg-black/80 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors text-lg font-bold shadow-lg"
            title="ปิด (ESC)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserProfile({ userEmail, allPosts = [], onBack, currentUser, isVip }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // กรองเฉพาะ posts ของ user นี้
  const userPosts = allPosts.filter(p =>
    p.author?.email === userEmail || p.author?.name === userEmail?.split('@')[0]
  );

  // สร้าง profile จาก post แรกที่มี
  const firstPost = userPosts[0];
  const authorName = firstPost?.author?.name || userEmail?.split('@')[0] || 'Unknown Trader';
  const authorAvatar = firstPost?.author?.avatar || null;

  // Stats
  const totalPosts = userPosts.length;
  const totalImages = userPosts.reduce((sum, p) =>
    sum + (p.blocks?.filter(b => b.imageUrl).length || 0), 0);

  const isOwn = userEmail === currentUser;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans animate-fade-in">

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-sm w-fit transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        กลับ Trading Bulletin
      </button>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(255,255,255,0.1),transparent_60%)]" />
        </div>

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4 w-fit">
            {authorAvatar ? (
              <button
                onClick={() => setLightboxSrc(authorAvatar)}
                className="block rounded-full ring-4 ring-white dark:ring-slate-900 overflow-hidden hover:ring-indigo-400 transition-all shadow-lg"
                title="ดูรูปโปรไฟล์"
              >
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-20 h-20 object-cover rounded-full"
                />
              </button>
            ) : (
              <div className="w-20 h-20 rounded-full ring-4 ring-white dark:ring-slate-900 bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shadow-lg">
                <UserCircle2 size={48} className="text-indigo-400" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Name & badges */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{authorName}</h1>
            {isVip && (
              <span className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                <Crown size={10} />
                VIP
              </span>
            )}
            {isOwn && (
              <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                คุณ
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-mono">{userEmail}</p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">{totalPosts}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Posts</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <BarChart2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">—</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Win Rate</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FileText size={14} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">—</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Trades</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-50 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                <span className="text-sky-600 dark:text-sky-400 text-xs font-bold">📷</span>
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">{totalImages}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Images</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
          Posts ({totalPosts})
        </h2>

        {userPosts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center shadow-sm">
            <div className="text-4xl mb-3 opacity-30">📝</div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">ยังไม่มีโพสต์</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {userPosts.map(post => (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  {authorAvatar ? (
                    <button onClick={() => setLightboxSrc(authorAvatar)} className="flex-shrink-0">
                      <img src={authorAvatar} alt={authorName} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-indigo-400 transition-all" />
                    </button>
                  ) : (
                    <UserCircle2 className="w-8 h-8 text-slate-400 flex-shrink-0" strokeWidth={1.5} />
                  )}
                  <div>
                    <span className="font-bold text-[13px] text-slate-900 dark:text-white">{authorName}</span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                      <Clock size={10} strokeWidth={2.5} />
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {post.title && (
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 tracking-tight">{post.title}</h3>
                  )}
                  <div className="flex flex-col gap-4">
                    {post.blocks?.map(block => (
                      <div key={block.id} className="flex flex-col gap-2">
                        {block.text && (
                          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{block.text}</p>
                        )}
                        {block.imageUrl && (
                          <button
                            onClick={() => setLightboxSrc(block.imageUrl)}
                            className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:opacity-90 transition-opacity cursor-zoom-in block w-full"
                          >
                            <img
                              src={block.imageUrl}
                              alt="Post"
                              className="w-full h-auto max-h-[400px] object-cover"
                              loading="lazy"
                            />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
