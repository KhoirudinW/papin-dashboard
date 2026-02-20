import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RespondAction = "approve" | "reject";

type RequestBody = {
  requestId?: string;
  profileId?: string;
  pairCode?: string;
  action?: RespondAction;
  confirmNewPairCode?: string;
};

type RespondResultRow = {
  request_id: string;
  pair_id: string;
  status: string;
  requested_by: string;
  requested_for: string;
  responded_by: string | null;
  responded_at: string | null;
};

const mapRespondError = (message: string, code?: string) => {
  if (code === "22P02") {
    return { status: 400, message: "Format data response pair code tidak valid." };
  }
  if (message.includes("INVALID_ACTION")) {
    return { status: 400, message: "Aksi tidak valid. Gunakan approve atau reject." };
  }
  if (message.includes("INVALID_PAIR_CODE")) {
    return { status: 401, message: "Sesi pair tidak valid. Silakan login ulang." };
  }
  if (message.includes("REQUEST_NOT_FOUND")) {
    return { status: 404, message: "Permintaan perubahan pair code tidak ditemukan." };
  }
  if (message.includes("REQUEST_ACCESS_DENIED")) {
    return { status: 403, message: "Kamu tidak punya akses untuk merespons request ini." };
  }
  if (message.includes("REQUEST_ALREADY_RESOLVED")) {
    return { status: 409, message: "Permintaan ini sudah diproses sebelumnya." };
  }
  if (message.includes("REQUEST_EXPIRED")) {
    return { status: 409, message: "Permintaan ini sudah kedaluwarsa." };
  }
  if (message.includes("CONFIRM_NEW_CODE_REQUIRED")) {
    return { status: 400, message: "Masukkan pair code baru untuk proses persetujuan." };
  }
  if (message.includes("CONFIRM_NEW_CODE_MISMATCH")) {
    return { status: 400, message: "Pair code baru yang dimasukkan tidak cocok dengan request pasangan." };
  }
  if (message.includes("PAIR_NOT_FOUND")) {
    return { status: 404, message: "Pair tidak ditemukan." };
  }

  return { status: 500, message: "Gagal memproses persetujuan perubahan pair code." };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const requestId = body.requestId?.trim();
    const profileId = body.profileId?.trim();
    const pairCode = body.pairCode?.trim();
    const action = body.action;
    const confirmNewPairCode = body.confirmNewPairCode?.trim().toUpperCase();

    if (!requestId || !profileId || !pairCode || !action) {
      return NextResponse.json(
        { message: "Data response pair code tidak lengkap. Silakan refresh halaman." },
        { status: 400 },
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { message: "Aksi tidak valid. Gunakan approve atau reject." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc("respond_pair_code_change", {
      p_request_id: requestId,
      p_approver_id: profileId,
      p_pair_code: pairCode,
      p_action: action,
      p_confirm_new_pair_code: action === "approve" ? confirmNewPairCode || null : null,
    });

    if (error) {
      const mapped = mapRespondError(error.message || "", error.code || "");
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }

    const row = (Array.isArray(data) ? data[0] : data) as RespondResultRow | undefined;
    if (!row?.request_id) {
      return NextResponse.json({ message: "Request tidak dapat diproses." }, { status: 500 });
    }

    const isApproved = row.status === "approved";
    return NextResponse.json({
      message: isApproved
        ? "Permintaan ganti pair code disetujui. Pair code aktif sudah diperbarui."
        : "Permintaan ganti pair code berhasil ditolak.",
      response: {
        requestId: row.request_id,
        pairId: row.pair_id,
        status: row.status,
        requestedBy: row.requested_by,
        requestedFor: row.requested_for,
        respondedBy: row.responded_by,
        respondedAt: row.responded_at,
      },
    });
  } catch (error: unknown) {
    console.error("Pair code change respond error:", error);
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
      { message: "Terjadi kesalahan pada server response pair code." },
      { status: 500 },
    );
  }
}
