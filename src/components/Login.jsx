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
      if (!res.error) {
        setSuccessMsg("ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมายเข้า (Inbox/Junk) ของคุณ");
        setIsResettingPassword(false);
      } else {
        setError(res.error.message || "เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ตรหัสผ่าน");
      }
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    if (isRegistering) {
      try {
        const user = await registerUser(cleanEmail, password);
        setSuccessMsg("สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณารอจนกว่าจะได้รับการยืนยันก่อนเข้าใช้งาน");
        setActiveTab('login'); // เปลี่ยนกลับเป็นโหมดล็อคอิน
        setPassword('');
      } catch (err) {
        setError(err.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500/30 transition-colors duration-300 relative overflow-hidden">
      
      {/* Full-screen Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/PDTJ.jpg')" }}
      />
      {/* Dark/Light Overlay to ensure text readability */}
      <div className="absolute inset-0 z-0 bg-white/70 dark:bg-slate-950/80 backdrop-blur-md" />

      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 p-8 rounded-3xl shadow-2xl max-w-sm w-full relative z-10 overflow-hidden ring-1 ring-indigo-500/10">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="mx-auto flex items-center justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="PDTJ Logo" 
              className="w-16 h-16 object-contain drop-shadow-xl animate-bounce"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback diamond */}
            <div className="hidden bg-indigo-600 w-16 h-16 rounded-2xl items-center justify-center text-3xl shadow-lg shadow-indigo-900/50 animate-bounce text-white">
              💎
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">PDTJ</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-1">Phudit Trade Journal</p>
        </div>

        <div className="flex bg-slate-200/50 dark:bg-slate-950/50 p-1 rounded-xl mb-6 relative z-10 backdrop-blur-sm border border-white/20 dark:border-slate-800/30">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setIsResettingPassword(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'login' && !isResettingPassword ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 scale-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer scale-95'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setIsResettingPassword(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'register' && !isResettingPassword ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 scale-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer scale-95'}`}
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
                className="w-full bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
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
                className="w-full bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
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
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 text-sm mt-4 tracking-wider uppercase hover:scale-[1.02] active:scale-95 cursor-pointer"
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
