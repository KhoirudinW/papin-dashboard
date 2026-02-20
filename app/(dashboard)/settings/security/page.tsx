"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  ArrowLeftCircle,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getPendingPairCodeChange,
  removePendingPairCodeChange,
  savePendingPairCodeChange,
} from "@/lib/pairCodeChangeLocal";
import type {
  PairCodeChangeNotificationItem,
  PairCodeChangeNotificationsResponse,
} from "@/types/pairCodeChange";

type FeedbackState = {
  type: "idle" | "success" | "error";
  message: string;
};

const normalizePairCode = (value: string) => value.trim().toUpperCase();
const isPairCodeFormatValid = (value: string) => /^[A-Z0-9]{6,20}$/.test(value);

const formatDateTimeLabel = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return { label: "PENDING", className: "bg-yellow-50 text-yellow-600" };
    case "approved":
      return { label: "APPROVED", className: "bg-green-50 text-green-600" };
    case "rejected":
      return { label: "REJECTED", className: "bg-red-50 text-red-500" };
    case "expired":
      return { label: "EXPIRED", className: "bg-gray-100 text-gray-500" };
    default:
      return { label: status.toUpperCase(), className: "bg-gray-100 text-gray-500" };
  }
};

export default function SecurityPage() {
  const { user, updateUser } = useAuth();
  const [pairCodeSnapshot, setPairCodeSnapshot] = useState(user?.me?.pair_code || "");
  const updateUserRef = React.useRef(updateUser);
  const [newPairCode, setNewPairCode] = useState("");
  const [confirmPairCode, setConfirmPairCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle", message: "" });
  const [incomingRequests, setIncomingRequests] = useState<PairCodeChangeNotificationItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PairCodeChangeNotificationItem[]>([]);

  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    setPairCodeSnapshot(user?.me?.pair_code || "");
  }, [user?.me?.pair_code]);

  const syncLocalPendingCodes = useCallback(
    (outgoingItems: PairCodeChangeNotificationItem[]) => {
      for (const item of outgoingItems) {
        const pending = getPendingPairCodeChange(item.id);
        if (!pending) {
          continue;
        }

        if (item.status === "approved") {
          const normalized = normalizePairCode(pending.newPairCode);
          if (normalized && normalizePairCode(pairCodeSnapshot) !== normalized) {
            updateUserRef.current({ pair_code: normalized });
            setPairCodeSnapshot(normalized);
          }
          removePendingPairCodeChange(item.id);
          continue;
        }

        if (item.status === "rejected" || item.status === "expired" || item.status === "cancelled") {
          removePendingPairCodeChange(item.id);
        }
      }
    },
    [pairCodeSnapshot],
  );

  const loadRequests = useCallback(async () => {
    const pairId = user?.me?.pair_id;
    const profileId = user?.me?.id;

    if (!pairId || !profileId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    setLoadingRequests(true);
    setRequestsError("");

    try {
      const response = await fetch("/api/pair-code-change/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, profileId }),
      });

      const payload = (await response.json()) as
        | PairCodeChangeNotificationsResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "Gagal memuat notifikasi pair code.",
        );
      }

      const normalizedPayload = payload as PairCodeChangeNotificationsResponse;
      const incoming = normalizedPayload.incoming || [];
      const outgoing = normalizedPayload.outgoing || [];

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      syncLocalPendingCodes(outgoing);
    } catch (error: unknown) {
      setRequestsError(error instanceof Error ? error.message : "Gagal memuat notifikasi pair code.");
    } finally {
      setLoadingRequests(false);
    }
  }, [syncLocalPendingCodes, user?.me?.id, user?.me?.pair_id]);

  useEffect(() => {
    void loadRequests();

    const intervalId = window.setInterval(() => {
      void loadRequests();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadRequests]);

  const handleRequestPairCodeChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const pairId = user?.me?.pair_id;
    const profileId = user?.me?.id;
    const currentPairCode = normalizePairCode(user?.me?.pair_code || "");
    const normalizedNewPairCode = normalizePairCode(newPairCode);
    const normalizedConfirmPairCode = normalizePairCode(confirmPairCode);

    if (!pairId || !profileId || !currentPairCode) {
      setFeedback({ type: "error", message: "Sesi pair tidak valid. Silakan login ulang." });
      return;
    }

    if (!isPairCodeFormatValid(normalizedNewPairCode)) {
      setFeedback({
        type: "error",
        message: "Format pair code baru tidak valid. Gunakan 6-20 karakter huruf/angka.",
      });
      return;
    }

    if (normalizedNewPairCode !== normalizedConfirmPairCode) {
      setFeedback({ type: "error", message: "Konfirmasi pair code baru tidak cocok." });
      return;
    }

    if (normalizedNewPairCode === currentPairCode) {
      setFeedback({ type: "error", message: "Pair code baru tidak boleh sama dengan pair code saat ini." });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/pair-code-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId,
          profileId,
          pairCode: currentPairCode,
          newPairCode: normalizedNewPairCode,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        request?: { id?: string };
      };

      if (!response.ok) {
        throw new Error(payload.message || "Gagal membuat request ganti pair code.");
      }

      if (payload.request?.id) {
        savePendingPairCodeChange(payload.request.id, pairId, normalizedNewPairCode);
      }

      setFeedback({
        type: "success",
        message:
          payload.message ||
          "Permintaan pair code berhasil dikirim. Pasanganmu akan menerima notifikasi di Navbar.",
      });
      setNewPairCode("");
      setConfirmPairCode("");
      await loadRequests();
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal membuat request ganti pair code.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all hover:bg-pink-50 hover:text-primary active:scale-95"
        >
          <ArrowLeftCircle size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-black uppercase tracking-wider">Back</span>
        </Link>
        <h2 className="header-primary-2 text-primary">Keamanan Pair Code</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-50 rounded-2xl text-primary">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-black text-gray-800 italic">Request Ganti Pair Code</h3>
                <p className="text-[11px] text-gray-400 font-bold">
                  Perubahan pair code butuh persetujuan 2 orang.
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestPairCodeChange} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                  Pair Code Baru
                </label>
                <input
                  type="text"
                  value={newPairCode}
                  onChange={(event) => setNewPairCode(event.target.value.toUpperCase())}
                  className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-black tracking-[0.2em] uppercase"
                  placeholder="Contoh: PAP12345"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                  Konfirmasi Pair Code Baru
                </label>
                <input
                  type="text"
                  value={confirmPairCode}
                  onChange={(event) => setConfirmPairCode(event.target.value.toUpperCase())}
                  className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-black tracking-[0.2em] uppercase"
                  placeholder="Ulangi Pair Code Baru"
                  maxLength={20}
                />
              </div>

              <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
                Format pair code: 6-20 karakter huruf/angka. Setelah request dikirim, pasanganmu akan menerima
                notifikasi persetujuan di Navbar.
              </p>

              <button
                disabled={submitting}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 hover:brightness-110 active:scale-95 transition-all disabled:bg-gray-200 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                {submitting ? "Mengirim Request..." : "Kirim Request Persetujuan"}
              </button>
            </form>

            {feedback.type !== "idle" && (
              <div
                className={`p-4 rounded-2xl border text-[11px] font-bold leading-relaxed ${
                  feedback.type === "success"
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-red-50 border-red-100 text-red-600"
                }`}
              >
                {feedback.message}
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800 italic flex items-center gap-2">
                <Clock3 size={18} className="text-primary" />
                Riwayat Request Pair Code
              </h3>
              {loadingRequests && <Loader2 size={16} className="animate-spin text-primary" />}
            </div>

            {requestsError && (
              <div className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[11px] font-bold">
                {requestsError}
              </div>
            )}

            {outgoingRequests.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-[11px] font-bold text-gray-400">
                Belum ada request pair code yang kamu kirim.
              </div>
            ) : (
              <div className="space-y-3">
                {outgoingRequests.slice(0, 5).map((item) => {
                  const badge = getStatusBadge(item.status);
                  const targetName =
                    item.requestedForProfile?.fullName || item.requestedForProfile?.name || "Pasangan";

                  return (
                    <div key={item.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black text-gray-700 uppercase tracking-wider truncate">
                          Untuk: {targetName}
                        </p>
                        <span
                          className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Dibuat: {formatDateTimeLabel(item.createdAt)}
                      </p>
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        Respon: {formatDateTimeLabel(item.respondedAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800 to-black p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <ShieldCheck className="absolute -bottom-6 -right-6 text-white/10" size={150} />
            <div className="relative z-10 space-y-4">
              <h4 className="font-black italic text-lg leading-tight">Verifikasi 2 Orang Aktif</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-pink-500 p-1 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
                    User pertama mengirim request ganti pair code dari halaman Security.
                  </p>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-pink-500 p-1 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
                    User kedua menerima notifikasi di Navbar lalu melakukan approve/reject.
                  </p>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 bg-pink-500 p-1 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
                    Pair code baru akan berlaku penuh setelah pasangan menyetujui.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-[2rem] flex gap-4">
            <AlertCircle className="text-yellow-500 shrink-0" size={20} />
            <div className="space-y-1">
              <h5 className="text-[10px] font-black uppercase text-yellow-700 tracking-wider">Notifikasi Masuk</h5>
              <p className="text-[10px] font-bold text-yellow-700/90 leading-relaxed italic">
                Saat ini ada {incomingRequests.length} request persetujuan pair code yang menunggu respons kamu di
                Navbar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
