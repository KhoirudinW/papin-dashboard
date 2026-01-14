"use client";

import React from 'react';
import { 
  LogOut, 
  User, 
  Bell, 
  ChevronRight,
  Moon,
  Settings,
  House,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link'; // Import Link untuk navigasi ke profil

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    avatar: string;
  };
}

export const SettingsDropdown = ({ isOpen, onClose, user }: SettingsDropdownProps) => {
  const { logout } = useAuth(); // Ambil fungsi logout dari hook

  if (!isOpen) return null;

  const menuItems = [
    { icon: <House size={18} />, label: 'Dashboard', color: 'text-primary', bg: 'bg-purple-50', href: '/dashboard' },
    { 
      icon: <User size={18} />, 
      label: 'Profil Saya', 
      color: 'text-blue-400', 
      bg: 'bg-blue-50',
      href: '/profile' // Tambahkan path
    },
    { icon: <Settings size={18} />, label: 'Pengaturan', color: 'text-gray-400', bg: 'bg-gray-100', href: '#' },
    { icon: <Bell size={18} />, label: 'Notifikasi', color: 'text-orange-400', bg: 'bg-orange-50', href: '#' },
  ];

  // Perbaikan fungsi handleLogout
  const handleLogoutAction = () => {
    logout(); // Memanggil fungsi logout dengan kurung ()
    onClose(); // Tutup dropdown
  };

  return (
    <>
      {/* Overlay transparan */}
      <div className="fixed inset-0 z-90" onClick={onClose} />

      {/* Dropdown Card */}
      <div className="absolute right-2 mt-10 w-64 bg-white rounded-md shadow-xl border border-pink-50 z-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
        
        {/* Profile Header Mini */}
        <div className="p-5 border-b border-pink-50 flex items-center gap-3 bg-gradient-to-r from-pink-50/50 to-white">
          <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shrink-0 shadow-sm">
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-gray-700 truncate leading-tight text-sm">{user.name}</p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Active Account</p>
          </div>
        </div>

        {/* Menu List */}
        <div className="p-2">
          {menuItems.map((item, idx) => (
            <Link 
              key={idx} 
              href={item.href} 
              onClick={onClose}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-pink-50/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`${item.bg} ${item.color} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-[13px] font-bold text-gray-500 group-hover:text-primary-hovered">
                  {item.label}
                </span>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-hovered transition-transform group-hover:translate-x-1" />
            </Link>
          ))}

          <div className="my-2 border-t border-pink-50 mx-2" />

          {/* Logout Button */}
          <button 
            onClick={handleLogoutAction} // Menggunakan fungsi yang sudah diperbaiki
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-400 hover:bg-red-50 transition-all group"
          >
            <div className="bg-red-50 p-2 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-[13px] font-bold">Keluar</span>
          </button>
        </div>
      </div>
    </>
  );
};