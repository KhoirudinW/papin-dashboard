"use client";
import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { SettingsDropdown as ModalAcc } from './ModalAcc';
import { useAuth } from "@/hooks/useAuth"; //

const TopNavBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mengambil data user yang sedang login dari session
  const { user } = useAuth();

  // Jika session belum dimuat atau user tidak ada
  const userDisplay = {
    name: user?.me?.name || 'User', // Mengambil nama dari role "me"
    role: user?.me?.role || '', // Menyimpan informasi role (A atau B)
    avatar: user?.me?.photo_url || "https://i.pravatar.cc/150?img=49", 
  };
  

  return (
    <header className="flex justify-end sm:justify-between items-center p-4 bg-white">
      {/* Left Side: Menampilkan Nama sesuai user yang login */}
      <div className="text-gray-800 font-medium text-lg hidden md:block">
        Welcome, <span className="capitalize font-bold">{userDisplay.name}</span>
        {userDisplay.role && (
          <span className="ml-2 text-[10px] bg-pink-50 text-[#FF90BC] px-2 py-1 rounded-full uppercase">
            Role {userDisplay.role == "A" ? "pria" : "wanita" }
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
            className="flex items-center bg-pink-100 hover:bg-pink-200 transition-colors rounded-full p-1 pr-3 gap-2"
          >
            <img
              src={userDisplay.avatar}
              alt="User Avatar"
              className="w-8 h-8 rounded-full object-cover border-2 border-white"
            />
            {/* Nama kecil di samping avatar untuk mobile/tablet */}
            <span className="text-xs font-bold text-gray-600 hidden lg:block">
              {userDisplay.name}
            </span>
            <div className="bg-white rounded-full p-1 shadow-sm">
              <FaChevronDown className={`text-pink-400 text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Modal Dropdown */}
          <div className="absolute right-0 mt-2 z-50">
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