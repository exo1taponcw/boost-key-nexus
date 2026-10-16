import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export type GuildPreview = {
  id: string;
  name: string;
  icon: string | null;
  members: number | null;
  online: number | null;
  boostLevel: number;
  boosts: number;
  resolved: boolean;
};

function parseInvite(input: string): { invite?: string; guildId?: string } {
  const v = input.trim();
  if (/^\d{17,20}$/.test(v)) return { guildId: v };
  const m = v.match(/(?:discord(?:app)?\.(?:gg|com\/invite)\/)?([A-Za-z0-9-]{2,32})$/);
  return m && m[1] ? { invite: m[1] } : {};
}

export const resolveGuild = createServerFn({ method: "POST" })
  .inputValidator((d: { input: string }) => ({ input: String(d.input ?? "").slice(0, 200) }))
  .handler(async ({ data }): Promise<GuildPreview | null> => {
    const { invite, guildId } = parseInvite(data.input);
    if (guildId) {
      return { id: guildId, name: `Server ${guildId.slice(-4)}`, icon: null, members: null, online: null, boostLevel: 0, boosts: 0, resolved: false };
    }
    if (!invite) return null;
    try {
      const res = await fetch(`https://discord.com/api/v10/invites/${invite}?with_counts=true`);
      if (!res.ok) return null;
      const j = (await res.json()) as any;
      const g = j.guild;
      if (!g) return null;
      const boosts = g.premium_subscription_count ?? 0;
      return {
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
        members: j.approximate_member_count ?? null,
        online: j.approximate_presence_count ?? null,
        boosts,
        boostLevel: boosts >= 14 ? 3 : boosts >= 7 ? 2 : boosts >= 2 ? 1 : 0,
        resolved: true,
      };
    } catch {
      return null;
    }
  });

export const checkKey = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => ({ code: String(d.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) }))
  .handler(async ({ data }) => {
    if (data.code.length !== 12) return { valid: false as const, reason: "incomplete" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("license_keys").select("tier, redeemed_at").eq("code", data.code).maybeSingle();
    if (!row) return { valid: false as const, reason: "not_found" };
    if (row.redeemed_at) return { valid: false as const, reason: "used" };
    return { valid: true as const, tier: row.tier };
  });

/**
 * Delivery provider hook. Currently simulated; replace the body with a call to a
 * real delivery service later. Must return the number of boosts applied.
 */
async function deliverBoosts(_args: { guildId: string; tier: "1m" | "3m"; nickname: string | null }) {
  return 14;
}

export const redeemKey = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; guildId: string; guildName?: string; nickname?: string }) => ({
    code: String(d.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12),
    guildId: String(d.guildId ?? "").replace(/[^0-9]/g, "").slice(0, 20),
    guildName: d.guildName ? String(d.guildName).slice(0, 100) : null,
    nickname: d.nickname ? String(d.nickname).slice(0, 32) : null,
  }))
  .handler(async ({ data }) => {
    if (data.code.length !== 12 || data.guildId.length < 17) throw new Error("Invalid key or server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Atomically claim the key
    const { data: claimed } = await supabaseAdmin
      .from("license_keys")
      .update({ redeemed_at: new Date().toISOString(), redeemed_guild: data.guildId })
      .eq("code", data.code)
      .is("redeemed_at", null)
      .select("tier")
      .maybeSingle();
    if (!claimed) throw new Error("This key is invalid or has already been redeemed");
    const tier = claimed.tier;
    const { data: inv } = await supabaseAdmin.from("inventory").select("stock").eq("tier", tier).single();
    if (!inv || inv.stock < 14) {
      await supabaseAdmin.from("license_keys").update({ redeemed_at: null, redeemed_guild: null }).eq("code", data.code);
      throw new Error("Out of stock for this plan — please try again later");
    }
    const boosts = await deliverBoosts({ guildId: data.guildId, tier, nickname: data.nickname });
    await supabaseAdmin.from("inventory").update({ stock: inv.stock - boosts, updated_at: new Date().toISOString() }).eq("tier", tier);
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "unknown";
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "boostbot"));
    const ipHash = Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: log } = await supabaseAdmin
      .from("redemptions")
      .insert({ key_code: data.code, tier, guild_id: data.guildId, guild_name: data.guildName, nickname: data.nickname, boosts, ip_hash: ipHash })
      .select("id, created_at")
      .single();
    return { id: log?.id ?? "", createdAt: log?.created_at ?? new Date().toISOString(), tier, boosts };
  });
