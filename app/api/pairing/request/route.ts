import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getApiAuthUser } from "@/lib/apiAuth";

type RequestBody = {
  requesterProfileId?: string;
  targetProfileId?: string;
  targetIdentifier?: string;
  note?: string;
};

type UserProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  pair_id: string | null;
  auth_user_id: string | null;
  role: string | null;
};

const isProfileOwnedByAuth = (profile: UserProfileRow, auth: { id: string; email: string }) => {
  const profileEmail = (profile.email || "").trim().toLowerCase();
  return profile.auth_user_id === auth.id || (Boolean(profileEmail) && profileEmail === auth.email);
};

const isGenderRoleValid = (role: string | null | undefined): role is "A" | "B" => {
  return role === "A" || role === "B";
};

const findTargetProfile = async (targetIdentifier: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const normalized = targetIdentifier.trim();
  const isEmail = normalized.includes("@");

  if (isEmail) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, name, pair_id, auth_user_id, role")
      .eq("email", normalized.toLowerCase())
      .limit(10);

    if (error) {
      throw error;
    }

    return (data || []) as UserProfileRow[];
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, name, pair_id, auth_user_id, role")
    .ilike("name", normalized.toLowerCase())
    .limit(10);

  if (error) {
    throw error;
  }

  return (data || []) as UserProfileRow[];
};

const findTargetProfileById = async (targetProfileId: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, name, pair_id, auth_user_id, role")
    .eq("id", targetProfileId)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data || []) as UserProfileRow[];
};

export async function POST(request: Request) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const requesterProfileId = body.requesterProfileId?.trim();
    const targetProfileId = body.targetProfileId?.trim();
    const targetIdentifier = body.targetIdentifier?.trim();
    const note = body.note?.trim() || null;

    if (!requesterProfileId || (!targetProfileId && !targetIdentifier)) {
      return NextResponse.json(
        { message: "Data pairing tidak lengkap. Isi user target pairing." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: requesterRaw, error: requesterError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, name, pair_id, auth_user_id, role")
      .eq("id", requesterProfileId)
      .limit(1)
      .maybeSingle();

    if (requesterError || !requesterRaw) {
      return NextResponse.json({ message: "Profile kamu tidak ditemukan." }, { status: 404 });
    }

    const requester = requesterRaw as UserProfileRow;
    if (!isProfileOwnedByAuth(requester, authUser)) {
      return NextResponse.json({ message: "Akses profile ditolak." }, { status: 403 });
    }

    if (requester.pair_id) {
      return NextResponse.json(
        { message: "Akun ini sudah terhubung ke pasangan. Pairing request tidak diperlukan." },
        { status: 409 },
      );
    }

    if (!isGenderRoleValid(requester.role)) {
      return NextResponse.json(
        { message: "Profil kamu belum punya gender yang valid. Lengkapi profile dulu." },
        { status: 409 },
      );
    }

    if (targetProfileId && targetProfileId === requester.id) {
      return NextResponse.json(
        { message: "Tidak bisa mengirim pairing request ke profile sendiri." },
        { status: 409 },
      );
    }

    const targetCandidates = (
      targetProfileId
        ? await findTargetProfileById(targetProfileId)
        : await findTargetProfile(targetIdentifier || "")
    ).filter(
      (item) => item.id !== requester.id,
    );

    if (targetCandidates.length === 0) {
      return NextResponse.json({ message: "User target tidak ditemukan." }, { status: 404 });
    }

    if (targetCandidates.length > 1) {
      return NextResponse.json(
        { message: "Target tidak unik. Gunakan identifier yang lebih spesifik." },
        { status: 409 },
      );
    }

    const target = targetCandidates[0];
    if (target.pair_id) {
      return NextResponse.json(
        { message: "User target sudah memiliki pasangan." },
        { status: 409 },
      );
    }

    if (!isGenderRoleValid(target.role)) {
      return NextResponse.json(
        { message: "User target belum punya gender yang valid untuk pairing." },
        { status: 409 },
      );
    }

    if (requester.role === target.role) {
      return NextResponse.json(
        { message: "Pairing hanya bisa antar user single dengan gender berbeda." },
        { status: 409 },
      );
    }

    const expireBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error: expireError } = await supabaseAdmin
      .from("pairing_requests")
      .update({
        status: "expired",
        responded_at: new Date().toISOString(),
      })
      .eq("status", "pending")
      .lt("created_at", expireBefore);

    if (expireError) {
      throw expireError;
    }

    const { data: existingPending, error: existingError } = await supabaseAdmin
      .from("pairing_requests")
      .select("id")
      .eq("status", "pending")
      .or(
        `and(requested_by.eq.${requester.id},requested_to.eq.${target.id}),and(requested_by.eq.${target.id},requested_to.eq.${requester.id})`,
      )
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingPending?.id) {
      return NextResponse.json(
        { message: "Masih ada pairing request pending antara kalian." },
        { status: 409 },
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("pairing_requests")
      .insert({
        requested_by: requester.id,
        requested_to: target.id,
        status: "pending",
        note,
      })
      .select("id, requested_by, requested_to, status, created_at")
      .single();

    if (insertError || !inserted) {
      throw insertError || new Error("Pairing request gagal disimpan.");
    }

    return NextResponse.json({
      message: "Permintaan pairing berhasil dikirim.",
      request: {
        id: inserted.id,
        requestedBy: inserted.requested_by,
        requestedTo: inserted.requested_to,
        status: inserted.status,
        createdAt: inserted.created_at,
      },
    });
  } catch (error: unknown) {
    console.error("Pairing request error:", error);
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
      { message: "Terjadi kesalahan pada server pairing request." },
      { status: 500 },
    );
  }
}
