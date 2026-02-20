import Midtrans from "midtrans-client";

const parseBooleanEnv = (value: string | undefined) => {
  return value?.trim().toLowerCase() === "true";
};

const normalizeEnvValue = (value: string | undefined) => {
  return value?.trim() || "";
};

const hasSandboxPrefix = (key: string) => {
  return key.startsWith("SB-");
};

const explicitMidtransMode = process.env.MIDTRANS_IS_PRODUCTION ?? process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION;
const inferredModeKey = normalizeEnvValue(
  process.env.MIDTRANS_SERVER_KEY ||
    process.env.NEXT_PUBLIC_MIDTRANS_SERVER_KEY ||
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
    process.env.MIDTRANS_CLIENT_KEY,
);

export const isMidtransProduction =
  typeof explicitMidtransMode === "string" && explicitMidtransMode.trim() !== ""
    ? parseBooleanEnv(explicitMidtransMode)
    : inferredModeKey
      ? !hasSandboxPrefix(inferredModeKey)
      : false;

export const midtransServerKey =
  normalizeEnvValue(process.env.MIDTRANS_SERVER_KEY || process.env.NEXT_PUBLIC_MIDTRANS_SERVER_KEY);

export const midtransClientKey =
  normalizeEnvValue(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY);

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

export const assertMidtransModeCompatibility = () => {
  if (!midtransServerKey || !midtransClientKey) {
    return;
  }

  const serverKeyIsSandbox = hasSandboxPrefix(midtransServerKey);
  const clientKeyIsSandbox = hasSandboxPrefix(midtransClientKey);

  if (serverKeyIsSandbox !== clientKeyIsSandbox) {
    throw new Error("Midtrans key mode mismatch between client and server key.");
  }

  if (isMidtransProduction && serverKeyIsSandbox) {
    throw new Error("Midtrans is configured as production but sandbox key is provided.");
  }

  if (!isMidtransProduction && !serverKeyIsSandbox) {
    throw new Error("Midtrans is configured as sandbox but production key is provided.");
  }
};

export const getMidtransSnap = () => {
  assertMidtransServerEnv();
  assertMidtransModeCompatibility();

  return new Midtrans.Snap({
    isProduction: isMidtransProduction,
    serverKey: midtransServerKey,
    clientKey: midtransClientKey,
  });
};

export const getMidtransCoreApi = () => {
  assertMidtransServerEnv();
  assertMidtransModeCompatibility();

  return new Midtrans.CoreApi({
    isProduction: isMidtransProduction,
    serverKey: midtransServerKey,
    clientKey: midtransClientKey,
  });
};
