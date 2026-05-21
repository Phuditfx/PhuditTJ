import React, { useState } from 'react';
import { checkUserStatus, registerUser } from '../db/journalDB';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes('@')) {
      // ลงทะเบียนผู้ใช้ในสารบบ LocalStorage
      registerUser(cleanEmail);
      
      // ตรวจสอบสถานะการอนุมัติ
      const status = checkUserStatus(cleanEmail);
      if (status === 'approved') {
        onLogin(cleanEmail);
      } else {
        setPendingEmail(cleanEmail);
        setIsPending(true);
      }
    } else {
      alert("กรุณากรอกอีเมลให้ถูกต้อง");
    }
  };

  const handleCheckStatusAgain = () => {
    const status = checkUserStatus(pendingEmail);
    if (status === 'approved') {
      onLogin(pendingEmail);
    } else {
      alert("⏳ บัญชีของคุณยังไม่ได้รับการอนุมัติ กรุณาติดต่อคุณ Phudit (Owner) เพื่อทำการเปิดสิทธิ์");
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500/30 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-900 border border-amber-500/30 p-8 rounded-2xl shadow-2xl max-w-md w-full glow-card-amber animate-fade-in relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg mb-6 animate-pulse text-amber-500 dark:text-amber-400">
            ⏳
          </div>
          
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">อยู่ระหว่างรอการอนุมัติ</h1>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold mt-2 bg-amber-500/10 py-1.5 px-3 rounded-lg inline-block">
            {pendingEmail}
          </p>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-6 space-y-3 leading-relaxed text-left max-w-sm mx-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="flex items-start gap-2">
              <span className="text-amber-500 dark:text-amber-400">⚡</span>
              <span><strong>ระบบความปลอดภัย:</strong> บัญชีสมาชิกทั่วไปต้องได้รับการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งานสถานีเทรด</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-amber-500 dark:text-amber-400">⚡</span>
              <span><strong>วิธีเปิดใช้งาน:</strong> กรุณาแจ้งอีเมลล็อกอินนี้ให้คุณ <strong>Phudit (Owner)</strong> ทราบเพื่อกดอนุมัติสิทธิ์ในระบบ</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <button 
              onClick={handleCheckStatusAgain}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-lg transition-all shadow-lg shadow-amber-950/40 text-xs cursor-pointer tracking-wider uppercase"
            >
              🔄 ตรวจสอบสถานะการอนุมัติอีกครั้ง
            </button>
            <button 
              onClick={() => setIsPending(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold py-3.5 rounded-lg transition-all border border-slate-200 dark:border-slate-800 text-xs cursor-pointer"
            >
              ← กลับไปหน้าล็อกอิน
            </button>
          </div>
          
          <p className="text-center text-[10px] text-slate-500 mt-6 leading-relaxed">
            Owner Email: phudit.mahawongsanan@gmail.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full glow-card-indigo animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-indigo-900/50 mb-4 animate-bounce text-white">
            💎
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PHUDIT <span className="text-indigo-600 dark:text-indigo-400">TJ</span></h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-1">Gamified Trader Station</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1.5 block">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-lg transition-all shadow-lg shadow-indigo-950/40 text-sm mt-2 cursor-pointer"
          >
            LOGIN TO STATION
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-6 leading-relaxed">
          ระบบเทรดนี้เป็นระบบจำลองส่วนบุคคล <br/>
          (Owner: phudit.mahawongsanan@gmail.com)
        </p>
      </div>
    </div>
  );
}
