import { NextResponse } from "next/server";
import { verifyPairSession } from "@/lib/payment";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type CancelSubscriptionRequestBody = {
  pairId?: string;
  pairCode?: string;
};

type ExistingSubscription = {
  id: string;
  status: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CancelSubscriptionRequestBody;
    const pairId = body.pairId?.trim();
    const pairCode = body.pairCode?.trim();

    if (!pairId || !pairCode) {
      return NextResponse.json(
        { message: "Data pembatalan tidak lengkap. Silakan refresh halaman." },
        { status: 400 },
      );
    }

    const hasPairAccess = await verifyPairSession(pairId, pairCode);
    if (!hasPairAccess) {
      return NextResponse.json({ message: "Sesi pair tidak valid." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status")
      .eq("pair_id", pairId)
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    const existing = subscription as ExistingSubscription | null;
    if (!existing?.id) {
      return NextResponse.json({ message: "Subscription tidak ditemukan." }, { status: 404 });
    }

    if (existing.status !== "active") {
      return NextResponse.json(
        { message: "Subscription sudah tidak aktif." },
        { status: 409 },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: nowIso,
        end_date: nowIso,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: "Subscription berhasil dibatalkan.",
      canceledAt: nowIso,
    });
  } catch (error: unknown) {
    console.error("Cancel subscription error:", error);

    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (errorCode === "42P01" || errorCode === "42703") {
      return NextResponse.json(
        {
          message:
            "Schema subscription belum tersedia di database. Cek tabel subscriptions.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Gagal membatalkan subscription." },
      { status: 500 },
    );
  }
}
