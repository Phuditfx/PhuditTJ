import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  saveTrades, 
  saveInitialBalance, 
  saveTargetRR, 
  RANK_SYSTEM,
  saveProfile,
  logoutUser,
  getUserStatus,
  savePlans,
  saveDividends,
  saveFundingHistory,
  getUserVipStatus,
  subscribeToUserData,
  saveAccounts,
  subscribeToGlobalFeed,
  addGlobalFeedPost
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
import Analytics from './components/Analytics';
import Sidebar from './components/Sidebar';
import FeedComponent from './components/FeedComponent';
import DataManager from './components/DataManager';
import VipLockScreen from './components/VipLockScreen';
import SwingPickCalculator from './components/SwingPickCalculator';
import UserProfile from './components/UserProfile';
import WeeklySwingPlanner from './components/WeeklySwingPlanner';
import AlphaPickPlanner from './components/AlphaPickPlanner';

export default function App() {
  const { t, language, toggleLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user.email);
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user.email);
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (email, rememberMe) => {
    // Rely completely on onAuthStateChanged to prevent race conditions
  };

  // โหลดค่าต่างๆ จากฐานข้อมูลจำลอง (LocalStorage) โดยอิงจาก currentUser
  const [trades, setTrades] = useState([]);
  const [initialBalances, setInitialBalances] = useState({ 'default': 10000 });
  const [targetRR, setTargetRRState] = useState(20);
  const [profile, setProfile] = useState({ name: '', photo: '', fontSize: 'normal' });
  const [plans, setPlans] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [fundingHistory, setFundingHistory] = useState([]);
  const [accounts, setAccounts] = useState([{ id: 'default', name: 'Main Account' }]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [activeTab, setActiveTabRaw] = useState(() => localStorage.getItem('phudit_active_tab') || 'dashboard');
  const [profileTab, setProfileTab] = useState(null); // email of user being viewed

  // Wrapper: กดเมนูใดก็ตามให้ออกจากหน้า Profile ทันที
  const setActiveTab = (tab) => {
    setProfileTab(null);
    setIsMobileMenuOpen(false);
    setActiveTabRaw(tab);
  };

  useEffect(() => {
    localStorage.setItem('phudit_active_tab', activeTab);
  }, [activeTab]);

  const [accountId, setAccountId] = useState('default');
  const [globalDateRange, setGlobalDateRange] = useState('1M');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [editingBalanceId, setEditingBalanceId] = useState(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [promptDialog, setPromptDialog] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '' });

  const requestPrompt = (title, message, placeholder, onConfirm) => {
    setPromptDialog({ isOpen: true, title, message, placeholder, onConfirm });
  };
  const closePrompt = () => setPromptDialog({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });

  const requestAlert = (title, message) => {
    setAlertDialog({ isOpen: true, title, message });
  };
  const closeAlert = () => setAlertDialog({ isOpen: false, title: '', message: '' });
  
  // 🌍 Global Feed Subscription (Anyone can see all posts)
  useEffect(() => {
    const unsubFeed = subscribeToGlobalFeed((posts) => {
      setFeedPosts(posts);
    });
    return () => {
      if (unsubFeed) unsubFeed();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeSnapshot = null;

    if (currentUser) {
      setDataLoading(true);

      unsubscribeSnapshot = subscribeToUserData(currentUser, (data) => {
        if (!isMounted) return;
        
        if (!data) {
           setDataLoading(false);
           return;
        }

        if (data.status === 'pending' && currentUser !== 'phudit.mahawongsanan@gmail.com') {
          requestAlert("รอการอนุมัติ", "⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณาติดต่อคุณ Phudit เพื่ออนุมัติการใช้งาน");
          logoutUser();
          return;
        }

        let userTrades = data.trades || [];
        if (currentUser === 'phudit.mahawongsanan@gmail.com') {
          const sampleTradesCount = userTrades.filter(t => t.id && t.id.startsWith('sample-')).length;
          if (sampleTradesCount > 0) {
            console.log(`Auditing: Found ${sampleTradesCount} sample trades in Owner account. Filtering them...`);
            const realTrades = userTrades.filter(t => !t.id || !t.id.startsWith('sample-'));
            userTrades = realTrades;
            // Save cleaned trades list back to Firestore and LocalStorage
            saveTrades(currentUser, realTrades);
          }
        }

        setTrades(userTrades);
        setInitialBalances(data.initialBalances || { 'default': 10000 });
        setTargetRRState(data.targetRR || 20);
        setProfile(data.profile);
        setPlans(data.plans || []);
        setDividends(data.dividends || []);
        setFundingHistory(data.fundingHistory || []);
        setAccounts(data.accounts || [{ id: 'default', name: 'Main Account' }]);
        setIsVip(currentUser === 'phudit.mahawongsanan@gmail.com' || data.isVip);
        
        setDataLoading(false);
      });
    } else {
      setTrades([]);
      setPlans([]);
      setDividends([]);
      setFundingHistory([]);
      setIsVip(false);
      setDataLoading(false);
    }

    return () => { 
      isMounted = false; 
      if (unsubscribeSnapshot) unsubscribeSnapshot();
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
      setTempProfileName(profile.name || (currentUser ? currentUser.split('@')[0] : ''));
      setTempProfilePhoto(profile.photo || '');
      setTempFontSize(profile.fontSize || 'normal');
    }
  }, [showSettingsModal, profile, currentUser]);

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
      // เราจะทำการบีบอัดรูปโปรไฟล์อัตโนมัติ ไม่ต้องกังวลเรื่องขนาดเกิน
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250; // บีบอัดขนาดสำหรับโปรไฟล์ให้เล็กมากๆ
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

          // Compress to JPEG with 0.5 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          setTempProfilePhoto(dataUrl);
        };
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

  const initialBalance = initialBalances[accountId] ?? 10000;

  // บันทึกและซิงค์เงินตั้งต้นลง LocalStorage
  const setInitialBalance = (newBalance) => {
    const updatedBalances = { ...initialBalances, [accountId]: parseFloat(newBalance) ?? 0 };
    setInitialBalances(updatedBalances);
    saveInitialBalance(currentUser, updatedBalances);
  };

  // บันทึกและซิงค์เป้าหมาย RR ลง LocalStorage
  const setTargetRR = (value) => {
    setTargetRRState(value);
    saveTargetRR(currentUser, value);
  };

  // 🏆 คำนวณยศปัจจุบันอัตโนมัติจากยอดคงเหลือในพอร์ต
  const currentRank = useMemo(() => {
    let rank = RANK_SYSTEM[0];
    for (let i = 0; i < RANK_SYSTEM.length; i++) {
      if (initialBalance >= RANK_SYSTEM[i].minPort) rank = RANK_SYSTEM[i];
    }
    return rank;
  }, [initialBalance]);

  // กรอง Trades ตาม Account และ Date Range
  const filteredGlobalTrades = useMemo(() => {
    return trades.filter(t => {
      const tradeAcc = t.accountId || 'default';
      if (tradeAcc !== accountId) return false;

      if (globalDateRange === 'All') return true;
      if (!t.dateTime) return true;
      
      const tradeDate = new Date(t.dateTime);
      const now = new Date();
      
      if (globalDateRange === '1W') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return tradeDate >= oneWeekAgo;
      }
      if (globalDateRange === '1M') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return tradeDate >= oneMonthAgo;
      }
      if (globalDateRange === 'YTD') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return tradeDate >= startOfYear;
      }
      return true;
    });
  }, [trades, accountId, globalDateRange]);

  // 📈 คำนวณยอดเงินในพอร์ตปัจจุบันแบบเรียลไทม์ (Initial Balance + ผลรวมกำไรขาดทุนของออเดอร์ที่ปิดแล้ว)
  const accountBalance = useMemo(() => {
    const netPnL = filteredGlobalTrades.reduce((acc, t) => acc + (t.status === 'Closed' ? (parseFloat(t.pnl) || 0) : 0), 0);
    return Math.max(0, initialBalance + netPnL);
  }, [filteredGlobalTrades, initialBalance]);

  // บันทึกออเดอร์ใหม่ (เปิดออเดอร์จาก Sidebar)
  const handleSaveTrade = (newTradeData) => {
    const newTrade = {
      ...newTradeData,
      id: 't-' + Date.now(),
      dateTime: new Date().toISOString(), // วันเวลา ณ ปัจจุบัน
      accountId: accountId, // ระบุว่าออเดอร์นี้เป็นของบัญชีไหน
      pnl: 0,
      actualRR: 0,
      aiScore: null,
      aiFeedback: ''
    };
    
    const updatedTrades = [newTrade, ...trades];
    setTrades(updatedTrades);
    saveTrades(currentUser, updatedTrades);
    
    setActiveTab('journal');
  };

  // อัปเดตข้อมูลการเทรด (เช่น เมื่อปิดดีลเทรด)
  const handleUpdateTrade = (updatedTrade) => {
    if (!updatedTrade.accountId) updatedTrade.accountId = accountId;
    
    setTrades(prevTrades => {
      const updatedTradesList = prevTrades.map(t => t.id === updatedTrade.id ? updatedTrade : t);
      saveTrades(currentUser, updatedTradesList);
      return updatedTradesList;
    });
  };

  // เพิ่มออเดอร์โดยตรง (เช่น จากการแบ่งปิดออเดอร์)
  const handleAddTradeDirect = (newTrade) => {
    if (!newTrade.accountId) newTrade.accountId = accountId;
    
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

  // จัดการ Feed Posts (Global)
  const handleSaveFeedPost = (newPost) => {
    // Ensure author.email is always stored for profile linking
    const postWithEmail = {
      ...newPost,
      author: { ...newPost.author, email: newPost.author?.email || currentUser }
    };
    setFeedPosts(prev => [postWithEmail, ...prev]); // Optimistic update
    addGlobalFeedPost(postWithEmail);
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

  // นำเข้าข้อมูลการเทรด (Import Trades)
  const handleImportData = (importedData) => {
    // Check if it's the new full backup format
    if (importedData.trades && Array.isArray(importedData.trades)) {
      setTrades(importedData.trades);
      saveTrades(currentUser, importedData.trades);
      
      if (importedData.plans) {
        setPlans(importedData.plans);
        savePlans(currentUser, importedData.plans);
      }
      if (importedData.dividends) {
        setDividends(importedData.dividends);
        saveDividends(currentUser, importedData.dividends);
      }
      // other non-subcollection data
      if (importedData.accounts) {
        setAccounts(importedData.accounts);
        saveAccounts(currentUser, importedData.accounts);
      }
      if (importedData.initialBalances) {
        setInitialBalances(importedData.initialBalances);
        saveInitialBalance(currentUser, importedData.initialBalances);
      }
    } else if (Array.isArray(importedData)) {
      // Legacy format (only trades array)
      setTrades(importedData);
      saveTrades(currentUser, importedData);
    }
  };

  const handleExportFullJSON = () => {
    const fullData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      trades,
      plans,
      dividends,
      fundingHistory,
      accounts,
      initialBalances
    };
    const dataStr = JSON.stringify(fullData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `PhuditTJ_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logoutUser();
    setActiveTab('dashboard');
  };

  const handleLoadSampleData = () => {
    const symbols = ['AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'BTCUSD', 'ETHUSD'];
    const sampleTrades = [];

    for (let i = 0; i < 20; i++) {
      const isWin = Math.random() > 0.4;
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const direction = Math.random() > 0.5 ? 'Long' : 'Short';
      const entryPrice = Math.random() * 200 + 50;
      const shares = Math.floor(Math.random() * 50) + 1;
      const pnl = isWin ? Math.random() * 500 + 100 : -(Math.random() * 300 + 50);
      const daysAgo = Math.floor(Math.random() * 60);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      
      // exit time is 4 hours after entry time
      const exitD = new Date(d);
      exitD.setHours(d.getHours() + 4);

      sampleTrades.push({
        id: `sample-${Date.now()}-${i}`,
        symbol,
        direction,
        status: 'Closed',
        entryPrice: Number(entryPrice).toFixed(2),
        actualExitPrice: Number(entryPrice + (isWin ? pnl/shares : pnl/shares)).toFixed(2),
        shares,
        pnl: parseFloat(pnl.toFixed(2)),
        dateTime: d.toISOString(),
        exitDateTime: exitD.toISOString(),
        accountId: accountId,
        planAdherenceScore: Math.floor(Math.random() * 50) + 50,
        actualRR: (pnl / (Math.abs(pnl) + 50)).toFixed(2),
      });
    }

    setTrades([...sampleTrades, ...trades]);
    saveTrades(currentUser, [...sampleTrades, ...trades]);
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newAccount = { id: `acc-${Date.now()}`, name: newAccountName.trim() };
    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    saveAccounts(currentUser, updatedAccounts);
    setNewAccountName('');
  };

  const handleDeleteAccount = (idToDelete) => {
    if (accounts.length <= 1) {
      requestAlert("ไม่สามารถลบได้", t('common.cannotDeleteLastAccount', 'Cannot delete the last remaining account.'));
      return;
    }
    
    requestConfirm(
      t('common.confirmDeleteAccountTitle', 'Confirm Delete Account'),
      t('common.confirmDeleteAccount', 'Are you sure you want to delete this account? All trades inside it will be permanently deleted!'),
      () => {
        const updatedAccounts = accounts.filter(a => a.id !== idToDelete);
        setAccounts(updatedAccounts);
        saveAccounts(currentUser, updatedAccounts);

        const remainingTrades = trades.filter(t => t.accountId !== idToDelete);
        setTrades(remainingTrades);
        saveTrades(currentUser, remainingTrades);

        if (accountId === idToDelete) {
          setAccountId(updatedAccounts[0].id);
        }
      }
    );
  };

  const handleRenameAccount = (accId, newName) => {
    if (!newName.trim()) return;
    const updatedAccounts = accounts.map(a => a.id === accId ? { ...a, name: newName.trim() } : a);
    setAccounts(updatedAccounts);
    saveAccounts(currentUser, updatedAccounts);
    setEditingAccountId(null);
    setEditingAccountName('');
  };

  const handleUpdateInitialBalance = (accId, newBalance) => {
    const val = parseFloat(newBalance);
    if (isNaN(val) || val < 0) return;
    const updatedBalances = { ...initialBalances, [accId]: val };
    setInitialBalances(updatedBalances);
    saveInitialBalance(currentUser, updatedBalances);
    setEditingBalanceId(null);
    setEditingBalanceValue('');
  };

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
      
      <header className="glass-panel sticky top-0 z-40 px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="PDTJ Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-lg" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="bg-brand-primary p-2 rounded-lg text-white font-black text-xl shadow-md shadow-brand-primary/40 select-none animate-pulse hidden">💎</div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-brand-text-primary dark:text-white m-0 leading-none">PDTJ</h1>
              <p className="text-[10px] text-brand-text-secondary mt-1 uppercase tracking-widest font-bold hidden sm:block">Phudit Trade Journal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-center">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-4 py-1.5 rounded-xl shadow-inner w-full md:w-auto justify-between md:justify-center">
            <div className="flex items-center gap-2 cursor-pointer group hover:opacity-90 active:scale-95 transition-all" onClick={() => setShowSettingsModal(true)}>
              {profile.photo ? (
                <img src={profile.photo} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-900/50 flex items-center justify-center shadow-sm text-[13px]">👤</div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-extrabold uppercase leading-tight group-hover:underline max-w-[100px] sm:max-w-none truncate">{profile.name || currentUser.split('@')[0]}</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono leading-none max-w-[100px] sm:max-w-none truncate">{currentUser}</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>
            <div className="hidden md:block text-right">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Rank Level</span>
              <span className="text-sm font-extrabold text-amber-605 dark:text-amber-400 block font-sans">{currentRank.name}</span>
            </div>
            <div className="hidden md:block w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>
            <div className="hidden md:block text-left font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-2">
            <button onClick={toggleLanguage} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-xs font-black text-slate-700 dark:text-slate-300" title={language === 'en' ? 'Switch to Thai' : 'Switch to English'}>
              {language === 'en' ? 'TH' : 'EN'}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm" title="Toggle Theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all shadow-sm text-xs font-bold" title="Logout">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
          {/* Mobile Hamburger Button */}
          <button 
            className="sm:hidden ml-2 p-2 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden flex flex-col gap-2 w-full mt-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg animate-fade-in">
            <button onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }} className="w-full py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">
              {language === 'en' ? 'Switch to Thai (TH)' : 'Switch to English (EN)'}
            </button>
            <button onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }} className="w-full py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">
              {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full py-2.5 flex justify-center items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 text-sm font-bold cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        )}

        {/* Mobile Only: Account & Date Filters */}
        <div className="lg:hidden flex flex-col gap-2 w-full mt-2">
          <div className="flex gap-2 w-full">
            <select 
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 text-[11px] font-bold shadow-sm focus:outline-none"
            >
            {accounts && accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          <select 
            value={globalDateRange}
            onChange={(e) => setGlobalDateRange(e.target.value)}
            className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 text-[11px] font-bold shadow-sm focus:outline-none"
          >
            <option value="1W">1W</option>
            <option value="1M">1M</option>
            <option value="YTD">YTD</option>
            <option value="All">All</option>
          </select>
          </div>
          <button 
            onClick={() => setShowAccountModal(true)}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
          >
            ⚙️ Manage Accounts
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] w-full mx-auto p-4 md:p-6 pb-24 md:pb-6 flex flex-col lg:flex-row gap-6 flex-grow items-start">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            accountId={accountId} 
            setAccountId={setAccountId} 
            globalDateRange={globalDateRange}
            setGlobalDateRange={setGlobalDateRange}
            isVip={isVip} 
            isOwner={currentUser === 'phudit.mahawongsanan@gmail.com'}
            accounts={accounts}
            setShowAccountModal={setShowAccountModal}
            setShowManual={setShowManual}
          />
        </div>

        <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
          <div className="w-full">
            {activeTab === 'dashboard' && (
              <Dashboard 
                accountBalance={accountBalance}
                initialBalance={initialBalance}
                setInitialBalance={setInitialBalance}
                targetRR={targetRR}
                setTargetRR={setTargetRR}
                trades={filteredGlobalTrades}
                currentRank={currentRank}
                fundingHistory={fundingHistory}
                isVip={isVip}
                setFundingHistory={(newHistory) => {
                  setFundingHistory(newHistory);
                  saveFundingHistory(currentUser, newHistory);
                }}
                onLoadSampleData={handleLoadSampleData}
                requestPrompt={requestPrompt}
                requestAlert={requestAlert}
              />
            )}
            
            {activeTab === 'journal' && (
              <TradeJournalTable 
                trades={filteredGlobalTrades}
                onUpdateTrade={handleUpdateTrade}
                onAddTrade={handleAddTradeDirect}
                onDeleteTrade={handleDeleteTrade}
                onClearAllTrades={handleClearAllTrades}
                onDeleteTradesByMonth={handleDeleteTradesByMonth}
                onImportData={handleImportData}
                onExportJSON={handleExportFullJSON}
                requestConfirm={requestConfirm}
                requestPrompt={requestPrompt}
                requestAlert={requestAlert}
                plans={plans}
                isVip={isVip}
              />
            )}

            {/* ✅ Task 5: User Profile Tab */}
            {profileTab ? (
              <UserProfile
                userEmail={profileTab}
                allPosts={feedPosts}
                onBack={() => { setProfileTab(null); setActiveTab('feed'); }}
                currentUser={currentUser}
                isVip={isVip}
              />
            ) : (
              <>
                {/* ✅ Task 3: VIP-gated tabs */}
                {activeTab === 'analytics' && (
                  isVip
                    ? <Analytics trades={filteredGlobalTrades} />
                    : <VipLockScreen featureName="Analytics & Stats" onBack={() => setActiveTab('dashboard')} />
                )}
                <div className={activeTab === 'fighter' ? 'block' : 'hidden'}>
                  {isVip ? (
                    <FighterComponent
                      accountBalance={accountBalance}
                      sharedOrder={sharedOrder}
                      setSharedOrder={setSharedOrder}
                      isVip={isVip}
                      requestAlert={requestAlert}
                    />
                  ) : activeTab === 'fighter' ? (
                    <VipLockScreen featureName="Trade Simulator" onBack={() => setActiveTab('dashboard')} />
                  ) : null}
                </div>
                {activeTab === 'calendar' && (
                  isVip
                    ? <CalendarView trades={trades} />
                    : <VipLockScreen featureName="Calendar" onBack={() => setActiveTab('dashboard')} />
                )}
                {activeTab === 'plans' && (
                  isVip ? (
                    <TradingPlans
                      plans={plans}
                      onSavePlan={handleSavePlan}
                      onDeletePlan={handleDeletePlan}
                      requestConfirm={requestConfirm}
                      requestAlert={requestAlert}
                    />
                  ) : (
                    <VipLockScreen featureName="Plans & Playbooks" onBack={() => setActiveTab('dashboard')} />
                  )
                )}
                {activeTab === 'dividends' && (
                  isVip ? (
                    <DividendTracker
                      dividends={dividends}
                      onSaveDividend={handleSaveDividend}
                      onDeleteDividend={handleDeleteDividend}
                      requestConfirm={requestConfirm}
                      requestAlert={requestAlert}
                    />
                  ) : (
                    <VipLockScreen featureName="Dividend Tracker" onBack={() => setActiveTab('dashboard')} />
                  )
                )}
                {/* ✅ Task 4 & 5: Feed with Lightbox + Profile navigation */}
                {activeTab === 'feed' && (
                  isVip ? (
                    <FeedComponent
                      posts={feedPosts}
                      onSavePost={handleSaveFeedPost}
                      currentUser={currentUser}
                      profile={profile}
                      onViewProfile={(email) => { setProfileTab(email); }}
                      requestAlert={requestAlert}
                      requestConfirm={requestConfirm}
                    />
                  ) : (
                    <VipLockScreen featureName="Trading Bulletin (Feed)" onBack={() => setActiveTab('dashboard')} />
                  )
                )}
                {activeTab === 'data' && (
                  <DataManager
                    currentUser={currentUser}
                    trades={trades} setTrades={setTrades}
                    feedPosts={feedPosts} setFeedPosts={setFeedPosts}
                    plans={plans} setPlans={setPlans}
                    dividends={dividends} setDividends={setDividends}
                    requestAlert={requestAlert}
                    requestConfirm={requestConfirm}
                  />
                )}
                {/* ✅ Task 2: TI Swing Pick Calculator (VIP only) */}
                {activeTab === 'swing' && (
                  isVip
                    ? <SwingPickCalculator accountBalance={accountBalance} />
                    : <VipLockScreen featureName="TI Swing Pick Calculator" onBack={() => setActiveTab('dashboard')} />
                )}
                {activeTab === 'weeklyPicks' && (
                  isVip
                    ? <WeeklySwingPlanner userEmail={currentUser} isVip={isVip} requestAlert={requestAlert} requestConfirm={requestConfirm} />
                    : <VipLockScreen featureName="TI Weekly Swing Planner" onBack={() => setActiveTab('dashboard')} />
                )}
                {activeTab === 'alphaPicks' && (
                  isVip
                    ? <AlphaPickPlanner userEmail={currentUser} isVip={isVip} requestAlert={requestAlert} requestConfirm={requestConfirm} />
                    : <VipLockScreen featureName="Alpha Picks Investment" onBack={() => setActiveTab('dashboard')} />
                )}
                {activeTab === 'owner' && currentUser === 'phudit.mahawongsanan@gmail.com' && (
                  <OwnerDashboard
                    currentUser={currentUser}
                    requestConfirm={requestConfirm}
                    requestAlert={requestAlert}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* ⚡ Right Side Snap Widget Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-24">
          <QuickOrderWidget 
            currentRank={currentRank}
            accountBalance={accountBalance}
            onSaveTrade={handleSaveTrade}
            sharedOrder={sharedOrder}
            setSharedOrder={setSharedOrder}
            activeTab={activeTab}
            plans={plans}
            requestAlert={requestAlert}
            requestConfirm={requestConfirm}
          />
          
          {/* ข้อมูลคำเตือนเล็กๆ ท้ายบอร์ด */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-4 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium shadow-sm">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">💡 Professional Tip</span>
            การใช้เศษหุ้นแบบละเอียด (Fractional Shares) ช่วยรักษา R-Multiple ให้ตรงตามความคุ้มค่าสูงสุด กรุณารักษาความเสี่ยงให้สอดคล้องกับยศปัจจุบันเพื่อป้องกันความเสียหายรุนแรง
          </div>
        </aside>

      </main>

      {/* 📱 Mobile Bottom Navigation Bar (Visible only on small screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-surface dark:bg-slate-900 border-t border-brand-border flex justify-around items-center p-2 z-40 pb-safe shadow-[0_-4px_12px_rgba(5,15,26,0.08)] overflow-x-auto gap-2">
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
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] ${
            activeTab === 'feed' ? 'text-brand-primary' : 'text-brand-text-secondary'
          }`}
        >
          <span className="text-xl">📰</span>
          <span className="text-[10px] font-bold mt-1">Feed</span>
        </button>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] text-brand-text-secondary hover:text-brand-primary"
        >
          <span className="text-xl">☰</span>
          <span className="text-[10px] font-bold mt-1">Menu</span>
        </button>
      </div>

      {/* 📱 Mobile Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl p-4 relative z-10 animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">More Tools</h3>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <button onClick={() => setActiveTab('fighter')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'fighter' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="text-2xl mb-1">⚡</span>
                <span className="text-[10px] font-bold text-center">Fighter</span>
              </button>
              <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'calendar' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="text-2xl mb-1">📅</span>
                <span className="text-[10px] font-bold text-center">Cal</span>
              </button>
              <button onClick={() => setActiveTab('swing')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'swing' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="text-2xl mb-1">📐</span>
                <span className="text-[10px] font-bold text-center">TI Pick</span>
              </button>
              <button onClick={() => setActiveTab('weeklyPicks')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'weeklyPicks' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="text-2xl mb-1">📈</span>
                <span className="text-[10px] font-bold text-center leading-tight">Weekly<br/>Picks</span>
              </button>
              <button onClick={() => setActiveTab('plans')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'plans' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="text-2xl mb-1">📝</span>
                <span className="text-[10px] font-bold text-center">Plans</span>
              </button>
              <button onClick={() => setActiveTab('dividends')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'dividends' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="text-2xl mb-1">💸</span>
                <span className="text-[10px] font-bold text-center leading-tight">Dividend</span>
              </button>
              {currentUser === 'phudit.mahawongsanan@gmail.com' && (
                <button onClick={() => setActiveTab('owner')} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-colors ${activeTab === 'owner' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  <span className="text-2xl mb-1">👑</span>
                  <span className="text-[10px] font-bold text-center">Owner</span>
                </button>
              )}
            </div>
            <div className="pb-safe"></div>
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

      {/* ⚙️ Account Management Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 relative z-10">
              <div>
                <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400">⚙️ Manage Trading Accounts</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Add, rename, or remove trading accounts</p>
              </div>
              <button 
                onClick={() => { setShowAccountModal(false); setEditingAccountId(null); setEditingBalanceId(null); }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Add New Account */}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                placeholder="New account name..." 
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button 
                onClick={handleAddAccount}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md shadow-indigo-900/20 flex items-center gap-1 whitespace-nowrap"
              >
                ➕ Add
              </button>
            </div>

            {/* Account List */}
            <div className="flex flex-col gap-2">
              {accounts.map(acc => {
                const accTrades = trades.filter(t => (t.accountId || 'default') === acc.id && t.status === 'Closed');
                const accPnL = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
                const accBalance = (initialBalances[acc.id] ?? 10000);
                const isEditing = editingAccountId === acc.id;
                const isEditingBal = editingBalanceId === acc.id;
                const isActive = accountId === acc.id;

                return (
                  <div key={acc.id} className={`border rounded-xl p-3 sm:p-4 flex flex-col gap-3 transition-all ${
                    isActive 
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/60 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    {/* Account Name Row */}
                    <div className="flex justify-between items-center gap-2">
                      {isEditing ? (
                        <div className="flex gap-2 flex-1">
                          <input 
                            type="text" 
                            value={editingAccountName}
                            onChange={(e) => setEditingAccountName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameAccount(acc.id, editingAccountName)}
                            className="flex-1 bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleRenameAccount(acc.id, editingAccountName)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                          >✓</button>
                          <button 
                            onClick={() => { setEditingAccountId(null); setEditingAccountName(''); }}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                          >✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isActive && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse"></span>}
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{acc.name}</span>
                          <button 
                            onClick={() => { setEditingAccountId(acc.id); setEditingAccountName(acc.name); }}
                            className="text-[10px] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer flex-shrink-0"
                            title="Rename"
                          >✏️</button>
                        </div>
                      )}
                      
                      {!isEditing && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          {!isActive && (
                            <button 
                              onClick={() => setAccountId(acc.id)}
                              className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >Select</button>
                          )}
                          <button 
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            title="Delete Account"
                          >🗑️</button>
                        </div>
                      )}
                    </div>

                    {/* Balance & P/L Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center flex flex-col items-center justify-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Initial Bal.</span>
                        {isEditingBal ? (
                          <div className="flex gap-1 mt-0.5">
                            <input 
                              type="number" 
                              value={editingBalanceValue}
                              onChange={(e) => setEditingBalanceValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateInitialBalance(acc.id, editingBalanceValue)}
                              className="w-full bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 rounded px-1 py-0.5 text-[10px] font-mono text-slate-900 dark:text-white focus:outline-none text-center"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleUpdateInitialBalance(acc.id, editingBalanceValue)}
                              className="text-emerald-500 text-[10px] font-bold cursor-pointer"
                            >✓</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span 
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              onClick={() => { setEditingBalanceId(acc.id); setEditingBalanceValue(accBalance.toString()); }}
                              title="Click to edit"
                            >
                              ${accBalance.toLocaleString()}
                            </span>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => {
                                  requestPrompt(
                                    "ฝากเงิน (Deposit)", 
                                    `กรุณาระบุจำนวนเงินที่ต้องการฝากเข้าบัญชี ${acc.name}`,
                                    "เช่น 1000",
                                    (amount) => {
                                      if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                                        handleUpdateInitialBalance(acc.id, accBalance + parseFloat(amount));
                                      }
                                    }
                                  );
                                }}
                                className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                                title="Deposit"
                              >+</button>
                              <button 
                                onClick={() => {
                                  requestPrompt(
                                    "ถอนเงิน (Withdraw)", 
                                    `กรุณาระบุจำนวนเงินที่ต้องการถอนจากบัญชี ${acc.name}`,
                                    "เช่น 500",
                                    (amount) => {
                                      if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                                        handleUpdateInitialBalance(acc.id, accBalance - parseFloat(amount));
                                      }
                                    }
                                  );
                                }}
                                className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                                title="Withdraw"
                              >-</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Net P/L</span>
                        <span className={`text-xs font-black ${accPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {accPnL >= 0 ? '+' : ''}${accPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Trades</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{accTrades.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close Button */}
            <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
              <button 
                onClick={() => { setShowAccountModal(false); setEditingAccountId(null); setEditingBalanceId(null); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Manual Modal */}
            {showManual && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-2 sticky top-0 bg-white dark:bg-slate-900 py-2 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">📖 {t('manual.title', 'User Manual & Guides')}</h3>
                    <button onClick={() => setShowManual(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-xl">✕</button>
                  </div>
                  
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4">
                    <div>
                      <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-base mb-1">1. {t('manual.accounts', 'Managing Trading Accounts')}</h4>
                      <p>{t('manual.accountsDesc', 'You can create multiple accounts (e.g., Main, Challenge). Each account has its own initial balance and trade history. You can filter the dashboard and charts by selecting an account from the Sidebar or Top Menu on mobile.')}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-base mb-1">2. {t('manual.dateRange', 'Global Date Filters')}</h4>
                      <p>{t('manual.dateRangeDesc', 'Use the 1W, 1M, YTD, or All filters to adjust the data shown on the Dashboard and Trades table. It instantly recalculates your PnL and win rates.')}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-base mb-1">3. {t('manual.analytics', 'Analytics & Deep Stats')}</h4>
                      <p>{t('manual.analyticsDesc', 'The Analytics tab provides a visual representation of your Equity Curve, Win Rate distribution, and average profit/loss to help you find your edge.')}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-base mb-1">4. {t('manual.sampleData', 'Sample Data (Testing)')}</h4>
                      <p>{t('manual.sampleDataDesc', 'If your dashboard is empty, you can click "Add Sample Trades" to instantly populate it with dummy data so you can test out the charts and features.')}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-amber-500 dark:text-amber-400 text-base mb-1">5. {t('manual.alphaPicks', 'Alpha Picks Investment (PRO)')}</h4>
                      <p>{t('manual.alphaPicksDesc', 'Use this module for Long-Term Investing. When you buy more shares of an existing position, the system automatically calculates your new Dollar-Cost Averaging (DCA). When you scale out (sell), it records the realized profit without altering your core average cost.')}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-amber-500 dark:text-amber-400 text-base mb-1">6. {t('manual.weeklyPlanner', 'TI Weekly Swing Planner (PRO)')}</h4>
                      <p>{t('manual.weeklyPlannerDesc', 'Plan your swing trades logically. Log your Entry Alert and Stop Loss. You can now click the Chart Icon 📈 to view the historical OHLC chart with automated markers pointing precisely to the date you logged the pick.')}</p>
                    </div>
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

    {/* 💬 Global Prompt Modal */}
      {promptDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl flex-shrink-0 border border-indigo-200 dark:border-indigo-500/30">
                💬
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{promptDialog.title}</h2>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10">
              {promptDialog.message}
            </p>
            
            <form 
              className="relative z-10 mt-1"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const val = formData.get('promptValue');
                if (promptDialog.onConfirm) promptDialog.onConfirm(val);
                closePrompt();
              }}
            >
              <input 
                name="promptValue"
                type="text" 
                placeholder={promptDialog.placeholder}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button"
                  onClick={closePrompt}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก (Cancel)
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-indigo-900/20 cursor-pointer"
                >
                  ตกลง (OK)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {/* ℹ️ Global Alert Modal */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl flex-shrink-0 border border-amber-200 dark:border-amber-500/30">
                ℹ️
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{alertDialog.title || "Information"}</h2>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10">
              {alertDialog.message}
            </p>
            
            <div className="flex justify-end gap-3 mt-4 relative z-10">
              <button 
                onClick={closeAlert}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-indigo-900/20 cursor-pointer w-full"
              >
                รับทราบ (OK)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
