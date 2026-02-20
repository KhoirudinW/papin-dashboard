import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  PairCodeChangeNotificationItem,
  PairCodeChangeNotificationsResponse,
  PairCodeChangeProfile,
} from "@/types/pairCodeChange";

type RequestBody = {
  pairId?: string;
  profileId?: string;
};

type PairCodeRequestRow = {
  id: string;
  pair_id: string;
  requested_by: string;
  requested_for: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
  expires_at: string | null;
};

type UserProfileRow = {
  id: string;
  name: string | null;
  full_name: string | null;
  role: string | null;
};

const toProfileMap = (rows: UserProfileRow[]) => {
  const mapped = new Map<string, PairCodeChangeProfile>();
  for (const row of rows) {
    mapped.set(row.id, {
      id: row.id,
      name: row.name,
      fullName: row.full_name,
      role: row.role,
    });
  }
  return mapped;
};

const toNotificationItem = (
  row: PairCodeRequestRow,
  profileMap: Map<string, PairCodeChangeProfile>,
): PairCodeChangeNotificationItem => ({
  id: row.id,
  pairId: row.pair_id,
  requestedBy: row.requested_by,
  requestedFor: row.requested_for,
  status: row.status,
  createdAt: row.created_at,
  respondedAt: row.responded_at,
  expiresAt: row.expires_at,
  requestedByProfile: profileMap.get(row.requested_by) || null,
  requestedForProfile: profileMap.get(row.requested_for) || null,
  respondedByProfile: row.responded_by ? profileMap.get(row.responded_by) || null : null,
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const pairId = body.pairId?.trim();
    const profileId = body.profileId?.trim();

    if (!pairId || !profileId) {
      return NextResponse.json(
        { message: "Data notifikasi pair code tidak lengkap." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: profileInPair, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("id", profileId)
      .eq("pair_id", pairId)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { message: "Gagal memverifikasi profile pair." },
        { status: 500 },
      );
    }

    if (!profileInPair) {
      return NextResponse.json(
        { message: "Akses profile tidak sesuai pair." },
        { status: 403 },
      );
    }

    await supabaseAdmin
      .from("pair_code_change_requests")
      .update({
        status: "expired",
        responded_at: new Date().toISOString(),
      })
      .eq("pair_id", pairId)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const { data: requestRowsRaw, error: requestError } = await supabaseAdmin
      .from("pair_code_change_requests")
      .select("id, pair_id, requested_by, requested_for, status, created_at, responded_at, responded_by, expires_at")
      .eq("pair_id", pairId)
      .or(`requested_by.eq.${profileId},requested_for.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (requestError) {
      throw requestError;
    }

    const requestRows = (requestRowsRaw as PairCodeRequestRow[] | null) || [];
    const profileIds = Array.from(
      new Set(
        requestRows
          .flatMap((item) => [item.requested_by, item.requested_for, item.responded_by])
          .filter((value): value is string => Boolean(value)),
      ),
    );

    let profileMap = new Map<string, PairCodeChangeProfile>();
    if (profileIds.length > 0) {
      const { data: profilesRaw, error: profilesError } = await supabaseAdmin
        .from("user_profiles")
        .select("id, name, full_name, role")
        .eq("pair_id", pairId)
        .in("id", profileIds);

      if (profilesError) {
        throw profilesError;
      }

      profileMap = toProfileMap((profilesRaw as UserProfileRow[] | null) || []);
    }

    const normalizedItems = requestRows.map((row) => toNotificationItem(row, profileMap));

    const incoming = normalizedItems.filter(
      (item) => item.requestedFor === profileId && item.status === "pending",
    );
    const outgoing = normalizedItems.filter((item) => item.requestedBy === profileId);

    const payload: PairCodeChangeNotificationsResponse = {
      incoming,
      outgoing,
      pendingIncomingCount: incoming.length,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error("Pair code notification error:", error);
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

    if (code === "42P01" || code === "42703" || code === "42883") {
      return NextResponse.json(
        {
          message:
            "Schema pair code change belum tersedia di database. Jalankan migration terbaru terlebih dahulu.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Gagal memuat notifikasi pair code." },
      { status: 500 },
    );
  }
}
