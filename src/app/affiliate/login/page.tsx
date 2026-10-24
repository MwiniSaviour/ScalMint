"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/affiliate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      window.location.href = "/affiliate/dashboard";
    } catch (err: unknown) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="bg-page">
      <Container className="flex min-h-[68vh] max-w-[480px] flex-col justify-center py-12">
        <div className="rounded-[16px] border border-white/[0.07] bg-surface-1 p-6 md:p-8">
          <Eyebrow>Affiliate access</Eyebrow>
          <h1 className="mt-3 text-[22px] font-medium tracking-[-0.02em] text-hi">Sign in to your affiliate dashboard</h1>
          <p className="mt-2 text-[13px] leading-[1.6] text-muted">
            Use the email you applied with. Demo: <span className="text-body">demo@scalmint.com / demo1234</span>
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="t-eyebrow text-eyebrow">Email</span>
              <input name="email" type="email" required className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" placeholder="ama@example.com" />
            </label>
            <label className="block">
              <span className="t-eyebrow text-eyebrow">Password</span>
              <input name="password" type="password" required className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" placeholder="••••••••" />
            </label>
            <Button type="submit" disabled={status === "loading"} className="w-full">
              {status === "loading" ? "Signing in…" : "Sign in"}
            </Button>
            {msg && <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-[#ff8a7a]">{msg}</p>}
          </form>

          <p className="mt-4 text-center text-[12px] text-muted">
            No account? <Link href="/affiliate/apply" className="text-hi underline underline-offset-4">Apply now</Link> •{" "}
            <Link href="/affiliate" className="text-muted underline underline-offset-4 hover:text-hi">Back to program</Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
