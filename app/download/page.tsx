"use client";
import React from 'react';
import { Download, Smartphone, ShieldCheck, Zap, Info, ArrowLeftCircle } from 'lucide-react';
import Navbar from '@/components/Navbar'; // Sesuaikan path navbar kamu
import { BackButton } from '@/components/BackButton';

export default function DownloadPage() {
  const downloadAPK = () => {
    // Ganti dengan URL link APK yang sudah kamu upload ke Supabase Storage atau hosting lain
    window.location.href = "github.com/KhoirudinW/papin-dashboard/releases/latest";
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Content */}
          <div className="space-y-8 order-2 lg:order-1">
            <BackButton/>
            <div className="space-y-4">
                <span className="bg-pink-100 text-pink-500 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
                    Available Now
                </span>
                <h1 className="text-4xl md:text-6xl font-black text-gray-800 leading-tight">
                    Stay Connected <br />
                    <span className="text-primary">Everywhere.</span>
                </h1>
                <p className="text-gray-500 font-medium max-w-7xl leading-relaxed">
                    Nikmati fitur eksklusif, notifikasi real-time, dan pengalaman berbagi PAP yang lebih lancar langsung dari smartphone kamu.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={downloadAPK}
                className="btn btn-primary-solid flex items-center justify-center gap-3 px-8 py-4 text-lg shadow-xl shadow-pink-200 transition-transform active:scale-95"
              >
                <Download size={24} /> Download APK
              </button>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Version 1.0.0-beta.1 (early access)</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Size: ~120 MB</span>
              </div>
            </div>

            {/* Features Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-3xl border border-pink-50">
                <div className="p-2 bg-blue-50 text-blue-400 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-700 uppercase">Safe & Secure</h4>
                  <p className="text-[10px] text-gray-400 font-bold leading-tight">Verified by Papin Dev Team</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-3xl border border-pink-50">
                <div className="p-2 bg-yellow-50 text-yellow-400 rounded-xl">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-700 uppercase">Fast Sync</h4>
                  <p className="text-[10px] text-gray-400 font-bold leading-tight">Instant photo exchange</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Mockup Image */}
          <div className="order-1 lg:order-2 flex justify-center items-center relative">
            <div className="absolute w-[300px] h-[300px] bg-pink-200/30 rounded-full blur-3xl animate-pulse" />
            {/* Ganti src dengan gambar mockup hp aplikasi kamu */}
            <img 
              src="assets/about.png" 
              alt="App Mockup" 
              className="w-full max-w-[200px] drop-shadow-[0_35px_35px_rgba(255,144,188,0.3)] z-10"
              width={400}
              height={400}
            />
          </div>
        </div>

        {/* Instruction Section */}
        <section className="mt-12 bg-white p-6 md:p-8 rounded-[2rem] border border-pink-50 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-primary">
              <Smartphone size={28} />
            </div>
            <h2 className="header-primary-4">Cara Instalasi</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-500 text-sm">1</div>
              <h4 className="font-black text-gray-700 uppercase text-xs">Download APK</h4>
              <p className="text-[11px] text-gray-400 font-bold leading-relaxed">Tekan tombol download di atas untuk mendapatkan file installer terbaru.</p>
            </div>
            <div className="space-y-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-500 text-sm">2</div>
              <h4 className="font-black text-gray-700 uppercase text-xs">Izinkan Sumber Tidak Dikenal</h4>
              <p className="text-[11px] text-gray-400 font-bold leading-relaxed">Buka Pengaturan HP {`>`} Keamanan {`>`} Aktifkan 'Instal Aplikasi dari sumber tidak dikenal'.</p>
            </div>
            <div className="space-y-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-500 text-sm">3</div>
              <h4 className="font-black text-gray-700 uppercase text-xs">Instal & Login</h4>
              <p className="text-[11px] text-gray-400 font-bold leading-relaxed">Buka file yang sudah didownload, instal, dan login menggunakan akun kamu.</p>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl text-blue-500 border border-blue-100">
            <Info size={18} />
            <p className="text-[10px] font-bold tracking-tight uppercase">Saat ini hanya tersedia untuk Android. Versi iOS akan segera hadir di App Store.</p>
          </div>
        </section>
      </main>
    </div>
  );
}