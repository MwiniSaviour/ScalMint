"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { opsFetch } from "@/lib/ops/client-fetch";

function LoginInner() {
  const params = useSearchParams();
  const resetToken = params.get("reset") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    const res = resetToken
      ? await opsFetch("/api/admin/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password }),
        })
      : await opsFetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
    if (!res.ok) {
      setStatus("error");
      setMsg(res.error ?? "Could not sign in");
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background-gray-primary px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] rounded-2xl border border-card-border bg-card-background p-8"
      >
        <p className="text-xs font-medium tracking-[0.14em] text-text-secondary uppercase">ScalMint operators</p>
        <h1 className="mt-2 text-[28px] font-medium leading-8 text-text-primary">
          {resetToken ? "Set your password" : "Sign in to Ops"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Staff console for the product portfolio. Not the public affiliate dashboard. No default password exists.
        </p>
        {!resetToken && (
          <label className="mt-6 block text-sm font-medium text-text-primary">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input-border bg-input-background px-3 py-2.5 text-sm outline-none"
            />
          </label>
        )}
        <label className="mt-4 block text-sm font-medium text-text-primary">
          Password{resetToken ? " (12+ characters)" : ""}
          <input
            type="password"
            required
            minLength={resetToken ? 12 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-input-border bg-input-background px-3 py-2.5 text-sm outline-none"
          />
        </label>
        <Button type="submit" appearance="fill" isDisabled={status === "loading"} className="mt-6 w-full">
          {status === "loading" ? "Please wait…" : resetToken ? "Save password" : "Sign in"}
        </Button>
        {msg && <p className="mt-3 text-sm text-error-500">{msg}</p>}
      </form>
    </main>
  );
}

export default function OpsLoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
