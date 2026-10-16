import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { Boxes, KeyRound, ScrollText, LogOut, Copy, FileDown, Search, Upload, Gem, Loader2, Plus, Minus, ShieldAlert, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "BoostBot Admin — Inventory, Keys & Audit Logs" },
      { name: "description", content: "Manage BoostBot stock, generate license keys, and review redemption logs." },
      { property: "og:title", content: "BoostBot Admin Dashboard" },
      { property: "og:description", content: "Inventory, license key generator and audit logs for BoostBot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tier = "1m" | "3m";
const tierLabel: Record<Tier, string> = { "1m": "1-Month", "3m": "3-Month" };
const inputCls = "w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/25";
const fmtKey = (c: string) => c.match(/.{1,4}/g)?.join("-") ?? c;

function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (session === undefined) return <Center><Loader2 className="h-6 w-6 animate-spin" /></Center>;
  if (!session) return <AuthForm />;
  if (isAdmin === null) return <Center><Loader2 className="h-6 w-6 animate-spin" /></Center>;
  if (!isAdmin) return (
    <Center>
      <div className="glass max-w-sm rounded-2xl p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h1 className="mt-3 font-display text-lg font-bold">No admin access</h1>
        <p className="mt-1 text-sm text-muted-foreground">{session.user.email} isn't an admin.</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm text-primary">Sign out</button>
      </div>
    </Center>
  );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-4">{children}</div>;
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up" && !data.session) toast.success("Check your email to confirm your account");
  };
  return (
    <Center>
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass aurora-border w-full max-w-sm space-y-4 rounded-3xl p-7">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-aurora"><Gem className="h-5 w-5" /></div><span className="font-display text-lg font-bold">BoostBot Admin</span></div>
        <input className={inputCls} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-aurora py-3 font-semibold disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">{mode === "in" ? "No account? Create one" : "Have an account? Sign in"}</button>
        <p className="text-center text-[11px] text-muted-foreground">The first account created becomes the admin.</p>
      </motion.form>
    </Center>
  );
}

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<"inv" | "keys" | "logs">("inv");
  const tabs = [
    { id: "inv" as const, label: "Inventory", icon: Boxes },
    { id: "keys" as const, label: "License Keys", icon: KeyRound },
    { id: "logs" as const, label: "Audit Logs", icon: ScrollText },
  ];
  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-aurora shadow-glow"><Gem className="h-5 w-5" /></div><span className="font-display text-lg font-bold">BoostBot <span className="text-muted-foreground">Admin</span></span></Link>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">{email}<button onClick={() => supabase.auth.signOut()} aria-label="Sign out" className="rounded-lg p-2 hover:bg-secondary"><LogOut className="h-4 w-4" /></button></div>
      </header>
      <nav className="glass mt-6 inline-flex rounded-2xl p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
            {tab === t.id && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-aurora" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <t.icon className="relative h-4 w-4" /><span className="relative">{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-6">{tab === "inv" ? <Inventory /> : tab === "keys" ? <Keys /> : <Logs />}</div>
    </div>
  );
}

function Inventory() {
  const [rows, setRows] = useState<{ tier: Tier; stock: number; updated_at: string }[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("inventory").select("*").order("tier");
    setRows((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const setStock = async (tier: Tier, stock: number) => {
    const { error } = await supabase.from("inventory").update({ stock: Math.max(0, stock), updated_at: new Date().toISOString() }).eq("tier", tier);
    if (error) toast.error(error.message); else load();
  };
  const upload = async (tier: Tier, file: File, current: number) => {
    const lines = (await file.text()).split(/\r?\n/).filter((l) => l.trim()).length;
    await setStock(tier, current + lines);
    toast.success(`Restocked ${lines} units to ${tierLabel[tier]}`);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => {
        const health = r.stock >= 140 ? { l: "Healthy", c: "bg-success", t: "text-success" } : r.stock >= 14 ? { l: "Low", c: "bg-warning", t: "text-warning" } : { l: "Critical", c: "bg-destructive", t: "text-destructive" };
        const pct = Math.min(100, (r.stock / 280) * 100);
        return (
          <div key={r.tier} className="glass aurora-border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">{tierLabel[r.tier]} Plan</h3>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${health.t}`}><span className={`h-2 w-2 rounded-full ${health.c}`} />{health.l}</span>
            </div>
            <p className="mt-3 font-display text-4xl font-extrabold">{r.stock}<span className="ml-2 text-sm font-normal text-muted-foreground">boosts · {Math.floor(r.stock / 14)} redemptions</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full ${health.c}`} style={{ width: `${pct}%` }} /></div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setStock(r.tier, r.stock - 14)} className="glass rounded-lg p-2" aria-label="Remove 14"><Minus className="h-4 w-4" /></button>
              <button onClick={() => setStock(r.tier, r.stock + 14)} className="glass rounded-lg p-2" aria-label="Add 14"><Plus className="h-4 w-4" /></button>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(r.tier, f, r.stock); }}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary">
                <Upload className="h-3.5 w-3.5" /> Drop or pick .txt to restock
                <input type="file" accept=".txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(r.tier, f, r.stock); e.target.value = ""; }} />
              </label>
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">Updated {new Date(r.updated_at).toLocaleString()}</p>
          </div>
        );
      })}
    </div>
  );
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

