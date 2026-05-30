import React, { useState } from 'react';
import { ImagePlus, X, Plus, Send, Clock, UserCircle2 } from 'lucide-react';

export default function FeedComponent() {
  const [postTitle, setPostTitle] = useState('');
  const [blocks, setBlocks] = useState([{ id: Date.now(), text: '', image: null, previewUrl: null }]);

  // Mock data for posts
  const [posts, setPosts] = useState([
    {
      id: 'p1',
      author: {
        name: 'Phudit',
        avatar: null
      },
      timestamp: '2 hours ago',
      title: 'Nvidia Earnings Breakout Setup',
      blocks: [
        {
          id: 'b1',
          text: 'NVDA is forming a massive bull flag right at the $120 resistance level. The volume profile suggests heavy accumulation over the past week.',
          imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800'
        },
        {
          id: 'b2',
          text: 'If we get a clean break above $125 with sustained volume, my target is $140. Stop loss tight at $118 just below the EMA20.',
          imageUrl: null
        }
      ]
    },
    {
      id: 'p2',
      author: {
        name: 'Phudit',
        avatar: null
      },
      timestamp: 'Yesterday',
      title: 'Market Review: Why I am shifting to cash',
      blocks: [
        {
          id: 'b1',
          text: 'The SPY is showing divergence on the daily timeframe. Breadth is weakening while the index pushes to marginally new highs. This usually precedes a pullback.',
          imageUrl: null
        }
      ]
    }
  ]);

  const handleAddBlock = () => {
    setBlocks([...blocks, { id: Date.now(), text: '', image: null, previewUrl: null }]);
  };

  const handleRemoveBlock = (idToRemove) => {
    if (blocks.length === 1) return; // Prevent removing the last block
    setBlocks(blocks.filter(b => b.id !== idToRemove));
  };

  const handleBlockTextChange = (id, newText) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, text: newText } : b));
  };

  const handleBlockImageChange = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setBlocks(blocks.map(b => b.id === id ? { ...b, image: file, previewUrl } : b));
    }
  };

  const handleRemoveImage = (id) => {
    setBlocks(blocks.map(b => {
      if (b.id === id) {
        if (b.previewUrl) URL.revokeObjectURL(b.previewUrl);
        return { ...b, image: null, previewUrl: null };
      }
      return b;
    }));
  };

  const handlePublish = () => {
    if (!postTitle.trim() && blocks.every(b => !b.text.trim() && !b.image)) {
      alert("Post cannot be empty.");
      return;
    }

    const newPost = {
      id: 'p' + Date.now(),
      author: {
        name: 'Phudit',
        avatar: null
      },
      timestamp: 'Just now',
      title: postTitle,
      blocks: blocks.map(b => ({
        id: 'b' + Date.now() + Math.random(),
        text: b.text,
        imageUrl: b.previewUrl // Use local object URL for instant rendering
      }))
    };

    setPosts([newPost, ...posts]);
    setPostTitle('');
    setBlocks([{ id: Date.now(), text: '', image: null, previewUrl: null }]);
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
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:font-normal"
        />

        <div className="flex flex-col gap-4">
          {blocks.map((block, index) => (
            <div key={block.id} className="relative bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 transition-all focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50">
              
              {/* Block Header / Remove button */}
              {blocks.length > 1 && (
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
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 resize-none min-h-[100px] text-[15px] placeholder-slate-400 dark:placeholder-slate-500 mb-3"
              />

              {/* Image Preview */}
              {block.previewUrl && (
                <div className="relative mb-3 group">
                  <img src={block.previewUrl} alt="Preview" className="w-full max-h-[400px] object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                  <button 
                    onClick={() => handleRemoveImage(block.id)}
                    className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full hover:bg-rose-600 transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 pt-3 mt-1">
                <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                  <ImagePlus size={16} strokeWidth={2.5} />
                  <span>{block.previewUrl ? 'Change Image' : 'Add Image'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleBlockImageChange(block.id, e)}
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
            className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Add Section</span>
          </button>

          <button 
            onClick={handlePublish}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <span>Publish Post</span>
            <Send size={16} strokeWidth={2.5} />
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
