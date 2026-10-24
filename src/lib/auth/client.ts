export const AFF_TOKEN_KEY = "aff_token";

export function storeAffiliateToken(token: string) {
  try {
    sessionStorage.setItem(AFF_TOKEN_KEY, token);
  } catch {
    /* private mode */
  }
}

export function readAffiliateToken(): string | null {
  try {
    return sessionStorage.getItem(AFF_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAffiliateToken() {
  try {
    sessionStorage.removeItem(AFF_TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export function affiliateAuthHeaders(): HeadersInit {
  const token = typeof window === "undefined" ? null : readAffiliateToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
