import type { HubSubscriber } from "./types";

export type { HubSubscriber } from "./types";

const PREFIX_TAG = "hub:";

/**
 * Dedupe key namespaced so the hub's dedupe track never collides with
 * other route handlers writing the same Paystack reference into WebhookEvent.
 */
export function hubReference(reference: string): string {
  return `${PREFIX_TAG}${reference}`;
}

function subscriberFromPairs(name: string): HubSubscriber | null {
  const norm = name.trim().replace(/[^A-Za-z0-9-]/g, "_").replace(/-+/g, "_").toUpperCase();
  const url = process.env[`HUB_SUBSCRIBER_${norm}_URL`];
  const secret = process.env[`HUB_SUBSCRIBER_${norm}_SECRET`];
  if (!url || !secret) return null;
  const prefixes = (process.env[`HUB_SUBSCRIBER_${norm}_PREFIXES`] ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return { name, url, secret, prefixes };
}

function fromJsonList(raw: string): HubSubscriber[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  const out: HubSubscriber[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name.trim() : "";
    const url = typeof e.url === "string" ? e.url.trim() : "";
    const secret = typeof e.secret === "string" ? e.secret.trim() : "";
    if (!name || !url || !secret) {
      console.warn(`[hub] subscriber entry skipped: missing name/url/secret`);
      continue;
    }
    const prefixes = Array.isArray(e.prefixes)
      ? e.prefixes.filter((p): p is string => typeof p === "string" && p.length > 0)
      : [];
    out.push({ name, url, secret, prefixes });
  }
  return out;
}

/**
 * Resolve subscribers from env.
 * Primary: HUB_SUBSCRIBERS = JSON array [{ name, url, secret, prefixes? }]
 * Pair mode: HUB_SUBSCRIBER_NAMES="nova-pos,school" + per-name
 *   HUB_SUBSCRIBER_<NAME>_URL / _SECRET / optional _PREFIXES (comma list).
 * Empty prefixes means "receive every event".
 */
export function resolveHubSubscribers(): HubSubscriber[] {
  const json = process.env.HUB_SUBSCRIBERS;
  if (json) {
    try {
      return fromJsonList(json);
    } catch {
      console.warn("[hub] HUB_SUBSCRIBERS is not valid JSON");
      return [];
    }
  }
  const names = process.env.HUB_SUBSCRIBER_NAMES ?? "";
  const out: HubSubscriber[] = [];
  for (const name of names.split(",")) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const sub = subscriberFromPairs(trimmed);
    if (!sub) {
      console.warn(`[hub] subscriber ${trimmed} declared but env pair incomplete`);
      continue;
    }
    out.push(sub);
  }
  return out;
}

export function routeTargets(subscribers: HubSubscriber[], reference: string): HubSubscriber[] {
  return subscribers.filter((s) => s.prefixes.length === 0 || s.prefixes.some((p) => reference.startsWith(p)));
}
