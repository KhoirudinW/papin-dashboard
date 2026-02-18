import Midtrans from "midtrans-client";

const parseBooleanEnv = (value: string | undefined) => {
  return value?.trim().toLowerCase() === "true";
};

export const isMidtransProduction =
  parseBooleanEnv(process.env.MIDTRANS_IS_PRODUCTION) ||
  parseBooleanEnv(process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION);

export const midtransServerKey =
  process.env.MIDTRANS_SERVER_KEY || process.env.NEXT_PUBLIC_MIDTRANS_SERVER_KEY || "";

export const midtransClientKey =
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";

export const assertMidtransServerEnv = () => {
  if (!midtransServerKey) {
    throw new Error("Missing Midtrans server key env.");
  }
};

export const assertMidtransClientEnv = () => {
  if (!midtransClientKey) {
    throw new Error("Missing Midtrans client key env.");
  }
};

export const getMidtransSnap = () => {
  assertMidtransServerEnv();

  return new Midtrans.Snap({
    isProduction: isMidtransProduction,
    serverKey: midtransServerKey,
    clientKey: midtransClientKey,
  });
};

export const getMidtransCoreApi = () => {
  assertMidtransServerEnv();

  return new Midtrans.CoreApi({
    isProduction: isMidtransProduction,
    serverKey: midtransServerKey,
    clientKey: midtransClientKey,
  });
};
