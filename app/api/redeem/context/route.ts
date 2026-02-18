import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ContextRequestBody = {
  pairId?: string;
  pairCode?: string;
};

type RedeemCodeRow = {
  id: string;
  code: string;
  title: string;
  benefit: string;
  starts_at: string | null;
  expires_at: string | null;
  max_total_claims: number | null;
  total_claims: number;
};

type RedeemCodeRelation = {
  code: string;
  title: string;
  benefit: string;
  expires_at: string | null;
};

type RedeemClaimRow = {
  id: string;
  status: string | null;
  claimed_at: string;
  redeem_codes: RedeemCodeRelation | RedeemCodeRelation[] | null;
};

const isRedeemCodeCurrentlyAvailable = (code: RedeemCodeRow, now: Date) => {
  const started = !code.starts_at || new Date(code.starts_at) <= now;
  const notExpired = !code.expires_at || new Date(code.expires_at) >= now;
  const hasQuota = code.max_total_claims === null || code.total_claims < code.max_total_claims;
  return started && notExpired && hasQuota;
};

const getPairAccess = async (pairId: string, pairCode: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: pair, error } = await supabaseAdmin
    .from("pairs")
    .select("id, pair_code")
    .eq("id", pairId)
    .single();

  if (error || !pair) {
    return false;
  }

  return bcrypt.compareSync(pairCode.trim().toUpperCase(), pair.pair_code);
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContextRequestBody;
    const pairId = body.pairId?.trim();
    const pairCode = body.pairCode?.trim();

    if (!pairId || !pairCode) {
      return NextResponse.json(
        { message: "Pair session tidak lengkap. Silakan login ulang." },
        { status: 400 },
      );
    }

    const hasPairAccess = await getPairAccess(pairId, pairCode);
    if (!hasPairAccess) {
      return NextResponse.json({ message: "Sesi pair tidak valid." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();

    const { data: codes, error: codesError } = await supabaseAdmin
      .from("redeem_codes")
      .select("id, code, title, benefit, starts_at, expires_at, max_total_claims, total_claims")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (codesError) {
      throw codesError;
    }

    const availableCodes = (codes as RedeemCodeRow[] | null | undefined)
      ?.filter((item) => isRedeemCodeCurrentlyAvailable(item, now))
      .map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        benefit: item.benefit,
        expiresAt: item.expires_at,
      })) ?? [];

    const { data: claims, error: claimsError } = await supabaseAdmin
      .from("redeem_claims")
      .select("id, status, claimed_at, redeem_codes(code, title, benefit, expires_at)")
      .eq("pair_id", pairId)
      .order("claimed_at", { ascending: false })
      .limit(10);

    if (claimsError) {
      throw claimsError;
    }

    const history =
      (claims as RedeemClaimRow[] | null | undefined)?.map((item) => {
        const redeemCode = Array.isArray(item.redeem_codes) ? item.redeem_codes[0] : item.redeem_codes;

        return {
          id: item.id,
          code: redeemCode?.code || "UNKNOWN",
          title: redeemCode?.title || "Redeem",
          benefit: redeemCode?.benefit || "-",
          claimedAt: item.claimed_at,
          status: item.status || "active",
          expiresAt: redeemCode?.expires_at || null,
        };
      }) || [];

    return NextResponse.json({
      availableCodes,
      history,
    });
  } catch (error: unknown) {
    console.error("Redeem context error:", error);
    const errorMessage = error instanceof Error ? error.message : "";
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (errorMessage.includes("Missing Supabase server env")) {
      return NextResponse.json(
        {
          message:
            "Server env Supabase belum lengkap. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    if (errorCode === "42P01" || errorCode === "42703") {
      return NextResponse.json(
        {
          message:
            "Schema redeem belum tersedia di database. Jalankan migration redeem terlebih dahulu.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Gagal memuat data redeem. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
