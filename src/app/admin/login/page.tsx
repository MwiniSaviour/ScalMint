"use client";

import { useState } from "react";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

export default function OpsLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not sign in");
      window.location.assign("/admin");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background-gray-primary px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] rounded-2xl border border-card-border bg-card-background p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
      >
        <p className="text-xs font-medium tracking-[0.14em] text-text-secondary uppercase">ScalMint operators</p>
        <h1 className="mt-2 text-[28px] font-medium leading-8 text-text-primary">Sign in to Ops</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Affiliate programme admin — users, commissions, conversions. Not the public affiliate dashboard.
        </p>
        <label className="mt-6 block text-sm font-medium text-text-primary">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-input-border bg-input-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-text-primary">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-input-border bg-input-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
          />
        </label>
        <Button type="submit" appearance="fill" isDisabled={status === "loading"} className="mt-6 w-full">
          {status === "loading" ? "Signing in…" : "Sign in"}
        </Button>
        {msg && <p className="mt-3 text-sm text-error-500">{msg}</p>}
      </form>
    </main>
  );
}
