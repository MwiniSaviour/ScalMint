export const AFF_TOKEN_KEY = "aff_token";

let memoryToken: string | null = null;

function silentGet(storage: Storage): string | null {
  try {
    return storage.getItem(AFF_TOKEN_KEY);
  } catch {
    return null;
  }
}

function silentSet(storage: Storage, token: string) {
  try {
    storage.setItem(AFF_TOKEN_KEY, token);
  } catch {
    /* blocked in iframe / private mode */
  }
}

function silentRemove(storage: Storage) {
  try {
    storage.removeItem(AFF_TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export function storeAffiliateToken(token: string) {
  memoryToken = token;
  if (typeof window === "undefined") return;
  silentSet(window.sessionStorage, token);
  silentSet(window.localStorage, token);
}

export function readAffiliateToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  const fromHash = tokenFromLocationHash();
  if (fromHash) {
    memoryToken = fromHash;
    silentSet(window.sessionStorage, fromHash);
    silentSet(window.localStorage, fromHash);
    return fromHash;
  }
  return silentGet(window.sessionStorage) ?? silentGet(window.localStorage);
}

export function clearAffiliateToken() {
  memoryToken = null;
  if (typeof window === "undefined") return;
  silentRemove(window.sessionStorage);
  silentRemove(window.localStorage);
}

export function tokenFromLocationHash(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith("eyJ") ? decoded : null;
  } catch {
    return raw.startsWith("eyJ") ? raw : null;
  }
}

export function affiliateAuthHeaders(token?: string | null): HeadersInit {
  const t = token ?? readAffiliateToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function dashboardUrl(token: string) {
  return `/affiliate/dashboard#${encodeURIComponent(token)}`;
}
