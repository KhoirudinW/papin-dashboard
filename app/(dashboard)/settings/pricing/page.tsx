"use client";

import React, { useState } from 'react';
import { 
  ArrowLeftCircle, CreditCard, Calendar, 
  Sparkles, History, ExternalLink,
  CheckCircle2, AlertCircle, Loader2, Trash2, Info
} from 'lucide-react';
import Link from 'next/link';
import PricingModal from '@/components/PricingModalProps'; 
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  
  const { planName, isPremium, daysRemaining, loading } = useSubscription();

  const handleCancelPlan = async () => {
    const confirmCancel = window.confirm(
      "Apakah Anda yakin ingin membatalkan paket? \n\nKeterangan: Pengembalian dana (Refund) akan diproses dalam waktu 2x24 jam ke metode pembayaran asal."
    );

    if (confirmCancel) {
      setIsCancelLoading(true);
      try {
        // Panggil API pembatalan Anda di sini
        // await fetch('/api/subscription/cancel', { method: 'POST' });
        alert("Permintaan pembatalan terkirim. Uang akan kembali dalam 2x24 jam.");
        window.location.reload();
      } catch (error) {
        alert("Gagal memproses pembatalan.");
      } finally {
        setIsCancelLoading(false);
      }
    }
  };

  const getPlanDetails = () => {
    switch(planName.toLowerCase()) {
      case 'pro': return { price: "Rp 50.000", color: "text-primary" };
      case 'simple': return { price: "Rp 15.000", color: "text-primary" };
      default: return { price: "Rp 0", color: "text-gray-400" };
    }
  };

  const details = getPlanDetails();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-xs font-black text-primary uppercase tracking-widest">Syncing Love Data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <PricingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-primary active:scale-95">
            <ArrowLeftCircle size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-xs font-black uppercase tracking-wider">Back</span>
          </Link>
          <h2 className="header-primary-2 text-primary">Subscription</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden bg-white p-8 rounded-[3rem] border border-pink-100 shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="bg-pink-50 text-primary text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-pink-100">
                  Paket Saat Ini
                </span>
                {isPremium && (
                  <button 
                    onClick={handleCancelPlan}
                    disabled={isCancelLoading}
                    className="flex items-center gap-1.5 text-[10px] font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                  >
                    {isCancelLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Cancel Plan
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-4xl font-black text-gray-800 flex items-center gap-3 capitalize">
                    {planName} 
                    {isPremium && <CheckCircle2 size={24} className="text-green-500" />}
                  </h3>
                  <p className="text-gray-400 font-medium text-sm mt-1 italic">
                    {isPremium ? `Premium member aktif` : "Status Basic"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biaya Paket</p>
                  <p className={`text-2xl font-black ${details.color}`}>{details.price}<span className="text-xs text-gray-300">/bln</span></p>
                </div>
              </div>

              {/* Info Refund khusus untuk user Premium */}
              {isPremium && (
                <div className="mt-6 p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-500 leading-relaxed">
                    Pembatalan paket akan menghentikan fitur premium seketika. 
                    <span className="block font-black mt-1">Uang kembali (Refund) akan diproses otomatis dalam 2x24 jam.</span>
                  </p>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                      <Calendar size={18} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Sisa Masa Aktif</p>
                      <p className="text-xs font-bold text-gray-600">
                        {isPremium ? `${daysRemaining} Hari lagi` : "Selamanya"}
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                      <CreditCard size={18} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Metode Bayar</p>
                      <p className="text-xs font-bold text-gray-600">{isPremium ? "Midtrans Snap" : "Free Access"}</p>
                   </div>
                </div>
              </div>

              {planName.toLowerCase() !== 'pro' && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full mt-10 py-4 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Sparkles size={18} />
                  Upgrade Kecepatan Cinta
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Riwayat Transaksi */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
            <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2 italic text-sm">
              <History size={18} className="text-primary" />
              Recent Billing
            </h4>
            
            <div className="space-y-4">
                <div className="group p-4 rounded-2xl border border-gray-50 hover:border-pink-100 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">{planName} Plan</p>
                    <span className="text-[9px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                      Success
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400">Current Session</p>
                      <p className="text-xs font-black text-gray-600 mt-0.5">{details.price}</p>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}