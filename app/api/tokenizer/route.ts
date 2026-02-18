import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getMidtransSnap } from "@/lib/midtrans";
import { verifyPairSession } from "@/lib/payment";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type TokenizerRequestBody = {
  pairId?: string;
  pairCode?: string;
  planId?: string;
};

type PlanRow = {
  id: string;
  name: string;
  price: number;
  description: string | null;
};

type RedeemCodeRelation = {
  code: string;
  metadata: Record<string, unknown> | null;
};

type RedeemDiscountClaimRow = {
  id: string;
  metadata: Record<string, unknown> | null;
  redeem_codes: RedeemCodeRelation | RedeemCodeRelation[] | null;
};

const toPositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const firstPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toPositiveNumber(value);
    if (parsed) {
      return parsed;
    }
  }
  return null;
};

const toObjectRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const getActiveDiscountClaim = async (pairId: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("redeem_claims")
    .select("id, metadata, redeem_codes(code, metadata)")
    .eq("pair_id", pairId)
    .eq("status", "active")
    .order("claimed_at", { ascending: true })
    .limit(20);

  if (error || !data) {
    return null;
  }

  const claims = data as RedeemDiscountClaimRow[];
  for (const claim of claims) {
    const claimMetadata = toObjectRecord(claim.metadata);
    const redeemCode = Array.isArray(claim.redeem_codes) ? claim.redeem_codes[0] : claim.redeem_codes;
    const codeMetadata = toObjectRecord(redeemCode?.metadata);
    const fallbackCode = (redeemCode?.code || "").toUpperCase();

    const effectType = String(
      claimMetadata.effect_type ||
        claimMetadata.effectType ||
        codeMetadata.effect_type ||
        codeMetadata.effectType ||
        "",
    ).toLowerCase();
    let discountPercent = firstPositiveNumber(
      claimMetadata.discount_percent,
      claimMetadata.discountPercent,
      codeMetadata.discount_percent,
      codeMetadata.discountPercent,
    );

    if ((!effectType || effectType === "none") && fallbackCode === "HEART25") {
      discountPercent = discountPercent || 25;
    }

    const isDiscountEffect =
      effectType === "discount_percent" || (fallbackCode === "HEART25" && Boolean(discountPercent));
    if (!isDiscountEffect) {
      continue;
    }

    if (!discountPercent) {
      continue;
    }

    return {
      claimId: claim.id,
      percent: Math.min(99, Math.max(1, Math.floor(discountPercent))),
    };
  }

  return null;
};

const generateOrderId = (pairId: string) => {
  const compactPair = pairId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const compactUuid = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `PAPIN-${compactPair}-${Date.now()}-${compactUuid}`;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TokenizerRequestBody;
    const pairId = body.pairId?.trim();
    const pairCode = body.pairCode?.trim();
    const planId = body.planId?.trim();

    if (!pairId || !pairCode || !planId) {
      return NextResponse.json(
        { message: "Data checkout belum lengkap. Silakan refresh halaman." },
        { status: 400 },
      );
    }

    const hasPairAccess = await verifyPairSession(pairId, pairCode);
    if (!hasPairAccess) {
      return NextResponse.json({ message: "Sesi pair tidak valid." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, name, price, description")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ message: "Plan tidak ditemukan." }, { status: 404 });
    }

    const selectedPlan = plan as PlanRow;
    if (!selectedPlan.price || selectedPlan.price <= 0) {
      return NextResponse.json({ message: "Plan gratis tidak memerlukan pembayaran." }, { status: 400 });
    }

    const activeDiscount = await getActiveDiscountClaim(pairId);
    const discountAmount = activeDiscount
      ? Math.round((selectedPlan.price * activeDiscount.percent) / 100)
      : 0;
    const finalAmount = Math.max(1, selectedPlan.price - discountAmount);

    const orderId = generateOrderId(pairId);
    const snap = getMidtransSnap();

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount,
      },
      item_details: [
        {
          id: selectedPlan.id,
          price: finalAmount,
          quantity: 1,
          name: `Langganan PAPin: ${selectedPlan.name}`,
        },
      ],
      custom_field1: pairId,
      custom_field2: selectedPlan.id,
      custom_field3: activeDiscount?.claimId || "",
    };

    const transaction = await snap.createTransaction(parameter);
    const token = transaction?.token as string | undefined;
    const redirectUrl = transaction?.redirect_url as string | undefined;

    if (!token) {
      return NextResponse.json({ message: "Gagal membuat token pembayaran." }, { status: 500 });
    }

    const { error: insertError } = await supabaseAdmin.from("payment_transactions").insert({
      order_id: orderId,
      pair_id: pairId,
      plan_id: selectedPlan.id,
      amount: finalAmount,
      currency: "IDR",
      transaction_status: "pending",
      snap_token: token,
      snap_redirect_url: redirectUrl || null,
      raw_request: {
        ...parameter,
        discount: activeDiscount
          ? {
              claimId: activeDiscount.claimId,
              percent: activeDiscount.percent,
              amount: discountAmount,
              originalAmount: selectedPlan.price,
              finalAmount,
            }
          : null,
      },
      raw_response: transaction || {},
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      token,
      orderId,
      redirectUrl: redirectUrl || null,
      plan: {
        id: selectedPlan.id,
        name: selectedPlan.name,
        price: selectedPlan.price,
      },
      discount: activeDiscount
        ? {
            claimId: activeDiscount.claimId,
            percent: activeDiscount.percent,
            amount: discountAmount,
            finalAmount,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Tokenizer route error:", error);

    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorCode === "42P01" || errorCode === "42703") {
      return NextResponse.json(
        {
          message:
            "Schema pembayaran belum tersedia di database. Jalankan migration payment terlebih dahulu.",
        },
        { status: 500 },
      );
    }

    if (errorMessage.includes("Missing Midtrans")) {
      return NextResponse.json(
        { message: "Midtrans server key belum diset di env server." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Gagal membuat transaksi pembayaran." }, { status: 500 });
  }
}
