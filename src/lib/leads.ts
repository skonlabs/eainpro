import { supabase } from "./supabase";

export type LeadPreview = {
  id: string;
  service_type_id: string;
  category_slug: string;
  service_slug: string;
  service_name_en: string;
  service_name_my: string;
  city_slug: string;
  township_id: string | null;
  urgency: string;
  preferred_date: string | null;
  preferred_time: string | null;
  short_description: string;
  budget_min: number | null;
  budget_max: number | null;
  lead_price_credits: number;
  max_provider_unlocks: number;
  current_unlock_count: number;
  status: string;
  expires_at: string | null;
  created_at: string;
  photo_count: number;
  directed_provider_id: string | null;
  is_direct: boolean;
};

export const UNLOCK_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Please sign in.",
  NOT_VERIFIED: "Your provider account is not verified yet.",
  LEAD_NOT_FOUND: "Lead not found.",
  LEAD_NOT_AVAILABLE: "Lead is no longer available.",
  EXPIRED: "This lead has expired.",
  LEAD_FULL: "This lead is fully booked.",
  ALREADY_UNLOCKED: "You already unlocked this lead.",
  SERVICE_NOT_OFFERED: "You don't offer this service category.",
  SERVICE_AREA_MISMATCH: "This lead is outside your service area.",
  INSUFFICIENT_CREDITS: "Insufficient credits. Please top up your wallet.",
};

export function isCustomerLeadRecursionError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String((error as { code?: string }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: string }).message ?? "") : "";

  return code === "42P17" && message.includes('relation "customer_leads"');
}

export async function listAvailableLeads(providerId: string) {
  // get provider services + areas to filter client-side
  const [{ data: services }, { data: areas }] = await Promise.all([
    supabase.from("provider_services").select("category_slug").eq("provider_id", providerId),
    supabase.from("provider_service_areas").select("city_slug").eq("provider_id", providerId),
  ]);
  const cats = new Set((services ?? []).map((s) => s.category_slug));
  const cities = new Set((areas ?? []).map((a) => a.city_slug));

  // Two streams: matched-area leads (open to all) + leads directly addressed
  // to me. Both depend on the `directed_provider_id` column added by the
  // 20260613 migration — if the database hasn't been migrated yet, fall back
  // to the legacy (matched-area-only) query so the page still loads.
  const seen = new Set<string>();
  const data: LeadPreview[] = [];
  const isUndefinedColumn = (err: unknown) =>
    !!err && typeof err === "object" &&
    (("code" in err && (err as { code?: string }).code === "42703") ||
      ("message" in err && /directed_provider_id/i.test(String((err as { message?: string }).message ?? ""))));

  let directedMissing = false;
  if (cats.size > 0 && cities.size > 0) {
    const baseQuery = () =>
      supabase
        .from("lead_previews")
        .select("*")
        .in("category_slug", Array.from(cats))
        .in("city_slug", Array.from(cities))
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);
    const tried = await baseQuery().is("directed_provider_id", null);
    if (tried.error && isUndefinedColumn(tried.error)) {
      directedMissing = true;
      const legacy = await baseQuery();
      if (legacy.error) throw legacy.error;
      for (const row of (legacy.data ?? []) as LeadPreview[]) {
        if (!seen.has(row.id)) { seen.add(row.id); data.push(row); }
      }
    } else if (tried.error) {
      throw tried.error;
    } else {
      for (const row of (tried.data ?? []) as LeadPreview[]) {
        if (!seen.has(row.id)) { seen.add(row.id); data.push(row); }
      }
    }
  }

  if (!directedMissing) {
    const direct = await supabase
      .from("lead_previews")
      .select("*")
      .eq("directed_provider_id", providerId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);
    if (direct.error && !isUndefinedColumn(direct.error)) throw direct.error;
    for (const row of ((direct.data ?? []) as LeadPreview[])) {
      if (!seen.has(row.id)) { seen.add(row.id); data.push(row); }
    }
  }

  if (data.length === 0) return [];

  // exclude already-unlocked
  const ids = data.map((l) => l.id);
  if (ids.length === 0) return [];
  const { data: unlocked } = await supabase
    .from("provider_lead_unlocks")
    .select("lead_id")
    .eq("provider_id", providerId)
    .in("lead_id", ids);
  const unlockedSet = new Set((unlocked ?? []).map((u) => u.lead_id));
  return data.filter((l) => !unlockedSet.has(l.id));
}

export async function listMyUnlocks(providerId: string, statuses?: string[]) {
  let q = supabase
    .from("provider_lead_unlocks")
    .select("*")
    .eq("provider_id", providerId)
    .order("unlocked_at", { ascending: false });
  if (statuses && statuses.length) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  const leadIds = [...new Set(rows.map((unlock) => unlock.lead_id).filter(Boolean))];

  if (leadIds.length === 0) return rows;

  // Batch fetch with a single RPC. Falls back to the per-lead RPC if the
  // batch function isn't deployed yet.
  const leadMap = new Map<string, any>();
  const { data: batch, error: batchErr } = await supabase.rpc("get_customer_leads", {
    _lead_ids: leadIds,
  });
  if (!batchErr && Array.isArray(batch)) {
    for (const lead of batch) leadMap.set(lead.id, lead);
  } else {
    const entries = await Promise.all(
      leadIds.map(async (leadId) => {
        const { data: lead } = await supabase.rpc("get_customer_lead", { _lead_id: leadId });
        return [leadId, Array.isArray(lead) ? (lead[0] ?? null) : lead] as const;
      }),
    );
    for (const [k, v] of entries) leadMap.set(k, v);
  }
  return rows.map((unlock) => ({
    ...unlock,
    customer_leads: leadMap.get(unlock.lead_id) ?? null,
  }));
}

export async function unlockLead(leadId: string) {
  const { data, error } = await supabase.rpc("unlock_lead", { p_lead_id: leadId });
  if (error) throw error;
  return data as { ok: boolean; error?: string; unlock_id?: string; balance_after?: number; balance?: number; required?: number };
}

export async function updateUnlockStatus(unlockId: string, fields: { status?: string; quoted_price_mmk?: number | null; provider_notes?: string | null }) {
  const { error } = await supabase.from("provider_lead_unlocks").update(fields).eq("id", unlockId);
  if (error) throw error;
}
