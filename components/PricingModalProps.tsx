"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Plan = {
  id: string;
  name: string;
  price: number;
  description: string;
};

type SnapResult = {
  order_id?: string;
};

type CheckoutDiscount = {
  claimId: string;
  percent: number;
  amount: number;
  finalAmount: number;
};

type TokenizerResponse = {
  token: string;
  orderId: string;
  redirectUrl: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
  };
  discount?: CheckoutDiscount | null;
};

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: SnapResult) => void;
          onPending?: (result: SnapResult) => void;
          onError?: (result: SnapResult) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
};

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { planName: currentPlan, loading: subLoading } = useSubscription();
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutDiscount, setCheckoutDiscount] = useState<CheckoutDiscount | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, price, description")
        .order("price", { ascending: true });

      if (error || !data) {
        setDbPlans([]);
        return;
      }

      setDbPlans(data as Plan[]);
    };

    if (isOpen) {
      void fetchPlans();
      setCheckoutMessage("");
      setCheckoutError("");
      setCheckoutDiscount(null);
      setProcessingPlanId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const confirmPaymentStatus = async (orderId: string) => {
    if (!user?.me?.pair_id || !user?.me?.pair_code) {
      throw new Error("Sesi pair tidak valid. Silakan login ulang.");
    }

    const response = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        pairId: user.me.pair_id,
        pairCode: user.me.pair_code,
      }),
    });

    const payload = (await response.json()) as { message?: string; paymentStatus?: string; activated?: boolean };
    if (!response.ok) {
      throw new Error(payload.message || "Gagal sinkron status pembayaran.");
    }

    return payload;
  };

  const handleCheckout = async (plan: Plan) => {
    if (plan.price <= 0) return;

    if (typeof window.snap === "undefined") {
      setCheckoutError("Midtrans Snap belum siap. Coba beberapa detik lagi.");
      return;
    }

    if (!user?.me?.pair_id || !user?.me?.pair_code) {
      setCheckoutError("Sesi pair tidak valid. Silakan login ulang.");
      return;
    }

    setProcessingPlanId(plan.id);
    setCheckoutError("");
    setCheckoutMessage("");
    setCheckoutDiscount(null);

    try {
      const response = await fetch("/api/tokenizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId: user.me.pair_id,
          pairCode: user.me.pair_code,
          planId: plan.id,
        }),
      });

      const data = (await response.json()) as Partial<TokenizerResponse> & { message?: string };
      if (!response.ok || !data.token || !data.orderId) {
        throw new Error(data.message || "Gagal membuat sesi pembayaran.");
      }
      setCheckoutDiscount(data.discount || null);

      window.snap.pay(data.token, {
        onSuccess: async (result) => {
          try {
            const orderId = result.order_id || data.orderId!;
            const confirm = await confirmPaymentStatus(orderId);
            setCheckoutMessage(confirm.message || "Pembayaran berhasil diverifikasi.");
            window.location.reload();
          } catch (error: unknown) {
            setCheckoutError(getErrorMessage(error, "Pembayaran berhasil, tapi sinkron status gagal."));
          }
        },
        onPending: async (result) => {
          try {
            const orderId = result.order_id || data.orderId!;
            const confirm = await confirmPaymentStatus(orderId);
            setCheckoutMessage(confirm.message || "Pembayaran masih pending.");
          } catch (error: unknown) {
            setCheckoutError(getErrorMessage(error, "Status pembayaran pending, tapi sinkron gagal."));
          }
        },
        onError: async (result) => {
          try {
            const orderId = result.order_id || data.orderId!;
            await confirmPaymentStatus(orderId);
          } catch {
            // Abaikan error sinkron saat onError
          }
          setCheckoutError("Pembayaran gagal, silakan coba lagi.");
        },
        onClose: () => {
          setCheckoutMessage("Pembayaran dibatalkan. Kamu bisa coba lagi kapan saja.");
        },
      });
    } catch (error: unknown) {
      setCheckoutError(getErrorMessage(error, "Checkout gagal diproses."));
    } finally {
      setProcessingPlanId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-pink-100/60 backdrop-blur-md animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-[3rem] shadow-2xl overflow-y-auto border border-pink-50 animate-in zoom-in">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-300 hover:text-primary z-20 p-2">
          <X size={32} />
        </button>

        <div className="p-6 md:p-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black text-primary-hovered">Upgrade Level Cinta</h2>
            <p className="text-gray-400 mt-2 font-medium">
              Aktifkan fitur eksklusif untuk hubungan yang lebih erat.
            </p>
          </div>

          {checkoutMessage && (
            <div className="mb-6 p-4 rounded-2xl border border-green-100 bg-green-50 text-green-700 text-xs font-bold">
              {checkoutMessage}
            </div>
          )}

          {checkoutError && (
            <div className="mb-6 p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-xs font-bold">
              {checkoutError}
            </div>
          )}

          {checkoutDiscount && (
            <div className="mb-6 p-4 rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 text-xs font-bold">
              Diskon {checkoutDiscount.percent}% diterapkan. Hemat{" "}
              {formatPrice(checkoutDiscount.amount)}, total bayar{" "}
              {formatPrice(checkoutDiscount.finalAmount)}.
            </div>
          )}

          {subLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-xs font-black text-primary uppercase tracking-widest">Memuat Data Paket...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {dbPlans.map((plan) => {
                const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
                const isProcessing = processingPlanId === plan.id;
                const featureList = plan.description.split(". ");

                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col p-8 rounded-3xl transition-all duration-500 relative border-2 ${
                      isCurrent
                        ? "bg-gray-50/50 border-dashed border-gray-300"
                        : plan.name === "Pro"
                          ? "bg-white border-primary shadow-xl scale-105 z-10"
                          : "bg-white border-gray-100 shadow-sm"
                    }`}
                  >
                    {plan.name === "Pro" && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full">
                        Best Value
                      </div>
                    )}

                    <h3 className="text-2xl font-black text-gray-700 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline mb-6">
                      <span className="text-4xl font-black text-primary-hovered">{formatPrice(plan.price)}</span>
                      <span className="ml-2 text-gray-400 font-bold text-sm">/bln</span>
                    </div>

                    <div className="my-4 border-t border-pink-50" />

                    <ul className="space-y-4 mb-10 grow">
                      {featureList.map((feature, idx) => (
                        <li
                          key={`${plan.id}-${idx}`}
                          className="flex items-start text-[13px] text-gray-600 font-bold italic leading-tight"
                        >
                          <Check className="text-primary mr-3 shrink-0" size={16} strokeWidth={4} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      disabled={isCurrent || isProcessing || processingPlanId !== null}
                      onClick={() => void handleCheckout(plan)}
                      className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                        isCurrent
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : plan.name === "Pro"
                            ? "bg-primary text-white shadow-lg hover:brightness-110"
                            : "border-2 border-primary text-primary hover:bg-pink-50"
                      }`}
                    >
                      {isCurrent
                        ? "Sedang Digunakan"
                        : isProcessing
                          ? "Memproses..."
                          : `Pilih ${plan.name}`}
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
