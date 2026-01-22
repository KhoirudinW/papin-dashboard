"use client";
import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { SettingsDropdown as ModalAcc } from './ModalAcc';
import { useAuth } from "@/hooks/useAuth"; 
import NoImage from "@/public/assets/NoImage.png"
const TopNavBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mengambil data user dari global state useAuth
  const { user } = useAuth();

  /**
   * Menggunakan optional chaining dan memberikan nilai fallback.
   * Ketika updateUser() dipanggil di halaman Profile, 
   * variabel ini akan otomatis mendapatkan nilai terbaru.
   */
  const userDisplay = {
    name: user?.me?.name || 'User',
    role: user?.me?.role || '',
    // Menambahkan timestamp t=... jika photo_url ada untuk menghindari cache browser di Navbar
    avatar: user?.me?.photo_url 
      ? `${user.me.photo_url}${user.me.photo_url.includes('?') ? '&' : '?'}t=${Date.now()}`
      : NoImage.src, 
  };

  return (
    <header className="flex justify-end sm:justify-between items-center p-4 bg-white">
      {/* Left Side: Welcome Message */}
      <div className="text-gray-800 font-medium text-lg hidden md:block">
        Welcome, <span className="capitalize font-bold">{userDisplay.name}</span>
        {userDisplay.role && (
          <span className="ml-2 text-[10px] bg-pink-50 text-[#FF90BC] px-3 py-1 rounded-full uppercase font-black tracking-wider">
            Role {userDisplay.role === "A" ? "pria" : "wanita" }
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search"
            className="bg-gray-50 border border-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all"
          />
        </div>

        {/* User Profile Widget */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex items-center bg-pink-50 hover:bg-pink-100 transition-colors rounded-full p-1 pr-3 gap-2 border border-pink-100"
          >
            <div className="relative">
              <img
                src={userDisplay.avatar}
                alt="User Avatar"
                // Menambahkan key unik agar React me-refresh elemen img saat avatar berubah
                key={userDisplay.avatar} 
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
              />
            </div>
            
            <span className="text-xs font-bold text-gray-600 hidden lg:block">
              {userDisplay.name}
            </span>
            
            <div className="bg-white rounded-full p-1 shadow-sm flex items-center justify-center w-5 h-5">
              <FaChevronDown className={`text-pink-400 text-[8px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Modal Dropdown */}
          {/* Tambahkan logic untuk menutup saat user klik di luar jika perlu */}
          <div className="absolute right-0 mt-2 z-50 shadow-2xl">
            <ModalAcc 
              isOpen={isOpen} 
              onClose={() => setIsOpen(false)} 
              user={userDisplay}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;