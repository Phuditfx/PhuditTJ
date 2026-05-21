import React, { useState } from 'react';
import { checkUserExists, registerUser, verifyUser } from '../db/journalDB';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleEmailChange = (e) => {
    const val = e.target.value.trim().toLowerCase();
    setEmail(val);
    if (val && val.includes('@')) {
      // Check if user exists to switch mode
      setIsRegistering(!checkUserExists(val));
    } else {
      setIsRegistering(false);
    }
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    if (isRegistering) {
      const res = registerUser(cleanEmail, password);
      if (res.success) {
        onLogin(cleanEmail, rememberMe);
      } else {
        setError(res.error);
      }
    } else {
      const isValid = verifyUser(cleanEmail, password);
      if (isValid) {
        onLogin(cleanEmail, rememberMe);
      } else {
        setError("รหัสผ่านไม่ถูกต้อง");
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
          
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1.5 block">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder={isRegistering ? "ตั้งรหัสผ่านใหม่ (สำหรับใช้ครั้งแรก)" : "••••••••"}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
            {isRegistering && email.includes('@') && (
              <p className="text-[10px] text-amber-500 mt-1">✨ บัญชีใหม่: รหัสผ่านที่คุณกรอกจะถูกใช้สำหรับการเข้าสู่ระบบครั้งถัดไป</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg text-center font-bold animate-pulse">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900"
            />
            <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              Remember me (จดจำการเข้าสู่ระบบ)
            </label>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-lg transition-all shadow-lg shadow-indigo-950/40 text-sm mt-2 cursor-pointer"
          >
            {isRegistering ? "CREATE ACCOUNT & LOGIN" : "LOGIN TO STATION"}
          </button>
        </form>
      </div>
    </div>
  );
}