function Keys() {
  const [tier, setTier] = useState<Tier>("1m");
  const [count, setCount] = useState(5);
  const [fresh, setFresh] = useState<string[]>([]);
  const [rows, setRows] = useState<{ id: string; code: string; tier: Tier; created_at: string; redeemed_at: string | null; redeemed_guild: string | null }[]>([]);
  const [filter, setFilter] = useState<"all" | "unused" | "redeemed">("all");
  const load = useCallback(async () => {
    const { data } = await supabase.from("license_keys").select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    const codes = Array.from({ length: count }, genCode);
    const { error } = await supabase.from("license_keys").insert(codes.map((code) => ({ code, tier })));
    if (error) { toast.error(error.message); return; }
    setFresh(codes); toast.success(`Generated ${count} ${tierLabel[tier]} keys`); load();
  };
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  const csv = (list: typeof rows) => {
    const body = ["key,tier,created_at,redeemed_at,guild", ...list.map((r) => `${fmtKey(r.code)},${r.tier},${r.created_at},${r.redeemed_at ?? ""},${r.redeemed_guild ?? ""}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = "boostbot-keys.csv"; a.click();
  };
  const del = async (id: string) => { await supabase.from("license_keys").delete().eq("id", id); load(); };
  const shown = rows.filter((r) => filter === "all" || (filter === "unused" ? !r.redeemed_at : !!r.redeemed_at));
  const unused = rows.filter((r) => !r.redeemed_at).length;

  return (
    <div className="space-y-4">
      <div className="glass aurora-border rounded-2xl p-5">
        <h3 className="font-display font-semibold">Bulk Key Generator</h3>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Seg value={tier} onChange={setTier} options={[["1m", "1-Month"], ["3m", "3-Month"]]} />
          <Seg value={count} onChange={setCount} options={[[1, "1"], [5, "5"], [10, "10"], [50, "50"]]} />
          <button onClick={generate} className="rounded-xl bg-aurora px-5 py-2.5 text-sm font-semibold shadow-glow">Generate</button>
        </div>
        {fresh.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-3">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{fresh.length} new keys</span><button onClick={() => copy(fresh.map(fmtKey).join("\n"))} className="flex items-center gap-1 text-primary"><Copy className="h-3 w-3" />Copy all</button></div>
            <div className="grid max-h-48 grid-cols-2 gap-1 overflow-auto font-mono text-sm sm:grid-cols-3">{fresh.map((c) => <button key={c} onClick={() => copy(fmtKey(c))} className="rounded px-2 py-1 text-left hover:bg-secondary">{fmtKey(c)}</button>)}</div>
          </div>
        )}
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display font-semibold">All Keys <span className="text-sm font-normal text-muted-foreground">· {unused} unused / {rows.length - unused} redeemed</span></h3>
          <div className="flex gap-2"><Seg value={filter} onChange={setFilter} options={[["all", "All"], ["unused", "Unused"], ["redeemed", "Redeemed"]]} />
            <button onClick={() => csv(shown)} className="glass flex items-center gap-1.5 rounded-xl px-3 text-sm"><FileDown className="h-4 w-4" />CSV</button></div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Key</th><th>Plan</th><th>Status</th><th>Created</th><th /></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2"><button onClick={() => copy(fmtKey(r.code))} className="flex items-center gap-2 font-mono hover:text-primary">{fmtKey(r.code)}<Copy className="h-3 w-3 opacity-50" /></button></td>
                <td>{tierLabel[r.tier]}</td>
                <td>{r.redeemed_at ? <span className="text-muted-foreground">Redeemed · <span className="font-mono">{r.redeemed_guild}</span></span> : <span className="text-success">Unused</span>}</td>
                <td className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                <td>{!r.redeemed_at && <button onClick={() => del(r.id)} aria-label="Delete key" className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Seg<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-background/50 p-1">
      {options.map(([v, l]) => <button key={String(v)} onClick={() => onChange(v)} className={`rounded-lg px-3 py-1.5 text-sm ${value === v ? "bg-secondary font-semibold" : "text-muted-foreground"}`}>{l}</button>)}
    </div>
  );
}

function Logs() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { supabase.from("redemptions").select("*").order("created_at", { ascending: false }).limit(1000).then(({ data }) => setRows(data ?? [])); }, []);
  const shown = useMemo(() => {
    const s = q.toLowerCase().replace(/-/g, "");
    return s ? rows.filter((r) => [r.key_code, r.guild_id, r.guild_name, r.nickname, r.ip_hash].some((v) => v?.toLowerCase().replace(/-/g, "").includes(s))) : rows;
  }, [rows, q]);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search key, server ID, name, IP hash…" className={`${inputCls} pl-9`} /></div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Time</th><th>Key</th><th>Plan</th><th>Server</th><th>Boosts</th><th>IP hash</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="font-mono">{fmtKey(r.key_code)}</td>
                <td>{tierLabel[r.tier as Tier]}</td>
                <td><div>{r.guild_name ?? "—"}</div><div className="font-mono text-xs text-muted-foreground">{r.guild_id}</div></td>
                <td>{r.boosts}</td>
                <td className="font-mono text-xs text-muted-foreground">{r.ip_hash}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No redemptions yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
