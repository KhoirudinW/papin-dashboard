import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getApiAuthUser } from "@/lib/apiAuth";

type RequestBody = {
  requesterProfileId?: string;
  targetProfileId?: string;
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
    const requesterProfileId = body.requesterProfileId?.trim();
    const targetProfileId = body.targetProfileId?.trim();

    if (!requesterProfileId || !targetProfileId) {
      return NextResponse.json({ message: "Data direct pairing tidak lengkap." }, { status: 400 });
    }

    if (requesterProfileId === targetProfileId) {
      return NextResponse.json(
        { message: "Tidak bisa pairing dengan profile sendiri." },
        { status: 409 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: requesterRaw, error: requesterError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, auth_user_id, pair_id, role")
      .eq("id", requesterProfileId)
      .limit(1)
      .maybeSingle();

    if (requesterError || !requesterRaw) {
      return NextResponse.json({ message: "Profile requester tidak ditemukan." }, { status: 404 });
    }

    const requester = requesterRaw as ProfileRow;
    if (!isProfileOwnedByAuth(requester, authUser)) {
      return NextResponse.json({ message: "Akses profile ditolak." }, { status: 403 });
    }

    const { data: targetRaw, error: targetError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, auth_user_id, pair_id, role")
      .eq("id", targetProfileId)
      .limit(1)
      .maybeSingle();

    if (targetError || !targetRaw) {
      return NextResponse.json({ message: "Profile target tidak ditemukan." }, { status: 404 });
    }

    const target = targetRaw as ProfileRow;
    if (requester.pair_id || target.pair_id) {
      return NextResponse.json(
        { message: "Salah satu user sudah terhubung ke pasangan lain." },
        { status: 409 },
      );
    }

    if (!isGenderRoleValid(requester.role) || !isGenderRoleValid(target.role)) {
      return NextResponse.json(
        { message: "Pairing hanya bisa diproses jika kedua user punya gender valid." },
        { status: 409 },
      );
    }

    if (requester.role === target.role) {
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

    const pairId = pairRaw.id;

    const { data: requesterUpdated, error: requesterUpdateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        pair_id: pairId,
        pair_code_plain: plainPairCode,
      })
      .eq("id", requester.id)
      .is("pair_id", null)
      .select("id")
      .maybeSingle();

    if (requesterUpdateError || !requesterUpdated?.id) {
      await supabaseAdmin.from("pairs").delete().eq("id", pairId);
      return NextResponse.json(
        { message: "Profile requester sudah terhubung ke pasangan lain." },
        { status: 409 },
      );
    }

    const { data: targetUpdated, error: targetUpdateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        pair_id: pairId,
        pair_code_plain: plainPairCode,
      })
      .eq("id", target.id)
      .is("pair_id", null)
      .select("id")
      .maybeSingle();

    if (targetUpdateError || !targetUpdated?.id) {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          pair_id: null,
          pair_code_plain: null,
        })
        .eq("id", requester.id)
        .eq("pair_id", pairId);
      await supabaseAdmin.from("pairs").delete().eq("id", pairId);

      return NextResponse.json(
        { message: "Profile target sudah terhubung ke pasangan lain." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message: "Pairing berhasil. Kalian sekarang sudah terhubung.",
      pairId,
      pairCode: plainPairCode,
    });
  } catch (error: unknown) {
    console.error("Pairing direct error:", error);
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
      { message: "Terjadi kesalahan pada server direct pairing." },
      { status: 500 },
    );
  }
}

