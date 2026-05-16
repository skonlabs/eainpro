import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/catalog";

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link to="/services" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("nav_services")}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {lang === "en" ? cat.en : cat.my}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {lang === "en"
            ? "Tell us what you need and get matched with verified providers."
            : "လိုအပ်ချက်ပြောပြပါ၊ အတည်ပြုထားသူများနှင့် ချိတ်ဆက်ပေးပါမည်။"}
        </p>

        {cat.subcategories && (
          <div className="mt-6 flex flex-wrap gap-2">
            {cat.subcategories.map((s) => (
              <span
                key={s.slug}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium"
              >
                {lang === "en" ? s.en : s.my}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link to="/post-job" search={{ q: cat.en, city: undefined }}>
            <Button size="lg">{t("cta_find")}</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}