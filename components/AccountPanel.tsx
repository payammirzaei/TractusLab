"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccountSecurityPanel } from "@/components/AccountSecurityPanel";
import { AdminUserManager } from "@/components/AdminUserManager";
import { useI18n } from "@/components/I18nProvider";
import { LearnerNav } from "@/components/LearnerNav";
import { accountCopy } from "@/lib/account-i18n";
import { passwordSignals, passwordStrength } from "@/lib/account-ux";
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
  const { locale } = useI18n();
  const text = accountCopy(locale);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [debugResetToken, setDebugResetToken] = useState<string | null>(null);

  const enabled = serverSyncEnabled();
  const journey = text.journeys[mode];
  const strength = useMemo(() => passwordStrength(password), [password]);
  const signals = useMemo(() => passwordSignals(password), [password]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void getCurrentAccount()
      .then(setUser)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [enabled]);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setDebugResetToken(null);
    setPassword("");
  }

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
      setError(err instanceof Error ? err.message : text.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError("");
    try {
      await logoutAccount();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : text.logoutError);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <LearnerNav active="account" eyebrow={text.navEyebrow} />
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        {!enabled ? (
          <OfflineAccountState text={text} />
        ) : loading && !user ? (
          <AccountSkeleton label={text.loadingAccount} />
        ) : user && !user.is_guest ? (
          <SignedInAccount user={user} loading={loading} error={error} onLogout={logout} onUserChange={setUser} />
        ) : (
          <section className="grid gap-5 py-8 md:py-12 lg:grid-cols-[minmax(0,.9fr)_minmax(420px,1.1fr)] lg:items-stretch">
            <aside className="surface-hero relative overflow-hidden p-7 md:p-9">
              <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-300/[0.07] blur-3xl" aria-hidden="true" />
              <div className="relative">
                <p className="eyebrow">{text.guestEyebrow}</p>
                <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.045em] md:text-5xl">{text.guestTitle}</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/48">{text.guestIntro}</p>

                <div className="mt-8 space-y-3">
                  <Benefit icon="↗" title={text.benefits[0][0]} text={text.benefits[0][1]} />
                  <Benefit icon="◎" title={text.benefits[1][0]} text={text.benefits[1][1]} />
                  <Benefit icon="◈" title={text.benefits[2][0]} text={text.benefits[2][1]} />
                </div>
              </div>
            </aside>

            <section className="surface-panel p-6 md:p-8">
              {mode !== "forgot" && (
                <div className="grid grid-cols-2 rounded-2xl border border-white/8 bg-black/15 p-1" role="tablist" aria-label={text.accountAction}>
                  <button role="tab" aria-selected={mode === "register"} onClick={() => switchMode("register")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${mode === "register" ? "bg-emerald-300 text-[#07110f]" : "text-white/42 hover:text-white/72"}`}>{text.createAccount}</button>
                  <button role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${mode === "login" ? "bg-emerald-300 text-[#07110f]" : "text-white/42 hover:text-white/72"}`}>{text.signIn}</button>
                </div>
              )}

              <div className="mt-7">
                <p className="eyebrow">{journey[0]}</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">{journey[1]}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/42">{journey[2]}</p>
              </div>

              <form onSubmit={submit} className="mt-7 space-y-5">
                {mode === "register" && (
                  <Field label={text.displayName} hint={text.displayNameHint}>
                    <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder={text.displayNamePlaceholder} className="input-field" />
                  </Field>
                )}

                <Field label={text.email}>
                  <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder={text.emailPlaceholder} className="input-field" />
                </Field>

                {mode !== "forgot" && (
                  <Field label={text.password} hint={mode === "register" ? text.passwordHint : undefined}>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={mode === "register" ? 10 : 1}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        placeholder={mode === "register" ? text.passwordCreatePlaceholder : text.passwordPlaceholder}
                        className="input-field pr-20"
                      />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-white/35 hover:text-white/70" aria-label={showPassword ? text.hidePassword : text.showPassword}>{showPassword ? text.hide : text.show}</button>
                    </div>
                    {mode === "register" && password && (
                      <div className="mt-3 rounded-2xl border border-white/8 bg-black/10 p-3">
                        <div className="flex items-center justify-between gap-3 text-xs"><span className="text-white/35">{text.passwordStrength}</span><span className="font-semibold text-white/65">{text.strength[strength.label]}</span></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${strength.score}%` }} /></div>
                        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {signals.map((signal) => <span key={signal.id} className={`text-[11px] ${signal.met ? "text-emerald-200/70" : "text-white/28"}`}>{signal.met ? "✓" : "○"} {text.signals[signal.id]}</span>)}
                        </div>
                      </div>
                    )}
                  </Field>
                )}

                <div aria-live="polite" className="min-h-5">
                  {message && <p className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-sm leading-6 text-emerald-100/75">{message}</p>}
                  {error && <p className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-3 text-sm leading-6 text-rose-100/80">{error}</p>}
                  {debugResetToken && <p className="mt-2 text-xs leading-5 text-amber-100/70">{text.devMode} <Link className="underline underline-offset-4" href={`/account/reset?token=${encodeURIComponent(debugResetToken)}`}>{text.openReset}</Link></p>}
                </div>

                <button disabled={loading} className="button-primary w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-45">
                  {loading ? text.working : journey[3]}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-white/38">
                {mode === "login" ? (
                  <button type="button" onClick={() => switchMode("forgot")} className="hover:text-white/70">{text.forgotPassword}</button>
                ) : mode === "forgot" ? (
                  <button type="button" onClick={() => switchMode("login")} className="hover:text-white/70">{text.backSignIn}</button>
                ) : (
                  <p className="text-xs leading-5">{text.noForcedSignup}</p>
                )}
              </div>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}

function SignedInAccount({ user, loading, error, onLogout, onUserChange }: { user: AccountUser; loading: boolean; error: string; onLogout: () => void; onUserChange: (user: AccountUser) => void }) {
  return (
    <section className="py-8 md:py-12">
      <div className="surface-hero relative overflow-hidden p-6 md:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/[0.07] blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] border border-emerald-300/20 bg-emerald-300/10 text-2xl font-semibold text-emerald-100">{(user.display_name || user.email || "L")[0]?.toUpperCase()}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">Signed in</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${user.email_verified ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>{user.email_verified ? "Verified" : "Email pending"}</span>
                {user.role === "admin" && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">Admin</span>}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{user.display_name || "TractusLab learner"}</h1>
              <p className="mt-1 text-sm text-white/40">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="button-primary">Open learning profile →</Link>
            <button disabled={loading} onClick={onLogout} className="button-ghost disabled:opacity-40">Sign out</button>
          </div>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <AccountMetric label="Learning state" value="Server synced" detail="with local offline cache" />
          <AccountMetric label="Email" value={user.email_verified ? "Verified" : "Pending"} detail={user.email_verified ? "recovery ready" : "verify when convenient"} />
          <AccountMetric label="Role" value={user.role} detail={user.role === "admin" ? "platform administration enabled" : "learning access"} />
        </div>
      </div>
      {user.role === "admin" && <AdminUserManager />}
      <AccountSecurityPanel user={user} onUserChange={onUserChange} />
      {error && <p aria-live="polite" className="mt-5 rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-4 text-sm text-rose-100/80">{error}</p>}
    </section>
  );
}

function OfflineAccountState({ text }: { text: ReturnType<typeof accountCopy> }) {
  return (
    <section className="py-10 md:py-16">
      <div className="surface-hero mx-auto max-w-4xl p-7 md:p-10">
        <div className="grid gap-7 md:grid-cols-[auto_1fr] md:items-start">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] text-2xl text-cyan-100">◎</div>
          <div>
            <p className="eyebrow">{text.offlineEyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-5xl">{text.offlineTitle}</h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/46">{text.offlineText} <code className="rounded bg-black/20 px-1.5 py-0.5 text-cyan-100/65">NEXT_PUBLIC_API_URL</code>.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/path" className="button-primary">{text.continueLearning}</Link><Link href="/profile" className="button-ghost">{text.localProfile}</Link></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountSkeleton({ label }: { label: string }) {
  return <div className="grid gap-5 py-10 lg:grid-cols-2" aria-label={label}><div className="skeleton-card h-80 rounded-[2rem]" /><div className="skeleton-card h-80 rounded-[2rem]" /></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-white/55">{label}</span>{hint && <span className="ml-2 text-[11px] font-normal text-white/25">{hint}</span>}<div className="mt-2">{children}</div></label>;
}

function Benefit({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="flex gap-3 rounded-2xl border border-white/7 bg-black/10 p-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-emerald-200">{icon}</div><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-white/35">{text}</p></div></div>;
}

function AccountMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/10 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">{label}</p><p className="mt-2 font-semibold capitalize">{value}</p><p className="mt-1 text-[11px] text-white/28">{detail}</p></div>;
}
