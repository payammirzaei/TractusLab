"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Copy, Plus, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import {
  createAdminUser,
  listAdminUsers,
  type AdminManagedUser,
} from "@/lib/server-sync";

const roles: Array<{ value: AdminManagedUser["role"]; label: string; detail: string }> = [
  { value: "learner", label: "Learner", detail: "Learn and keep progress" },
  { value: "author", label: "Author", detail: "Create learning content" },
  { value: "reviewer", label: "Reviewer", detail: "Review content changes" },
  { value: "admin", label: "Admin", detail: "Full platform control" },
];

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export function AdminUserManager() {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminManagedUser["role"]>("learner");
  const [emailVerified, setEmailVerified] = useState(true);
  const [copied, setCopied] = useState(false);

  const selectedRole = useMemo(() => roles.find((item) => item.value === role)!, [role]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setUsers(await listAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createAdminUser({ email, password, displayName, role, emailVerified });
      setUsers((current) => [created, ...current]);
      setMessage(`${created.email} created as ${created.role}.`);
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("learner");
      setEmailVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "User creation failed");
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck size={19} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Admin controls</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">User management</h2>
            <p className="mt-1 text-sm text-slate-500">Create accounts without touching the database.</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="button-secondary gap-2">
          <UserPlus size={15} /> {open ? "Close" : "Add user"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="border-b border-slate-100 bg-slate-50/55 p-5 md:p-6">
          <div className="mb-5 flex items-center gap-2"><Plus size={16} className="text-emerald-700" /><h3 className="font-semibold text-slate-900">Create a new account</h3></div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Email">
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="learner@company.com" className="input-field" />
            </AdminField>
            <AdminField label="Display name" optional>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Alex Learner" className="input-field" />
            </AdminField>
            <AdminField label="Temporary password" hint="Minimum 10 characters">
              <div className="flex gap-2">
                <input type="text" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Temporary password" className="input-field min-w-0" />
                <button type="button" onClick={() => setPassword(generatePassword())} className="button-ghost shrink-0">Generate</button>
                <button type="button" onClick={copyPassword} disabled={!password} className="button-ghost w-10 shrink-0 px-0" aria-label="Copy password">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
              </div>
            </AdminField>
            <AdminField label="Role" hint={selectedRole.detail}>
              <select value={role} onChange={(event) => setRole(event.target.value as AdminManagedUser["role"])} className="input-field">
                {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </AdminField>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <input type="checkbox" checked={emailVerified} onChange={(event) => setEmailVerified(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
            <span><span className="block text-sm font-semibold text-slate-800">Mark email as verified</span><span className="block text-xs text-slate-500">Useful for accounts created directly by an administrator.</span></span>
          </label>

          <div aria-live="polite" className="mt-4">
            {message && <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
            {error && <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          </div>

          <div className="mt-5 flex justify-end">
            <button disabled={saving} className="button-primary gap-2 px-5"><UserPlus size={15} />{saving ? "Creating…" : "Create user"}</button>
          </div>
        </form>
      )}

      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Users size={16} /> Users <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{users.length}</span></div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="button-ghost gap-2"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>
        {!open && error && <p className="mb-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {loading && users.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No registered users yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.slice(0, 8).map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.display_name || item.email}</p><p className="truncate text-xs text-slate-500">{item.email}</p></div>
                  <div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">{item.role}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.email_verified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.email_verified ? "Verified" : "Pending"}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminField({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-700">{label}{optional && <span className="ml-1 font-normal text-slate-400">optional</span>}</span>{hint && <span className="ml-2 text-[11px] text-slate-400">{hint}</span>}<div className="mt-2">{children}</div></label>;
}
