import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStoredTrades, 
  saveTrades, 
  getStoredInitialBalance, 
  saveInitialBalance, 
  getStoredTargetRR, 
  saveTargetRR, 
  RANK_SYSTEM,
  getStoredProfile,
  saveProfile
} from './db/journalDB';
import Dashboard from './components/Dashboard';
import QuickOrderWidget from './components/QuickOrderWidget';
import FighterComponent from './components/FighterComponent';
import TradeJournalTable from './components/TradeJournalTable';
import Login from './components/Login';
import OwnerDashboard from './components/OwnerDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('phudit_tj_currentUser') || null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('phudit_tj_currentUser', currentUser);
    } else {
      localStorage.removeItem('phudit_tj_currentUser');
    }
  }, [currentUser]);

  // โหลดค่าต่างๆ จากฐานข้อมูลจำลอง (LocalStorage) โดยอิงจาก currentUser
  const [trades, setTrades] = useState([]);
  const [initialBalance, setInitialBalanceState] = useState(10000);
  const [targetRR, setTargetRRState] = useState(20);
  const [profile, setProfile] = useState({ name: '', photo: '', fontSize: 'normal' });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      setTrades(getStoredTrades(currentUser));
      setInitialBalanceState(getStoredInitialBalance(currentUser));
      setTargetRRState(getStoredTargetRR(currentUser));
      setProfile(getStoredProfile(currentUser));
    }
  }, [currentUser]);

  // ซิงค์ขนาดตัวอักษรของระบบ
  useEffect(() => {
    if (currentUser && profile && profile.fontSize) {
      const sizes = {
        small: '14px',
        normal: '16px',
        large: '18px',
        xlarge: '20px'
      };
      const rootSize = sizes[profile.fontSize] || '16px';
      document.documentElement.style.fontSize = rootSize;
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  }, [currentUser, profile]);

  // ค่าการตั้งค่าโปรไฟล์ชั่วคราว
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfilePhoto, setTempProfilePhoto] = useState('');
  const [tempFontSize, setTempFontSize] = useState('normal');

  useEffect(() => {
    if (showSettingsModal) {
      setTempProfileName(profile.name || currentUser.split('@')[0]);
      setTempProfilePhoto(profile.photo || '');
      setTempFontSize(profile.fontSize || 'normal');
    }
  }, [showSettingsModal, profile]);

  const handleTempFontSizeChange = (size) => {
    setTempFontSize(size);
    const sizes = {
      small: '14px',
      normal: '16px',
      large: '18px',
      xlarge: '20px'
    };
    document.documentElement.style.fontSize = sizes[size] || '16px';
  };

  const handleCancelSettings = () => {
    const sizes = {
      small: '14px',
      normal: '16px',
      large: '18px',
      xlarge: '20px'
    };
    document.documentElement.style.fontSize = sizes[profile.fontSize] || '16px';
    setShowSettingsModal(false);
  };

  const handleSaveSettings = () => {
    const updated = {
      name: tempProfileName.trim() || currentUser.split('@')[0],
      photo: tempProfilePhoto,
      fontSize: tempFontSize
    };
    setProfile(updated);
    saveProfile(currentUser, updated);
    setShowSettingsModal(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("⚠️ ขนาดรูปภาพเกิน 1MB! กรุณาเลือกรูปขนาดเล็กเพื่อความเร็วในการโหลดข้อมูล");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const fontSizesList = [
    { value: 'small', label: '🔎 เล็ก (Small)', desc: 'ขนาดกะทัดรัด (14px)' },
    { value: 'normal', label: '📱 ปกติ (Normal)', desc: 'ขนาดมาตรฐาน (16px)' },
    { value: 'large', label: '🖥️ ใหญ่ (Large)', desc: 'ขนาดใหญ่อ่านง่าย (18px)' },
    { value: 'xlarge', label: '📢 ใหญ่มาก (X-Large)', desc: 'ขนาดขยายพิเศษ (20px)' },
  ];

  // จัดเก็บค่าแถบเมนูหลักที่แสดงอยู่
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | journal | fighter | owner

  // Shared State ระหว่าง Fighter Engine และ Quick Order Widget
  const [sharedOrder, setSharedOrder] = useState({
    symbol: 'AAPL',
    entry: 150,
    stopLoss: 145,
    tp1: 165,
    tp2: 180,
    tp3: 195
  });

  // บันทึกและซิงค์เงินตั้งต้นลง LocalStorage
  const setInitialBalance = (value) => {
    setInitialBalanceState(value);
    saveInitialBalance(currentUser, value);
  };

  // บันทึกและซิงค์เป้าหมาย RR ลง LocalStorage
  const setTargetRR = (value) => {
    setTargetRRState(value);
    saveTargetRR(currentUser, value);
  };

  // 📈 คำนวณยอดเงินในพอร์ตปัจจุบันแบบเรียลไทม์ (Initial Balance + ผลรวมกำไรขาดทุนของออเดอร์ที่ปิดแล้ว)
  const accountBalance = useMemo(() => {
    const netPnL = trades.reduce((acc, t) => acc + (t.status === 'Closed' ? (parseFloat(t.pnl) || 0) : 0), 0);
    return Math.max(0, initialBalance + netPnL);
  }, [trades, initialBalance]);

  // 🏆 คำนวณยศปัจจุบันอัตโนมัติจากยอดคงเหลือในพอร์ต
  const currentRank = useMemo(() => {
    return RANK_SYSTEM.slice().reverse().find(r => accountBalance >= r.minPort) || RANK_SYSTEM[0];
  }, [accountBalance]);

  // บันทึกออเดอร์ใหม่ (เปิดออเดอร์จาก Sidebar)
  const handleSaveTrade = (newTradeData) => {
    const newTrade = {
      ...newTradeData,
      id: 't-' + Date.now(),
      dateTime: new Date().toISOString(), // วันเวลา ณ ปัจจุบัน
      pnl: 0,
      actualRR: 0,
      aiScore: null,
      aiFeedback: ''
    };
    
    const updatedTrades = [newTrade, ...trades];
    setTrades(updatedTrades);
    saveTrades(currentUser, updatedTrades);
    
    // เปลี่ยนแถบมาที่บันทึกประวัติการเทรดอัตโนมัติ เพื่อให้ผู้ใช้เห็นออเดอร์ที่บันทึก
    setActiveTab('journal');
  };

  // อัปเดตข้อมูลการเทรด (เช่น เมื่อปิดดีลเทรด)
  const handleUpdateTrade = (updatedTrade) => {
    const updatedTrades = trades.map(t => t.id === updatedTrade.id ? updatedTrade : t);
    setTrades(updatedTrades);
    saveTrades(currentUser, updatedTrades);
  };

  // ลบข้อมูลการเทรด
  const handleDeleteTrade = (id) => {
    const updatedTrades = trades.filter(t => t.id !== id);
    setTrades(updatedTrades);
    saveTrades(currentUser, updatedTrades);
  };

  // ล้างประวัติการเทรดทั้งหมด
  const handleClearAllTrades = () => {
    setTrades([]);
    saveTrades(currentUser, []);
  };

  // ลบข้อมูลการเทรดรายเดือน
  const handleDeleteTradesByMonth = (month) => {
    const updatedTrades = trades.filter(t => {
      if (!t.dateTime) return true;
      const d = new Date(t.dateTime);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return mStr !== month;
    });
    setTrades(updatedTrades);
    saveTrades(currentUser, updatedTrades);
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('phudit_tj_theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('phudit_tj_theme', theme);
  }, [theme]);

  const handleLogout = () => {
    setCurrentUser(null);
    setTrades([]);
    setActiveTab('dashboard');
  };

  const [showManual, setShowManual] = useState(false);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* 🧭 Top Glassmorphism Navigation Bar */}
      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-black text-xl shadow-md shadow-indigo-950/40 select-none animate-pulse">
            💎
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white m-0 leading-none">
              PHUDIT <span className="text-indigo-600 dark:text-indigo-400">TRADE JOURNAL</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">Gamified Trader Station & AI Coach</p>
          </div>
        </div>

        {/* ยศของพอร์ตรวมปัจจุบัน & สลับธีม */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-4 py-1.5 rounded-xl shadow-inner">
            
            {/* กล่องแสดงโปรไฟล์ผู้ใช้และข้อมูล */}
            <div 
              className="flex items-center gap-2 cursor-pointer group hover:opacity-90 active:scale-95 transition-all" 
              onClick={() => setShowSettingsModal(true)}
              title="คลิกเพื่อตั้งค่าโปรไฟล์และขนาดตัวอักษร"
            >
              {profile.photo ? (
                <img 
                  src={profile.photo} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-900/50 flex items-center justify-center shadow-sm text-[13px]">
                  👤
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-extrabold uppercase leading-tight group-hover:underline">
                  {profile.name || currentUser.split('@')[0]}
                </span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono leading-none">
                  {currentUser}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>

            <div className="flex flex-col text-right">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 font-bold uppercase tracking-widest cursor-pointer text-right flex items-center gap-0.5"
              >
                ⚙️ Settings
              </button>
              <button 
                onClick={handleLogout}
                className="text-[9px] text-rose-500 dark:text-rose-450 hover:text-rose-600 dark:hover:text-rose-350 font-bold uppercase tracking-widest mt-0.5 text-right cursor-pointer"
              >
                Logout
              </button>
            </div>

            <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>

            <div className="text-right">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Rank Level</span>
              <span className="text-sm font-extrabold text-amber-605 dark:text-amber-400 block font-sans">{currentRank.name}</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>
            <div className="text-left font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-amber-500 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center w-9 h-9 border-solid"
            title={theme === 'dark' ? 'เปิดโหมดสว่าง (Soft Slate)' : 'เปิดโหมดมืด (Dark Mode)'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* 💻 Main Layout container */}
      <main className="max-w-[1400px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start">
        
        {/* 📋 Left & Central Side (Dashboard & Sub-pages) - 9 Columns */}
        <div className="lg:col-span-9 flex flex-col gap-6 w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            {/* แถบ Tab เลือกสลับการแสดงผลหลัก */}
            <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800/80 gap-2 p-1 bg-white dark:bg-slate-900/60 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-800/40 w-full sm:w-max">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                }`}
              >
                📊 DASHBOARD & LEVEL RANKS
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                  activeTab === 'journal'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                }`}
              >
                📓 TRADE JOURNAL ({trades.length})
              </button>
              <button
                onClick={() => setActiveTab('fighter')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                  activeTab === 'fighter'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                }`}
              >
                ⚡ FIGHTER SANDBOX
              </button>
              {currentUser === 'phudit.mahawongsanan@gmail.com' && (
                <button
                  onClick={() => setActiveTab('owner')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                    activeTab === 'owner'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950/20'
                      : 'text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                  }`}
                >
                  👑 OWNER DASHBOARD
                </button>
              )}
            </div>
            
            <button 
              onClick={() => setShowManual(true)}
              className="bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              📖 คู่มือการใช้งาน
            </button>
          </div>

          {/* เรนเดอร์แท็บเนื้อหาที่เลือก */}
          <div className="w-full">
            {activeTab === 'dashboard' && (
              <Dashboard 
                accountBalance={accountBalance}
                initialBalance={initialBalance}
                setInitialBalance={setInitialBalance}
                targetRR={targetRR}
                setTargetRR={setTargetRR}
                trades={trades}
                currentRank={currentRank}
              />
            )}
            
            {activeTab === 'journal' && (
              <TradeJournalTable 
                trades={trades}
                onUpdateTrade={handleUpdateTrade}
                onDeleteTrade={handleDeleteTrade}
                onClearAllTrades={handleClearAllTrades}
                onDeleteTradesByMonth={handleDeleteTradesByMonth}
              />
            )}

            {activeTab === 'fighter' && (
              <FighterComponent 
                accountBalance={accountBalance}
                sharedOrder={sharedOrder}
                setSharedOrder={setSharedOrder}
              />
            )}

            {activeTab === 'owner' && currentUser === 'phudit.mahawongsanan@gmail.com' && (
              <OwnerDashboard currentUser={currentUser} />
            )}
          </div>

        </div>

        {/* ⚡ Right Side Snap Widget Sidebar - 3 Columns */}
        <aside className="lg:col-span-3 w-full flex flex-col gap-6 lg:sticky lg:top-24">
          <QuickOrderWidget 
            currentRank={currentRank}
            accountBalance={accountBalance}
            onSaveTrade={handleSaveTrade}
            sharedOrder={sharedOrder}
            setSharedOrder={setSharedOrder}
          />
          
          {/* ข้อมูลคำเตือนเล็กๆ ท้ายบอร์ด */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-4 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium shadow-sm">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">💡 Professional Tip</span>
            การใช้เศษหุ้นแบบละเอียด (Fractional Shares) ช่วยรักษา R-Multiple ให้ตรงตามความคุ้มค่าสูงสุด กรุณารักษาความเสี่ยงให้สอดคล้องกับยศปัจจุบันเพื่อป้องกันความเสียหายรุนแรง
          </div>
        </aside>

      </main>

      {/* User Manual Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3">
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📖 คู่มือการใช้งาน Phudit TJ</h3>
              <button 
                onClick={() => setShowManual(false)} 
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 font-black cursor-pointer text-xl"
              >✕</button>
            </div>
            <div className="text-sm text-slate-750 dark:text-slate-300 space-y-4">
              <p><strong>1. ระบบ Login:</strong> นี่คือระบบ Local Auth ข้อมูลทั้งหมดจะถูกผูกกับอีเมลของคุณ และเก็บไว้ใน Browser ของคุณเอง.</p>
              <p><strong>2. การตั้งค่า Initial Balance:</strong> ไปที่แท็บ DASHBOARD และกรอกเงินต้นของคุณ จากนั้นระบบจะคำนวณยศ Level Rank ให้ทันที.</p>
              <p><strong>3. การเปิดออเดอร์:</strong> กรอกข้อมูลหุ้นทางขวามือ (Quick Order Widget) ข้อมูลนี้จะ Sync ไปที่ <strong>Fighter Sandbox</strong> เพื่อคำนวณ Buying Power. หากวงเงินเกินยศที่กำหนด จะมีการแจ้งเตือน.</p>
              <p><strong>4. Fighter Sandbox:</strong> เมื่อกรอกราคา Entry และ Stop Loss ระบบจะคำนวณค่า TP (Take Profit) อัตโนมัติตาม RR แบบ 1:1, 1:2 และ 1:3.</p>
              <p><strong>5. การปิดออเดอร์และการใช้งาน AI:</strong> ไปที่หน้า TRADE JOURNAL กด Close เพื่อปิดออเดอร์. คุณสามารถกรอก Actual Exit Price, คะแนนตลาด, และเลือกระดับวินัยการเล่น ระบบมี <strong>AI Assess</strong> จำลองการวิเคราะห์ให้คำแนะนำ.</p>
              <p><strong>6. Export Excel:</strong> ในหน้า TRADE JOURNAL คุณสามารถกรองข้อมูลรายเดือน และส่งออกเป็น Excel ได้.</p>
              <p><strong>👑 Owner Dashboard:</strong> เฉพาะ <code>phudit.mahawongsanan@gmail.com</code> เท่านั้นที่สามารถเข้าถึงแท็บนี้ เพื่อดูสถิติรวมของผู้ใช้งานทั้งหมดในระบบได้.</p>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-850 mt-2">
              <button onClick={() => setShowManual(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm cursor-pointer">เข้าใจแล้ว</button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ Profile Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3">
              <div>
                <h3 className="text-lg font-black text-indigo-650 dark:text-indigo-400">⚙️ Personal Station Settings</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Customize your Profile & App Settings</p>
              </div>
              <button 
                onClick={handleCancelSettings} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 font-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Profile Avatar Upload & Preview */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group">
                {tempProfilePhoto ? (
                  <img 
                    src={tempProfilePhoto} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center border-4 border-slate-200 dark:border-slate-800 shadow-inner text-4xl">
                    👤
                  </div>
                )}
                <label className="absolute inset-0 bg-slate-950/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity">
                  Upload Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              
              <div className="flex gap-2">
                <label className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm">
                  Upload Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
                {tempProfilePhoto && (
                  <button 
                    onClick={() => setTempProfilePhoto('')}
                    className="bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-250 dark:border-rose-900/50 text-rose-650 dark:text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Recommended size under 1MB</p>
            </div>

            {/* Profile Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Display Name</label>
              <input 
                type="text" 
                value={tempProfileName} 
                onChange={(e) => setTempProfileName(e.target.value)}
                placeholder="กรอกชื่อของคุณ..." 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 font-sans text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>

            {/* Typography Font Size Scaling */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Text Size (ขนาดตัวอักษรของระบบ)</label>
              <div className="grid grid-cols-2 gap-2">
                {fontSizesList.map((sz) => (
                  <button
                    key={sz.value}
                    onClick={() => handleTempFontSizeChange(sz.value)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      tempFontSize === sz.value
                        ? 'bg-indigo-650 text-white border-indigo-655 shadow-md shadow-indigo-950/20'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">{sz.label}</span>
                    <span className={`text-[9px] mt-0.5 ${tempFontSize === sz.value ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>{sz.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 pt-4 mt-2">
              <button 
                onClick={handleCancelSettings}
                className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-250 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Save Settings ⚙️
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
