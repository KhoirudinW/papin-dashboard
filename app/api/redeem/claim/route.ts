import { NextResponse } from "next/server";
import { verifyPairSession } from "@/lib/payment";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ClaimRequestBody = {
  pairId?: string;
  profileId?: string;
  pairCode?: string;
  code?: string;
};

type RedeemCodeRow = {
  id: string;
  code: string;
  title: string;
  benefit: string;
  metadata: Record<string, unknown> | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  max_total_claims: number | null;
  total_claims: number;
};

type RedeemClaimRow = {
  id: string;
  status: string;
  claimed_at: string;
};

type SubscriptionRow = {
  id: string;
  plan_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type RedeemEffectDefinition = {
  effectType: "activate_plan_days" | "extend_days" | "discount_percent" | "none";
  durationDays: number | null;
  planId: string | null;
  planName: string | null;
  discountPercent: number | null;
};

type AppliedEffectResult = {
  applied: boolean;
  effectType: RedeemEffectDefinition["effectType"];
  message: string;
  endDate: string | null;
  planId: string | null;
};

type MappedClaimError = {
  status: number;
  message: string;
};

const mapClaimError = (rawMessage: string, rawCode?: string): MappedClaimError => {
  if (rawCode === "22P02") {
    return { status: 400, message: "Format data redeem tidak valid. Coba login ulang." };
  }
  if (rawCode === "23505") {
    return { status: 409, message: "Kode ini sudah pernah kamu pakai." };
  }
  if (rawCode === "42501") {
    return { status: 500, message: "Akses redeem ditolak oleh database (RLS/policy)." };
  }
  if (rawMessage.includes("REDEEM_NOT_FOUND")) {
    return { status: 404, message: "Kode redeem tidak ditemukan." };
  }
  if (rawMessage.includes("INVALID_PAIR_CODE")) {
    return { status: 401, message: "Sesi pair tidak valid. Silakan login ulang." };
  }
  if (rawMessage.includes("PAIR_NOT_FOUND")) {
    return { status: 404, message: "Pair tidak ditemukan." };
  }
  if (rawMessage.includes("PROFILE_NOT_IN_PAIR")) {
    return { status: 403, message: "Akses profile tidak sesuai pair." };
  }
  if (rawMessage.includes("REDEEM_NOT_STARTED")) {
    return { status: 409, message: "Kode belum bisa digunakan." };
  }
  if (rawMessage.includes("REDEEM_EXPIRED")) {
    return { status: 409, message: "Kode sudah kedaluwarsa." };
  }
  if (rawMessage.includes("REDEEM_INACTIVE")) {
    return { status: 409, message: "Kode saat ini tidak aktif." };
  }
  if (rawMessage.includes("REDEEM_ALREADY_CLAIMED")) {
    return { status: 409, message: "Kode ini sudah pernah kamu pakai." };
  }
  if (rawMessage.includes("REDEEM_QUOTA_EXCEEDED")) {
    return { status: 409, message: "Kuota kode redeem sudah habis." };
  }
  return { status: 500, message: "Gagal melakukan redeem code." };
};

const parseDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const toIso = (value: string | null) => {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
};

const addDaysIso = (baseIso: string, days: number) => {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString();
};

const parsePositiveInt = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return null;
};

