export type PairingRequestStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export type PairingProfileSummary = {
  id: string;
  name: string | null;
  fullName: string | null;
  role: string | null;
};

export type PairingNotificationItem = {
  id: string;
  requestedBy: string;
  requestedTo: string;
  status: PairingRequestStatus | string;
  createdAt: string;
  respondedAt: string | null;
  requestedByProfile: PairingProfileSummary | null;
  requestedToProfile: PairingProfileSummary | null;
};

export type PairingNotificationsResponse = {
  incoming: PairingNotificationItem[];
  outgoing: PairingNotificationItem[];
  pendingIncomingCount: number;
};
