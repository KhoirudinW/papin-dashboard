const STORAGE_KEY = "papin_pair_code_pending_changes";

export type PendingPairCodeLocal = {
  requestId: string;
  pairId: string;
  newPairCode: string;
  createdAt: string;
};

type PendingPairCodeStore = Record<string, PendingPairCodeLocal>;

const readStore = (): PendingPairCodeStore => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as PendingPairCodeStore;
  } catch {
    return {};
  }
};

const writeStore = (value: PendingPairCodeStore) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

export const savePendingPairCodeChange = (requestId: string, pairId: string, newPairCode: string) => {
  const current = readStore();
  current[requestId] = {
    requestId,
    pairId,
    newPairCode: newPairCode.trim().toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  writeStore(current);
};

export const getPendingPairCodeChange = (requestId: string) => {
  const current = readStore();
  return current[requestId] || null;
};

export const removePendingPairCodeChange = (requestId: string) => {
  const current = readStore();
  if (!current[requestId]) {
    return;
  }

  delete current[requestId];
  writeStore(current);
};
