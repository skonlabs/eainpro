import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Star, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/providers")({
  validateSearch: (s: Record<string, unknown>) => ({
    cat: typeof s.cat === "string" ? s.cat : "",
    city: typeof s.city === "string" ? s.city : "",
  }),
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

function ProvidersPage() {
  const { lang } = useI18n();
  const sp = Route.useSearch();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cat, setCat] = useState(sp.cat);
  const [city, setCity] = useState(sp.city);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("providers")
        .select("id, business_name, rating_avg, rating_count, jobs_completed, is_verified, provider_services(category_slug), provider_service_areas(city_slug)")
        .order("rating_avg", { ascending: false });
      setRows((data ?? []) as unknown as Row[]);
    })();
  }, []);

  const filtered = (rows ?? []).filter((r) => {
    if (cat && !r.provider_services.some((s) => s.category_slug === cat)) return false;
    if (city && !r.provider_service_areas.some((a) => a.city_slug === city)) return false;
    return true;
  });

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

        {!rows && <p className="mt-6 text-sm text-muted-foreground">{lang === "en" ? "Loading…" : "တင်နေသည်…"}</p>}
        {rows && filtered.length === 0 && (
          <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {lang === "en" ? "No verified providers match yet." : "ကိုက်ညီသော ဝန်ဆောင်မှုပေးသူ မရှိသေးပါ။"}
          </p>
        )}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link to="/p/$providerId" params={{ providerId: r.id }} className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.business_name ?? "Provider"}</span>
                    {r.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    {r.rating_avg.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.provider_services.slice(0, 4).map((s) => {
                    const c = CATEGORIES.find((x) => x.slug === s.category_slug);
                    return (
                      <span key={s.category_slug} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                        {c ? (lang === "en" ? c.en : c.my) : s.category_slug}
                      </span>
                    );
                  })}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>

    </div>
  );
}