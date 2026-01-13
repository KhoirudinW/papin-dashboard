"use client";

import React from 'react';
import { Check, X, Sparkles, Crown } from 'lucide-react';
import simpleImg from 'pub/assets/simple.png'
import proImg from 'pub/assets/pro.png'
import freeImg from 'pub/assets/free.png'
import Image from 'next/image';

interface Plan {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  // Ubah ke React.ReactNode agar bisa menerima <Image /> atau <LucideIcon />
  icon: React.ReactNode; 
  isCurrent?: boolean;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const plans: Plan[] = [
    {
      name: 'Gratis',
      price: 'Rp 0',
      description: 'Fitur standar untuk pasangan baru.',
      features: ['2 Slot Preset Reaksi', 'Limit 5 PAP / Hari', 'Akses Komunitas'],
      buttonText: 'Paket Aktif',
      icon: <Image src={freeImg} alt="Free Plan" width={24} height={24} />,
      isCurrent: true,
    },
    {
      name: 'Simple',
      price: 'Rp 49.000',
      description: 'Langkah awal pengalaman lebih intim.',
      features: ['5 Slot Preset Reaksi', 'Unlimited PAP', 'Mood Harian', 'Tanpa Iklan'],
      buttonText: 'Pilih Simple',
      icon: <Image src={simpleImg} alt="Simple Plan" width={24} height={24} />,
    },
    {
      name: 'Pro',
      price: 'Rp 99.000',
      description: 'Solusi lengkap tanpa batasan apapun.',
      features: [
        'Semua fitur Simple',
        'Unlimited Reaction Preset',
        'Statistik Lengkap',
        'Widget Eksklusif',
        'Custom Tema Chat',
      ],
      buttonText: 'Langganan Pro',
      icon: <Image src={proImg} alt="Pro Plan" width={24} height={24} />,
    },
  ];

  const handleCheckout = (planName: string) => {
    console.log(`Inisiasi pembayaran untuk: ${planName}`);
    alert(`Menuju pembayaran paket ${planName}...`);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-pink-100/40 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-pink-50">
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 text-gray-300 hover:text-primary-hovered transition-colors z-10"
        >
          <X size={32} />
        </button>

        <div className="p-8 md:p-14">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-primary-hovered">Upgrade Level Cinta</h2>
            <p className="text-gray-400 mt-3 text-lg font-medium">Pilih paket yang paling pas untuk kalian berdua.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`flex flex-col p-8 rounded-[2.5rem] transition-all duration-500 relative ${
                  plan.isCurrent 
                  ? 'bg-gray-50/50 border-2 border-dashed border-gray-200 opacity-80' 
                  : index === 2 ? 'card-primary scale-105 shadow-pink-200' : 'card-secondary'
                }`}
              >
                {index === 2 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-hotext-primary-hovered text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-md">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-black text-gray-700">{plan.name}</h3>
                </div>

                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-black text-primary-hovered">{plan.price}</span>
                  <span className="ml-2 text-gray-400 font-bold">/bln</span>
                </div>
                <p className="mt-3 text-gray-500 text-sm font-medium leading-relaxed">{plan.description}</p>

                <div className="my-8 border-t border-pink-50"></div>

                <ul className="space-y-4 mb-10 grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-[13px] text-gray-600 font-bold">
                      <div className="mr-3 mt-0.5 bg-pink-50 rounded-full p-1 shrink-0">
                        <Check className="text-primary-hovered" size={12} strokeWidth={4} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={plan.isCurrent}
                  onClick={() => handleCheckout(plan.name)}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                    plan.isCurrent
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : index === 2
                      ? 'btn-secondary-solid' 
                      : 'btn-secondary-stroke'
                  }`}
                >
                  {plan.isCurrent ? 'Sedang Digunakan' : plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-pink-50/30 py-4 text-center border-t border-pink-50 text-[10px] text-primary-hovered font-bold uppercase tracking-widest">
           Secure Payment with SSL Encryption ❤️
        </div>
      </div>
    </div>
  );
};

export default PricingModal;