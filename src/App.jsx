import React, { useState, useEffect, useMemo } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  getStoredTrades, 
  saveTrades, 
  getStoredInitialBalance, 
  saveInitialBalance, 
  getStoredTargetRR, 
  saveTargetRR, 
  RANK_SYSTEM,
  getStoredProfile,
  saveProfile,
  logoutUser,
  getUserStatus,
  getStoredPlans,
  savePlans,
  getStoredDividends,
  saveDividends,
  getStoredFundingHistory,
  saveFundingHistory,
  getUserVipStatus
} from './db/journalDB';
import { useLanguage } from './contexts/LanguageContext';
import Dashboard from './components/Dashboard';
import QuickOrderWidget from './components/QuickOrderWidget';
import FighterComponent from './components/FighterComponent';
import TradeJournalTable from './components/TradeJournalTable';
import Login from './components/Login';
import OwnerDashboard from './components/OwnerDashboard';
import CalendarView from './components/CalendarView';
import TradingPlans from './components/TradingPlans';
import DividendTracker from './components/DividendTracker';

export default function App() {
  const { t, language, toggleLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user.email);
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (email, rememberMe) => {
    // Rely completely on onAuthStateChanged to prevent race conditions
  };

  // โหลดค่าต่างๆ จากฐานข้อมูลจำลอง (LocalStorage) โดยอิงจาก currentUser
  const [trades, setTrades] = useState([]);
  const [initialBalance, setInitialBalanceState] = useState(10000);
  const [targetRR, setTargetRRState] = useState(20);
  const [profile, setProfile] = useState({ name: '', photo: '', fontSize: 'normal' });
  const [plans, setPlans] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [fundingHistory, setFundingHistory] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isVip, setIsVip] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const loadData = async () => {
      if (currentUser) {
        setDataLoading(true);

        // Safety timeout in case Firebase hangs
        timeoutId = setTimeout(() => {
          if (isMounted) setDataLoading(false);
        }, 8000);

        try {
          const status = await getUserStatus(currentUser);
          if (status === 'pending') {
            alert("⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณาติดต่อคุณ Phudit เพื่ออนุมัติการใช้งาน");
            await logoutUser();
            return;
          }

          const [t, b, rr, p, pl, div, funding, vip] = await Promise.all([
            getStoredTrades(currentUser),
            getStoredInitialBalance(currentUser),
            getStoredTargetRR(currentUser),
            getStoredProfile(currentUser),
            getStoredPlans(currentUser),
            getStoredDividends(currentUser),
            getStoredFundingHistory(currentUser),
            getUserVipStatus(currentUser)
          ]);
          
          if (isMounted) {
            setTrades(t);
            setInitialBalanceState(b);
            setTargetRRState(rr);
            setProfile(p);
            setPlans(pl);
            setDividends(div);
            setFundingHistory(funding);
            setIsVip(vip);
          }
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          clearTimeout(timeoutId);
          if (isMounted) {
            setDataLoading(false);
          }
        }
      } else {
        setTrades([]);
        setPlans([]);
        setDividends([]);
        setFundingHistory([]);
        setIsVip(false);
        if (isMounted) {
          setDataLoading(false);
        }
      }
    };
    loadData();
    return () => { 
      isMounted = false; 
      if (timeoutId) clearTimeout(timeoutId);
    };
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
    symbol: '',
    tiEntryAlert: '', // จุด Breakout ของ Day
    entry: '',
    stopLoss: '',
    tp1: '',
    tp2: '',
    tp3: ''
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
    setTrades(prevTrades => {
      const updatedTradesList = prevTrades.map(t => t.id === updatedTrade.id ? updatedTrade : t);
      saveTrades(currentUser, updatedTradesList);
      return updatedTradesList;
    });
  };

  // เพิ่มออเดอร์โดยตรง (เช่น จากการแบ่งปิดออเดอร์)
  const handleAddTradeDirect = (newTrade) => {
    setTrades(prevTrades => {
      const updatedTradesList = [newTrade, ...prevTrades];
      saveTrades(currentUser, updatedTradesList);
      return updatedTradesList;
    });
  };

  // จัดการ Plans
  const handleSavePlan = (newPlanData) => {
    const updatedPlans = [...plans, newPlanData];
    setPlans(updatedPlans);
    savePlans(currentUser, updatedPlans);
  };
  const handleDeletePlan = (id) => {
    const updatedPlans = plans.filter(p => p.id !== id);
    setPlans(updatedPlans);
    savePlans(currentUser, updatedPlans);
  };

  // จัดการ Dividends
  const handleSaveDividend = (newDivData) => {
    const updatedDivs = [...dividends, newDivData];
    setDividends(updatedDivs);
    saveDividends(currentUser, updatedDivs);
  };
  const handleDeleteDividend = (id) => {
    const updatedDivs = dividends.filter(d => d.id !== id);
    setDividends(updatedDivs);
    saveDividends(currentUser, updatedDivs);
  };

  // ระบบ Global Confirm Modal
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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

  const handleLogout = async () => {
    await logoutUser();
    setActiveTab('dashboard');
  };

  const [showManual, setShowManual] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
        <div className="text-indigo-600 dark:text-indigo-400 text-5xl mb-4 animate-spin">⏳</div>
        <div className="text-slate-500 font-bold tracking-widest animate-pulse">CONNECTING...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
        <div className="text-indigo-600 dark:text-indigo-400 text-5xl mb-4 animate-spin">⌛</div>
        <div className="text-slate-500 font-bold tracking-widest animate-pulse">LOADING TRADER STATION...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* 🧭 Top Glassmorphism Navigation Bar */}
      <header className="glass-panel sticky top-0 z-40 px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        {/* Logo and Theme toggle row for mobile */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="PDTJ Logo" 
              className="w-10 h-10 object-contain drop-shadow-md rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback in case logo.png is not found */}
            <div className="bg-brand-primary p-2 rounded-lg text-white font-black text-xl shadow-md shadow-brand-primary/40 select-none animate-pulse hidden">
              💎
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-brand-text-primary dark:text-white m-0 leading-none">
                PDTJ
              </h1>
              <p className="text-[10px] text-brand-text-secondary mt-1 uppercase tracking-widest font-bold hidden sm:block">Phudit Trade Journal</p>
            </div>
          </div>
          
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setShowManual(true)}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center w-9 h-9 border-solid"
              title="Manual"
            >
              📖
            </button>
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-indigo-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center w-9 h-9 border-solid font-bold text-[10px]"
              title="Toggle Language"
            >
              {language === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-amber-500 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center w-9 h-9 border-solid"
              title={theme === 'dark' ? 'เปิดโหมดสว่าง (Soft Slate)' : 'เปิดโหมดมืด (Dark Mode)'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* ยศของพอร์ตรวมปัจจุบัน & สลับธีม */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-center">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-4 py-1.5 rounded-xl shadow-inner w-full md:w-auto justify-between md:justify-center">
            
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
                <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-extrabold uppercase leading-tight group-hover:underline max-w-[100px] sm:max-w-none truncate">
                  {profile.name || currentUser.split('@')[0]}
                </span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono leading-none max-w-[100px] sm:max-w-none truncate">
                  {currentUser}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>

            <div className="flex flex-col text-right">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 font-bold uppercase tracking-widest cursor-pointer text-right flex items-center justify-end gap-0.5"
              >
                ⚙️ Settings
              </button>
              <button 
                onClick={handleLogout}
                className="text-[9px] text-rose-500 dark:text-rose-450 hover:text-rose-600 dark:hover:text-rose-350 font-bold uppercase tracking-widest mt-0.5 text-right cursor-pointer"
              >
                {t('app.logout')}
              </button>
            </div>

            {/* ซ่อนเส้นคั่น และ ยศ/เงิน ในจอมือถือ (เล็กกว่า md) */}
            <div className="hidden md:block w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>

            <div className="hidden md:block text-right">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Rank Level</span>
              <span className="text-sm font-extrabold text-amber-605 dark:text-amber-400 block font-sans">{currentRank.name}</span>
            </div>
            
            <div className="hidden md:block w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>
            
            <div className="hidden md:block text-left font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={toggleLanguage}
            className="hidden md:flex p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-indigo-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm items-center justify-center w-9 h-9 border-solid font-bold text-xs"
            title="Toggle Language"
          >
            {language === 'th' ? 'EN' : 'TH'}
          </button>
          
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hidden md:flex p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-amber-500 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm items-center justify-center w-9 h-9 border-solid"
            title={theme === 'dark' ? 'เปิดโหมดสว่าง (Soft Slate)' : 'เปิดโหมดมืด (Dark Mode)'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* 💻 Main Layout container */}
      <main className="max-w-[1400px] w-full mx-auto p-4 md:p-6 pb-24 md:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start">
        
        {/* 📋 Left & Central Side (Dashboard & Sub-pages) - 9 Columns */}
        <div className="lg:col-span-9 flex flex-col gap-6 w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            {/* แถบ Tab เลือกสลับการแสดงผลหลัก */}
            <div className="hidden md:flex overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-brand-border dark:border-slate-800/80 gap-2 p-1 bg-brand-surface dark:bg-slate-900/60 backdrop-blur rounded-xl border w-max snap-x">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/35'
                }`}
              >
                {t('app.dashboard')}
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                  activeTab === 'journal'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                }`}
              >
                {t('app.journal')} ({trades.length})
              </button>
              <button
                onClick={() => setActiveTab('fighter')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                  activeTab === 'fighter'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                }`}
              >
                ⚡ {t('app.fighter')}
              </button>
              {isVip && (
                <>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                      activeTab === 'calendar'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                    }`}
                  >
                    {t('app.calendar')}
                  </button>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                      activeTab === 'plans'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-950/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                    }`}
                  >
                    {t('app.plans')}
                  </button>
                  <button
                    onClick={() => setActiveTab('dividends')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                      activeTab === 'dividends'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                    }`}
                  >
                    {t('app.dividends')}
                  </button>
                </>
              )}
              {currentUser === 'phudit.mahawongsanan@gmail.com' && (
                <button
                  onClick={() => setActiveTab('owner')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all cursor-pointer ${
                    activeTab === 'owner'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950/20'
                      : 'text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/35'
                  }`}
                >
                  👑 {t('app.owner')}
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => import('./utils/logger').then(m => m.downloadLogs())}
                className="hidden md:flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-black tracking-wide text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer shadow border border-indigo-200 dark:border-indigo-800"
              >
                📥 โหลด Logs
              </button>
              <button 
                onClick={() => setShowManual(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black tracking-wide text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/35 transition-all cursor-pointer shadow border border-slate-200 dark:border-slate-700"
              >
                📖 {t('app.manual')}
              </button>
            </div>
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
                fundingHistory={fundingHistory}
                isVip={isVip}
                setFundingHistory={(newHistory) => {
                  setFundingHistory(newHistory);
                  saveFundingHistory(currentUser, newHistory);
                }}
              />
            )}
            
            {activeTab === 'journal' && (
              <TradeJournalTable 
                trades={trades}
                onUpdateTrade={handleUpdateTrade}
                onAddTrade={handleAddTradeDirect}
                onDeleteTrade={handleDeleteTrade}
                onClearAllTrades={handleClearAllTrades}
                onDeleteTradesByMonth={handleDeleteTradesByMonth}
                onImportTrades={handleImportTrades}
                requestConfirm={requestConfirm}
                plans={plans}
                isVip={isVip}
              />
            )}

            <div className={activeTab === 'fighter' ? 'block' : 'hidden'}>
              <FighterComponent 
                accountBalance={accountBalance}
                sharedOrder={sharedOrder}
                setSharedOrder={setSharedOrder}
                isVip={isVip}
              />
            </div>

            {activeTab === 'calendar' && (
              <CalendarView trades={trades} />
            )}

            {activeTab === 'plans' && (
              <TradingPlans 
                plans={plans}
                onSavePlan={handleSavePlan}
                onDeletePlan={handleDeletePlan}
              />
            )}

            {activeTab === 'dividends' && (
              <DividendTracker 
                dividends={dividends}
                onSaveDividend={handleSaveDividend}
                onDeleteDividend={handleDeleteDividend}
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
            activeTab={activeTab}
            plans={plans}
          />
          
          {/* ข้อมูลคำเตือนเล็กๆ ท้ายบอร์ด */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-4 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium shadow-sm">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">💡 Professional Tip</span>
            การใช้เศษหุ้นแบบละเอียด (Fractional Shares) ช่วยรักษา R-Multiple ให้ตรงตามความคุ้มค่าสูงสุด กรุณารักษาความเสี่ยงให้สอดคล้องกับยศปัจจุบันเพื่อป้องกันความเสียหายรุนแรง
          </div>
        </aside>

      </main>

      {/* 📱 Mobile Bottom Navigation Bar (Visible only on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-surface dark:bg-slate-900 border-t border-brand-border flex justify-around items-center p-2 z-40 pb-safe shadow-[0_-4px_12px_rgba(5,15,26,0.08)] overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
            activeTab === 'dashboard' ? 'text-brand-primary' : 'text-brand-text-secondary'
          }`}
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold mt-1">Dash</span>
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
            activeTab === 'journal' ? 'text-brand-primary' : 'text-brand-text-secondary'
          }`}
        >
          <span className="text-xl">📓</span>
          <span className="text-[10px] font-bold mt-1">Journal</span>
        </button>
        <button
          onClick={() => setActiveTab('fighter')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
            activeTab === 'fighter' ? 'text-brand-primary' : 'text-brand-text-secondary'
          }`}
        >
          <span className="text-xl">⚡</span>
          <span className="text-[10px] font-bold mt-1">Fighter</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
            activeTab === 'calendar' ? 'text-brand-primary' : 'text-brand-text-secondary'
          }`}
        >
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-bold mt-1">Cal</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
            activeTab === 'plans' ? 'text-amber-500' : 'text-brand-text-secondary'
          }`}
        >
          <span className="text-xl">📝</span>
          <span className="text-[10px] font-bold mt-1">Plans</span>
        </button>
        {currentUser === 'phudit.mahawongsanan@gmail.com' && (
          <button
            onClick={() => setActiveTab('owner')}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
              activeTab === 'owner' ? 'text-amber-500' : 'text-brand-text-secondary'
            }`}
          >
            <span className="text-xl">👑</span>
            <span className="text-[10px] font-bold mt-1">Owner</span>
          </button>
        )}
      </div>

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
              <p><strong>1. ระบบ Login & ฐานข้อมูล:</strong> ข้อมูลทั้งหมดจะถูกผูกกับอีเมลและเซฟไว้ใน Browser ของคุณเอง.</p>
              <p><strong>2. DASHBOARD & RANKS:</strong> เริ่มต้นโดยการตั้งค่าเงินทุน (Initial Balance) ระบบจะอัปเดตยศ (Rank Level) อัตโนมัติจากยอดเงินปัจจุบัน.</p>
              <p><strong>3. PORTFOLIO GROWTH & PROJECTION (New!):</strong> กราฟใหม่ในหน้า Dashboard ช่วยให้คุณเห็นการเติบโตแบบบันทึกประวัติ ฝาก/ถอน และรัน AI (Monte Carlo & Statistical) คาดการณ์ความสำเร็จของระบบคุณในอนาคตได้ 1-36 เดือน!</p>
              <p><strong>4. ALPHA TRADER (TI SWING PICK):</strong> กรอก <code>TI Entry Alert</code> (จุดเบรคระดับ Day) และจุดเข้า (Entry). ระบบจะดึงข้อมูลราคามาวาดกราฟแท่งเทียนแบบเรียลไทม์ (Lightweight Chart) พร้อมตีเส้น Entry, SL, TP ให้อัตโนมัติ เพื่อให้หาจุดซื้อขายได้คมที่สุด.</p>
              <p><strong>5. STOP LOSS & AUTO-TP:</strong> มีปุ่ม Quick SL คำนวณ % ลัด และ <strong>🤖 AI Auto-SL</strong> เป็นไกด์ไลน์. เมื่อได้ SL แล้ว ระบบ Auto-TP จะคำนวณเป้าหมายกำไร 1R, 2R, 3R ให้ทันที.</p>
              <p><strong>6. QUICK ORDER WIDGET & TRADING PLANS:</strong> ทุกการตั้งค่าจาก Alpha Trader จะ Sync มาที่ Widget นี้ให้กด Save เข้า Journal สะดวกๆ และคุณสามารถสร้างแผนการเทรด (Trading Plans) เพื่อเช็คลิสต์ก่อนเข้าเทรดได้.</p>
              <p><strong>7. TRADE JOURNAL & AI COACH:</strong> สำหรับออเดอร์ที่ยังเปิดอยู่ ระบบจะดึงราคาปัจจุบันมาคำนวณ Live PnL ให้อัตโนมัติ และเมื่อปิดออเดอร์ ระบบ AI จะประเมินคะแนน (AI Score) พร้อมให้คำแนะนำอย่างละเอียด.</p>
              <p><strong>👑 Owner Dashboard:</strong> เฉพาะผู้ดูแลระบบ <code>phudit.mahawongsanan@gmail.com</code> ที่จะเข้าถึงหน้ารวมสถิติผู้ใช้งานได้.</p>
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3 relative z-10">
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

    {/* 🔴 Global Confirm Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl flex-shrink-0 border border-red-200 dark:border-red-500/30">
                ⚠️
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{confirmDialog.title}</h2>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10">
              {confirmDialog.message}
            </p>
            
            <div className="flex justify-end gap-3 mt-4 relative z-10">
              <button 
                onClick={closeConfirm}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                ยกเลิก (Cancel)
              </button>
              <button 
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  closeConfirm();
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-red-900/20 cursor-pointer"
              >
                ยืนยัน (Confirm)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
