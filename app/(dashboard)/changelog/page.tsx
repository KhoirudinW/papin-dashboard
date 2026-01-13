"use client";

import React, { useState } from 'react';
import { ChevronDown, History, Info, Sparkles, Rocket, ShieldCheck } from 'lucide-react';

interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  updates: string[];
  type: 'feature' | 'improvement' | 'security';
}

const changelogData: ChangelogItem[] = [
  {
    version: 'v1.0.4',
    date: '05 Januari 2026',
    title: 'Optimasi Dashboard & Modal Pricing',
    updates: [
      'Penambahan Modal Pricing dengan sistem disabled pada paket aktif',
      'Peningkatan responsivitas pada menu navigasi profil',
      'Perbaikan bug pada tampilan chart statistik di perangkat mobile'
    ],
    type: 'improvement'
  },
  {
    version: 'v1.0.3',
    date: '28 Desember 2025',
    title: 'Fitur Baru: Preset Reaksi Custom',
    updates: [
      'User sekarang dapat menambah hingga 10 preset reaksi (Pro)',
      'Integrasi emoji picker yang lebih ringan',
      'Pembaruan UI pada halaman pengaturan akun'
    ],
    type: 'feature'
  },
  {
    version: 'v1.0.2',
    date: '15 Desember 2025',
    title: 'Peningkatan Keamanan Data',
    updates: [
      'Enkripsi end-to-end pada pengiriman PAP',
      'Sistem login dua faktor (2FA) via email',
      'Pembersihan cache otomatis untuk menjaga performa'
    ],
    type: 'security'
  }
];

export default function ChangelogPage() {
  // State untuk melacak accordion mana yang terbuka (null berarti tertutup semua)
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="header-primary-2 mb-4 tracking-tight">Changelog</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* KOLOM KIRI: Changelog Accordion */}
        <div className="lg:col-span-7 space-y-4">
          {changelogData.map((item, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg border-2 border-secondary/50 shadow-lg overflow-hidden transition-all duration-300"
            >
              {/* Accordion Trigger */}
              <button 
                onClick={() => toggleAccordion(index)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-pink-50/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    item.type === 'feature' ? 'bg-blue-50 text-blue-500' : 
                    item.type === 'security' ? 'bg-green-50 text-green-500' : 'bg-pink-50 text-primary-hovered'
                  }`}>
                    {item.type === 'feature' ? <Rocket size={20} /> : 
                     item.type === 'security' ? <ShieldCheck size={20} /> : <Sparkles size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary-hovered bg-pink-50 px-2 py-0.5 rounded-full uppercase">
                        {item.version}
                      </span>
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        {item.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-gray-700 mt-1">{item.title}</h3>
                  </div>
                </div>
                <ChevronDown 
                  size={24} 
                  className={`text-gray-300 transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-primary-hovered' : ''}`} 
                />
              </button>

              {/* Accordion Content */}
              <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  openIndex === index ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-6 pt-0 border-t border-pink-50">
                  <ul className="space-y-3 mt-4">
                    {item.updates.map((update, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-500 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
                        {update}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* KOLOM KANAN: How To (Sama dengan konsep Preset Reaction) */}
        <div className="lg:col-span-5">
          <div className="card-secondary shadow-xl sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-pink-50 rounded-2xl text-primary-hovered">
                <Info size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-secondary">How to</h2>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-500 font-medium leading-relaxed">
                Halaman ini berisi catatan perjalanan pengembangan <b>PAPin</b>. Kami terus berusaha memberikan fitur terbaik untuk hubungan Anda.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 font-black text-xs">F</div>
                  <p className="text-xs text-gray-400 font-bold leading-normal">
                    <span className="text-gray-700 block">Fitur Baru</span>
                    Sesuatu yang baru ditambahkan untuk meningkatkan pengalaman Anda.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-pink-50 text-primary-hovered flex items-center justify-center shrink-0 font-black text-xs">I</div>
                  <p className="text-xs text-gray-400 font-bold leading-normal">
                    <span className="text-gray-700 block">Perbaikan & Optimasi</span>
                    Peningkatan performa dan perbaikan antarmuka pengguna.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-pink-50/50 rounded-3xl border border-dashed border-secondary">
                <p className="text-[11px] text-primary-hovered font-bold text-center italic">
                  "Kritik dan saran kalian sangat berarti bagi kami. Yuk, bangun PAPin bareng-bareng! ❤️"
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}