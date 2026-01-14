"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export const BackButton = () => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()} // Ini akan kembali ke halaman terakhir apapun itu
      className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-pink-50 hover:text-primary active:scale-95"
    >
      <div className="p-1 rounded-lg bg-gray-50 group-hover:bg-white transition-all group-hover:-translate-x-1">
        <ArrowLeft 
          size={16} 
          className="" 
        />
      </div>
      <span className="text-xs font-black uppercase tracking-wider">Back</span>
    </button>
  );
};