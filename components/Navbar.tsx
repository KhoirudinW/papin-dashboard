"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { Bell, Check, Loader2, X } from "lucide-react";
import { SettingsDropdown as ModalAcc } from "./ModalAcc";
import { useAuth } from "@/hooks/useAuth";
import NoImage from "@/public/assets/NoImage.png";
import {
  getPendingPairCodeChange,
  removePendingPairCodeChange,
} from "@/lib/pairCodeChangeLocal";
import type {
  PairCodeChangeNotificationItem,
  PairCodeChangeNotificationsResponse,
} from "@/types/pairCodeChange";

const normalizePairCode = (value: string) => value.trim().toUpperCase();

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
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-50 text-yellow-600";
    case "approved":
      return "bg-green-50 text-green-600";
    case "rejected":
      return "bg-red-50 text-red-500";
    case "expired":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-500";
  }
};

const getProfileLabel = (item: PairCodeChangeNotificationItem) => {
  return item.requestedByProfile?.fullName || item.requestedByProfile?.name || "Pasangan";
};

const TopNavBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<PairCodeChangeNotificationItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PairCodeChangeNotificationItem[]>([]);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [approveCodeInputs, setApproveCodeInputs] = useState<Record<string, string>>({});

  const { user, updateUser } = useAuth();
  const [pairCodeSnapshot, setPairCodeSnapshot] = useState(user?.me?.pair_code || "");
  const updateUserRef = React.useRef(updateUser);

  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    setPairCodeSnapshot(user?.me?.pair_code || "");
  }, [user?.me?.pair_code]);

  const userDisplay = {
    name: user?.me?.name || "User",
    role: user?.me?.role || "",
    avatar: user?.me?.photo_url
      ? `${user.me.photo_url}${user.me.photo_url.includes("?") ? "&" : "?"}t=${Date.now()}`
      : NoImage.src,
  };

  const syncOutgoingResolvedCode = useCallback(
    (items: PairCodeChangeNotificationItem[]) => {
      for (const item of items) {
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

  const loadNotifications = useCallback(async () => {
    const pairId = user?.me?.pair_id;
    const profileId = user?.me?.id;

    if (!pairId || !profileId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    setNotifLoading(true);
    setNotifError("");

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
      syncOutgoingResolvedCode(outgoing);
    } catch (error: unknown) {
      setNotifError(error instanceof Error ? error.message : "Gagal memuat notifikasi pair code.");
    } finally {
      setNotifLoading(false);
    }
  }, [syncOutgoingResolvedCode, user?.me?.id, user?.me?.pair_id]);

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const handleRespond = async (requestId: string, action: "approve" | "reject") => {
    const profileId = user?.me?.id;
    const pairCode = normalizePairCode(user?.me?.pair_code || "");

    if (!profileId || !pairCode) {
      setNotifError("Sesi pair tidak valid. Silakan login ulang.");
      return;
    }

    const confirmNewPairCode = normalizePairCode(approveCodeInputs[requestId] || "");
    if (action === "approve" && !confirmNewPairCode) {
      setNotifError("Masukkan pair code baru dari pasangan sebelum approve.");
      return;
    }

    setRespondingRequestId(requestId);
    setNotifError("");
    setNotifMessage("");

    try {
      const response = await fetch("/api/pair-code-change/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          profileId,
          pairCode,
          action,
          confirmNewPairCode: action === "approve" ? confirmNewPairCode : undefined,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Gagal memproses persetujuan pair code.");
      }

      if (action === "approve" && confirmNewPairCode) {
        updateUser({ pair_code: confirmNewPairCode });
      }

      removePendingPairCodeChange(requestId);
      setApproveCodeInputs((prev) => ({ ...prev, [requestId]: "" }));
      setNotifMessage(
        payload.message ||
          (action === "approve"
            ? "Permintaan pair code berhasil disetujui."
            : "Permintaan pair code berhasil ditolak."),
      );

      await loadNotifications();
    } catch (error: unknown) {
      setNotifError(error instanceof Error ? error.message : "Gagal memproses persetujuan pair code.");
    } finally {
      setRespondingRequestId(null);
    }
  };

  return (
    <header className="flex justify-end sm:justify-between items-center p-4 bg-white">
      <div className="text-gray-800 font-medium text-lg hidden md:block">
        Welcome, <span className="capitalize font-bold">{userDisplay.name}</span>
        {userDisplay.role && (
          <span className="ml-2 text-[10px] bg-pink-50 text-[#FF90BC] px-3 py-1 rounded-full uppercase font-black tracking-wider">
            Role {userDisplay.role === "A" ? "pria" : "wanita"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search"
            className="bg-gray-50 border border-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsOpen(false);
            }}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-pink-50 border border-pink-100 text-primary hover:bg-pink-100 transition-colors"
            title="Notifikasi Pair Code"
          >
            <Bell size={18} />
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>

          {isNotifOpen && <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />}

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 z-50 w-[360px] max-w-[90vw] bg-white border border-pink-100 rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-pink-50 flex items-center justify-between bg-pink-50/50">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary">Pair Code Alerts</p>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {incomingRequests.length} request menunggu persetujuan
                  </p>
                </div>
                {notifLoading && <Loader2 size={14} className="animate-spin text-primary" />}
              </div>

              <div className="p-4 max-h-[420px] overflow-y-auto space-y-4">
                {notifMessage && (
                  <div className="text-[10px] font-bold p-3 rounded-xl border border-green-100 bg-green-50 text-green-700">
                    {notifMessage}
                  </div>
                )}

                {notifError && (
                  <div className="text-[10px] font-bold p-3 rounded-xl border border-red-100 bg-red-50 text-red-600">
                    {notifError}
                  </div>
                )}

                {incomingRequests.length === 0 ? (
                  <div className="text-[11px] font-bold text-gray-400 p-4 border border-dashed border-gray-200 rounded-2xl">
                    Tidak ada request pair code baru.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((item) => {
                      const isResponding = respondingRequestId === item.id;

                      return (
                        <div key={item.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-black text-gray-700 uppercase tracking-wide">
                                {getProfileLabel(item)} minta ganti pair code
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                                {formatDateTimeLabel(item.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${getStatusClass(item.status)}`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <input
                            type="text"
                            value={approveCodeInputs[item.id] || ""}
                            onChange={(event) =>
                              setApproveCodeInputs((prev) => ({
                                ...prev,
                                [item.id]: event.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="Masukkan Pair Code Baru"
                            className="w-full p-3 rounded-xl border border-gray-200 text-[11px] font-black tracking-[0.15em] uppercase focus:outline-none focus:border-primary"
                            maxLength={20}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => void handleRespond(item.id, "approve")}
                              disabled={isResponding}
                              className="py-2 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-1"
                            >
                              {isResponding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Approve
                            </button>
                            <button
                              onClick={() => void handleRespond(item.id, "reject")}
                              disabled={isResponding}
                              className="py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-1"
                            >
                              {isResponding ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {outgoingRequests.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Saya</p>
                    {outgoingRequests.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 truncate">{formatDateTimeLabel(item.createdAt)}</p>
                        <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${getStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center bg-pink-50 hover:bg-pink-100 transition-colors rounded-full p-1 pr-3 gap-2 border border-pink-100"
          >
            <div className="relative">
              <img
                src={userDisplay.avatar}
                alt="User Avatar"
                key={userDisplay.avatar}
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
              />
            </div>

            <span className="text-xs font-bold text-gray-600 hidden lg:block">{userDisplay.name}</span>

            <div className="bg-white rounded-full p-1 shadow-sm flex items-center justify-center w-5 h-5">
              <FaChevronDown
                className={`text-pink-400 text-[8px] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          <div className="absolute right-0 mt-2 z-50 shadow-2xl">
            <ModalAcc isOpen={isOpen} onClose={() => setIsOpen(false)} user={userDisplay} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
