import { supabase } from "@/lib/supabase";

export async function fetchProviderNames(ids: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await supabase.from("providers").select("id, business_name").in("id", unique);
  return new Map((data ?? []).map((p: any) => [p.id, p.business_name ?? null]));
}

export async function fetchLeadsByIds(ids: string[]): Promise<Map<string, any>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await supabase.rpc("get_customer_leads", { _lead_ids: unique });
  const arr = Array.isArray(data) ? data : [];
  return new Map(arr.map((l: any) => [l.id, l]));
}

export async function fetchUnlocksByIds(ids: string[]): Promise<Map<string, any>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await supabase
    .from("provider_lead_unlocks")
    .select("id, unlock_price_credits, refunded_amount_credits, status")
    .in("id", unique);
  return new Map((data ?? []).map((u: any) => [u.id, u]));
}