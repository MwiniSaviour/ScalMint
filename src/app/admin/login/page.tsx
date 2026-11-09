"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { opsFetch } from "@/lib/ops/client-fetch";

type Mode = "login" | "reset";

/**
 * The login route answers 403 with this message when the operator has no
 * stored password yet. The UI must offer the reset path instead of leaving the
 * person on a dead end. Kept in sync with the route on purpose, so the two
 * never drift (the route must not imply a login that cannot succeed).
 */
const PASSWORD_NOT_SET_PREFIX = "Password not set";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-input-border bg-input-background px-3 py-2.5 text-sm outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500";

function LoginInner() {
  const params = useSearchParams();
  const urlToken = params.get("reset") ?? "";

  const [mode, setMode] = useState<Mode>(urlToken ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  // Adopt a token pasted into the URL (e.g. /admin/login?reset=<token>).
  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
      setMode("reset");
    }
  }, [urlToken]);

  // Move focus to the error so keyboard and screen reader users land on it.
  useEffect(() => {
    if (msg) errorRef.current?.focus();
  }, [msg]);

  function switchToReset(note: string | null = null) {
    setMode("reset");
    setNotice(note);
    setMsg("");
    setStatus("idle");
  }

  function switchToLogin() {
    setMode("login");
    setNotice(null);
    setMsg("");
    setStatus("idle");
  }

  /** Clear the error as soon as the person starts fixing it. */
  function clearError() {
    if (msg) {
      setMsg("");
      setStatus("idle");
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    const res = await opsFetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.assign("/admin");
      return;
    }
    if (res.status === 403 && (res.error ?? "").startsWith(PASSWORD_NOT_SET_PREFIX)) {
      switchToReset(
        "This account has no password yet. Set one with the one-time reset token from setup, then sign in.",
      );
      return;
    }
    setStatus("error");
    setMsg(res.error ?? "Could not sign in");
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setStatus("error");
      setMsg("Enter the reset token");
      return;
    }
    if (newPassword.length < 12) {
      setStatus("error");
      setMsg("The new password must be 12 or more characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMsg("Passwords do not match");
      return;
    }
    setStatus("loading");
    setMsg("");
    const res = await opsFetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: trimmedToken, password: newPassword }),
    });
    if (!res.ok) {
      setStatus("error");
      setMsg(
        res.status === 429
          ? "Too many attempts — wait a minute and try again."
          : (res.error ?? "Could not set the password"),
      );
      return;
    }
    window.location.assign("/admin");
  }

  const fieldProps = {
    disabled: status === "loading",
    "aria-invalid": msg ? true : undefined,
    "aria-describedby": msg ? "login-error" : undefined,
  } as const;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background-gray-primary px-6 py-6">
      <form
        onSubmit={mode === "reset" ? onReset : onLogin}
        className="w-full max-w-[420px] rounded-2xl border border-card-border bg-card-background p-5 sm:p-8"
      >
        <p className="text-xs font-medium tracking-[0.14em] text-text-secondary uppercase">ScalMint operators</p>
        <h1 className="mt-2 text-[28px] leading-8 font-medium text-text-primary">
          {mode === "reset" ? "Set your password" : "Sign in to Ops"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Staff console for the product portfolio. Not the public affiliate dashboard. No default password exists.
        </p>

        {notice && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
          >
            {notice}
          </p>
        )}

        {mode === "login" ? (
          <>
            <label className="mt-6 block text-sm font-medium text-text-primary">
              Email
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                autoComplete="email"
                spellCheck={false}
                className={INPUT_CLASS}
                {...fieldProps}
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-text-primary">
              Password
              <input
                type="password"
                name="password"
                required
                minLength={1}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                autoComplete="current-password"
                className={INPUT_CLASS}
                {...fieldProps}
              />
            </label>
          </>
        ) : (
          <>
            <label className="mt-6 block text-sm font-medium text-text-primary">
              Reset token
              <input
                type="text"
                name="token"
                required
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  clearError();
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Paste the one-time token"
                className={`${INPUT_CLASS} font-mono`}
                {...fieldProps}
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-text-primary">
              New password (12+ characters)
              <input
                type="password"
                name="newPassword"
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearError();
                }}
                autoComplete="new-password"
                className={INPUT_CLASS}
                {...fieldProps}
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-text-primary">
              Confirm new password
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError();
                }}
                autoComplete="new-password"
                className={INPUT_CLASS}
                {...fieldProps}
              />
            </label>
          </>
        )}

        <Button type="submit" appearance="fill" isDisabled={status === "loading"} className="mt-6 w-full">
          {status === "loading"
            ? "Please wait…"
            : mode === "reset"
              ? "Save password"
              : "Sign in"}
        </Button>

        {msg && (
          <p id="login-error" ref={errorRef} tabIndex={-1} role="alert" className="mt-3 text-sm text-error-500">
            {msg}
          </p>
        )}

        {mode === "login" ? (
          <p className="mt-4 text-center text-sm text-text-secondary">
            <button
              type="button"
              onClick={() => switchToReset()}
              className="inline-block min-h-6 rounded-md px-2 py-1.5 text-brand-500 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Forgot password?
            </button>
          </p>
        ) : (
          <div className="mt-4 space-y-2 text-center text-sm text-text-secondary">
            <p>
              <button
                type="button"
                onClick={switchToLogin}
                className="inline-block min-h-6 rounded-md px-2 py-1.5 text-brand-500 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Back to sign in
              </button>
            </p>
            <p className="text-xs text-text-secondary">
              Tokens are issued once and expire in 24 hours. An OWNER can generate one in Team → Reset token.
              First setup: run{" "}
              <code className="break-all rounded bg-background-gray-secondary px-1 py-0.5 font-mono text-[11px]">
                npm run ops:bootstrap
              </code>{" "}
              on the server. Locked out (nobody can sign in):{" "}
              <code className="break-all rounded bg-background-gray-secondary px-1 py-0.5 font-mono text-[11px]">
                npm run ops:reset -- owner@example.com
              </code>
              .
            </p>
          </div>
        )}
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
