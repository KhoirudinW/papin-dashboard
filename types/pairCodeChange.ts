export type PairCodeChangeStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export type PairCodeChangeProfile = {
  id: string;
  name: string | null;
  fullName: string | null;
  role: string | null;
};

export type PairCodeChangeNotificationItem = {
  id: string;
  pairId: string;
  requestedBy: string;
  requestedFor: string;
  status: PairCodeChangeStatus | string;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string | null;
  requestedByProfile: PairCodeChangeProfile | null;
  requestedForProfile: PairCodeChangeProfile | null;
  respondedByProfile: PairCodeChangeProfile | null;
};

export type PairCodeChangeNotificationsResponse = {
  incoming: PairCodeChangeNotificationItem[];
  outgoing: PairCodeChangeNotificationItem[];
  pendingIncomingCount: number;
};
