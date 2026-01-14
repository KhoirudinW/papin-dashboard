import React, { Suspense } from 'react';
import { PairCode } from './PairCode';
import Link from 'next/link';
import { GenderBtn } from './GenderBtn';
import Charts from './Charts';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface StatCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: IconDefinition; // Menggunakan tipe data dari FontAwesome
}

export const StatCard = ({ title, value, unit, icon }: StatCardProps) => (
  <div className="bg-secondary p-6 md:p-12 rounded-md flex flex-col items-center justify-center flex-1 inset-shadow-sm inset-shadow-gray border border-white min-w-35">
    <div className="flex items-center gap-2 md:gap-3 mb-2">
      <div className="bg-white p-1.5 md:p-2 rounded-md text-primary flex items-center justify-center">
        {/* Menggunakan FontAwesomeIcon */}
        <FontAwesomeIcon 
          icon={icon} 
          className="fa-xl" 
        />
      </div>
      <h3 className="text-white font-bold text-sm md:text-xl truncate">{title}</h3>
    </div>
    <div className="text-2xl md:text-4xl font-black text-primary-hovered">
      {value} <span className="text-xs md:text-sm font-normal text-gray-400 italic">/ {unit}</span>
    </div>
  </div>
);

export const PairCodeCard = () => (
    <div className="card-secondary shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-6">
        <h3 className="text-primary-hovered font-bold text-xl md:text-2xl">Pair code:</h3>
        
        <PairCode/>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-8 items-center justify-center">
        <Link href={'/profile'} className="w-full sm:w-auto btn btn-primary-stroke text-sm">
          Lihat Detail
        </Link>
        <a href='/download' className="w-full sm:w-auto btn btn-primary-solid text-sm">
          Unduh Aplikasi
        </a>
      </div>
      <Suspense fallback={<div className="h-20 animate-pulse bg-gray-100 rounded-xl" />}>
        <GenderBtn />
      </Suspense>
    </div>
  );

// 3. Preset Table Card - Responsif: Container scrollable untuk tabel di layar kecil
export const PresetCard = () => (
  <div className="card-secondary shadow-lg">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-primary-hovered font-bold text-xl md:text-2xl">Preset :</h3>
      <Link href={'/preset-reaction'} className="btn btn-primary-stroke scale-75">Lihat Detail</Link>
    </div>
    
    <div className="overflow-x-auto rounded-sm border border-pink-100">
      <table className="w-full text-left border-collapse min-w-75">
        <thead className="bg-primary text-white">
          <tr>
            <th className="p-3 text-xs font-bold uppercase tracking-wider">No</th>
            <th className="p-3 text-xs font-bold uppercase tracking-wider">Reaksi</th>
          </tr>
        </thead>
        <tbody className="text-[10px] md:text-xs">
          {[1, 2].map((i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-pink-50/30 transition-colors">
              <td className="p-3 border-r border-pink-50 font-medium text-gray-500">{i}</td>
              <td className="p-3 whitespace-nowrap">"❤️", "😊", "👍", "😁", "😴", "😅", "👎", "🙄"</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);



export const ChartCard = () => {
  return (
    <div className="card-secondary shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <div>
          <h3 className="text-primary-hovered font-bold text-xl md:text-2xl">PAP Activity</h3>
          <p className="text-xs text-gray-400">Statistik pertukaran foto kalian</p>
        </div>
        
        {/* Link ke halaman statistik utama */}
        <Link href="/statistic">
          <button className="btn btn-primary-stroke scale-90 hover:scale-100 transition-transform">
            Lihat Detail
          </button>
        </Link>
      </div>

      <Charts/>

      {/* Legend Sederhana */}
      <div className="flex justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-light-blue" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Alex</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sarah</span>
        </div>
      </div>
    </div>
  );
};