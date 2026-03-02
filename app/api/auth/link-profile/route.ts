import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type LinkProfileBody = {
  profileId?: string;
  email?: string;
  password?: string;
  pairCode?: string;
};

type ProfileRow = {
  id: string;
  pair_id: string | null;
  pair_code_plain: string | null;
  auth_user_id: string | null;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LinkProfileBody;

    const profileId = String(body.profileId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const pairCode = String(body.pairCode || "").trim().toUpperCase();

    if (!profileId || !email || !password || !pairCode) {
      return NextResponse.json(
        { message: "Data tidak lengkap. Wajib isi profile, email, password, dan pair code." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "Format email tidak valid." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password minimal 6 karakter." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: profileRaw, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, pair_id, pair_code_plain, auth_user_id")
      .eq("id", profileId)
      .limit(1)
      .maybeSingle();

    if (profileError || !profileRaw) {
      return NextResponse.json({ message: "Profile tidak ditemukan." }, { status: 404 });
    }

    const profile = profileRaw as ProfileRow;

    if (profile.auth_user_id) {
      return NextResponse.json(
        { message: "Profile ini sudah terhubung ke akun login email/password." },
        { status: 409 },
      );
    }

    let pairCodeValid = false;

    if (profile.pair_code_plain) {
      pairCodeValid = profile.pair_code_plain.trim().toUpperCase() === pairCode;
    }

    if (!pairCodeValid && profile.pair_id) {
      const { data: pairRaw, error: pairError } = await supabaseAdmin
        .from("pairs")
        .select("pair_code")
        .eq("id", profile.pair_id)
        .limit(1)
        .maybeSingle();

      if (pairError) {
        throw pairError;
      }

      const pairCodeHash =
        pairRaw && typeof (pairRaw as { pair_code?: unknown }).pair_code === "string"
          ? String((pairRaw as { pair_code?: string }).pair_code)
          : "";

      pairCodeValid = Boolean(pairCodeHash) && bcrypt.compareSync(pairCode, pairCodeHash);
    }

    if (!pairCodeValid) {
      return NextResponse.json({ message: "Pair code tidak valid." }, { status: 403 });
    }

    const { data: authCreated, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        profile_id: profile.id,
      },
    });

    if (authCreateError || !authCreated.user?.id) {
      const authMessage = String(authCreateError?.message || "").toLowerCase();
      if (authMessage.includes("already")) {
        return NextResponse.json(
          { message: "Email sudah terdaftar di Auth. Gunakan email lain atau login langsung." },
          { status: 409 },
        );
      }

      throw authCreateError || new Error("Gagal membuat user auth.");
    }

    const createdAuthUserId = authCreated.user.id;

    const { error: profileUpdateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        email,
        auth_user_id: createdAuthUserId,
      })
      .eq("id", profile.id)
      .is("auth_user_id", null);

    if (profileUpdateError) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      throw profileUpdateError;
    }

    return NextResponse.json({
      message: "Akun login berhasil dibuat dan profile sudah terhubung.",
      authUserId: createdAuthUserId,
      email,
    });
  } catch (error: unknown) {
    console.error("Link profile auth error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Missing Supabase server env")) {
      return NextResponse.json(
        {
          message:
            "Server env Supabase belum lengkap. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat akun login." },
      { status: 500 },
    );
  }
}
