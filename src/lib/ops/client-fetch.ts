export type OpsFetchResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  unauthorized: boolean;
};

export async function opsFetch<T>(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<OpsFetchResult<T>> {
  const { timeoutMs = 8000, headers, signal, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    const res = await fetch(input, {
      ...rest,
      credentials: "include",
      signal: ctrl.signal,
      headers: { Accept: "application/json", ...headers },
    });
    const json = (await res.json().catch(() => null)) as { error?: string } | T | null;
    if (res.status === 401) {
      if (typeof window !== "undefined" && !input.includes("/api/admin/login")) {
        window.location.assign("/admin/login");
      }
      return {
        ok: false,
        status: 401,
        data: null,
        error: (json as { error?: string } | null)?.error ?? "Unauthorized",
        unauthorized: true,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`,
        unauthorized: res.status === 403,
      };
    }
    return { ok: true, status: res.status, data: json as T, error: null, unauthorized: false };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: describeNetworkFailure(err),
      unauthorized: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Map a fetch rejection to a user-facing message. Raw Error.message can be
 * browser jargon or, worse, an empty string — both render as a dead toast in
 * the UI. Known failure shapes get a friendly line; everything else falls back
 * to a generic network error. Never throws.
 */
function describeNetworkFailure(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Request timed out";
    const msg = err.message || "";
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed") ||
      msg.includes("fetch failed")
    ) {
      return "Network error — check your connection and try again";
    }
  }
  return "Network error — check your connection and try again";
}
