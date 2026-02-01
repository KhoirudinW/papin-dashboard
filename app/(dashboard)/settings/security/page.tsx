"use client";
import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Smartphone, Key, 
  ArrowLeftCircle, AlertCircle, Loader2, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulasi proses update password
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* Header Navigasi */}
      <div className="flex items-center gap-4">
        <Link href="/settings" className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-primary active:scale-95">
          <ArrowLeftCircle size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-black uppercase tracking-wider">Back</span>
        </Link>
        <h2 className="header-primary-2 text-primary">Keamanan Akun</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Ganti Password */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-pink-50 rounded-2xl text-primary">
                <Lock size={20} />
              </div>
              <h3 className="font-black text-gray-800 italic">Ganti Kata Sandi</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Password Saat Ini</label>
                <input 
                  type="password" 
                  className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Password Baru</label>
                <input 
                  type="password" 
                  className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="Minimal 8 karakter"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="Ulangi password baru"
                />
              </div>

              <button 
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 hover:brightness-110 active:scale-95 transition-all disabled:bg-gray-200 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : success ? <CheckCircle2 size={18} /> : null}
                {loading ? "Memproses..." : success ? "Berhasil Diperbarui" : "Update Password"}
              </button>
            </form>
          </div>

          {/* Sesi Aktif
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
             <h3 className="font-black text-gray-800 italic mb-6 flex items-center gap-3">
               <Smartphone size={20} className="text-blue-500" />
               Sesi Perangkat
             </h3>
             <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Smartphone size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-800">iPhone 14 Pro — Jakarta</p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Perangkat Saat Ini</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-green-500 bg-white px-3 py-1 rounded-full shadow-sm">AKTIF</span>
             </div>
          </div> */}
        </div>

        {/* Info Keamanan (Sesuai Privacy Policy) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800 to-black p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <ShieldCheck className="absolute -bottom-6 -right-6 text-white/10" size={150} />
            <div className="relative z-10 space-y-4">
              <h4 className="font-black italic text-lg leading-tight">Standar Keamanan PAPin</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-pink-500 p-1 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
                    Media dienkripsi dengan <strong>AES-256</strong> sebelum disimpan di server[cite: 35, 68].
                  </p>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-pink-500 p-1 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
                    Password tidak pernah disimpan langsung, melainkan di-hash menggunakan metode aman.
                  </p>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-pink-500 p-1 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
                    Akses data dilindungi oleh <strong>Supabase RLS</strong> untuk mencegah akses tidak sah.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-[2rem] flex gap-4">
             <AlertCircle className="text-yellow-500 shrink-0" size={20} />
             <div>
               <h5 className="text-[10px] font-black uppercase text-yellow-700 tracking-wider mb-1">Tips Keamanan</h5>
               <p className="text-[10px] font-bold text-yellow-600/80 leading-relaxed italic">
                 Jangan pernah membagikan Pair Code kamu kepada siapapun selain pasanganmu[cite: 49].
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}