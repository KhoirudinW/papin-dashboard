"use client";
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Lock, CalendarDays, BarChart3 } from 'lucide-react';
import PricingModal from '@/components/PricingModalProps';
import { useSubscription } from '@/hooks/useSubscription';
import { useDataChart } from '@/hooks/useDataChart'
// --- DUMMY UNTUK MOOD (PREMIUM) ---
const moodData = [
  { name: 'Happy ✨', value: 45, color: '#FFC0D9' },
  { name: 'Romantic ❤️', value: 25, color: '#FF90BC' },
  { name: 'Sad 🥺', value: 15, color: '#A0D1FF' },
  { name: 'Tired 😴', value: 15, color: '#FFF5F5' },
];

export default function StatistikPasangan() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const { isPremium, loading: subLoading } = useSubscription();
  const {chartData, setViewType, viewType, loading } = useDataChart()

  const LockOverlay = ({ title }: { title: string }) => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md p-6 text-center animate-in fade-in duration-500 rounded-[2.5rem]">
       <div className="card-secondary shadow-xl shadow-primary/10 flex flex-col items-center max-w-70 border-2 border-primary/20 bg-white/90">
         <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-inner">
           <Lock size={28} fill="currentColor" fillOpacity={0.2} />
         </div>
         <h6 className="header-black-6">Buka {title}</h6>
         <p className="text-[10px] text-gray-400 font-bold mb-5 leading-relaxed">
           Upgrade ke Premium untuk melihat statistik mood bulanan kalian.
         </p>
         <button 
           onClick={() => setIsPricingOpen(true)}
           className="btn btn-secondary-solid tracking-widest transition-transform active:scale-95 text-[10px]"
         >
           Upgrade Sekarang
         </button>
       </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex justify-between items-center">
        <h2 className="header-primary-2">Relationship Stats</h2>
        {/* --- TOGGLE WEEKLY / YEARLY --- */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
          <button 
            onClick={() => setViewType('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewType === 'weekly' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
          >
            <CalendarDays size={14} /> Weekly
          </button>
          <button 
            onClick={() => setViewType('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewType === 'yearly' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
          >
            <BarChart3 size={14} /> Yearly
          </button>
        </div>
      </div>

      {/* --- PAP & REACTION CHART (DINAMIS DARI DB) --- */}
      <div className="card-secondary p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="header-primary-5">Activity Overview</h2>
            <p className="text-xs text-gray-400">Statistik {viewType === 'weekly' ? 'Mingguan' : 'Tahunan'} kalian</p>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <div className="w-3 h-3 bg-primary rounded-full" /> PAP
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <div className="w-3 h-3 bg-light-blue rounded-full" /> Reactions
             </div>
          </div>
        </div>
        
        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-primary font-bold animate-pulse">Loading Stats...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="display" axisLine={false} tickLine={false} tick={{fill: '#FFAFCC', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#FFF5F7'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="pap" name="PAP Sent" fill="#FFAFCC" radius={[6, 6, 0, 0]} barSize={viewType === 'weekly' ? 25 : 40} />
                <Bar dataKey="reaction" name="Reactions" fill="#A0D1FF" radius={[6, 6, 0, 0]} barSize={viewType === 'weekly' ? 25 : 40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- MOOD TRACKER (LOCKED IF NOT PREMIUM) --- */}
        <div className="card-secondary p-8 shadow-sm relative overflow-hidden min-h-100">
          {!isPremium && <LockOverlay title="Monthly Mood" />}
          
          <div className={`transition-all duration-700 ${!isPremium ? 'blur-md opacity-40 scale-95' : ''}`}>
            <h2 className="header-primary-5 mb-1">Monthly Mood</h2>
            <p className="text-xs text-gray-400 mb-6">Mood kalian bulan ini</p>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={moodData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                    {moodData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                {moodData.map((m) => (
                  <div key={m.name} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: m.color}} />
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- DUMMY INFO/TOP REACTIONS --- */}
        <div className="card-secondary p-8 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="text-primary" size={40} />
            </div>
            <h3 className="header-primary-5">More Stats Coming Soon</h3>
            <p className="text-xs text-gray-400 max-w-50">Kami sedang menyiapkan statistik interaksi yang lebih mendalam untukmu.</p>
        </div>
      </div>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </div>
  );
}