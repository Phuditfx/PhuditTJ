import React, { useState, useEffect } from 'react';
import { getAllUsersData, approveUser, deleteUser } from '../db/journalDB';

export default function OwnerDashboard({ currentUser }) {
  const [users, setUsers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsersData();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (email) => {
    await approveUser(email);
    await fetchUsers();
  };

  const handleDelete = async (email) => {
    if (window.confirm(`⚠️ คุณต้องการลบผู้ใช้ ${email} และเคลียร์ข้อมูลการเทรดทั้งหมดใน LocalStorage หรือไม่?\n(การกระทำนี้จะถูกล้างข้อมูลประวัติและข้อมูลเงินทุนทั้งหมดอย่างถาวร!)`)) {
      await deleteUser(email);
      await fetchUsers();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 shadow-lg flex flex-col justify-center items-center h-[500px]">
        <div className="text-amber-500 text-5xl mb-4 animate-spin">⏳</div>
        <div className="text-slate-500 font-bold tracking-widest animate-pulse">LOADING DASHBOARD...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg flex flex-col gap-6 transition-colors duration-300">
      <div>
        <h2 className="text-xl font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2">
          <span>👑 Owner Admin Dashboard</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">สรุปข้อมูลผู้ใช้งานทั้งหมดในระบบ (เฉพาะ Owner เท่านั้นที่เห็นหน้านี้)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Users</span>
          <span className="text-3xl font-black text-slate-800 dark:text-white mt-1 block">{users.length}</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Trades in System</span>
          <span className="text-3xl font-black text-indigo-500 dark:text-indigo-400 mt-1 block">
            {users.reduce((acc, u) => acc + u.tradesCount, 0)}
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">System Net PnL</span>
          <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-1 block">
            ${users.reduce((acc, u) => acc + u.netPnL, 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <th className="py-3 px-4">User Email</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-center">Total Trades</th>
              <th className="py-3 px-3 text-right">Net PnL ($)</th>
              <th className="py-3 px-3 text-right">Current Balance ($)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500 font-semibold italic">
                  ไม่มีผู้ใช้งานในระบบ
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr key={u.email} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors">
                  <td className="py-4 px-4 text-slate-800 dark:text-slate-300 font-sans font-bold flex items-center gap-2">
                    {i === 0 && u.tradesCount > 0 && <span className="text-[10px] bg-amber-500/20 text-amber-500 dark:text-amber-400 px-2 py-0.5 rounded uppercase font-bold">Rank 1</span>}
                    {u.email}
                    {u.email === currentUser && <span className="text-[9px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded ml-1">You</span>}
                  </td>
                  <td className="py-4 px-3 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wide uppercase ${
                      u.status === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-center text-slate-600 dark:text-slate-400 font-bold">{u.tradesCount}</td>
                  <td className={`py-4 px-3 text-right font-extrabold ${u.netPnL >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {u.netPnL >= 0 ? '+' : '-'}${Math.abs(u.netPnL).toFixed(2)}
                  </td>
                  <td className="py-4 px-3 text-right text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                    ${u.currentBal.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right font-sans">
                    <div className="flex justify-end gap-2">
                      {u.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(u.email)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-[10px] transition-colors cursor-pointer"
                        >
                          อนุมัติ
                        </button>
                      )}
                      {u.email !== 'phudit.mahawongsanan@gmail.com' && (
                        <button
                          onClick={() => handleDelete(u.email)}
                          className="bg-slate-200 hover:bg-rose-500/20 text-slate-700 hover:text-rose-600 dark:bg-slate-950 dark:hover:bg-rose-950/40 dark:text-slate-500 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-800 dark:hover:border-rose-900/40 px-2 py-1 rounded text-[10px] transition-colors cursor-pointer"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
