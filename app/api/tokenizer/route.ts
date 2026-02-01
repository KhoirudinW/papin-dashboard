// app/api/tokenizer/route.ts
import Midtrans from "midtrans-client";
import { NextResponse } from "next/server";

let snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.NEXT_PUBLIC_MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
});

export async function POST(request: Request) {
    try {
      const { planName, amount } = await request.json();
  
      const parameter = {
        transaction_details: {
          order_id: `PAPIN-${Date.now()}`,
          gross_amount: amount,
        },
        item_details: [{
          id: planName.toLowerCase(),
          price: amount,
          quantity: 1,
          name: `Langganan PAPin: ${planName}`,
        }],
      };
  
      const transaction = await snap.createTransaction(parameter);
      return NextResponse.json({ token: transaction.token });
    } catch (error) {
      return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
    }
  }