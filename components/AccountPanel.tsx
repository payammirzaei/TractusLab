"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccountSecurityPanel } from "@/components/AccountSecurityPanel";
import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  requestPasswordReset,
  serverSyncEnabled,
  type AccountUser,
} from "@/lib/server-sync";

type Mode = "register" | "login" | "forgot";

export function AccountPanel() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [debugResetToken, setDebugResetToken] = useState<string | null>(null);

  useEffect(() => {
    if (!serverSyncEnabled()) {
      setLoading(false);
      return;
    }
    void getCurrentAccount().then(setUser).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const result = await requestPasswordReset(email);
        setMessage(result.message);
        setDebugResetToken(result.debug_token);
        return;
      }

      const next = mode === "register"
        ? await registerAccount({ email, password, displayName })
        : await loginAccount(email, password);
      setUser(next);
      setPassword("");
      if (mode === "login") window.location.href = "/profile";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await logoutAccount();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
      setLoading(false);
    }
  }

  if (!serverSyncEnabled()) {
    return (
      <Shell>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-3xl font-semibold">Accounts are ready in code.</h1>
          <p className="mt-4 text-white/50">Set <code>NEXT_PUBLIC_API_URL</code> when the backend is enabled. Until then TractusLab stays local-first.</p>
        </div>
      </Shell>
    );
  }

  if (loading && !user) return <Shell><p className="text-white/45">Loading account…</p></Shell>;

  if (user && !user.is_guest) {
    return (
      <Shell>
        <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.04] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Signed in</p>
              <h1 className="mt-3 text-3xl font-semibold">{user.display_name || "TractusLab learner"}</h1>
              <p className="mt-2 text-white/45">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/profile" className="rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#07110f]">Open profile</Link>
              <button disabled={loading} onClick={logout} className="rounded-full border border-white/15 px-5 py-2.5 text-sm disabled:opacity-50">Sign out</button>
            </div>
          </div>
          <AccountSecurityPanel user={user} onUserChange={setUser} />
          {error && <p className="mt-5 text-sm text-rose-300">{error}</p>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
        {mode !== "forgot" && (
          <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
            <button onClick={() => setMode("register")} className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-emerald-300 text-[#07110f]" : "text-white/50"}`}>Create account</button>
            <button onClick={() => setMode("login")} className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-emerald-300 text-[#07110f]" : "text-white/50"}`}>Sign in</button>
          </div>
        )}

        <h1 className="mt-8 text-3xl font-semibold">
          {mode === "register" ? "Keep your learning progress." : mode === "login" ? "Welcome back." : "Reset your password."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/45">
          {mode === "register"
            ? "Your current guest progress stays attached to this account."
            : mode === "login"
              ? "Signing in loads the account's server-side learning state."
              : "We return the same response whether or not an account exists for this email."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />}
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
          {mode !== "forgot" && <input type="password" required minLength={mode === "register" ? 10 : 1} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />}

          {message && <p className="text-sm leading-6 text-emerald-200">{message}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {debugResetToken && (
            <p className="text-xs leading-5 text-amber-100/70">Dev mode: <Link className="underline" href={`/account/reset?token=${encodeURIComponent(debugResetToken)}`}>open password reset link</Link></p>
          )}

          <button disabled={loading} className="w-full rounded-full bg-emerald-300 px-5 py-3 font-semibold text-[#07110f] disabled:opacity-50">
            {loading ? "Working…" : mode === "register" ? "Create account" : mode === "login" ? "Sign in" : "Send reset link"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/40">
          {mode === "login" ? (
            <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} className="hover:text-white/70">Forgot password?</button>
          ) : mode === "forgot" ? (
            <button onClick={() => { setMode("login"); setError(""); setMessage(""); setDebugResetToken(null); }} className="hover:text-white/70">← Back to sign in</button>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 py-7 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="font-semibold">← TractusLab</Link>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Account security</span>
        </header>
        {children}
      </div>
    </main>
  );
}
