"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { Bell, Check, Loader2, X, UserPlus } from "lucide-react";
import { SettingsDropdown as ModalAcc } from "./ModalAcc";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import NoImage from "@/public/assets/NoImage.png";
import { getPendingPairCodeChange, removePendingPairCodeChange } from "@/lib/pairCodeChangeLocal";
import type {
  PairCodeChangeNotificationItem,
  PairCodeChangeNotificationsResponse,
} from "@/types/pairCodeChange";
import type { PairingNotificationItem, PairingNotificationsResponse } from "@/types/pairing";

const normalizePairCode = (value: string) => value.trim().toUpperCase();
const getNotifSeenKey = (profileId: string) => `papin_notif_last_seen_${profileId}`;

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

const getPairCodeProfileLabel = (item: PairCodeChangeNotificationItem) => {
  return item.requestedByProfile?.fullName || item.requestedByProfile?.name || "Pasangan";
};

const getPairingProfileLabel = (item: PairingNotificationItem) => {
  return item.requestedByProfile?.fullName || item.requestedByProfile?.name || "User";
};

const toTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const TopNavBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  const [incomingPairCodeRequests, setIncomingPairCodeRequests] = useState<PairCodeChangeNotificationItem[]>([]);
  const [outgoingPairCodeRequests, setOutgoingPairCodeRequests] = useState<PairCodeChangeNotificationItem[]>([]);
  const [respondingPairCodeRequestId, setRespondingPairCodeRequestId] = useState<string | null>(null);
  const [approveCodeInputs, setApproveCodeInputs] = useState<Record<string, string>>({});

  const [incomingPairingRequests, setIncomingPairingRequests] = useState<PairingNotificationItem[]>([]);
  const [outgoingPairingRequests, setOutgoingPairingRequests] = useState<PairingNotificationItem[]>([]);
  const [respondingPairingRequestId, setRespondingPairingRequestId] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const { user, updateUser } = useAuth();
  const hasPair = Boolean(user?.me?.pair_id);
  const [pairCodeSnapshot, setPairCodeSnapshot] = useState(user?.me?.pair_code || "");
  const updateUserRef = React.useRef(updateUser);

  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    setPairCodeSnapshot(user?.me?.pair_code || "");
  }, [user?.me?.pair_code]);

  useEffect(() => {
    const profileId = user?.me?.id;
    if (!profileId) {
      setLastSeenAt(null);
      return;
    }

    const storageKey = getNotifSeenKey(profileId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setLastSeenAt(saved);
      return;
    }

    const nowIso = new Date().toISOString();
    localStorage.setItem(storageKey, nowIso);
    setLastSeenAt(nowIso);
  }, [user?.me?.id]);

  const userDisplay = {
    name: user?.me?.name || "User",
    role: user?.me?.role || "",
    avatar: user?.me?.photo_url
      ? `${user.me.photo_url}${user.me.photo_url.includes("?") ? "&" : "?"}t=${Date.now()}`
      : NoImage.src,
  };

  const pendingNotificationCount = useMemo(() => {
    const lastSeenMs = toTimestamp(lastSeenAt);

    const pairCodePending = incomingPairCodeRequests.filter((item) => item.status === "pending").length;
    const pairingPending = hasPair
      ? 0
      : incomingPairingRequests.filter((item) => item.status === "pending").length;

    const pairCodeUpdates = outgoingPairCodeRequests.filter((item) => {
      if (item.status === "pending") {
        return false;
      }
      const latestAt = Math.max(toTimestamp(item.createdAt), toTimestamp(item.respondedAt));
      return latestAt > lastSeenMs;
    }).length;

    const pairingUpdates = hasPair
      ? 0
      : outgoingPairingRequests.filter((item) => {
          if (item.status === "pending") {
            return false;
          }
          const latestAt = Math.max(toTimestamp(item.createdAt), toTimestamp(item.respondedAt));
          return latestAt > lastSeenMs;
        }).length;

    return pairCodePending + pairingPending + pairCodeUpdates + pairingUpdates;
  }, [
    hasPair,
    incomingPairCodeRequests,
    incomingPairingRequests,
    lastSeenAt,
    outgoingPairCodeRequests,
    outgoingPairingRequests,
  ]);

  const pendingIncomingPairingRequests = useMemo(
    () => (hasPair ? [] : incomingPairingRequests.filter((item) => item.status === "pending")),
    [hasPair, incomingPairingRequests],
  );

  const pendingIncomingPairCodeRequests = useMemo(
    () => incomingPairCodeRequests.filter((item) => item.status === "pending"),
    [incomingPairCodeRequests],
  );

  const newOutgoingPairCodeUpdates = useMemo(() => {
    const lastSeenMs = toTimestamp(lastSeenAt);
    return outgoingPairCodeRequests.filter((item) => {
      if (item.status === "pending") {
        return false;
      }
      const latestAt = Math.max(toTimestamp(item.createdAt), toTimestamp(item.respondedAt));
      return latestAt > lastSeenMs;
    });
  }, [lastSeenAt, outgoingPairCodeRequests]);

  const newOutgoingPairingUpdates = useMemo(() => {
    if (hasPair) {
      return [] as PairingNotificationItem[];
    }

    const lastSeenMs = toTimestamp(lastSeenAt);
    return outgoingPairingRequests.filter((item) => {
      if (item.status === "pending") {
        return false;
      }
      const latestAt = Math.max(toTimestamp(item.createdAt), toTimestamp(item.respondedAt));
      return latestAt > lastSeenMs;
    });
  }, [hasPair, lastSeenAt, outgoingPairingRequests]);

  const markNotificationsSeen = useCallback(() => {
    const profileId = user?.me?.id;
    if (!profileId) {
      return;
    }

    const nowIso = new Date().toISOString();
    localStorage.setItem(getNotifSeenKey(profileId), nowIso);
    setLastSeenAt(nowIso);
  }, [user?.me?.id]);

  const closeNotificationPanel = useCallback(() => {
    setIsNotifOpen(false);
    markNotificationsSeen();
  }, [markNotificationsSeen]);

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

  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadNotifications = useCallback(async () => {
    const pairId = user?.me?.pair_id;
    const profileId = user?.me?.id;

    if (!profileId) {
      setIncomingPairCodeRequests([]);
      setOutgoingPairCodeRequests([]);
      setIncomingPairingRequests([]);
      setOutgoingPairingRequests([]);
      return;
    }

    setNotifLoading(true);
    setNotifError("");

    try {
      const authHeader = await getAuthHeader();

      if (!pairId) {
        const pairingResponse = await fetch("/api/pairing/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ profileId }),
        });

        const pairingPayload = (await pairingResponse.json()) as
          | PairingNotificationsResponse
          | { message?: string };
        if (!pairingResponse.ok) {
          throw new Error(
            "message" in pairingPayload && pairingPayload.message
              ? pairingPayload.message
              : "Gagal memuat notifikasi pairing.",
          );
        }

        const normalizedPairingPayload = pairingPayload as PairingNotificationsResponse;
        setIncomingPairingRequests(normalizedPairingPayload.incoming || []);
        setOutgoingPairingRequests(normalizedPairingPayload.outgoing || []);
      } else {
        setIncomingPairingRequests([]);
        setOutgoingPairingRequests([]);
      }

      if (pairId) {
        const pairCodeResponse = await fetch("/api/pair-code-change/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairId, profileId }),
        });

        const pairCodePayload = (await pairCodeResponse.json()) as
          | PairCodeChangeNotificationsResponse
          | { message?: string };

        if (!pairCodeResponse.ok) {
          throw new Error(
            "message" in pairCodePayload && pairCodePayload.message
              ? pairCodePayload.message
              : "Gagal memuat notifikasi pair code.",
          );
        }

        const normalizedPairCodePayload = pairCodePayload as PairCodeChangeNotificationsResponse;
        const incoming = normalizedPairCodePayload.incoming || [];
        const outgoing = normalizedPairCodePayload.outgoing || [];
        setIncomingPairCodeRequests(incoming);
        setOutgoingPairCodeRequests(outgoing);
        syncOutgoingResolvedCode(outgoing);
      } else {
        setIncomingPairCodeRequests([]);
        setOutgoingPairCodeRequests([]);
      }
    } catch (error: unknown) {
      setNotifError(error instanceof Error ? error.message : "Gagal memuat notifikasi.");
    } finally {
      setNotifLoading(false);
    }
  }, [getAuthHeader, syncOutgoingResolvedCode, user?.me?.id, user?.me?.pair_id]);

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const handlePairCodeRespond = async (requestId: string, action: "approve" | "reject") => {
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

    setRespondingPairCodeRequestId(requestId);
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
      setRespondingPairCodeRequestId(null);
    }
  };

  const handlePairingRespond = async (requestId: string, action: "approve" | "reject") => {
    const profileId = user?.me?.id;
    if (!profileId) {
      setNotifError("Profile tidak ditemukan. Silakan login ulang.");
      return;
    }

    setRespondingPairingRequestId(requestId);
    setNotifError("");
    setNotifMessage("");

    try {
      const authHeader = await getAuthHeader();
      const response = await fetch("/api/pairing/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          requestId,
          responderProfileId: profileId,
          action,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        pairId?: string;
        pairCode?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Gagal memproses pairing request.");
      }

      if (action === "approve") {
        updateUser({
          pair_id: payload.pairId || null,
          pair_code: payload.pairCode || "",
        });
      }

      setNotifMessage(
        payload.message ||
          (action === "approve"
            ? "Permintaan pairing berhasil disetujui."
            : "Permintaan pairing berhasil ditolak."),
      );

      await loadNotifications();

      if (action === "approve") {
        window.location.reload();
      }
    } catch (error: unknown) {
      setNotifError(error instanceof Error ? error.message : "Gagal memproses pairing request.");
    } finally {
      setRespondingPairingRequestId(null);
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
              if (isNotifOpen) {
                closeNotificationPanel();
              } else {
                setIsNotifOpen(true);
              }
              setIsOpen(false);
            }}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-pink-50 border border-pink-100 text-primary hover:bg-pink-100 transition-colors"
            title="Notifikasi"
          >
            <Bell size={18} />
            {pendingNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {pendingNotificationCount}
              </span>
            )}
          </button>

          {isNotifOpen && <div className="fixed inset-0 z-40" onClick={closeNotificationPanel} />}

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 z-50 w-[380px] max-w-[92vw] bg-white border border-pink-100 rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-pink-50 flex items-center justify-between bg-pink-50/50">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary">Notifications</p>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {pendingNotificationCount} notifikasi baru
                  </p>
                </div>
                {notifLoading && <Loader2 size={14} className="animate-spin text-primary" />}
              </div>

              <div className="p-4 max-h-[460px] overflow-y-auto space-y-4">
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

                {!hasPair && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Pairing Requests
                    </p>
                    {pendingIncomingPairingRequests.length === 0 ? (
                      <div className="text-[11px] font-bold text-gray-400 p-3 border border-dashed border-gray-200 rounded-2xl">
                        Tidak ada pairing request baru.
                      </div>
                    ) : (
                      pendingIncomingPairingRequests.map((item) => {
                        const isResponding = respondingPairingRequestId === item.id;

                        return (
                          <div key={item.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                  <UserPlus size={13} />
                                  {getPairingProfileLabel(item)} minta pairing
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                                  {formatDateTimeLabel(item.createdAt)}
                                </p>
                              </div>
                              <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${getStatusClass(item.status)}`}>
                                {item.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => void handlePairingRespond(item.id, "approve")}
                                disabled={isResponding}
                                className="py-2 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-1"
                              >
                                {isResponding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => void handlePairingRespond(item.id, "reject")}
                                disabled={isResponding}
                                className="py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-1"
                              >
                                {isResponding ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {user?.me?.pair_id && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Pair Code Requests
                    </p>
                    {pendingIncomingPairCodeRequests.length === 0 ? (
                      <div className="text-[11px] font-bold text-gray-400 p-3 border border-dashed border-gray-200 rounded-2xl">
                        Tidak ada request pair code baru.
                      </div>
                    ) : (
                      pendingIncomingPairCodeRequests.map((item) => {
                        const isResponding = respondingPairCodeRequestId === item.id;

                        return (
                          <div key={item.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-wide">
                                  {getPairCodeProfileLabel(item)} minta ganti pair code
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                                  {formatDateTimeLabel(item.createdAt)}
                                </p>
                              </div>
                              <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${getStatusClass(item.status)}`}>
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
                                onClick={() => void handlePairCodeRespond(item.id, "approve")}
                                disabled={isResponding}
                                className="py-2 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-1"
                              >
                                {isResponding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => void handlePairCodeRespond(item.id, "reject")}
                                disabled={isResponding}
                                className="py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-1"
                              >
                                {isResponding ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {(newOutgoingPairingUpdates.length > 0 || newOutgoingPairCodeUpdates.length > 0) && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aktivitas Baru</p>

                    {newOutgoingPairingUpdates.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 truncate">
                          Pairing - {formatDateTimeLabel(item.respondedAt || item.createdAt)}
                        </p>
                        <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${getStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}

                    {newOutgoingPairCodeUpdates.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 truncate">
                          Pair Code - {formatDateTimeLabel(item.respondedAt || item.createdAt)}
                        </p>
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
              if (isNotifOpen) {
                closeNotificationPanel();
              }
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

