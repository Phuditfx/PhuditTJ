import React, { useState, useEffect, useRef } from 'react';
import { getPennyStocks, savePennyStock, deletePennyStock } from '../db/journalDB';

export default function OwnerPennyStocksManager({ currentUser, requestConfirm, requestAlert, onUpdate }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [chartImage, setChartImage] = useState('');
  
  const fileInputRef = useRef(null);

  const fetchPosts = async () => {
    setLoading(true);
    const data = await getPennyStocks();
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        requestAlert("ไฟล์ใหญ่เกินไป", "กรุณาอัปโหลดรูปขนาดไม่เกิน 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setChartImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setChartImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      requestAlert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อหุ้น/หัวข้อ");
      return;
    }
    
    try {
      await savePennyStock({
        title,
        analysis_text: analysisText,
        chart_image: chartImage,
        author_email: currentUser
      });
      requestAlert("สำเร็จ", "เพิ่มโพสต์ Penny Stocks เรียบร้อยแล้ว");
      setTitle('');
      setAnalysisText('');
      handleClearImage();
      fetchPosts();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
      requestAlert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกโพสต์ได้");
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        {/* Form Section */}
        <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            เพิ่มโพสต์ใหม่
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                หัวข้อ / ชื่อหุ้น <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น AAPL - Breakout แนวต้านสำคัญ"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                รูปภาพกราฟ (ถ้ามี)
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900/30 dark:file:text-amber-400"
                />
                {chartImage && (
                  <button type="button" onClick={handleClearImage} className="text-xs text-red-500 hover:underline shrink-0">
                    นำออก
                  </button>
                )}
              </div>
              {chartImage && (
                <div className="mt-2 relative w-32 h-32 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <img src={chartImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                แผนการเทรด / คำอธิบาย
              </label>
              <textarea 
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                placeholder="พิมพ์บทวิเคราะห์ จุดเข้า จุดตัดขาดทุน..."
                rows="6"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              ></textarea>
            </div>

            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/20 text-sm">
              โพสต์ข้อความ
            </button>
          </form>
        </div>

        {/* List Section */}
        <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            โพสต์ที่ผ่านมา
          </h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500 animate-pulse">กำลังโหลด...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 italic">ยังไม่มีโพสต์</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {posts.map(post => (
                <div key={post.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{post.title}</h4>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs shrink-0"
                    >
                      ลบ
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(post.created_at).toLocaleString('th-TH')}
                  </span>
                  {(post.analysis_text || post.chart_image) && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      {post.chart_image && <span>🖼️ มีรูป</span>}
                      {post.analysis_text && <span>📝 มีคำอธิบาย</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
