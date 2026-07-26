import React, { useState, useEffect, useRef } from 'react';
import { getPennyStocks, savePennyStock, deletePennyStock, updatePennyStock } from '../db/journalDB';

export default function OwnerPennyStocksManager({ currentUser, requestConfirm, requestAlert, onUpdate }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [dayOfWeek, setDayOfWeek] = useState('#Mon');
  const [weekOfMonth, setWeekOfMonth] = useState('Week1');
  const [stocks, setStocks] = useState([{
    id: Date.now().toString(),
    ticker: '',
    pattern: '',
    setup: '',
    description: '',
    images: []
  }]);

  const resetForm = () => {
    setEditingId(null);
    setDayOfWeek('#Mon');
    setWeekOfMonth('Week1');
    setStocks([{
      id: Date.now().toString(),
      ticker: '',
      pattern: '',
      setup: '',
      description: '',
      images: []
    }]);
  };

  const handleEditClick = (post) => {
    try {
      if (post.analysis_text && post.analysis_text.startsWith('{')) {
        const parsed = JSON.parse(post.analysis_text);
        if (parsed.is_new_format) {
          setEditingId(post.id);
          setDayOfWeek(parsed.day_of_week || '#Mon');
          setWeekOfMonth(parsed.week_of_month || 'Week1');
          
          // Ensure all stocks have images array just in case
          const loadedStocks = parsed.stocks?.map(s => ({
            ...s,
            images: s.images || []
          })) || [];
          
          if (loadedStocks.length > 0) {
            setStocks(loadedStocks);
          }
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (e) {
      console.error('Error parsing post for edit:', e);
      requestAlert("ข้อผิดพลาด", "ไม่สามารถเปิดโพสต์นี้เพื่อแก้ไขได้");
    }
  };
  
  const fetchPosts = async () => {
    setLoading(true);
    const data = await getPennyStocks();
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // max width for compression
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
          
          // compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const addStock = () => {
    setStocks([...stocks, {
      id: Date.now().toString(),
      ticker: '',
      pattern: '',
      setup: '',
      description: '',
      images: []
    }]);
  };

  const removeStock = (id) => {
    setStocks(stocks.filter(s => s.id !== id));
  };

  const updateStock = (id, field, value) => {
    setStocks(stocks.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleStockImageUpload = async (id, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Check sizes just in case before compression
    const oversized = files.some(file => file.size > 10 * 1024 * 1024);
    if (oversized) {
      requestAlert("ไฟล์ใหญ่เกินไป", "กรุณาอัปโหลดรูปขนาดไม่เกิน 10MB ต่อไฟล์");
      return;
    }

    try {
      const compressedImages = await Promise.all(
        files.map(file => compressImage(file))
      );
      
      setStocks(stocks.map(s => {
        if (s.id === id) {
          return { ...s, images: [...s.images, ...compressedImages] };
        }
        return s;
      }));
    } catch (error) {
      console.error(error);
      requestAlert("ข้อผิดพลาด", "ไม่สามารถประมวลผลรูปภาพได้");
    }
    
    // Clear input
    e.target.value = '';
  };
  
  const removeStockImage = (stockId, imageIndex) => {
    setStocks(stocks.map(s => {
      if (s.id === stockId) {
        const newImages = [...s.images];
        newImages.splice(imageIndex, 1);
        return { ...s, images: newImages };
      }
      return s;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (stocks.length === 0) {
      requestAlert("ข้อมูลไม่ครบ", "กรุณาเพิ่มหุ้นอย่างน้อย 1 ตัว");
      return;
    }

    const hasEmptyTicker = stocks.some(s => !s.ticker.trim());
    if (hasEmptyTicker) {
      requestAlert("ข้อมูลไม่ครบ", "กรุณาระบุชื่อหุ้น (Ticker) ในทุกรายการ");
      return;
    }
    
    const payload = {
      is_new_format: true,
      day_of_week: dayOfWeek,
      week_of_month: weekOfMonth,
      stocks: stocks
    };
    
    const generatedTitle = `Penny Stocks - ${weekOfMonth} (${dayOfWeek})`;
    const generatedAnalysisText = JSON.stringify(payload);
    
    try {
      if (editingId) {
        await updatePennyStock(editingId, currentUser, {
          title: generatedTitle,
          analysis_text: generatedAnalysisText,
        });
        requestAlert("สำเร็จ", "อัปเดตโพสต์ Penny Stocks เรียบร้อยแล้ว");
      } else {
        await savePennyStock({
          title: generatedTitle,
          analysis_text: generatedAnalysisText,
          chart_image: null,
          author_email: currentUser
        });
        requestAlert("สำเร็จ", "เพิ่มโพสต์ Penny Stocks เรียบร้อยแล้ว");
      }
      
      resetForm();
      
      fetchPosts();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
      requestAlert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกโพสต์ได้ (ข้อมูลอาจใหญ่เกินไป)");
    }
  };

  const handleDelete = (id) => {
    requestConfirm("ยืนยันการลบ", "คุณต้องการลบโพสต์นี้ใช่หรือไม่?", async () => {
      try {
        await deletePennyStock(id, currentUser);
        fetchPosts();
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error(error);
        requestAlert("เกิดข้อผิดพลาด", "ไม่สามารถลบโพสต์ได้");
      }
    });
  };
  
  // Helper to parse post data for listing
  const getPostInfo = (post) => {
    try {
      if (post.analysis_text && post.analysis_text.startsWith('{')) {
        const parsed = JSON.parse(post.analysis_text);
        if (parsed.is_new_format) {
          return {
            isNew: true,
            day: parsed.day_of_week,
            week: parsed.week_of_month,
            stockCount: parsed.stocks?.length || 0
          };
        }
      }
    } catch(e) {
      // old format
    }
    return { isNew: false };
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg mt-6 transition-colors duration-300">
      <div>
        <h2 className="text-xl font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2">
          <span>🪙 Penny Stocks Management</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          จัดการโพสต์หุ้นเก็งกำไรสำหรับสมาชิก Penny Stocks Pro
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Form Section */}
        <div className="lg:col-span-7">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex justify-between items-center">
            <span>{editingId ? 'แก้ไขโพสต์ (Edit)' : 'เพิ่มโพสต์ใหม่ (Multiple Stocks)'}</span>
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  วันในสัปดาห์
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="#Mon">#Mon (จันทร์)</option>
                  <option value="#Tue">#Tue (อังคาร)</option>
                  <option value="#Wed">#Wed (พุธ)</option>
                  <option value="#Thurs">#Thurs (พฤหัสฯ)</option>
                  <option value="#Fri">#Fri (ศุกร์)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  สัปดาห์ที่
                </label>
                <select
                  value={weekOfMonth}
                  onChange={(e) => setWeekOfMonth(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="Week1">Week 1</option>
                  <option value="Week2">Week 2</option>
                  <option value="Week3">Week 3</option>
                  <option value="Week4">Week 4</option>
                  <option value="Week5">Week 5</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {stocks.map((stock, index) => (
                <div key={stock.id} className="relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-amber-600 dark:text-amber-500 text-sm">หุ้นที่ {index + 1}</h4>
                    {stocks.length > 1 && (
                      <button type="button" onClick={() => removeStock(stock.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors text-xs">
                        ลบหุ้นนี้
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ticker *</label>
                      <input 
                        type="text" 
                        value={stock.ticker}
                        onChange={(e) => updateStock(stock.id, 'ticker', e.target.value.toUpperCase())}
                        placeholder="เช่น AAPL"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Pattern</label>
                      <select 
                        value={stock.pattern}
                        onChange={(e) => updateStock(stock.id, 'pattern', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        <option value="Before Pump">Before Pump</option>
                        <option value="After Pump">After Pump</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Setup / Strategy</label>
                      <select 
                        value={stock.setup}
                        onChange={(e) => updateStock(stock.id, 'setup', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        <option value="-Bo">-Bo</option>
                        <option value="-Dipbuy">-Dipbuy</option>
                        <option value="-1St Redday">-1St Redday</option>
                        <option value="-1St Greenday">-1St Greenday</option>
                        <option value="-Last Short">-Last Short</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">แผนการเทรด / คำอธิบาย</label>
                    <textarea 
                      value={stock.description}
                      onChange={(e) => updateStock(stock.id, 'description', e.target.value)}
                      placeholder="อธิบายแผนการเทรด จุดเข้า จุดตัดขาดทุน..."
                      rows="2"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">รูปภาพ (เลือกได้หลายรูป)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={(e) => handleStockImageUpload(stock.id, e)}
                      className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900/30 dark:file:text-amber-400 mb-2"
                    />
                    {stock.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {stock.images.map((img, imgIdx) => (
                          <div key={imgIdx} className="relative group w-20 h-20 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img src={img} alt="preview" className="w-full h-full object-cover" />
                            <button 
                              type="button" 
                              onClick={() => removeStockImage(stock.id, imgIdx)}
                              className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs"
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              type="button" 
              onClick={addStock}
              className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:border-amber-500 dark:hover:text-amber-400 dark:hover:border-amber-500 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <span>+ เพิ่มหุ้นอีกตัว</span>
            </button>

            <div className="flex gap-3 mt-4">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20 text-sm">
                {editingId ? 'อัปเดตโพสต์' : 'โพสต์ข้อมูล'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-5">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            โพสต์ที่ผ่านมา
          </h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500 animate-pulse">กำลังโหลด...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 italic">ยังไม่มีโพสต์</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {posts.map(post => {
                const info = getPostInfo(post);
                
                return (
                  <div key={post.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col gap-2 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {post.title}
                      </h4>
                      <div className="flex gap-2 shrink-0">
                        {info.isNew && (
                          <button 
                            onClick={() => handleEditClick(post)}
                            className="text-amber-500 hover:text-white bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-500 dark:hover:bg-amber-600 px-2 py-1 rounded text-xs transition-colors"
                          >
                            แก้ไข
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="text-red-500 hover:text-white bg-red-50 dark:bg-red-900/20 hover:bg-red-500 dark:hover:bg-red-600 px-2 py-1 rounded text-xs transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                    
                    <span className="text-[10px] text-slate-500">
                      {new Date(post.created_at).toLocaleString('th-TH')}
                    </span>
                    
                    {info.isNew ? (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded font-semibold">{info.day}</span>
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 rounded font-semibold">{info.week}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded font-semibold">📈 {info.stockCount} หุ้น</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        {post.chart_image && <span>🖼️ มีรูป</span>}
                        {post.analysis_text && <span>📝 มีคำอธิบาย</span>}
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded font-semibold text-[10px]">รูปแบบเก่า</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
