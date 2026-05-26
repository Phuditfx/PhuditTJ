import React, { useState } from 'react';
import { registerUser, verifyUser, resetPassword } from '../db/journalDB';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState('login');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isRegistering = activeTab === 'register';

  const handleEmailChange = async (e) => {
    const val = e.target.value.trim().toLowerCase();
    setEmail(val);
    setError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    const cleanEmail = email.trim().toLowerCase();
    
    if (isResettingPassword) {
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError("กรุณากรอกอีเมลให้ถูกต้อง");
        return;
      }
      const res = await resetPassword(cleanEmail);
      if (res.success) {
        setSuccessMsg("ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมายเข้า (Inbox/Junk) ของคุณ");
        setIsResettingPassword(false);
      } else {
        setError(res.error);
      }
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    if (isRegistering) {
      const res = await registerUser(cleanEmail, password);
      if (res.success) {
        setSuccessMsg("สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณารอการยืนยันก่อนเข้าใช้งาน");
        setActiveTab('login'); // เปลี่ยนกลับเป็นโหมดล็อคอิน
        setPassword('');
      } else {
        setError(res.error);
      }
    } else {
      const res = await verifyUser(cleanEmail, password);
      if (res.success) {
        if (onLogin) onLogin(cleanEmail, rememberMe);
      } else {
        setError(res.error || "รหัสผ่านไม่ถูกต้อง");
      }
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full glow-card-indigo animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-indigo-900/50 mb-4 animate-bounce text-white">
            💎
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PHUDIT <span className="text-indigo-600 dark:text-indigo-400">TJ</span></h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-1">Gamified Trader Station</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-6 relative z-10">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setIsResettingPassword(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'login' && !isResettingPassword ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setIsResettingPassword(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'register' && !isResettingPassword ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1.5 block">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>
          
          {!isResettingPassword && (
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1.5 flex justify-between">
                <span>Password</span>
                {!isRegistering && (
                  <button type="button" onClick={() => setIsResettingPassword(true)} className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 cursor-pointer">
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={isRegistering ? "ตั้งรหัสผ่านใหม่ (สำหรับใช้ครั้งแรก)" : "••••••••"}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required={!isResettingPassword}
              />
              {isRegistering && email.includes('@') && (
                <p className="text-[10px] text-amber-500 mt-1">✨ บัญชีใหม่: รหัสผ่านที่คุณกรอกจะถูกใช้สำหรับการเข้าสู่ระบบครั้งถัดไป</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg text-center font-bold animate-pulse">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-lg text-center font-bold animate-fade-in">
              {successMsg}
            </div>
          )}



          {!isResettingPassword && (
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                Remember me (จดจำการเข้าสู่ระบบ)
              </label>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-lg transition-all shadow-lg shadow-indigo-950/40 text-sm mt-2 cursor-pointer"
          >
            {isResettingPassword ? "ส่งลิงก์รีเซ็ตรหัสผ่าน" : (isRegistering ? "CREATE ACCOUNT" : "LOGIN TO STATION")}
          </button>
          
          {isResettingPassword && (
            <button
              type="button"
              onClick={() => {
                  setIsResettingPassword(false);
                  setError('');
                  setSuccessMsg('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-center cursor-pointer mt-2"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
