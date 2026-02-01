"use client";
import React from 'react';
import { 
  ShieldCheck, Lock, Eye, CloudOff, ArrowLeftCircle, 
  Heart, FileText, Smartphone, UserCheck, Trash2, Mail
} from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const lastUpdated = "7 Desember 2025";

  const policySections = [
    {
      icon: <UserCheck className="text-blue-500" />,
      title: "Data yang Kami Kumpulkan",
      details: [
        "Data Akun: Nama, Username, Email, dan Foto Profil.",
        "Daily PAP: Foto/Video, Caption, Waktu, dan Lokasi.",
        "Teknis: Tipe perangkat, OS, IP Address, dan Token Notifikasi."
      ]
    },
    {
      icon: <Lock className="text-pink-500" />,
      title: "Keamanan",
      details: [
        "Enkripsi Media: Foto di amankan dengan signed url dari supabase",
        "Pair Code: Tidak pernah disimpan langsung, melainkan di-hash menggunakan bcrypt."
      ]
    },
    {
      icon: <Heart className="text-red-500" />,
      title: "Berbagi dengan Pasangan",
      details: [
        "Eksklusif: PAP hanya bisa diakses oleh akun yang terhubung via Pair Code.",
        "Kendali Penuh: Anda dapat memutus hubungan kapan saja.",
        "Pemutusan Akses: Saat hubungan diputus, akses pasangan otomatis dicabut seketika."
      ]
    },
    {
      icon: <Trash2 className="text-orange-500" />,
      title: "Hak & Retensi Data",
      details: [
        "Penghapusan: Jika Anda menghapus akun, seluruh data akan dihapus permanen dalam 30 hari.",
        "Akses & Perbaikan: Anda berhak meminta salinan atau memperbaiki data pribadi Anda.",
        "Tanpa Pihak Ketiga: Kami tidak menggunakan cookie pelacak iklan atau menjual data Anda."
      ]
    }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      {/* Header Navigasi */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-primary active:scale-95">
            <ArrowLeftCircle size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-xs font-black uppercase tracking-wider">Back</span>
          </Link>
          <h2 className="header-primary-2 text-primary">Privacy Policy</h2>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white rounded-[3rem] border border-pink-100 p-8 md:p-12 shadow-sm text-center space-y-4">
        <div className="absolute top-0 right-0 p-10 opacity-5">
            <ShieldCheck size={200} className="text-primary" />
        </div>
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
            <ShieldCheck size={14} /> Keamanan Terjamin
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-800 italic leading-tight">
          Privasimu adalah <span className="text-primary underline decoration-pink-200">Janji Kami.</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-6xl mx-auto leading-relaxed font-medium">
          Di PAPin, kami mengambil perlindungan ekstra dengan standar industri dan kepatuhan terhadap UU PDP untuk memastikan momen manismu tetap menjadi milikmu dan pasanganmu saja.
        </p>
        <div className="pt-4 flex items-center justify-center gap-2 text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span>Last Updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {policySections.map((section, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-md transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm">
              {section.icon}
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-4 italic tracking-tight">{section.title}</h3>
            <ul className="space-y-3">
              {section.details.map((detail, dIdx) => (
                <li key={dIdx} className="flex gap-3 items-start text-xs text-gray-500 leading-relaxed font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-200 mt-1.5 shrink-0" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Technical Security Footer */}
      <div className="card-secondary border-dashed border-2 border-pink-100 bg-pink-50/30 p-8 rounded-[3rem]">
        <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="shrink-0 bg-white p-5 rounded-[2rem] shadow-sm">
                <Smartphone className="text-primary" size={40} />
            </div>
            <div className="space-y-2">
                <h4 className="font-black text-gray-800 uppercase text-sm tracking-wide">Komitmen Keamanan Sistem</h4>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                    Kami menggunakan komunikasi <strong>HTTPS/TLS terenkripsi</strong>, proteksi akses <strong>Supabase RLS (Row-Level Security)</strong>, dan backup sistem berkala. Meskipun tidak ada sistem yang 100% aman, kami berkomitmen memberikan standar terbaik untuk Anda.
                </p>
            </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Ada Pertanyaan?</p>
        <a 
            href="mailto:support@papinapp.com" 
            className="flex items-center gap-3 px-8 py-4 bg-gray-800 text-white rounded-2xl font-black text-sm transition-all hover:bg-black hover:shadow-xl active:scale-95"
        >
            <Mail size={18} />
            Contact Developer
        </a>
      </div>
    </div>
  );
}