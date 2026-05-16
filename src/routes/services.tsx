import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/catalog";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "All services — Eain Pro" },
      { name: "description", content: "Browse all home service categories available on Eain Pro." },
    ],
  }),
});

function ServicesPage() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("categories")}</h1>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/services/$category"
              params={{ category: c.slug }}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary"
            >
              <div className="text-sm font-semibold">{lang === "en" ? c.en : c.my}</div>
              {c.subcategories && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.subcategories.length} {lang === "en" ? "options" : "ရွေးချယ်စရာ"}
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}