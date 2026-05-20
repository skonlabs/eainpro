import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/catalog";
import {
  Sparkles, Wrench, Plug, Snowflake, PaintBucket, Truck, Bug, Hammer,
  Sofa, Refrigerator, Droplets, Zap, Camera, Wifi, Lock, Trees, Shirt,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Wrench, Plug, Snowflake, PaintBucket, Truck, Bug, Hammer, Sofa,
  Refrigerator, Droplets, Zap, Camera, Wifi, Lock, Trees, Shirt,
  Saw: Hammer, Brick: Hammer,
};

export const Route = createFileRoute("/services")({
  component: ServicesRouteShell,
  head: () => ({
    meta: [
      { title: "All services — Fixido" },
      { name: "description", content: "Browse all home service categories available on Fixido." },
    ],
  }),
});

function ServicesRouteShell() {
  const { pathname } = useLocation();

  if (pathname !== "/services") {
    return <Outlet />;
  }

  return <ServicesPage />;
}

function ServicesPage() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight">{t("categories")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "en" ? "Choose a service to find providers or request a quote." : "ဝန်ဆောင်မှု ရွေးပြီး ပညာရှင် ရှာပါ သို့မဟုတ် စျေးနှုန်း တောင်းဆိုပါ။"}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {CATEGORIES.map((c) => {
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
                <div>
                  <div className="text-sm font-semibold">{lang === "en" ? c.en : c.my}</div>
                  {c.subcategories && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {c.subcategories.length} {lang === "en" ? "types" : "အမျိုးအစား"}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>

    </div>
  );
}