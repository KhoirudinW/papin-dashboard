"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftCircle,
  CreditCard,
  Calendar,
  Sparkles,
  History,
  CheckCircle2,
  Loader2,
  Trash2,
  Info,
  TicketPercent,
  Gift,
  Copy,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import PricingModal from "@/components/PricingModalProps";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

type RedeemStatus = "idle" | "loading" | "success" | "error";

type RedeemCodeItem = {
  id: string;
  code: string;
  title: string;
  benefit: string;
  expiresAt: string | null;
};

type RedeemHistoryItem = {
  id: string;
  code: string;
  title: string;
  benefit: string;
  claimedAt: string;
  status: string;
  expiresAt: string | null;
};

const getRedeemBadgeStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "text-green-500 bg-green-50";
    case "used":
      return "text-blue-500 bg-blue-50";
    case "expired":
      return "text-gray-400 bg-gray-100";
    case "revoked":
      return "text-red-500 bg-red-50";
    default:
      return "text-gray-400 bg-gray-100";
  }
};

const getRedeemBadgeLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "ACTIVE";
    case "used":
      return "USED";
    case "expired":
      return "EXPIRED";
    case "revoked":
      return "REVOKED";
    default:
      return status.toUpperCase();
  }
};

const formatDateLabel = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<RedeemStatus>("idle");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [activeRedeem, setActiveRedeem] = useState<RedeemHistoryItem | null>(null);
  const [isRedeemContextLoading, setIsRedeemContextLoading] = useState(false);
  const [redeemContextError, setRedeemContextError] = useState("");
  const [availableCodes, setAvailableCodes] = useState<RedeemCodeItem[]>([]);
  const [redeemHistory, setRedeemHistory] = useState<RedeemHistoryItem[]>([]);

  const { planName, isPremium, daysRemaining, loading } = useSubscription();

  const loadRedeemContext = useCallback(async () => {
    const pairId = user?.me?.pair_id;
    const pairCode = user?.me?.pair_code;

    if (!pairId || !pairCode) {
      setAvailableCodes([]);
      setRedeemHistory([]);
      return;
    }

    setIsRedeemContextLoading(true);
    setRedeemContextError("");

    try {
      const response = await fetch("/api/redeem/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId,
          pairCode,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Gagal memuat data redeem.");
      }

      setAvailableCodes((payload?.availableCodes || []) as RedeemCodeItem[]);
      setRedeemHistory((payload?.history || []) as RedeemHistoryItem[]);
    } catch (error: unknown) {
      setRedeemContextError(getErrorMessage(error, "Gagal memuat data redeem."));
    } finally {
      setIsRedeemContextLoading(false);
    }
  }, [user?.me?.pair_code, user?.me?.pair_id]);

  useEffect(() => {
    void loadRedeemContext();
  }, [loadRedeemContext]);

  const handleCancelPlan = async () => {
    const confirmCancel = window.confirm(
      "Apakah Anda yakin ingin membatalkan paket? \n\nKeterangan: Pengembalian dana (Refund) akan diproses dalam waktu 2x24 jam ke metode pembayaran asal.",
    );

    if (confirmCancel) {
      setIsCancelLoading(true);
      try {
        if (!user?.me?.pair_id || !user?.me?.pair_code) {
          throw new Error("Sesi tidak valid. Silakan login ulang.");
        }

        const response = await fetch("/api/subscription/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pairId: user.me.pair_id,
            pairCode: user.me.pair_code,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Gagal memproses pembatalan.");
        }

        alert(payload?.message || "Subscription berhasil dibatalkan.");
        window.location.reload();
      } catch (error: unknown) {
        alert(getErrorMessage(error, "Gagal memproses pembatalan."));
      } finally {
        setIsCancelLoading(false);
      }
    }
  };

  const handlePickCode = (code: string) => {
    setRedeemCode(code);
    setRedeemStatus("idle");
    setRedeemMessage("");
    setActiveRedeem(null);
  };

  const handleRedeemCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = redeemCode.trim().toUpperCase();
    if (!normalizedCode) {
      setRedeemStatus("error");
      setRedeemMessage("Masukkan kode redeem terlebih dahulu.");
      setActiveRedeem(null);
      return;
    }

    if (!user?.me?.pair_id || !user?.me?.pair_code || !user?.me?.id) {
      setRedeemStatus("error");
      setRedeemMessage("Sesi tidak valid. Silakan login ulang.");
      setActiveRedeem(null);
      return;
    }

    setRedeemStatus("loading");
    setRedeemMessage("Memproses redeem code...");
    setActiveRedeem(null);

    try {
      const response = await fetch("/api/redeem/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId: user.me.pair_id,
          profileId: user.me.id,
          pairCode: user.me.pair_code,
          code: normalizedCode,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Gagal redeem code.");
      }

      const claim = payload?.claim as RedeemHistoryItem | undefined;
      setRedeemStatus("success");
      setRedeemMessage(payload?.message || `Kode ${normalizedCode} berhasil diaktifkan.`);
      setRedeemCode("");

      if (claim) {
        setActiveRedeem(claim);
      }

      await loadRedeemContext();
    } catch (error: unknown) {
      setRedeemStatus("error");
      setRedeemMessage(getErrorMessage(error, "Gagal redeem code."));
    }
  };

  const getPlanDetails = () => {
    switch (planName.toLowerCase()) {
      case "pro":
        return { price: "Rp 50.000", color: "text-primary" };
      case "simple":
        return { price: "Rp 15.000", color: "text-primary" };
      default:
        return { price: "Rp 0", color: "text-gray-400" };
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
          <Link
            href="/settings"
            className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-primary active:scale-95"
          >
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
                    {isPremium ? "Premium member aktif" : "Status Basic"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biaya Paket</p>
                  <p className={`text-2xl font-black ${details.color}`}>
                    {details.price}
                    <span className="text-xs text-gray-300">/bln</span>
                  </p>
                </div>
              </div>

              {isPremium && (
                <div className="mt-6 p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-500 leading-relaxed">
                    Pembatalan paket akan menghentikan fitur premium seketika.
                    <span className="block font-black mt-1">
                      Uang kembali (Refund) akan diproses otomatis dalam 2x24 jam.
                    </span>
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
                    <p className="text-xs font-bold text-gray-600">
                      {isPremium ? "Midtrans Snap" : "Free Access"}
                    </p>
                  </div>
                </div>
              </div>

              {planName.toLowerCase() !== "pro" && (
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

          <div className="bg-white p-8 rounded-[3rem] border border-pink-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-50 rounded-2xl text-primary">
                  <TicketPercent size={20} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 italic">Redeem Code</h3>
                  <p className="text-xs text-gray-400 font-medium">Aktifkan benefit langganan lewat kode promo.</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-full w-fit">
                Production
              </span>
            </div>

            <form onSubmit={handleRedeemCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Masukkan Kode
                </label>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(event) => setRedeemCode(event.target.value.toUpperCase())}
                    placeholder="Contoh: PAPLOVE7"
                    className="inp-primary-default w-full min-w-0 uppercase tracking-[0.18em] font-black text-sm placeholder:normal-case placeholder:tracking-normal"
                  />
                  <button
                    type="submit"
                    disabled={redeemStatus === "loading" || isRedeemContextLoading}
                    className="btn btn-primary-solid w-full md:w-auto md:min-w-[170px] uppercase tracking-widest font-black disabled:opacity-60"
                  >
                    {redeemStatus === "loading" ? "Checking..." : "Redeem"}
                  </button>
                </div>
              </div>

              {/* {availableCodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableCodes.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePickCode(item.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-100 bg-pink-50 text-primary text-[10px] font-black uppercase tracking-wide hover:bg-pink-100 transition-colors"
                    >
                      <Copy size={12} />
                      {item.code}
                    </button>
                  ))}
                </div>
              )} */}
            </form>

            {redeemStatus !== "idle" && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  redeemStatus === "success"
                    ? "bg-green-50 border-green-100"
                    : redeemStatus === "loading"
                      ? "bg-blue-50 border-blue-100"
                      : "bg-red-50 border-red-100"
                }`}
              >
                {redeemStatus === "success" && (
                  <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                )}
                {redeemStatus === "loading" && (
                  <Loader2 size={18} className="text-blue-500 shrink-0 mt-0.5 animate-spin" />
                )}
                {redeemStatus === "error" && (
                  <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <p
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      redeemStatus === "success"
                        ? "text-green-600"
                        : redeemStatus === "loading"
                          ? "text-blue-600"
                          : "text-red-600"
                    }`}
                  >
                    {redeemStatus === "success"
                      ? "Redeem Berhasil"
                      : redeemStatus === "loading"
                        ? "Memproses"
                        : "Redeem Gagal"}
                  </p>
                  <p
                    className={`text-[11px] font-bold leading-relaxed ${
                      redeemStatus === "success"
                        ? "text-green-700"
                        : redeemStatus === "loading"
                          ? "text-blue-700"
                          : "text-red-600"
                    }`}
                  >
                    {redeemMessage}
                  </p>
                  {redeemStatus === "success" && activeRedeem && (
                    <p className="text-[11px] font-bold text-gray-600 leading-relaxed">
                      Benefit: {activeRedeem.benefit}
                      <span className="block text-gray-400 font-medium">
                        Berlaku sampai {formatDateLabel(activeRedeem.expiresAt)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {redeemContextError && (
              <div className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[11px] font-bold leading-relaxed">
                {redeemContextError}
              </div>
            )}

            {/* <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-100 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                Kode Aktif di Database
              </p>

              {isRedeemContextLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold">
                  <Loader2 size={14} className="animate-spin" />
                  Memuat kode redeem...
                </div>
              ) : availableCodes.length === 0 ? (
                <p className="text-[11px] font-bold text-gray-500">
                  Tidak ada kode aktif saat ini. Cek lagi nanti.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableCodes.map((item) => (
                    <div key={item.id} className="bg-white border border-pink-100 rounded-2xl p-3">
                      <p className="text-[11px] font-black text-gray-700 uppercase tracking-wide">{item.code}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1">{item.title}</p>
                      <p className="text-[10px] font-medium text-gray-400 mt-1 leading-relaxed">
                        {item.benefit}
                      </p>
                      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-2">
                        Expired: {formatDateLabel(item.expiresAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div> */}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
            <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2 italic text-sm">
              <History size={18} className="text-primary" />
              Recent Billing
            </h4>

            <div className="space-y-4">
              <div className="group p-4 rounded-2xl border border-gray-50 hover:border-pink-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                    {planName} Plan
                  </p>
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

          <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
            <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2 italic text-sm">
              <Gift size={18} className="text-primary" />
              Recent Redeem
            </h4>

            {isRedeemContextLoading && redeemHistory.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold">
                <Loader2 size={14} className="animate-spin" />
                Memuat riwayat redeem...
              </div>
            ) : redeemHistory.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-[11px] font-bold text-gray-400">
                Belum ada riwayat redeem untuk pair ini.
              </div>
            ) : (
              <div className="space-y-3">
                {redeemHistory.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-gray-50">
                    <div className="flex justify-between items-start gap-3">
                      <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                        {item.code}
                      </p>
                      <span
                        className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${getRedeemBadgeStyles(item.status)}`}
                      >
                        {getRedeemBadgeLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-500 mt-2 leading-relaxed">{item.benefit}</p>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-2">
                      {formatDateLabel(item.claimedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
