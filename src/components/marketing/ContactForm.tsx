"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const email = String(fd.get("email") ?? "");
    const company = String(fd.get("company") ?? "");
    const message = String(fd.get("message") ?? "");
    const subject = encodeURIComponent(`Project enquiry — ${company || name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\n${message}`);
    window.location.href = `mailto:hello@scalmint.com?subject=${subject}&body=${body}`;
    setStatus("sent");
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[16px] border border-white/[0.07] bg-surface-1 p-6 md:p-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="t-eyebrow text-eyebrow">Name *</span>
          <input name="name" required className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
        </label>
        <label className="block">
          <span className="t-eyebrow text-eyebrow">Work email *</span>
          <input name="email" type="email" required className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
        </label>
        <label className="block md:col-span-2">
          <span className="t-eyebrow text-eyebrow">Company</span>
          <input name="company" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
        </label>
        <label className="block md:col-span-2">
          <span className="t-eyebrow text-eyebrow">What needs building? *</span>
          <textarea name="message" required rows={6} className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
        </label>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit">Send to hello@scalmint.com</Button>
        {status === "sent" && <p className="text-[13px] text-muted">Your mail client should open. If it does not, write us directly.</p>}
      </div>
    </form>
  );
}
