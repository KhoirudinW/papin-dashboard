"use client"; // Wajib karena menggunakan hook usePathname

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faChartColumn, faUserGroup, faFaceSmile, faCalendarDays, faCircleExclamation, faHandshake, faClockRotateLeft, faNewspaper, faHeadset, faShieldHeart, faGear } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/hooks/useAuth'; 

const Sidebar = () => {
  const pathname = usePathname();
  const { user} = useAuth()

  // Tambahkan properti 'href' untuk setiap menu
  const menuItems = [
    { name: 'Dashboard', icon: <FontAwesomeIcon icon={faHouse} className="w-5 h-5" />, href: '/dashboard' },
    { name: 'Statistik', icon: <FontAwesomeIcon icon={faChartColumn} className="w-5 h-5" />, href: '/statistic' },
    { name: 'Data diri', icon: <FontAwesomeIcon icon={faUserGroup} className="w-5 h-5" />, href: '/profile' },
    { name: 'Preset reaksi', icon: <FontAwesomeIcon icon={faFaceSmile} className="w-5 h-5"/>, href: '/preset-reaction' },
    // { name: 'Acara', icon: <FontAwesomeIcon icon={faCalendarDays} className="w-5 h-5"/>, href: '/events' },
    // { name: 'Berita', icon: <FontAwesomeIcon icon={faNewspaper} className="w-5 h-5"/>, href: '/berita' },
    { name: 'Changelog', icon: <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5" />, href: '/changelog' },
    // { name: 'Komunitas', icon: <FontAwesomeIcon icon={faHandshake} className="w-5 h-5"/>, href: '/komunitas' },
    // { name: 'Perjalanan', icon: <FontAwesomeIcon icon={faClockRotateLeft} />, href: '/perjalanan' },
    { name: 'Settings', icon: <FontAwesomeIcon icon={faGear} />, href: '/settings' },
  ];

  const bottomItems = [
    { name: 'Customer service', icon: <FontAwesomeIcon icon={faHeadset} className="w-5 h-5"/>, href: '/cs' },
    { name: 'Privacy & Policy', icon: <FontAwesomeIcon icon={faShieldHeart} className="w-5 h-5"/>, href: '/settings/privacy' },
  ];

  return (
    <aside className="w-64 h-screen bg-primary flex flex-col p-6 text-white overflow-y-auto">
      {/* Logo Section */}
      <div className="flex items-center p-2 gap-3 mb-8">
        <div className="bg-white rounded-full">
          <img src="/assets/logo.png" alt="" width={60} height={60}/>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">PAPin</h1>
      </div>

      <hr className="border-primary-hovered opacity-30 mb-8" />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          // Logika mengecek apakah link sedang aktif
          const isActive = pathname === item.href;

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-full cursor-pointer transition-all ${
                isActive 
                  ? 'bg-primary-hovered text-white shadow-sm' 
                  : 'hover:bg-primary text-white/90'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <hr className="border-primary-hovered opacity-30 my-6" />

      {/* Bottom Navigation */}
      <div className="space-y-2">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-full cursor-pointer transition-all ${
                isActive 
                  ? 'bg-primary-hovered text-white shadow-sm' 
                  : 'hover:bg-primary text-white/90'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;