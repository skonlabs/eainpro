import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import {
  Search,
  MapPin,
  ShieldCheck,
  Tag,
  MessagesSquare,
  Star,
  Languages,
  Sparkles,
  Wrench,
  Plug,
  Snowflake,
  PaintBucket,
  Truck,
  Bug,
  Hammer,
  Sofa,
  Refrigerator,
  Droplets,
  Zap,
  Camera,
  Wifi,
  Lock,
  Trees,
  Shirt,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Eain Pro — Trusted home services in Myanmar" },
      {
        name: "description",
        content:
          "Book trusted cleaners, plumbers, electricians, AC technicians, painters and movers in Yangon, Mandalay and across Myanmar.",
      },
    ],
  }),
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Wrench, Plug, Snowflake, PaintBucket, Truck, Bug, Hammer, Sofa,
  Refrigerator, Droplets, Zap, Camera, Wifi, Lock, Trees, Shirt,
  Saw: Hammer, Brick: Hammer,
};

const POPULAR = ["cleaning", "plumbing", "electrical", "aircon", "painting", "moving", "pest"];

function Index() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("yangon");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/70 via-background to-background" />
        <div className="absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 top-40 -z-10 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-16 sm:pt-20 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t("hero_title").split(/(Myanmar|မြန်မာ)/).map((part, i) =>
                part === "Myanmar" || part === "မြန်မာ" ? (
                  <span key={i} className="text-primary">{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
              {t("hero_sub")}
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mt-7 max-w-3xl rounded-3xl border border-border/60 bg-card p-4 shadow-elevated sm:mt-10 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search_placeholder")}
                  className="h-12 rounded-2xl border-transparent bg-muted/60 pl-10 font-medium placeholder:text-muted-foreground/70 focus-visible:bg-card"
                />
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-label={t("city")}
                  className="h-12 w-full appearance-none rounded-2xl border border-transparent bg-muted/60 pl-10 pr-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {lang === "en" ? c.en : c.my}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                to="/post-job"
                search={{ q: query || undefined, city }}
              >
                <Button size="lg" className="h-12 w-full rounded-2xl font-bold shadow-lg shadow-primary/25 sm:w-auto">
                  {t("cta_find")}
                </Button>
              </Link>
            </div>

            {/* Popular chips */}
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {t("popular")}
              </div>
              <div className="flex flex-wrap gap-2">
              {POPULAR.map((slug) => {
                const c = CATEGORIES.find((x) => x.slug === slug);
                if (!c) return null;
                return (
                  <Link
                    key={slug}
                    to="/services/$category"
                    params={{ category: slug }}
                    className="rounded-full border border-border/70 bg-muted/40 px-3.5 py-1.5 text-xs font-semibold text-foreground/75 transition hover:border-primary hover:bg-card hover:text-primary"
                  >
                    {lang === "en" ? c.en : c.my}
                  </Link>
                );
              })}
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 text-xs sm:grid-cols-5 sm:text-sm">
            {[
              { i: ShieldCheck, k: "trust_verified" as const, tint: "bg-primary/10 text-primary" },
              { i: Tag, k: "trust_pricing" as const, tint: "bg-amber-100 text-amber-700" },
              { i: MessagesSquare, k: "trust_chat" as const, tint: "bg-sky-100 text-sky-700" },
              { i: Star, k: "trust_reviews" as const, tint: "bg-violet-100 text-violet-700" },
              { i: Languages, k: "trust_support" as const, tint: "bg-rose-100 text-rose-700" },
            ].map(({ i: Icon, k, tint }) => (
              <div
                key={k}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card/70 p-3 backdrop-blur"
              >
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-semibold text-foreground/90">{t(k)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-5 flex items-end justify-between sm:mb-8">
          <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
            {t("categories")}
          </h2>
          <Link to="/services" className="text-sm font-medium text-primary hover:underline">
            {lang === "en" ? "See all" : "အားလုံးကြည့်ရန်"}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CATEGORIES.slice(0, 12).map((c) => {
            const Icon = ICONS[c.icon] ?? Hammer;
            return (
              <Link
                key={c.slug}
                to="/services/$category"
                params={{ category: c.slug }}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold">
                  {lang === "en" ? c.en : c.my}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
          <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
            {t("how_it_works")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[t("step1"), t("step2"), t("step3"), t("step4")].map((label, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {i + 1}
                </div>
                <div className="mt-4 text-base font-semibold">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row">
            <div>
              <div className="text-lg font-semibold">
                {lang === "en" ? "Are you a service professional?" : "သင်က ဝန်ဆောင်မှုပေးသူလား?"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "en"
                  ? "Grow your business with new customers across Myanmar."
                  : "မြန်မာတစ်နိုင်ငံလုံးမှ ဖောက်သည်အသစ်များဖြင့် သင့်လုပ်ငန်းကို ချဲ့ထွင်ပါ။"}
              </p>
            </div>
            <Link to="/signup" search={{ as: "provider" }}>
              <Button size="lg" variant="default">
                {t("cta_join")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
