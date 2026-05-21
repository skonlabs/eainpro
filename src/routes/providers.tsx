import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Star, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const searchSchema = z.object({
  cat: z.string().optional().default(""),
  city: z.string().optional().default(""),
});

export const Route = createFileRoute("/providers")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(providersListQuery());
  },
  component: ProvidersPage,
});

type Row = {
  id: string;
  business_name: string | null;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  is_verified: boolean;
  provider_services: { category_slug: string }[];
  provider_service_areas: { city_slug: string }[];
};

export const providersListQuery = () =>
  queryOptions({
    queryKey: ["providers", "list"],
    queryFn: async (): Promise<Row[]> => {
      const { data } = await supabase
        .from("providers")
        .select("id, business_name, rating_avg, rating_count, jobs_completed, is_verified, provider_services(category_slug), provider_service_areas(city_slug)")
        .eq("is_verified", true)
        .eq("is_suspended", false)
        .order("rating_avg", { ascending: false });
      return (data ?? []) as unknown as Row[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

function ProvidersPage() {
  const { lang } = useI18n();
  const sp = Route.useSearch();
  const { data: rows } = useQuery(providersListQuery());
  const [cat, setCat] = useState(sp.cat);
  const [city, setCity] = useState(sp.city);

  const filtered = useMemo(() => (rows ?? []).filter((r) => {
    if (cat && !r.provider_services.some((s) => s.category_slug === cat)) return false;
    if (city && !r.provider_service_areas.some((a) => a.city_slug === city)) return false;
    return true;
  }), [rows, cat, city]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {lang === "en" ? "Find providers" : "ဝန်ဆောင်မှုပေးသူများ ရှာရန်"}
        </h1>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">{lang === "en" ? "All services" : "ဝန်ဆောင်မှု အားလုံး"}</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{lang === "en" ? c.en : c.my}</option>
            ))}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">{lang === "en" ? "All cities" : "မြို့ အားလုံး"}</option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{lang === "en" ? c.en : c.my}</option>
            ))}
          </select>
        </div>

        {!rows && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="mt-2 flex gap-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {rows && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {lang === "en" ? "No verified providers match your filters yet." : "ကိုက်ညီသော ဝန်ဆောင်မှုပေးသူ မရှိသေးပါ။"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "en" ? "Try clearing your filters or check back later." : "စစ်ဆေးချက် ဖျက်ပြီး မကြာမီ ပြန်ကြည့်ပါ။"}
            </p>
          </div>
        )}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link to="/p/$providerId" params={{ providerId: r.id }} className="block rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {(r.business_name ?? "P").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold">{r.business_name ?? "Provider"}</span>
                      {r.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {r.rating_avg.toFixed(1)} ({r.rating_count})
                      </span>
                      <span>{r.jobs_completed} {lang === "en" ? "jobs" : "အလုပ်"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.provider_services.slice(0, 4).map((s) => {
                        const c = CATEGORIES.find((x) => x.slug === s.category_slug);
                        return (
                          <span key={s.category_slug} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                            {c ? (lang === "en" ? c.en : c.my) : s.category_slug}
                          </span>
                        );
                      })}
                      {r.provider_services.length > 4 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          +{r.provider_services.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>

    </div>
  );
}