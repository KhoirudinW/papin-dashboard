import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getApiAuthUser } from "@/lib/apiAuth";

type RespondAction = "approve" | "reject";

type RequestBody = {
  requestId?: string;
  responderProfileId?: string;
  action?: RespondAction;
};

type PairingRequestRow = {
  id: string;
  requested_by: string;
  requested_to: string;
  status: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  auth_user_id: string | null;
  pair_id: string | null;
  role: string | null;
};

const isProfileOwnedByAuth = (profile: ProfileRow, auth: { id: string; email: string }) => {
  const profileEmail = (profile.email || "").trim().toLowerCase();
  return profile.auth_user_id === auth.id || (Boolean(profileEmail) && profileEmail === auth.email);
};

const isGenderRoleValid = (role: string | null | undefined): role is "A" | "B" => {
  return role === "A" || role === "B";
};

const generatePlainPairCode = () => `PAP${Math.floor(100000 + Math.random() * 900000)}`;

export async function POST(request: Request) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const requestId = body.requestId?.trim();
    const responderProfileId = body.responderProfileId?.trim();
    const action = body.action;

    if (!requestId || !responderProfileId || !action) {
      return NextResponse.json({ message: "Data response pairing tidak lengkap." }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ message: "Aksi pairing tidak valid." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: responderProfileRaw, error: responderProfileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, auth_user_id, pair_id, role")
      .eq("id", responderProfileId)
      .limit(1)
      .maybeSingle();

    if (responderProfileError || !responderProfileRaw) {
      return NextResponse.json({ message: "Profile responder tidak ditemukan." }, { status: 404 });
    }

    const responderProfile = responderProfileRaw as ProfileRow;
    if (!isProfileOwnedByAuth(responderProfile, authUser)) {
      return NextResponse.json({ message: "Akses profile ditolak." }, { status: 403 });
    }

    const { data: pairingRequestRaw, error: pairingRequestError } = await supabaseAdmin
      .from("pairing_requests")
      .select("id, requested_by, requested_to, status")
      .eq("id", requestId)
      .limit(1)
      .maybeSingle();

    if (pairingRequestError || !pairingRequestRaw) {
      return NextResponse.json({ message: "Pairing request tidak ditemukan." }, { status: 404 });
    }

    const pairingRequest = pairingRequestRaw as PairingRequestRow;
    if (pairingRequest.requested_to !== responderProfile.id) {
      return NextResponse.json({ message: "Kamu tidak punya akses untuk request ini." }, { status: 403 });
    }

    if (pairingRequest.status !== "pending") {
      return NextResponse.json({ message: "Pairing request ini sudah diproses." }, { status: 409 });
    }

    if (action === "reject") {
      const { error: rejectError } = await supabaseAdmin
        .from("pairing_requests")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
          responded_by: responderProfile.id,
        })
        .eq("id", pairingRequest.id);

      if (rejectError) {
        throw rejectError;
      }

      return NextResponse.json({
        message: "Permintaan pairing berhasil ditolak.",
      });
    }

    const { data: requesterProfileRaw, error: requesterProfileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, auth_user_id, pair_id, role")
      .eq("id", pairingRequest.requested_by)
      .limit(1)
      .maybeSingle();

    if (requesterProfileError || !requesterProfileRaw) {
      return NextResponse.json({ message: "Profile pengirim pairing tidak ditemukan." }, { status: 404 });
    }

    const requesterProfile = requesterProfileRaw as ProfileRow;
    if (requesterProfile.pair_id || responderProfile.pair_id) {
      return NextResponse.json(
        { message: "Salah satu user sudah terhubung ke pasangan lain." },
        { status: 409 },
      );
    }

    if (!isGenderRoleValid(requesterProfile.role) || !isGenderRoleValid(responderProfile.role)) {
      return NextResponse.json(
        { message: "Pairing hanya bisa diproses jika kedua user punya gender valid." },
        { status: 409 },
      );
    }

    if (requesterProfile.role === responderProfile.role) {
      return NextResponse.json(
        { message: "Pairing hanya bisa antar user single dengan gender berbeda." },
        { status: 409 },
      );
    }

    const plainPairCode = generatePlainPairCode();
    const hashedPairCode = bcrypt.hashSync(plainPairCode, bcrypt.genSaltSync(10));

    const { data: pairRaw, error: pairError } = await supabaseAdmin
      .from("pairs")
      .insert({
        pair_code: hashedPairCode,
        streak: 0,
      })
      .select("id")
      .single();

    if (pairError || !pairRaw?.id) {
      throw pairError || new Error("Gagal membuat data pair baru.");
    }

    const requesterRole = requesterProfile.role;
    const responderRole = responderProfile.role;

    const { error: requesterUpdateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        pair_id: pairRaw.id,
        role: requesterRole,
        pair_code_plain: plainPairCode,
      })
      .eq("id", requesterProfile.id);

    if (requesterUpdateError) {
      throw requesterUpdateError;
    }

    const { error: responderUpdateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        pair_id: pairRaw.id,
        role: responderRole,
        pair_code_plain: plainPairCode,
      })
      .eq("id", responderProfile.id);

    if (responderUpdateError) {
      throw responderUpdateError;
    }

    const { error: requestUpdateError } = await supabaseAdmin
      .from("pairing_requests")
      .update({
        status: "approved",
        responded_at: new Date().toISOString(),
        responded_by: responderProfile.id,
      })
      .eq("id", pairingRequest.id);

    if (requestUpdateError) {
      throw requestUpdateError;
    }

    return NextResponse.json({
      message: "Pairing berhasil disetujui. Kalian sekarang sudah terhubung.",
      pairId: pairRaw.id,
      pairCode: plainPairCode,
    });
  } catch (error: unknown) {
    console.error("Pairing respond error:", error);
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
      { message: "Terjadi kesalahan pada server pairing respond." },
      { status: 500 },
    );
  }
}
