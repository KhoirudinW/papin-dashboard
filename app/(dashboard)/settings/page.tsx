"use client";
import React from 'react';
import { 
  User, Shield, CreditCard,
  ChevronRight, LogOut, LockKeyhole, HandHeart
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const settingsMenu = [
    {
      title: "Account Profile",
      description: "Ubah foto, nama, dan detail pribadimu",
      icon: <User className="text-blue-500" />,
      href: "/profile",
      color: "bg-blue-50"
    },
    {
      title: "Subscription & Plan",
      description: "Upgrade paket dan lihat status pembayaran",
      icon: <CreditCard className="text-purple-500" />,
      href: "/settings/pricing", // Link ke halaman pricing yang kita buat tadi
      color: "bg-purple-50",
      badge: "Upgrade"
    },
    {
      title: "Security",
      description: "Kelola pair code dengan verifikasi 2 orang",
      icon: <Shield className="text-green-500" />,
      href: "/settings/security",
      color: "bg-green-50"
    },
    {
      title: "Privacy & Policy",
      description: "Lihat bagaimana kita menjaga keamanan dan kenyamanan anda",
      icon: <LockKeyhole className="text-yellow-500" />,
      href: "/settings/privacy",
      color: "bg-yellow-50"
    },
    {
      title: "Feedback",
      description: "Beri tanggapan anda tentang papin",
      icon: <HandHeart className="text-primary" />,
      href: "https://forms.gle/GrRtGDpnX7ywRnF26",
      color: "bg-pink-50"
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h2 className="header-primary-2">Settings</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
      {settingsMenu.map((item, index) => {
        // Cek apakah href adalah link eksternal (diawali http)
        const isExternal = item.href.startsWith('http');

        return (
            <Link 
            key={index} 
            href={item.href}
            // Tambahkan dua baris ini untuk membuka tab baru jika link eksternal
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="group flex items-center justify-between p-5 bg-white rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.98]"
            >
            <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl ${item.color} transition-transform group-hover:scale-110`}>
                {item.icon}
                </div>
                <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {item.title}
                </h3>
                <p className="text-xs text-gray-400 font-medium">{item.description}</p>
                </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
        );
        })}
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-gray-100">
        <button className="w-full flex items-center gap-4 p-5 text-red-400 hover:bg-red-50 rounded-[2rem] transition-colors font-bold text-sm italic">
          <div className="p-3 bg-red-50 rounded-xl">
            <LogOut size={18} />
          </div>
          Logout dari Akun
        </button>
      </div>
    </div>
  );
}
