"use client";

import React, { useState } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const PairCode = () => {
  // Secara default kita sembunyikan (true)
  const [isHidden, setIsHidden] = useState(true);
  const { user } = useAuth();

  // 1. Guard Clause: Jika user belum load, tampilkan loading/skeleton
  if (!user || !user.me) {
    return (
      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg animate-pulse w-32 h-9">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  const pairCode = user.me.pair_code || "";

  return (
    <div 
      className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors group"
      onClick={() => setIsHidden(!isHidden)}
      title={isHidden ? "Show Pair Code" : "Hide Pair Code"}
    >
      <span className="font-mono font-bold text-gray-700 text-sm md:text-base tracking-wider select-none">
        {/* Perbaikan Logika: 
            Jika isHidden true -> tampilkan titik
            Jika isHidden false -> tampilkan kode asli */}
        {isHidden ? 
          "•".repeat(pairCode.length || 7) : 
          pairCode
        }
      </span>
      
      {/* Icon menyesuaikan state isHidden */}
      {isHidden ? (
        <EyeOff size={18} className="text-primary-hovered group-hover:scale-110 transition-transform" />
      ) : (
        <Eye size={18} className="text-primary-hovered group-hover:scale-110 transition-transform" />
      )}
    </div>
  );
};