const normalizeEffectFromCode = (redeemCode: RedeemCodeRow): RedeemEffectDefinition => {
  const metadata = redeemCode.metadata || {};
  const metadataEffectType = String(metadata.effect_type || "").toLowerCase();
  const metadataDurationDays = parsePositiveInt(metadata.duration_days);
  const metadataPlanId = typeof metadata.plan_id === "string" ? metadata.plan_id : null;
  const metadataPlanName = typeof metadata.plan_name === "string" ? metadata.plan_name : null;
  const metadataDiscountPercent = parsePositiveInt(metadata.discount_percent);

  if (
    metadataEffectType === "activate_plan_days" ||
    metadataEffectType === "extend_days" ||
    metadataEffectType === "discount_percent"
  ) {
    return {
      effectType: metadataEffectType,
      durationDays: metadataDurationDays,
      planId: metadataPlanId,
      planName: metadataPlanName,
      discountPercent: metadataDiscountPercent,
    };
  }

  // Fallback untuk seed code lama yang metadata-nya belum terisi.
  if (redeemCode.code === "PAPLOVE7") {
    return {
      effectType: "activate_plan_days",
      durationDays: 7,
      planId: null,
      planName: "Pro",
      discountPercent: null,
    };
  }

  if (redeemCode.code === "COUPLEPRO14") {
    return {
      effectType: "activate_plan_days",
      durationDays: 14,
      planId: null,
      planName: "Pro",
      discountPercent: null,
    };
  }

  if (redeemCode.code === "HEART25") {
    return {
      effectType: "discount_percent",
      durationDays: null,
      planId: null,
      planName: null,
      discountPercent: 25,
    };
  }

  return {
    effectType: "none",
    durationDays: null,
    planId: null,
    planName: null,
    discountPercent: null,
  };
};

const resolvePlanId = async (
  effect: RedeemEffectDefinition,
  defaultPlanName: string,
) => {
  const supabaseAdmin = getSupabaseAdmin();

  if (effect.planId) {
    const { data: planById } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("id", effect.planId)
      .limit(1)
      .maybeSingle();
    if (planById?.id) {
      return planById.id as string;
    }
  }

  const planName = effect.planName || defaultPlanName;
  const { data: planByName } = await supabaseAdmin
    .from("plans")
    .select("id")
    .ilike("name", planName)
    .limit(1)
    .maybeSingle();

  return (planByName?.id as string | undefined) || null;
};

