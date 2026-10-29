"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";
import { dashboardUrl, storeAffiliateToken } from "@/lib/auth/client";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/affiliate/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string | Record<string, unknown>; token?: string; code?: string };
      if (!res.ok) {
        const err = typeof data.error === "string" ? data.error : "Could not sign in with those credentials.";
        throw new Error(err);
      }
      if (!data.token) throw new Error("Sign-in succeeded but no session was issued. Try Apply again.");
      storeAffiliateToken(data.token);
      window.location.assign(dashboardUrl(data.token));
    } catch (err: unknown) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="bg-page">
      <Container className="flex min-h-[68vh] max-w-[480px] flex-col justify-center py-12">
        <div className="rounded-[16px] border border-line bg-surface-1 p-6 md:p-8">
          <Eyebrow>Affiliate access</Eyebrow>
          <h1 className="mt-3 text-[22px] font-medium tracking-[-0.02em] text-hi">Sign in to your affiliate dashboard</h1>
          <p className="mt-2 text-[13px] leading-[1.6] text-muted">
            Sign in with the email and password from <Link href="/affiliate/apply" className="text-hi underline underline-offset-4">Apply</Link>.
            There is no account until that form succeeds.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="t-eyebrow text-eyebrow">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-[10px] border border-line bg-page px-3 py-[10px] text-[14px] text-hi focus:border-line focus:outline-none"
                placeholder="ama@example.com"
              />
            </label>
            <label className="block">
              <span className="t-eyebrow text-eyebrow">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-[10px] border border-line bg-page px-3 py-[10px] text-[14px] text-hi focus:border-line focus:outline-none"
                placeholder="••••••••"
              />
            </label>
            <Button type="submit" disabled={status === "loading"} className="w-full">
              {status === "loading" ? "Signing in…" : "Sign in"}
            </Button>
            {msg && (
              <div className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] leading-[1.5] text-[#ff8a7a]">
                <p>{msg}</p>
                {msg.toLowerCase().includes("apply") && (
                  <Link href="/affiliate/apply" className="mt-2 inline-flex text-hi underline underline-offset-4">
                    Go to Apply
                  </Link>
                )}
              </div>
            )}
          </form>

          <p className="mt-4 text-center text-[12px] text-muted">
            No account?{" "}
            <Link href="/affiliate/apply" className="text-hi underline underline-offset-4">
              Apply now
            </Link>{" "}
            •{" "}
            <Link href="/affiliate" className="text-muted underline underline-offset-4 hover:text-hi">
              Back to program
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
