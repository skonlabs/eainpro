import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";
import { Star, BadgeCheck, ArrowLeft, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/services/$category")({
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Category not found</h1>
        <Link to="/services" className="mt-4 inline-block text-primary hover:underline">
          Browse all services
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <p>{error.message}</p>
    </div>
  ),
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { lang, t } = useI18n();
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) throw notFound();

  type Row = {
    id: string;
    business_name: string | null;
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
    is_verified: boolean;
    provider_services: { category_slug: string }[];
  };
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("providers")
        .select(
          "id, business_name, rating_avg, rating_count, jobs_completed, is_verified, provider_services!inner(category_slug)",
        )
        .eq("provider_services.category_slug", category)
        .order("rating_avg", { ascending: false });
      setRows((data ?? []) as unknown as Row[]);
    })();
  }, [category]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-12">
        <Link
          to="/services"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("nav_services")}
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {lang === "en" ? cat.en : cat.my}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              {lang === "en"
                ? `Browse verified ${cat.en.toLowerCase()} providers, or post a job and get matched.`
                : "အတည်ပြုထားသူများကို ကြည့်ပါ၊ သို့မဟုတ် အလုပ်တင်၍ ချိတ်ဆက်ပါ။"}
            </p>
          </div>
          <Link to="/post-job" search={{ q: cat.en, city: undefined }}>
            <Button size="lg" className="rounded-2xl font-bold shadow-lg shadow-primary/25">
              <PlusCircle className="mr-2 h-4 w-4" />
              {lang === "en" ? "Post a job" : "အလုပ်တင်ရန်"}
            </Button>
          </Link>
        </div>

        {cat.subcategories && (
          <div className="mt-5 flex flex-wrap gap-2">
            {cat.subcategories.map((s) => (
              <span
                key={s.slug}
                className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground/70"
              >
                {lang === "en" ? s.en : s.my}
              </span>
            ))}
          </div>
        )}

        <h2 className="mt-10 text-lg font-bold tracking-tight">
          {lang === "en" ? "Top providers" : "ထိပ်တန်း ဝန်ဆောင်မှုပေးသူများ"}
        </h2>

        {!rows && (
          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "en" ? "Loading…" : "တင်နေသည်…"}
          </p>
        )}

        {rows && rows.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {lang === "en"
                ? "No verified providers in this category yet. Post a job and we'll match you."
                : "ဤအမျိုးအစားတွင် အတည်ပြုထားသူ မရှိသေးပါ။ အလုပ်တင်ပါ။"}
            </p>
            <Link to="/post-job" search={{ q: cat.en, city: undefined }} className="mt-4 inline-block">
              <Button variant="default" size="sm" className="rounded-xl font-semibold">
                {lang === "en" ? "Post a job" : "အလုပ်တင်ရန်"}
              </Button>
            </Link>
          </div>
        )}

        {rows && rows.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to="/p/$providerId"
                  params={{ providerId: r.id }}
                  className="block rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.business_name ?? "Provider"}</span>
                      {r.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {r.rating_avg.toFixed(1)}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({r.rating_count})
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {r.jobs_completed} {lang === "en" ? "jobs completed" : "အလုပ် ပြီးစီး"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}