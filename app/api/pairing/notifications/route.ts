import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getApiAuthUser } from "@/lib/apiAuth";
import type {
  PairingNotificationItem,
  PairingNotificationsResponse,
  PairingProfileSummary,
} from "@/types/pairing";

type RequestBody = {
  profileId?: string;
};

type PairingRequestRow = {
  id: string;
  requested_by: string;
  requested_to: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

type UserProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  full_name: string | null;
  role: string | null;
  auth_user_id: string | null;
};

const isProfileOwnedByAuth = (profile: UserProfileRow, auth: { id: string; email: string }) => {
  const profileEmail = (profile.email || "").trim().toLowerCase();
  return profile.auth_user_id === auth.id || (Boolean(profileEmail) && profileEmail === auth.email);
};

const toProfileMap = (rows: UserProfileRow[]) => {
  const map = new Map<string, PairingProfileSummary>();
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      fullName: row.full_name,
      role: row.role,
    });
  }
  return map;
};

const toNotificationItem = (
  row: PairingRequestRow,
  profileMap: Map<string, PairingProfileSummary>,
): PairingNotificationItem => ({
  id: row.id,
  requestedBy: row.requested_by,
  requestedTo: row.requested_to,
  status: row.status,
  createdAt: row.created_at,
  respondedAt: row.responded_at,
  requestedByProfile: profileMap.get(row.requested_by) || null,
  requestedToProfile: profileMap.get(row.requested_to) || null,
});

export async function POST(request: Request) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const profileId = body.profileId?.trim();

    if (!profileId) {
      return NextResponse.json({ message: "Profile ID wajib diisi." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: myProfileRaw, error: myProfileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, name, full_name, role, auth_user_id")
      .eq("id", profileId)
      .limit(1)
      .maybeSingle();

    if (myProfileError || !myProfileRaw) {
      return NextResponse.json({ message: "Profile tidak ditemukan." }, { status: 404 });
    }

    const myProfile = myProfileRaw as UserProfileRow;
    if (!isProfileOwnedByAuth(myProfile, authUser)) {
      return NextResponse.json({ message: "Akses profile ditolak." }, { status: 403 });
    }

    const expireBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error: expireError } = await supabaseAdmin
      .from("pairing_requests")
      .update({
        status: "expired",
        responded_at: new Date().toISOString(),
        responded_by: profileId,
      })
      .eq("status", "pending")
      .lt("created_at", expireBefore);

    if (expireError) {
      throw expireError;
    }

    const { data: rowsRaw, error: rowsError } = await supabaseAdmin
      .from("pairing_requests")
      .select("id, requested_by, requested_to, status, created_at, responded_at")
      .or(`requested_by.eq.${profileId},requested_to.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (rowsError) {
      throw rowsError;
    }

    const rows = (rowsRaw as PairingRequestRow[] | null) || [];
    const profileIds = Array.from(
      new Set(
        rows
          .flatMap((item) => [item.requested_by, item.requested_to])
          .filter((value): value is string => Boolean(value)),
      ),
    );

    let profileMap = new Map<string, PairingProfileSummary>();
    if (profileIds.length > 0) {
      const { data: profileRowsRaw, error: profileRowsError } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, name, full_name, role, auth_user_id")
        .in("id", profileIds);

      if (profileRowsError) {
        throw profileRowsError;
      }

      profileMap = toProfileMap((profileRowsRaw as UserProfileRow[] | null) || []);
    }

    const normalized = rows.map((row) => toNotificationItem(row, profileMap));
    const incoming = normalized.filter((item) => item.requestedTo === profileId);
    const outgoing = normalized.filter((item) => item.requestedBy === profileId);

    const payload: PairingNotificationsResponse = {
      incoming,
      outgoing,
      pendingIncomingCount: incoming.filter((item) => item.status === "pending").length,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error("Pairing notifications error:", error);
    const message = error instanceof Error ? error.message : "";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (message.includes("Missing Supabase server env")) {
      return NextResponse.json(
        {
          message:
            "Server env Supabase belum lengkap. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    if (
      code === "42P01" ||
      code === "42703" ||
      code === "PGRST205" ||
      message.toLowerCase().includes("schema cache")
    ) {
      return NextResponse.json(
        { message: "Schema pairing belum tersedia. Jalankan migration pairing terbaru." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan pada server pairing notifications." },
      { status: 500 },
    );
  }
}
