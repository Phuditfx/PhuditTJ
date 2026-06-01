import React from 'react';

const VIP_BENEFITS = [
  { icon: '📈', text: 'Real-time Live Price Tracking' },
  { icon: '⚡', text: 'AI Coach Feedback & Scoring' },
  { icon: '📊', text: 'Advanced Analytics & Stats' },
  { icon: '⚙️', text: 'Trade Simulator (Fighter Engine)' },
  { icon: '📅', text: 'Calendar & Trading Plans' },
  { icon: '💰', text: 'Dividend Tracker' },
  { icon: '📰', text: 'Full Feed Access & Posting' },
  { icon: '📐', text: 'TI Swing Pick Budget Calculator' },
];

export default function VipLockScreen({ featureName = 'Feature นี้', onBack }) {
  return (
    <div className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_60%)] rounded-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.15),transparent_60%)] rounded-2xl" />

      {/* Floating particles */}
      <div className="absolute top-8 left-12 w-2 h-2 bg-indigo-400/30 rounded-full animate-pulse" />
      <div className="absolute top-24 right-20 w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-16 left-24 w-3 h-3 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 right-16 w-1 h-1 bg-indigo-300/50 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />

      {/* Main card */}
      <div className="relative z-10 max-w-lg w-full mx-4 flex flex-col items-center gap-6 p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/40">
        
        {/* Crown icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-2xl scale-150" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-900/40 rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-4xl select-none">👑</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {featureName} <span className="text-amber-400">VIP Only</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Feature นี้สำหรับสมาชิก <strong className="text-amber-400">VIP</strong> เท่านั้น
            <br />ติดต่อ Phudit เพื่ออัปเกรดบัญชีของคุณ
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Benefits grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VIP_BENEFITS.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <span className="text-base flex-shrink-0">{b.icon}</span>
              <span className="text-xs text-slate-300 font-medium leading-tight">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <button
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-900/30 transition-all hover:shadow-amber-900/50 hover:-translate-y-0.5 active:scale-95 text-sm flex items-center justify-center gap-2"
            onClick={() => window.open('https://line.me/', '_blank')}
          >
            <span>✨</span>
            <span>ติดต่ออัปเกรด VIP</span>
          </button>
          {onBack && (
            <button
              className="flex-1 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all text-sm"
              onClick={onBack}
            >
              ← กลับ Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
