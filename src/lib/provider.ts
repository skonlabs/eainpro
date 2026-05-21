import { supabase } from "./supabase";

export type ProviderProfileInput = {
  business_name: string;
  business_type: "individual" | "business";
  bio: string;
  years_experience: number;
  supports_urgent: boolean;
  /** Map of category_slug -> base_price (string, may be empty) */
  services: Record<string, string>;
  /** Map of city_slug -> selected */
  cities: Record<string, boolean>;
};

/**
 * Upserts the provider row, replaces provider_services and
 * provider_service_areas. Mirrors the legacy delete-then-insert flow used by
 * both `account.tsx` and `provider.onboarding.tsx`. Throws on the first error.
 */
export async function saveProviderProfile(
  providerId: string,
  input: ProviderProfileInput,
): Promise<void> {
  const { error: upErr } = await supabase.from("providers").upsert({
    id: providerId,
    business_name: input.business_name.trim(),
    business_type: input.business_type,
    bio: input.bio.trim() || null,
    years_experience: input.years_experience || 0,
    supports_urgent: input.supports_urgent,
  });
  if (upErr) throw upErr;

  const svcRows = Object.entries(input.services).map(([slug, p]) => ({
    provider_id: providerId,
    category_slug: slug,
    base_price: p ? Number(p) : null,
  }));
  const { error: delSvcErr } = await supabase
    .from("provider_services")
    .delete()
    .eq("provider_id", providerId);
  if (delSvcErr) throw delSvcErr;
  if (svcRows.length) {
    const { error } = await supabase.from("provider_services").insert(svcRows);
    if (error) throw error;
  }

  const cityList = Object.keys(input.cities).filter((k) => input.cities[k]);
  const { error: delAreaErr } = await supabase
    .from("provider_service_areas")
    .delete()
    .eq("provider_id", providerId);
  if (delAreaErr) throw delAreaErr;
  if (cityList.length) {
    const { error } = await supabase
      .from("provider_service_areas")
      .insert(cityList.map((c) => ({ provider_id: providerId, city_slug: c })));
    if (error) throw error;
  }
}