import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type MidtransTransactionSnapshot = {
  orderId: string;
  statusCode?: string | null;
  transactionStatus: string;
  fraudStatus?: string | null;
  paymentType?: string | null;
  transactionId?: string | null;
  grossAmount?: string | number | null;
  transactionTime?: string | null;
  expiryTime?: string | null;
  rawResponse?: Record<string, unknown>;
};

export type CheckoutDiscount = {
  claimId: string;
  percent: number;
  amount: number;
};

type ExistingSubscriptionRow = {
  id: string;
  status: string | null;
  end_date: string | null;
};

type RedeemClaimForDiscount = {
  id: string;
  pair_id: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

export const toIsoOrNull = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const normalizeTransactionStatus = (status: string) => {
  return status.trim().toLowerCase();
};

const addOneMonthIso = (baseIso: string) => {
  const baseDate = new Date(baseIso);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const nextDate = new Date(baseDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate.toISOString();
};

export const isPaidTransaction = (status: string, fraudStatus?: string | null) => {
  const normalizedStatus = normalizeTransactionStatus(status);
  const normalizedFraud = (fraudStatus || "").trim().toLowerCase();

  if (normalizedStatus === "settlement") {
    return true;
  }

  if (normalizedStatus === "capture") {
    return !normalizedFraud || normalizedFraud === "accept";
  }

  return false;
};

const toObjectRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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

export const extractDiscountFromRawRequest = (
  rawRequest: Record<string, unknown> | null | undefined,
): CheckoutDiscount | null => {
  const requestRecord = toObjectRecord(rawRequest);
  const discountRecord = toObjectRecord(requestRecord.discount);

  const claimId =
    typeof discountRecord.claimId === "string"
      ? discountRecord.claimId
      : typeof discountRecord.claim_id === "string"
        ? discountRecord.claim_id
        : "";
  const percent = toPositiveNumber(discountRecord.percent ?? discountRecord.discount_percent);
  const amount = toPositiveNumber(discountRecord.amount ?? discountRecord.discount_amount);

  if (!claimId || !percent || !amount) {
    return null;
  }

  return {
    claimId,
    percent,
    amount,
  };
};

export const verifyPairSession = async (pairId: string, pairCode: string) => {
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

export const persistPaymentTransactionStatus = async (
  snapshot: MidtransTransactionSnapshot,
) => {
  const supabaseAdmin = getSupabaseAdmin();
  const normalizedStatus = normalizeTransactionStatus(snapshot.transactionStatus);

  const updatePayload = {
    transaction_status: normalizedStatus,
    status_code: snapshot.statusCode || null,
    fraud_status: snapshot.fraudStatus || null,
    payment_type: snapshot.paymentType || null,
    midtrans_transaction_id: snapshot.transactionId || null,
    gross_amount:
      snapshot.grossAmount === null || snapshot.grossAmount === undefined
        ? null
        : String(snapshot.grossAmount),
    transaction_time: toIsoOrNull(snapshot.transactionTime),
    expires_at: toIsoOrNull(snapshot.expiryTime),
    paid_at: isPaidTransaction(normalizedStatus, snapshot.fraudStatus)
      ? toIsoOrNull(snapshot.transactionTime) || new Date().toISOString()
      : null,
    raw_response: snapshot.rawResponse || {},
  };

  const { error } = await supabaseAdmin
    .from("payment_transactions")
    .update(updatePayload)
    .eq("order_id", snapshot.orderId);

  if (error) {
    throw error;
  }
};

export const activatePairSubscription = async (
  pairId: string,
  planId: string,
  startDateIso?: string | null,
) => {
  const supabaseAdmin = getSupabaseAdmin();
  const startDate = toIsoOrNull(startDateIso) || new Date().toISOString();

  const { data: existingSubscription, error: existingError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status, end_date")
    .eq("pair_id", pairId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const existing = existingSubscription as ExistingSubscriptionRow | null;
  let billingStartDate = startDate;

  if (existing?.status === "active" && existing.end_date) {
    const existingEndDate = toIsoOrNull(existing.end_date);
    if (existingEndDate && new Date(existingEndDate).getTime() > new Date(startDate).getTime()) {
      billingStartDate = existingEndDate;
    }
  }

  const nextEndDate = addOneMonthIso(billingStartDate);
  if (!nextEndDate) {
    throw new Error("Failed to build subscription end date.");
  }

  if (existing?.id) {

    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_id: planId,
        status: "active",
        start_date: startDate,
        end_date: nextEndDate,
        canceled_at: null,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
    pair_id: pairId,
    plan_id: planId,
    status: "active",
    start_date: startDate,
    end_date: nextEndDate,
    canceled_at: null,
  });

  if (insertError) {
    throw insertError;
  }
};

export const markRedeemDiscountUsed = async (pairId: string, claimId: string, orderId: string) => {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("redeem_claims")
    .select("id, pair_id, status, metadata")
    .eq("id", claimId)
    .eq("pair_id", pairId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const claim = data as RedeemClaimForDiscount;
  if (claim.status !== "active") {
    return;
  }

  const metadata = toObjectRecord(claim.metadata);
  const nextMetadata = {
    ...metadata,
    used_at: new Date().toISOString(),
    used_order_id: orderId,
  };

  await supabaseAdmin
    .from("redeem_claims")
    .update({
      status: "used",
      metadata: nextMetadata,
    })
    .eq("id", claim.id);
};
