import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Heart, Star, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/p/$providerId")({
  component: ProviderProfilePage,
});

type Provider = {
  id: string;
  business_name: string | null;
  business_type: string | null;
  bio: string | null;
  years_experience: number | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  logo_url: string | null;
};

function ProviderProfilePage() {
  const { providerId } = Route.useParams();
  const { user } = useAuth();
  const { lang } = useI18n();
  const [p, setP] = useState<Provider | null>(null);
  const [services, setServices] = useState<{ category_slug: string; base_price: number | null }[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: pr }, { data: svc }, { data: ar }, { data: rv }] = await Promise.all([
        supabase.from("providers").select("*").eq("id", providerId).maybeSingle(),
        supabase.from("provider_services").select("category_slug, base_price").eq("provider_id", providerId),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", providerId),
        supabase.from("reviews").select("id, rating, comment, created_at").eq("provider_id", providerId).order("created_at", { ascending: false }).limit(20),
      ]);
      setP(pr as Provider | null);
      setServices(svc ?? []);
      setAreas((ar ?? []).map((a) => a.city_slug));
      setReviews(rv ?? []);
      if (user) {
        const { data: f } = await supabase.from("favorites").select("provider_id").eq("customer_id", user.id).eq("provider_id", providerId).maybeSingle();
        setFavorite(!!f);
      }
    })();
  }, [providerId, user]);

  const toggleFav = async () => {
    if (!user || !p) return;
    if (favorite) {
      await supabase.from("favorites").delete().eq("customer_id", user.id).eq("provider_id", p.id);
      setFavorite(false);
    } else {
      await supabase.from("favorites").insert({ customer_id: user.id, provider_id: p.id });
      setFavorite(true);
    }
  };

  if (!p) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-sm text-muted-foreground">{lang === "en" ? "Loading…" : "တင်နေသည်…"}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-14">
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary text-xl font-bold text-primary">
            {(p.business_name ?? "?").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {p.business_name ?? "Provider"}
              </h1>
              {p.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {p.rating_avg.toFixed(1)} ({p.rating_count})
              </span>
              <span>{p.jobs_completed} {lang === "en" ? "jobs" : "အလုပ်"}</span>
              {p.years_experience ? <span>{p.years_experience}+ {lang === "en" ? "yrs" : "နှစ်"}</span> : null}
            </div>
            {p.bio && <p className="mt-2 text-sm">{p.bio}</p>}
          </div>
          {user && (
            <button onClick={toggleFav} aria-label="favorite" className="shrink-0">
              <Heart className={`h-6 w-6 ${favorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-semibold">{lang === "en" ? "Services" : "ဝန်ဆောင်မှုများ"}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => {
              const c = CATEGORIES.find((x) => x.slug === s.category_slug);
              return (
                <span key={s.category_slug} className="rounded-full border border-border px-3 py-1 text-xs">
                  {c ? (lang === "en" ? c.en : c.my) : s.category_slug}
                  {s.base_price ? ` · ${Number(s.base_price).toLocaleString()} MMK` : ""}
                </span>
              );
            })}
          </div>
          <div className="mt-4 text-sm font-semibold">{lang === "en" ? "Service areas" : "နယ်မြေ"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {areas.map((a) => {
              const c = CITIES.find((x) => x.slug === a);
              return (
                <span key={a} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {c ? (lang === "en" ? c.en : c.my) : a}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-semibold">{lang === "en" ? "Reviews" : "သုံးသပ်ချက်များ"}</div>
          {reviews.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{lang === "en" ? "No reviews yet." : "သုံးသပ်ချက် မရှိသေးပါ။"}</p>
          )}
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  ))}
                </div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>

        <Link to="/post-job">
          <Button className="w-full">{lang === "en" ? "Post a job in this area" : "ဤနယ်မြေတွင် အလုပ်တင်ရန်"}</Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}