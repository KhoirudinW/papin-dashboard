import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RequestBody = {
  pairId?: string;
  profileId?: string;
  pairCode?: string;
  newPairCode?: string;
};

type RequestResultRow = {
  request_id: string;
  pair_id: string;
  requested_by: string;
  requested_for: string;
  status: string;
  created_at: string;
  expires_at: string;
};

const mapRequestError = (message: string, code?: string) => {
  if (code === "22P02") {
    return { status: 400, message: "Format data pair code request tidak valid." };
  }
  if (message.includes("INVALID_PAIR_CODE")) {
    return { status: 401, message: "Sesi pair tidak valid. Silakan login ulang." };
  }
  if (message.includes("PAIR_NOT_FOUND")) {
    return { status: 404, message: "Pair tidak ditemukan." };
  }
  if (message.includes("REQUESTER_NOT_IN_PAIR")) {
    return { status: 403, message: "Akses profile tidak sesuai pair." };
  }
  if (message.includes("PARTNER_NOT_FOUND")) {
    return { status: 409, message: "Pasangan tidak ditemukan untuk pair ini." };
  }
  if (message.includes("PENDING_REQUEST_EXISTS")) {
    return {
      status: 409,
      message: "Masih ada permintaan perubahan pair code yang menunggu persetujuan.",
    };
  }
  if (message.includes("NEW_CODE_SAME_AS_CURRENT")) {
    return { status: 409, message: "Pair code baru tidak boleh sama dengan pair code saat ini." };
  }
  if (message.includes("INVALID_NEW_PAIR_CODE_FORMAT")) {
    return {
      status: 400,
      message: "Format pair code baru tidak valid. Gunakan 6-20 karakter huruf/angka.",
    };
  }

  return { status: 500, message: "Gagal membuat permintaan perubahan pair code." };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const pairId = body.pairId?.trim();
    const profileId = body.profileId?.trim();
    const pairCode = body.pairCode?.trim();
    const newPairCode = body.newPairCode?.trim().toUpperCase();

    if (!pairId || !profileId || !pairCode || !newPairCode) {
      return NextResponse.json(
        { message: "Data request pair code tidak lengkap. Silakan refresh halaman." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc("request_pair_code_change", {
      p_pair_id: pairId,
      p_requester_id: profileId,
      p_pair_code: pairCode,
      p_new_pair_code: newPairCode,
    });

    if (error) {
      const mapped = mapRequestError(error.message || "", error.code || "");
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }

    const row = (Array.isArray(data) ? data[0] : data) as RequestResultRow | undefined;
    if (!row?.request_id) {
      return NextResponse.json(
        { message: "Permintaan pair code tidak dapat diproses." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Permintaan perubahan pair code berhasil dikirim. Menunggu persetujuan pasangan.",
      request: {
        id: row.request_id,
        pairId: row.pair_id,
        requestedBy: row.requested_by,
        requestedFor: row.requested_for,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      },
    });
  } catch (error: unknown) {
    console.error("Pair code change request error:", error);
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
      { message: "Terjadi kesalahan pada server pair code request." },
      { status: 500 },
    );
  }
}
