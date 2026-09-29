import React, { useEffect } from 'react';
import { useMoonbagStore } from '../hooks/useMoonbagStore';
import MoonbagHeader from './AlphaPicks/MoonbagHeader';
import FundingGuidanceCard from './AlphaPicks/FundingGuidanceCard';
import NewPickForm from './AlphaPicks/NewPickForm';
import HoldingsBoard from './AlphaPicks/HoldingsBoard';

export default function AlphaPickPlanner({ userEmail, isVip }) {
  const { setUserEmail, loading } = useMoonbagStore();

  useEffect(() => {
    if (userEmail) {
      setUserEmail(userEmail);
    }
  }, [userEmail, setUserEmail]);

  if (!isVip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center blur-md opacity-60 select-none pointer-events-none">
        <h2 className="text-2xl font-black">VIP Feature Locked</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-7xl mx-auto pb-10 px-2 sm:px-0">
      
      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-[#0B1121] transition-colors"></div>
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 via-emerald-500/5 to-transparent -z-10 pointer-events-none"></div>
      
      <MoonbagHeader />
      
      <FundingGuidanceCard />
      
      <NewPickForm />
      
      <HoldingsBoard isLoading={loading} />
      
    </div>
  );
}
