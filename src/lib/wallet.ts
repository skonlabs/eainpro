import { supabase } from "./supabase";

export type CreditPackage = {
  id: string;
  slug: string;
  name: string;
  mmk: number;
  credits: number;
  bonus: number;
  total: number;
  popular?: boolean;
  badge?: string | null;
};

// Fallback used if DB query fails or returns empty.
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", slug: "starter", name: "Starter", mmk: 10000, credits: 10000, bonus: 0, total: 10000 },
  { id: "growth", slug: "growth", name: "Growth", mmk: 25000, credits: 25000, bonus: 2500, total: 27500, popular: true, badge: "Popular" },
  { id: "pro", slug: "pro", name: "Pro", mmk: 50000, credits: 50000, bonus: 7500, total: 57500, badge: "Best value" },
  { id: "power", slug: "power", name: "Power", mmk: 100000, credits: 100000, bonus: 20000, total: 120000, badge: "+20%" },
];

export async function listCreditPackages(): Promise<CreditPackage[]> {
  const { data } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (!data || data.length === 0) return CREDIT_PACKAGES;
  return data.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.name_en,
    mmk: p.price_mmk,
    credits: p.credits,
    bonus: p.bonus_credits ?? 0,
    total: p.credits + (p.bonus_credits ?? 0),
    popular: (p.badge_en || "").toLowerCase().includes("popular"),
    badge: p.badge_en,
  }));
}

export const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-US");

export async function getWallet(providerId: string) {
  // ensure exists
  await supabase.rpc("ensure_wallet", { _provider_id: providerId });
  const { data } = await supabase
    .from("provider_wallets")
    .select("*")
    .eq("provider_id", providerId)
    .maybeSingle();
  return data;
}

export async function listTransactions(providerId: string, limit = 50) {
  const { data } = await supabase
    .from("provider_wallet_transactions")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listMyTopups(providerId: string) {
  const { data } = await supabase
    .from("provider_credit_topups")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function submitTopup(input: {
  providerId: string;
  pkg: CreditPackage;
  paymentMethod: string;
  paymentReference: string;
  proofFile?: File | null;
}) {
  let proofUrl: string | null = null;
  if (input.proofFile) {
    const ext = input.proofFile.name.split(".").pop() || "jpg";
    const path = `${input.providerId}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("topup-proofs").upload(path, input.proofFile, {
      contentType: input.proofFile.type,
      upsert: false,
    });
    if (up.error) throw up.error;
    proofUrl = path;
  }
  const { error } = await supabase.from("provider_credit_topups").insert({
    provider_id: input.providerId,
    package_name: input.pkg.name,
    payment_amount_mmk: input.pkg.mmk,
    credits_requested: input.pkg.credits,
    bonus_credits: input.pkg.bonus,
    total_credits: input.pkg.total,
    payment_method: input.paymentMethod,
    payment_reference: input.paymentReference,
    payment_proof_url: proofUrl,
    status: "pending",
  });
  if (error) throw error;
}
