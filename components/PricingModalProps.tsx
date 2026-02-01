"use client";

import React, { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase'; // Sesuaikan setup database kamu

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    snap: {
      pay: (token: string, callbacks: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { planName: currentPlan, loading: subLoading } = useSubscription();
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ambil list plan dari database (Referensi Gambar 2)
  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      if (data) setDbPlans(data);
    };
    if (isOpen) fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleCheckout = async (plan: any) => {
    if (plan.price === 0 || typeof window.snap === 'undefined') return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/tokenizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          amount: plan.price,
        }),
      });

      const data = await response.json();
      window.snap.pay(data.token, {
        onSuccess: () => { alert("Pembayaran Berhasil!"); window.location.reload(); },
        onPending: () => alert("Selesaikan pembayaranmu di aplikasi terkait."),
        onError: () => alert("Pembayaran gagal, silakan coba lagi."),
      });
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-pink-100/60 backdrop-blur-md animate-in fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-[3rem] shadow-2xl overflow-y-auto border border-pink-50 animate-in zoom-in">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-300 hover:text-primary z-20 p-2">
          <X size={32} />
        </button>

        <div className="p-6 md:p-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black text-primary-hovered">Upgrade Level Cinta</h2>
            <p className="text-gray-400 mt-2 font-medium">Aktifkan fitur eksklusif untuk hubungan yang lebih erat.</p>
          </div>

          {subLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-xs font-black text-primary uppercase tracking-widest">Memuat Data Paket...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {dbPlans.map((plan) => {
                // Cek status aktif (Bandingkan nama plan dari database dengan hook)
                const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
                // Parsing deskripsi dari database (Referensi Gambar 2)
                const featureList = plan.description.split('. ');

                return (
                  <div key={plan.id} className={`flex flex-col p-8 rounded-3xl transition-all duration-500 relative border-2 ${
                    isCurrent ? 'bg-gray-50/50 border-dashed border-gray-300' :
                    plan.name === 'Pro' ? 'bg-white border-primary shadow-xl scale-105 z-10' : 'bg-white border-gray-100 shadow-sm'
                  }`}>
                    
                    {plan.name === 'Pro' && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full">
                        Best Value
                      </div>
                    )}

                    <h3 className="text-2xl font-black text-gray-700 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline mb-6">
                      <span className="text-4xl font-black text-primary-hovered">{formatPrice(plan.price)}</span>
                      <span className="ml-2 text-gray-400 font-bold text-sm">/bln</span>
                    </div>

                    <div className="my-4 border-t border-pink-50"></div>

                    <ul className="space-y-4 mb-10 grow">
                      {featureList.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start text-[13px] text-gray-600 font-bold italic leading-tight">
                          <Check className="text-primary mr-3 shrink-0" size={16} strokeWidth={4} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      disabled={isCurrent || isProcessing}
                      onClick={() => handleCheckout(plan)}
                      className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                        isCurrent ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                        plan.name === 'Pro' ? 'bg-primary text-white shadow-lg hover:brightness-110' : 'border-2 border-primary text-primary hover:bg-pink-50'
                      }`}
                    >
                      {isCurrent ? 'Sedang Digunakan' : isProcessing ? 'Memproses...' : `Pilih ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingModal;