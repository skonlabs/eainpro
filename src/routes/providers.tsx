import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  const { lang } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {lang === "en" ? "Find providers" : "ဝန်ဆောင်မှုပေးသူများ ရှာရန်"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {lang === "en"
            ? "Provider directory is coming next. Post a job to get matched today."
            : "ဝန်ဆောင်မှုပေးသူ စာရင်းကို ဆက်လက်တည်ဆောက်နေပါသည်။ ယနေ့ပင် အလုပ်တင်နိုင်ပါသည်။"}
        </p>
      </main>
      <Footer />
    </div>
  );
}