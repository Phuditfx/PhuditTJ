import React, { useState } from 'react';
import { ImagePlus, X, Plus, Send, Clock, UserCircle2, Loader2 } from 'lucide-react';
import { storage } from '../firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function FeedComponent({ posts = [], onSavePost, currentUser }) {
  const [postTitle, setPostTitle] = useState('');
  const [blocks, setBlocks] = useState([{ id: Date.now(), text: '', image: null, previewUrl: null, base64: null }]);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleAddBlock = () => {
    setBlocks([...blocks, { id: Date.now(), text: '', image: null, previewUrl: null, base64: null }]);
  };

  const handleRemoveBlock = (idToRemove) => {
    if (blocks.length === 1) return; // Prevent removing the last block
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
          const MAX_WIDTH = 600; // ลดขนาดลงเพื่อประหยัดพื้นที่ให้มากที่สุด
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

          // Compress to JPEG with 0.4 quality to keep it very small (often < 50KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
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
        alert("ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง");
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
      alert("Post cannot be empty.");
      return;
    }

    setIsPublishing(true);

    try {
        const processedBlocks = [];
        
        for (const b of blocks) {
            let uploadedUrl = null;
            
            if (b.base64 && currentUser) {
                try {
                  const cleanEmail = currentUser.trim().toLowerCase();
                  const imagePath = `users/${cleanEmail}/feed_images/${Date.now()}_${b.id}.jpg`;
                  const storageRef = ref(storage, imagePath);
                  
                  // สร้าง Timeout Promise เพื่อป้องกันการโหลดค้าง (Spinning endlessly)
                  const uploadTask = async () => {
                    await uploadString(storageRef, b.base64, 'data_url');
                    return await getDownloadURL(storageRef);
                  };
                  
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Upload timeout')), 10000) // 10 วินาที Timeout
                  );
                  
                  uploadedUrl = await Promise.race([uploadTask(), timeoutPromise]);
                } catch (uploadError) {
                  console.warn("Firebase Storage upload failed or timed out, falling back to base64 saving:", uploadError);
                  // ถ้า Upload รูปขึ้น Storage ไม่สำเร็จ ให้ใช้ Base64 (ที่ถูกบีบอัดแล้ว) เซฟลง Firestore แทน
                  uploadedUrl = b.base64; 
                }
            } else if (b.base64) {
                // กรณีไม่มี currentUser หรือ error อื่นๆ
                uploadedUrl = b.base64;
            }
            
            processedBlocks.push({
                id: 'b' + Date.now() + Math.random(),
                text: b.text,
                imageUrl: uploadedUrl // อาจจะเป็น Firebase Storage URL หรือ Base64 string ขนาดเล็ก
            });
        }

        const newPost = {
            id: 'p' + Date.now(),
            author: {
                name: currentUser ? currentUser.split('@')[0] : 'Trader',
                avatar: null
            },
            timestamp: new Date().toLocaleString(),
            title: postTitle,
            blocks: processedBlocks
        };

        onSavePost(newPost);
        setPostTitle('');
        setBlocks([{ id: Date.now(), text: '', image: null, previewUrl: null, base64: null }]);
    } catch (e) {
        console.error("Error publishing post:", e);
        alert("Failed to publish post. Please check your connection and try again.");
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
        
        <input 
          type="text" 
          placeholder="Post Title (Optional)" 
          value={postTitle}
          onChange={(e) => setPostTitle(e.target.value)}
          disabled={isPublishing}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:font-normal disabled:opacity-50"
        />

        <div className="flex flex-col gap-4">
          {blocks.map((block, index) => (
            <div key={block.id} className="relative bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 transition-all focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50">
              
              {/* Block Header / Remove button */}
              {blocks.length > 1 && !isPublishing && (
                <button 
                  onClick={() => handleRemoveBlock(block.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  title="Remove block"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              )}

              <textarea 
                placeholder="What's your analysis? (Type here...)" 
                value={block.text}
                onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                disabled={isPublishing}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 resize-none min-h-[100px] text-[15px] placeholder-slate-400 dark:placeholder-slate-500 mb-3 disabled:opacity-50"
              />

              {/* Image Preview */}
              {block.previewUrl && (
                <div className="relative mb-3 group">
                  <img src={block.previewUrl} alt="Preview" className="w-full max-h-[400px] object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
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

              {/* Toolbar */}
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

        {/* Composer Footer Actions */}
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
        {posts.map(post => (
          <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            
            {/* Post Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              {post.author.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <UserCircle2 className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">{post.author.name}</span>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-0.5">
                  <Clock size={11} strokeWidth={2.5} />
                  <span>{post.timestamp}</span>
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
                    {block.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <img 
                          src={block.imageUrl} 
                          alt="Post content" 
                          className="w-full h-auto max-h-[500px] object-cover" 
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p className="font-medium text-lg mb-2">No posts yet</p>
            <p className="text-sm">Be the first to share an insight!</p>
          </div>
        )}
      </div>

    </div>
  );
}
