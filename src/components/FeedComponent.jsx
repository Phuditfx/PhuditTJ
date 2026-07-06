import React, { useState, useEffect } from 'react';
import { ImagePlus, X, Plus, Send, Clock, UserCircle2, Loader2, ZoomIn, Download } from 'lucide-react';

// ============================
// Image Lightbox Modal
// ============================
function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Full size view"
          className="w-full h-auto max-h-[90vh] object-contain rounded-xl shadow-2xl"
        />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const response = await fetch(src);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Image_${new Date().toISOString().split('T')[0]}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
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
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium">
          คลิกนอกรูปหรือกด ESC เพื่อปิด
        </p>
      </div>
    </div>
  );
}

// ============================
// Main Feed Component
// ============================
export default function FeedComponent({ posts = [], onSavePost, currentUser, profile, onViewProfile, requestAlert, requestConfirm, isVip, isTiPicks, isAlphaPicks }) {
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('General');
  const [blocks, setBlocks] = useState([{ id: Date.now(), text: '', image: null, previewUrl: null, base64: null }]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const handleAddBlock = () => {
    setBlocks([...blocks, { id: Date.now(), text: '', image: null, previewUrl: null, base64: null }]);
  };

  const handleRemoveBlock = (idToRemove) => {
    if (blocks.length === 1) return;
    setBlocks(blocks.filter(b => b.id !== idToRemove));
  };

  const handleBlockTextChange = (id, newText) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, text: newText } : b));
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1600;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleBlockImageChange = async (id, e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const previewUrl = URL.createObjectURL(file);
        const base64 = await compressImage(file);
        setBlocks(blocks.map(b => b.id === id ? { ...b, image: file, previewUrl, base64 } : b));
      } catch (err) {
        if (requestAlert) requestAlert('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง');
        else alert('ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  const handleRemoveImage = (id) => {
    setBlocks(blocks.map(b => {
      if (b.id === id) {
        if (b.previewUrl) URL.revokeObjectURL(b.previewUrl);
        return { ...b, image: null, previewUrl: null, base64: null };
      }
      return b;
    }));
  };

  const handlePublish = async () => {
    if (!postTitle.trim() && blocks.every(b => !b.text.trim() && !b.image)) {
      if (requestAlert) requestAlert('ข้อผิดพลาด', 'Post cannot be empty.');
      else alert('Post cannot be empty.');
      return;
    }
    setIsPublishing(true);
    try {
      const processedBlocks = [];
      for (const b of blocks) {
        let uploadedUrl = null;
        if (b.base64) uploadedUrl = b.base64;
        processedBlocks.push({
          id: 'b' + Date.now() + Math.random(),
          text: b.text,
          imageUrl: uploadedUrl,
        });
      }
      const newPost = {
        id: 'p' + Date.now(),
        author: {
          name: profile?.name || (currentUser ? currentUser.split('@')[0] : 'Trader'),
          avatar: profile?.photo || null,
          email: currentUser || null,
        },
        timestamp: new Date().toLocaleString(),
        title: postTitle,
        category: postCategory,
        blocks: processedBlocks,
      };
      onSavePost(newPost);
      setPostTitle('');
      setBlocks([{ id: Date.now(), text: '', image: null, previewUrl: null, base64: null }]);
    } catch (e) {
      console.error('Error publishing post:', e);
      if (requestAlert) requestAlert('ข้อผิดพลาด', 'Failed to publish post. Please check your connection and try again.');
      else alert('Failed to publish post. Please check your connection and try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans">

      {/* Sticky Header */}
      <div className="sticky top-20 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md pb-4 pt-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Trading Bulletin</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Share your market insights and trade setups.</p>
      </div>

      {/* Composer Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Create Post</h3>

        <div className="flex gap-4 mb-4">
          <select 
            value={postCategory}
            onChange={(e) => setPostCategory(e.target.value)}
            disabled={isPublishing}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
          >
            <option value="General">ทั่วไป (General)</option>
            <option value="TI Picks">TI Picks</option>
            <option value="Alpha Picks">Alpha Picks</option>
          </select>
          <input
            type="text"
            placeholder="Post Title (Optional)"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            disabled={isPublishing}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:font-normal disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <div key={block.id} className="relative bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 transition-all focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50">

              {blocks.length > 1 && !isPublishing && (
                <button
                  onClick={() => handleRemoveBlock(block.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  title="Remove block"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              )}

              {/* ✅ Task 4: Larger textarea with resize-y */}
              <textarea
                placeholder="What's your analysis? (Type here...)"
                value={block.text}
                onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                disabled={isPublishing}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 caret-slate-900 dark:caret-white resize-y min-h-[250px] text-[15px] placeholder-slate-400 dark:placeholder-slate-500 mb-3 disabled:opacity-50"
              />

              {block.previewUrl && (
                <div className="relative mb-3 group">
                  <img
                    src={block.previewUrl}
                    alt="Preview"
                    className="w-full max-h-[400px] object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in"
                    onClick={() => setLightboxSrc(block.previewUrl)}
                  />
                  {!isPublishing && (
                    <button
                      onClick={() => handleRemoveImage(block.id)}
                      className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full hover:bg-rose-600 transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 pt-3 mt-1">
                <label className={`cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-colors px-2 py-1.5 rounded-md ${isPublishing ? 'text-slate-400 opacity-50 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                  <ImagePlus size={16} strokeWidth={2.5} />
                  <span>{block.previewUrl ? 'Change Image' : 'Add Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBlockImageChange(block.id, e)}
                    disabled={isPublishing}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleAddBlock}
            disabled={isPublishing}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Add Section</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            {isPublishing ? (
              <>
                <span>Publishing...</span>
                <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
              </>
            ) : (
              <>
                <span>Publish Post</span>
                <Send size={16} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex flex-col gap-6 mt-4">
        {(() => {
          const visiblePosts = posts.filter(post => {
            if (isVip) return true;
            const cat = post.category || 'General';
            if (cat === 'General') return true;
            if (cat === 'TI Picks' && isTiPicks) return true;
            if (cat === 'Alpha Picks' && isAlphaPicks) return true;
            return false;
          });
          
          if (visiblePosts.length === 0) {
            return (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <p className="font-medium text-lg mb-2">No posts yet</p>
                <p className="text-sm">Be the first to share an insight!</p>
              </div>
            );
          }
          
          return visiblePosts.map(post => (
          <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

            {/* Post Header — ✅ Task 4 & 5: clickable avatar + author name */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              {post.author.avatar ? (
                <button
                  onClick={() => setLightboxSrc(post.author.avatar)}
                  className="flex-shrink-0 hover:ring-2 hover:ring-indigo-400 rounded-full transition-all"
                  title="ดูรูปโปรไฟล์"
                >
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 cursor-zoom-in"
                  />
                </button>
              ) : (
                <button
                  onClick={() => onViewProfile && onViewProfile(post.author.email || post.author.name)}
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  title="ดู Profile"
                >
                  <UserCircle2 className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                </button>
              )}
              <div className="flex flex-col min-w-0">
                {/* ✅ Task 5: Clickable author name → Profile page */}
                <button
                  onClick={() => onViewProfile && onViewProfile(post.author.email || post.author.name)}
                  className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-fit"
                  title="ดู Profile"
                >
                  {post.author.name}
                </button>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                  <div className="flex items-center gap-1">
                    <Clock size={11} strokeWidth={2.5} />
                    <span>{post.timestamp}</span>
                  </div>
                  {post.category && post.category !== 'General' && (
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                      post.category === 'TI Picks' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {post.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-5 pb-5">
              {post.title && (
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{post.title}</h4>
              )}
              <div className="flex flex-col gap-5">
                {post.blocks.map(block => (
                  <div key={block.id} className="flex flex-col gap-3">
                    {block.text && (
                      <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {block.text}
                      </p>
                    )}
                    {/* ✅ Task 4: Clickable image → Lightbox */}
                    {block.imageUrl && (
                      <button
                        onClick={() => setLightboxSrc(block.imageUrl)}
                        className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:opacity-90 transition-opacity cursor-zoom-in block w-full group relative"
                        title="คลิกเพื่อดูรูปขนาดเต็ม"
                      >
                        <img
                          src={block.imageUrl}
                          alt="Post content"
                          className="w-full h-auto max-h-[500px] object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm rounded-full p-2">
                            <ZoomIn size={20} className="text-white" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))
        })()}
      </div>

      {/* ✅ Task 4: Image Lightbox Modal */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
