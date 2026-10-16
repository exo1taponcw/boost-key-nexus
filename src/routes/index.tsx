import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  KeyRound, Server, UserRound, Rocket, CheckCircle2, Loader2, Globe, Zap, PartyPopper,
  Download, Users, Sparkles, ShieldCheck, X, Gem,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkKey, redeemKey, resolveGuild, type GuildPreview } from "@/lib/boost.functions";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BoostBot — Claim Your Discord Server Boosts in Seconds" },
      { name: "description", content: "Redeem your 12-character BoostBot license key and deploy 14 instant Discord server boosts." },
      { property: "og:title", content: "BoostBot — Instant Discord Server Boosts" },
      { property: "og:description", content: "Enter your license key and server to deploy Level 3 boosts instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const spring = { type: "spring" as const, stiffness: 260, damping: 22 };
const tierLabel = { "1m": "1-Month", "3m": "3-Month" } as const;

function formatKey(v: string) {
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return c.match(/.{1,4}/g)?.join("-") ?? "";
}

function useStock() {
  const [stock, setStock] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("inventory").select("tier, stock");
      if (data) setStock(Object.fromEntries(data.map((r) => [r.tier, r.stock])));
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  return { stock, refresh: async () => {
    const { data } = await supabase.from("inventory").select("tier, stock");
    if (data) setStock(Object.fromEntries(data.map((r) => [r.tier, r.stock])));
  } };
}

function StockPill({ label, count }: { label: string; count: number | undefined }) {
  const status = count === undefined ? "…" : count >= 14 ? "Ready" : count > 0 ? "Low" : "Empty";
  const tone = count === undefined ? "bg-muted-foreground" : count >= 14 ? "bg-success" : count > 0 ? "bg-warning" : "bg-destructive";
  return (
    <motion.div whileHover={{ y: -2 }} transition={spring} className="glass flex items-center gap-3 rounded-full px-4 py-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${tone}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone}`} />
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="font-mono text-sm text-muted-foreground">{count ?? "—"} in stock</span>
      <span className="text-xs text-muted-foreground">· {status}</span>
    </motion.div>
  );
}

function StepCard({ n, icon: Icon, title, children, done }: { n: number; icon: typeof KeyRound; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: n * 0.06 }}
      className="glass aurora-border rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${done ? "bg-aurora" : "bg-secondary"}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Step {n}</p>
          <h3 className="font-display text-sm font-semibold">{title}</h3>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/25 focus:shadow-glow placeholder:text-muted-foreground/60";

type Receipt = { id: string; createdAt: string; tier: "1m" | "3m"; boosts: number; key: string; guild: GuildPreview; nickname: string };

function Index() {
  const { stock, refresh } = useStock();
  const check = useServerFn(checkKey);
  const resolve = useServerFn(resolveGuild);
  const redeem = useServerFn(redeemKey);

  const [key, setKey] = useState("");
  const [keyState, setKeyState] = useState<{ status: "idle" | "checking" | "valid" | "invalid"; tier?: "1m" | "3m"; reason?: string }>({ status: "idle" });
  const [server, setServer] = useState("");
  const [guild, setGuild] = useState<GuildPreview | null>(null);
  const [guildLoading, setGuildLoading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [modal, setModal] = useState(false);

  const raw = key.replace(/-/g, "");
  useEffect(() => {
    if (raw.length !== 12) { setKeyState({ status: "idle" }); return; }
    setKeyState({ status: "checking" });
    const t = setTimeout(async () => {
      const r = await check({ data: { code: raw } });
      setKeyState(r.valid ? { status: "valid", tier: r.tier } : { status: "invalid", reason: r.reason });
    }, 300);
    return () => clearTimeout(t);
  }, [raw]);

  useEffect(() => {
    if (server.trim().length < 2) { setGuild(null); return; }
    setGuildLoading(true);
    const t = setTimeout(async () => {
      const g = await resolve({ data: { input: server } });
      setGuild(g); setGuildLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [server]);

  const ready = keyState.status === "valid" && !!guild;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-aurora shadow-glow"><Gem className="h-5 w-5" /></div>
          <span className="font-display text-lg font-bold">BoostBot</span>
        </div>
        <Link to="/admin" className="text-sm text-muted-foreground transition hover:text-foreground">Admin</Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-peach" /> ✦ BoostBot Network • Instant Discord Server Boosts
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Claim Your <span className="text-aurora">Server Boosts</span> in Seconds
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Enter your 12-character license key and target Discord server to deploy instant Level 3 boosts.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <StockPill label="1-Month Plan" count={stock?.["1m"]} />
            <StockPill label="3-Month Plan" count={stock?.["3m"]} />
          </div>
        </motion.div>

        <div className="mt-12 space-y-4">
          <StepCard n={1} icon={KeyRound} title="License Key" done={keyState.status === "valid"}>
            <input
              value={key} onChange={(e) => setKey(formatKey(e.target.value))}
              placeholder="XXXX-XXXX-XXXX" aria-label="License key" spellCheck={false}
              className={`${inputCls} text-center font-mono text-xl tracking-[0.3em]`}
            />
            <div className="mt-2 flex h-5 items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{raw.length}/12</span>
              {keyState.status === "checking" && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Validating…</span>}
              {keyState.status === "valid" && <span className="rounded-full bg-aurora px-2.5 py-0.5 font-semibold">{tierLabel[keyState.tier!]} Plan detected</span>}
              {keyState.status === "invalid" && <span className="text-destructive">{keyState.reason === "used" ? "Key already redeemed" : "Key not recognized"}</span>}
            </div>
          </StepCard>

          <StepCard n={2} icon={Server} title="Discord Server" done={!!guild}>
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="discord.gg/yourserver or Guild ID" aria-label="Server invite or Guild ID" className={inputCls} />
            <AnimatePresence mode="wait">
              {guildLoading && <motion.p key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Resolving server…</motion.p>}
              {!guildLoading && guild && (
                <motion.div key={guild.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
                  className="mt-3 flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3">
                  {guild.icon ? <img src={guild.icon} alt="" className="h-14 w-14 rounded-2xl" /> :
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-aurora font-display text-xl font-bold">{guild.name[0]}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{guild.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{guild.id}</p>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      {guild.members != null && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{guild.members.toLocaleString()} members</span>}
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-peach" />Level {guild.boostLevel} · {guild.boosts} boosts</span>
                    </div>
                  </div>
                </motion.div>
              )}
              {!guildLoading && !guild && server.trim().length >= 2 && <motion.p key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-destructive">Couldn't find that server. Check the invite link or Guild ID.</motion.p>}
            </AnimatePresence>
          </StepCard>

          <StepCard n={3} icon={UserRound} title="Booster Nickname (optional)">
            <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 32))} placeholder="Leave blank for server default" className={inputCls} />
          </StepCard>

          <motion.button
            whileHover={{ scale: ready ? 1.02 : 1 }} whileTap={{ scale: ready ? 0.98 : 1 }} transition={spring}
            disabled={!ready || stock?.[keyState.tier ?? "1m"] === 0}
            onClick={() => setModal(true)}
            className="shimmer relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-aurora py-4 font-display text-lg font-bold text-primary-foreground shadow-glow transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Rocket className="h-5 w-5" /> Deploy 14 Boosts Now
          </motion.button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Each key can be redeemed once</p>
        </div>
      </main>

      <AnimatePresence>
        {modal && guild && (
          <ExecutionModal
            onClose={(done) => { setModal(false); if (done) { setKey(""); setServer(""); setNickname(""); refresh(); } }}
            run={() => redeem({ data: { code: raw, guildId: guild.id, guildName: guild.name, nickname } })}
            keyCode={key} guild={guild} nickname={nickname}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const STEPS = [
  { icon: KeyRound, label: "Validating License Key" },
  { icon: Globe, label: "Fetching Server Metadata" },
  { icon: Zap, label: "Authorizing & Joining 7 Boost Accounts" },
  { icon: PartyPopper, label: "Applying 14 Boosts" },
];

function ExecutionModal({ run, onClose, keyCode, guild, nickname }: {
  run: () => Promise<{ id: string; createdAt: string; tier: "1m" | "3m"; boosts: number }>;
  onClose: (done: boolean) => void; keyCode: string; guild: GuildPreview; nickname: string;
}) {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      try {
        await wait(900); setStep(1);
        await wait(900); setStep(2);
        const p = run();
        for (let i = 0; i <= 100; i += 5) { setPct(i); await wait(70); }
        const r = await p;
        setStep(3); await wait(700); setStep(4);
        setReceipt({ ...r, key: keyCode, guild, nickname });
        const fire = (o: confetti.Options) => confetti({ particleCount: 90, spread: 80, colors: ["#8B5CF6", "#F43F5E", "#FB923C", "#ffffff"], ...o });
        fire({ origin: { x: 0.2, y: 0.6 } }); fire({ origin: { x: 0.8, y: 0.6 } });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        toast.error("Redemption failed");
      }
    })();
  }, []);

  const download = () => {
    if (!receipt) return;
    const txt = [
      "BOOSTBOT — TRANSACTION RECEIPT", "==============================",
      `Transaction: ${receipt.id}`, `Date:        ${new Date(receipt.createdAt).toLocaleString()}`,
      `License Key: ${receipt.key}`, `Plan:        ${tierLabel[receipt.tier]}`,
      `Server:      ${receipt.guild.name} (${receipt.guild.id})`, `Nickname:    ${receipt.nickname || "(server default)"}`,
      `Boosts:      ${receipt.boosts}`, `Status:      Delivered — Level 3`,
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    a.download = `boostbot-receipt-${receipt.id.slice(0, 8)}.txt`; a.click();
  };

  const done = step >= 4;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={spring}
        className="glass aurora-border w-full max-w-md rounded-3xl p-6 shadow-glow">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{done ? "Boosts Delivered" : error ? "Deployment Failed" : "Deploying Boosts…"}</h2>
          {(done || error) && <button onClick={() => onClose(done)} aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>}
        </div>
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const state = step > i ? "done" : step === i && !error ? "active" : error && step === i ? "error" : "pending";
            return (
              <li key={i} className={`rounded-xl border p-3 transition ${state === "active" ? "border-primary/60 bg-primary/10" : "border-border"} ${state === "pending" ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">[{i + 1}/4]</span>
                  {state === "done" ? <CheckCircle2 className="h-4 w-4 text-success" /> : state === "active" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : state === "error" ? <X className="h-4 w-4 text-destructive" /> : <s.icon className="h-4 w-4" />}
                  <span className="text-sm">{i === 3 && done ? "Applied 14 Boosts! Server reached Level 3." : s.label + (state === "active" ? "…" : "")}</span>
                </div>
                {i === 2 && step >= 2 && <Progress value={pct} className="mt-3 h-1.5" />}
              </li>
            );
          })}
        </ol>
        {error && <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {receipt && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-1 rounded-xl border border-border bg-background/50 p-4 font-mono text-xs">
            <Row k="Transaction" v={receipt.id.slice(0, 8)} /><Row k="Plan" v={tierLabel[receipt.tier]} />
            <Row k="Server" v={receipt.guild.name} /><Row k="Boosts" v={String(receipt.boosts)} />
            <button onClick={download} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-aurora py-2.5 font-sans text-sm font-semibold"><Download className="h-4 w-4" /> Download Receipt</button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{k}</span><span className="truncate">{v}</span></div>;
}