const applyRedeemEffect = async (pairId: string, redeemCode: RedeemCodeRow) => {
  const effect = normalizeEffectFromCode(redeemCode);
  const supabaseAdmin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  if (effect.effectType === "none") {
    return {
      applied: true,
      effectType: "none",
      message: "Claim berhasil dicatat.",
      endDate: null,
      planId: null,
    } satisfies AppliedEffectResult;
  }

  if (effect.effectType === "discount_percent") {
    return {
      applied: true,
      effectType: "discount_percent",
      message: `Diskon ${effect.discountPercent ?? 0}% aktif dan akan dipakai otomatis di checkout pembayaran berikutnya.`,
      endDate: null,
      planId: null,
    } satisfies AppliedEffectResult;
  }

  const durationDays = effect.durationDays;
  if (!durationDays || durationDays <= 0) {
    throw new Error("EFFECT_DURATION_INVALID");
  }

  const { data: existingSubscriptionData, error: existingSubscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, plan_id, status, start_date, end_date")
    .eq("pair_id", pairId)
    .limit(1)
    .maybeSingle();

  if (existingSubscriptionError) {
    throw existingSubscriptionError;
  }

  const existingSubscription = existingSubscriptionData as SubscriptionRow | null;

  if (effect.effectType === "extend_days") {
    if (!existingSubscription || existingSubscription.status !== "active") {
      throw new Error("NO_ACTIVE_SUBSCRIPTION");
    }

    const baseEnd =
      toIso(existingSubscription.end_date) && (parseDate(existingSubscription.end_date) as Date).getTime() > Date.now()
        ? (toIso(existingSubscription.end_date) as string)
        : nowIso;
    const nextEnd = addDaysIso(baseEnd, durationDays);

    if (!nextEnd) {
      throw new Error("FAILED_TO_BUILD_END_DATE");
    }

    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "active",
        end_date: nextEnd,
        canceled_at: null,
      })
      .eq("id", existingSubscription.id);

    if (updateError) {
      throw updateError;
    }

    return {
      applied: true,
      effectType: "extend_days",
      message: `Masa aktif berhasil ditambah ${durationDays} hari.`,
      endDate: nextEnd,
      planId: existingSubscription.plan_id,
    } satisfies AppliedEffectResult;
  }

  // activate_plan_days
  const targetPlanId = await resolvePlanId(effect, "Pro");
  if (!targetPlanId) {
    throw new Error("TARGET_PLAN_NOT_FOUND");
  }

  let baseIso = nowIso;
  if (
    existingSubscription &&
    existingSubscription.status === "active" &&
    existingSubscription.plan_id === targetPlanId
  ) {
    const existingEndIso = toIso(existingSubscription.end_date);
    if (existingEndIso && new Date(existingEndIso).getTime() > Date.now()) {
      baseIso = existingEndIso;
    }
  }

  const nextEnd = addDaysIso(baseIso, durationDays);
  if (!nextEnd) {
    throw new Error("FAILED_TO_BUILD_END_DATE");
  }

  if (existingSubscription?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_id: targetPlanId,
        status: "active",
        start_date: nowIso,
        end_date: nextEnd,
        canceled_at: null,
      })
      .eq("id", existingSubscription.id);

    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
      pair_id: pairId,
      plan_id: targetPlanId,
      status: "active",
      start_date: nowIso,
      end_date: nextEnd,
      canceled_at: null,
    });

    if (insertError) {
      throw insertError;
    }
  }

  return {
    applied: true,
    effectType: "activate_plan_days",
    message: `Plan berhasil diaktifkan selama ${durationDays} hari.`,
    endDate: nextEnd,
    planId: targetPlanId,
  } satisfies AppliedEffectResult;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClaimRequestBody;
    const pairId = body.pairId?.trim();
    const profileId = body.profileId?.trim();
    const pairCode = body.pairCode?.trim();
    const code = body.code?.trim().toUpperCase();

    if (!pairId || !profileId || !pairCode || !code) {
      return NextResponse.json(
        { message: "Data redeem tidak lengkap. Silakan refresh halaman." },
        { status: 400 },
      );
    }

    const hasPairAccess = await verifyPairSession(pairId, pairCode);
    if (!hasPairAccess) {
      return NextResponse.json({ message: "Sesi pair tidak valid. Silakan login ulang." }, { status: 401 });
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
      const mapped = mapClaimError(profileError.message || "", profileError.code || "");
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }

    if (!profileInPair) {
      return NextResponse.json({ message: "Akses profile tidak sesuai pair." }, { status: 403 });
    }

    const { data: redeemCodeData, error: redeemCodeError } = await supabaseAdmin
      .from("redeem_codes")
      .select(
        "id, code, title, benefit, metadata, starts_at, expires_at, is_active, max_total_claims, total_claims",
      )
      .eq("code", code)
      .limit(1)
      .maybeSingle();

    if (redeemCodeError) {
      const mapped = mapClaimError(redeemCodeError.message || "", redeemCodeError.code || "");
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }

    const redeemCode = redeemCodeData as RedeemCodeRow | null;
    if (!redeemCode) {
      return NextResponse.json({ message: "Kode redeem tidak ditemukan." }, { status: 404 });
    }

    if (!redeemCode.is_active) {
      return NextResponse.json({ message: "Kode saat ini tidak aktif." }, { status: 409 });
    }

    const now = new Date();
    const startsAt = parseDate(redeemCode.starts_at);
    const expiresAt = parseDate(redeemCode.expires_at);

    if (startsAt && startsAt.getTime() > now.getTime()) {
      return NextResponse.json({ message: "Kode belum bisa digunakan." }, { status: 409 });
    }

    if (expiresAt && expiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ message: "Kode sudah kedaluwarsa." }, { status: 409 });
    }

    const { data: existingClaim, error: existingClaimError } = await supabaseAdmin
      .from("redeem_claims")
      .select("id")
      .eq("redeem_code_id", redeemCode.id)
      .eq("pair_id", pairId)
      .limit(1)
      .maybeSingle();

    if (existingClaimError) {
      const mapped = mapClaimError(existingClaimError.message || "", existingClaimError.code || "");
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }

    if (existingClaim) {
      return NextResponse.json({ message: "Kode ini sudah pernah kamu pakai." }, { status: 409 });
    }

    if (redeemCode.max_total_claims !== null && redeemCode.total_claims >= redeemCode.max_total_claims) {
      return NextResponse.json({ message: "Kuota kode redeem sudah habis." }, { status: 409 });
    }

    const effectDefinition = normalizeEffectFromCode(redeemCode);

    const { data: insertedClaimData, error: insertedClaimError } = await supabaseAdmin
      .from("redeem_claims")
      .insert({
        redeem_code_id: redeemCode.id,
        pair_id: pairId,
        claimed_by: profileId,
        status: "active",
        metadata: {
          effect_type: effectDefinition.effectType,
          duration_days: effectDefinition.durationDays,
          plan_id: effectDefinition.planId,
          plan_name: effectDefinition.planName,
          discount_percent: effectDefinition.discountPercent,
        },
      })
      .select("id, status, claimed_at")
      .single();

    if (insertedClaimError) {
      const mapped = mapClaimError(insertedClaimError.message || "", insertedClaimError.code || "");
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }

    const insertedClaim = insertedClaimData as RedeemClaimRow | null;
    if (!insertedClaim) {
      return NextResponse.json({ message: "Redeem gagal diproses." }, { status: 500 });
    }

    let effectResult: AppliedEffectResult;
    try {
      effectResult = await applyRedeemEffect(pairId, redeemCode);
    } catch (effectError: unknown) {
      // Rollback claim jika effect gagal diterapkan
      await supabaseAdmin.from("redeem_claims").delete().eq("id", insertedClaim.id);

      const effectMessage =
        effectError instanceof Error ? effectError.message : "FAILED_TO_APPLY_REDEEM_EFFECT";
      if (effectMessage === "NO_ACTIVE_SUBSCRIPTION") {
        return NextResponse.json(
          { message: "Tidak ada subscription aktif untuk diperpanjang." },
          { status: 409 },
        );
      }
      if (effectMessage === "TARGET_PLAN_NOT_FOUND") {
        return NextResponse.json(
          { message: "Plan target redeem tidak ditemukan." },
          { status: 500 },
        );
      }
      if (effectMessage === "EFFECT_DURATION_INVALID") {
        return NextResponse.json(
          { message: "Konfigurasi redeem duration tidak valid." },
          { status: 500 },
        );
      }

      console.error("Redeem effect apply error:", effectError);
      return NextResponse.json(
        { message: "Gagal menerapkan efek redeem code." },
        { status: 500 },
      );
    }

    await supabaseAdmin
      .from("redeem_claims")
      .update({
        metadata: {
          effect_type: effectDefinition.effectType,
          duration_days: effectDefinition.durationDays,
          plan_id: effectResult.planId,
          plan_name: effectDefinition.planName,
          discount_percent: effectDefinition.discountPercent,
          applied: effectResult.applied,
          applied_message: effectResult.message,
          applied_end_date: effectResult.endDate,
          applied_at: new Date().toISOString(),
        },
      })
      .eq("id", insertedClaim.id);

    const { count: updatedTotalClaims, error: countError } = await supabaseAdmin
      .from("redeem_claims")
      .select("id", { count: "exact", head: true })
      .eq("redeem_code_id", redeemCode.id);

    if (!countError) {
      await supabaseAdmin
        .from("redeem_codes")
        .update({ total_claims: updatedTotalClaims ?? redeemCode.total_claims + 1 })
        .eq("id", redeemCode.id);
    }

    return NextResponse.json({
      message: `Kode ${redeemCode.code} berhasil diaktifkan. ${effectResult.message}`,
      appliedEffect: {
        type: effectResult.effectType,
        endDate: effectResult.endDate,
        planId: effectResult.planId,
      },
      claim: {
        id: insertedClaim.id,
        code: redeemCode.code,
        title: redeemCode.title,
        benefit: redeemCode.benefit,
        expiresAt: redeemCode.expires_at,
        claimedAt: insertedClaim.claimed_at,
        status: insertedClaim.status,
      },
    });
  } catch (error: unknown) {
    console.error("Redeem claim server error:", error);
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

    return NextResponse.json({ message: "Terjadi kesalahan pada server redeem." }, { status: 500 });
  }
}
