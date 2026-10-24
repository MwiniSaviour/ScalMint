"use client";

import { useState } from "react";
import { affiliateAuthHeaders } from "@/lib/auth/client";

export function PayoutButton({ eligible, pendingGhs }: { eligible: boolean; pendingGhs: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function requestPayout() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/affiliate/payout", {
        method: "POST",
        credentials: "include",
        headers: affiliateAuthHeaders(),
      });
      const data = (await res.json()) as { reference?: string; error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Payout failed");
        return;
      }
      setMsg(`Queued ${data.reference}`);
      window.location.reload();
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={!eligible || busy}
        onClick={requestPayout}
        className="mt-4 w-full rounded-[10px] bg-white px-4 py-2 text-[13px] font-medium text-black hover:bg-[#e8e8e8] disabled:opacity-40"
      >
        {busy ? "Queuing…" : `Request MoMo payout · GHS ${pendingGhs}`}
      </button>
      {msg && <p className="mt-2 text-center font-mono text-[11px] text-muted">{msg}</p>}
    </div>
  );
}
