"use client";
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Lock } from 'lucide-react';
import PricingModal from '@/components/PricingModalProps';


// --- DATA DUMMY ---
const papData = [
  { day: 'Sen', man: 12, woman: 15 },
  { day: 'Sel', man: 10, woman: 8 },
  { day: 'Rab', man: 15, woman: 12 },
  { day: 'Kam', man: 8, woman: 10 },
  { day: 'Jum', man: 18, woman: 20 },
  { day: 'Sab', man: 22, woman: 25 },
  { day: 'Min', man: 20, woman: 18 },
];

const moodData = [
  { name: 'Happy ✨', value: 45, color: '#FFC0D9' },
  { name: 'Romantic ❤️', value: 25, color: '#FF90BC' },
  { name: 'Sad 🥺', value: 15, color: '#A0D1FF' },
  { name: 'Tired 😴', value: 15, color: '#FFF5F5' },
];

const reactionData = [
  { name: 'Love Icon', value: 50, color: '#FF90BC' },
  { name: 'Fire Icon', value: 20, color: '#FFB6C1' },
  { name: 'Laugh Icon', value: 30, color: '#FFF5F5' },
];

export default function StatistikPasangan() {
  const [isPremium, setIsPremium] = useState(false); 
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Overlay hanya untuk kartu tertentu
  const LockOverlay = ({ title }: { title: string }) => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/5 backdrop-blur-xs p-6 text-center animate-in fade-in duration-500">
      <div className="card-secondary shadow-md shadow-primary flex flex-col items-center max-w-70">
        <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-inner">
          <Lock size={28} fill="currentColor" fillOpacity={0.2} />
        </div>
        <h6 className="header-black-6">Buka {title}</h6>
        <p className="text-[10px] text-gray-400 font-bold mb-5 leading-relaxed">
          Upgrade ke Premium untuk melihat statistik mood bulanan kalian.
        </p>
        <button 
          onClick={() => setIsPricingOpen(true)}
          className="btn btn-secondary-solid tracking-widest transition-transform active:scale-95"
        >
          Upgrade Sekarang
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <h2 className="header-primary-2 mb-5">Relationship Stats</h2>

      {/* --- PAP EXCHANGE (TIDAK DI-LOCK) --- */}
      <div className="card-secondary p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="header-primary-5">PAP Exchange</h2>
            <p className="text-xs text-gray-400">Jumlah foto yang dikirim 7 hari terakhir</p>
          </div>
          <button className="btn-secondary-stroke btn">Detail Foto</button>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={papData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#FF90BC', fontWeight: 'bold'}} />
              <YAxis hide />
              <Tooltip cursor={{fill: '#FFF5F7'}} />
              <Bar dataKey="man" name="Alex" fill="#A0D1FF" radius={[8, 8, 0, 0]} barSize={20} />
              <Bar dataKey="woman" name="Sarah" fill="#FF90BC" radius={[8, 8, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- MOOD TRACKER (BAGIAN YANG DI-LOCK) --- */}
        <div className="card-secondary p-8 shadow-sm relative overflow-hidden">
          {!isPremium && <LockOverlay title="Monthly Mood" />}
          
          <div className={`transition-all duration-700 ${!isPremium ? 'blur-md pointer-events-none opacity-50' : ''}`}>
            <h2 className="header-primary-5 mb-1">Monthly Mood</h2>
            <p className="text-xs text-gray-400 mb-6">Mood harian kamu & pasangan</p>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={moodData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {moodData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6 w-full px-4">
                {moodData.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: m.color}} />
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-tight">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- TOP REACTIONS (TIDAK DI-LOCK) --- */}
        <div className="card-secondary p-8 shadow-sm">
          <h2 className="header-primary-5 mb-1">Top Reactions</h2>
          <p className="text-xs text-gray-400 mb-6">Reaksi yang paling sering dikirim</p>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reactionData} innerRadius={0} outerRadius={80} dataKey="value">
                  {reactionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-3 mt-6 w-full px-4">
              {reactionData.map((r) => (
                <div key={r.name} className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-gray-500 uppercase">{r.name}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full" style={{width: `${r.value}%`, backgroundColor: r.color}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </div>
  );
}