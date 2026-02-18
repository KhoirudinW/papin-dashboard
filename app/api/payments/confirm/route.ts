import { NextResponse } from "next/server";
import { getMidtransCoreApi } from "@/lib/midtrans";
import {
  activatePairSubscription,
  extractDiscountFromRawRequest,
  isPaidTransaction,
  markRedeemDiscountUsed,
  persistPaymentTransactionStatus,
  toIsoOrNull,
  verifyPairSession,
} from "@/lib/payment";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ConfirmRequestBody = {
  orderId?: string;
  pairId?: string;
  pairCode?: string;
};

type PaymentRecord = {
  id: string;
  pair_id: string;
  plan_id: string;
  transaction_status: string;
  raw_request: Record<string, unknown> | null;
};

const getString = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfirmRequestBody;
    const orderId = body.orderId?.trim();
    const pairId = body.pairId?.trim();
    const pairCode = body.pairCode?.trim();

    if (!orderId || !pairId || !pairCode) {
      return NextResponse.json(
        { message: "Data konfirmasi pembayaran tidak lengkap." },
        { status: 400 },
      );
    }

    const hasPairAccess = await verifyPairSession(pairId, pairCode);
    if (!hasPairAccess) {
      return NextResponse.json({ message: "Sesi pair tidak valid." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, pair_id, plan_id, transaction_status, raw_request")
      .eq("order_id", orderId)
      .eq("pair_id", pairId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ message: "Transaksi pembayaran tidak ditemukan." }, { status: 404 });
    }

    const paymentRecord = payment as PaymentRecord;
    const coreApi = getMidtransCoreApi();
    const transaction = await coreApi.transaction.status(orderId);

    const transactionStatus = getString((transaction as { transaction_status?: unknown }).transaction_status);
    const fraudStatus = getString((transaction as { fraud_status?: unknown }).fraud_status);
    const statusCode = getString((transaction as { status_code?: unknown }).status_code);
    const paymentType = getString((transaction as { payment_type?: unknown }).payment_type);
    const transactionId = getString((transaction as { transaction_id?: unknown }).transaction_id);
    const grossAmount = getString((transaction as { gross_amount?: unknown }).gross_amount);
    const transactionTime = getString((transaction as { transaction_time?: unknown }).transaction_time);
    const expiryTime = getString((transaction as { expiry_time?: unknown }).expiry_time);

    if (!transactionStatus) {
      return NextResponse.json(
        { message: "Status pembayaran dari Midtrans tidak valid." },
        { status: 502 },
      );
    }

    await persistPaymentTransactionStatus({
      orderId,
      statusCode,
      transactionStatus,
      fraudStatus,
      paymentType,
      transactionId,
      grossAmount,
      transactionTime,
      expiryTime,
      rawResponse: transaction as Record<string, unknown>,
    });

    const isPaid = isPaidTransaction(transactionStatus, fraudStatus);
    if (isPaid) {
      const paidStartDate = toIsoOrNull(transactionTime) || undefined;
      await activatePairSubscription(paymentRecord.pair_id, paymentRecord.plan_id, paidStartDate);

      const checkoutDiscount = extractDiscountFromRawRequest(paymentRecord.raw_request);
      if (checkoutDiscount) {
        await markRedeemDiscountUsed(paymentRecord.pair_id, checkoutDiscount.claimId, orderId);
      }
    }

    return NextResponse.json({
      message: isPaid ? "Pembayaran berhasil diverifikasi." : "Status pembayaran sudah diperbarui.",
      paymentStatus: transactionStatus,
      previousStatus: paymentRecord.transaction_status,
      activated: isPaid,
    });
  } catch (error: unknown) {
    console.error("Payment confirm error:", error);

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

    return NextResponse.json({ message: "Gagal konfirmasi status pembayaran." }, { status: 500 });
  }
}
