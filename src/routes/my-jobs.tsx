import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { CheckCircle2, Clock, MapPin } from "lucide-react";

const searchSchema = z.object({ created: z.string().optional() });

export const Route = createFileRoute("/my-jobs")({
  validateSearch: searchSchema,
  component: MyJobsPage,
  head: () => ({ meta: [{ title: "My jobs — Eain Pro" }] }),
});

type Job = {
  id: string;
  category_slug: string;
  description: string | null;
  city_slug: string;
  address: string | null;
  urgency: "today" | "tomorrow" | "this_week" | "flexible";
  status: "open" | "quoted" | "accepted" | "on_the_way" | "started" | "completed" | "cancelled";
  created_at: string;
};

function MyJobsPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { created } = Route.useSearch();
  const nav = useNavigate();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/my-jobs" } });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("job_requests")
        .select("id, category_slug, description, city_slug, address, urgency, status, created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setJobs(data as Job[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, nav]);

  const catName = (slug: string) => {
    const c = CATEGORIES.find((x) => x.slug === slug);
    return c ? (lang === "en" ? c.en : c.my) : slug;
  };
  const cityName = (slug: string) => {
    const c = CITIES.find((x) => x.slug === slug);
    return c ? (lang === "en" ? c.en : c.my) : slug;
  };
  const urgencyName = (u: Job["urgency"]) => {
    const map = {
      today: { en: "Today", my: "ယနေ့" },
      tomorrow: { en: "Tomorrow", my: "မနက်ဖြန်" },
      this_week: { en: "This week", my: "ဤအပတ်" },
      flexible: { en: "Flexible", my: "လွတ်လပ်" },
    } as const;
    return lang === "en" ? map[u].en : map[u].my;
  };
  const statusName = (s: Job["status"]) => {
    const map: Record<Job["status"], { en: string; my: string }> = {
      open: { en: "Open", my: "ဖွင့်ထား" },
      quoted: { en: "Quoted", my: "စျေးပေး" },
      accepted: { en: "Accepted", my: "လက်ခံ" },
      on_the_way: { en: "On the way", my: "လမ်းပေါ်" },
      started: { en: "Started", my: "စတင်ပြီး" },
      completed: { en: "Completed", my: "ပြီးစီး" },
      cancelled: { en: "Cancelled", my: "ပယ်ဖျက်" },
    };
    return lang === "en" ? map[s].en : map[s].my;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {lang === "en" ? "My jobs" : "ကျွန်ုပ်၏ အလုပ်များ"}
          </h1>
          <Link to="/post-job">
            <Button size="sm">{lang === "en" ? "Post a job" : "အလုပ်တင်ရန်"}</Button>
          </Link>
        </div>

        {created && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              {lang === "en"
                ? "Job posted. Providers in your area can now send you quotes."
                : "အလုပ်တင်ပြီးပါပြီ။ သင်၏ ဧရိယာရှိ ဝန်ဆောင်မှုပေးသူများ စျေးနှုန်းပေးပို့နိုင်ပါပြီ။"}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        )}

        {!jobs && !error && (
          <p className="mt-8 text-sm text-muted-foreground">
            {lang === "en" ? "Loading…" : "တင်နေသည်…"}
          </p>
        )}

        {jobs && jobs.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {lang === "en"
                ? "You haven't posted any jobs yet."
                : "သင် မည်သည့်အလုပ်မှ မတင်ရသေးပါ။"}
            </p>
            <Link to="/post-job" className="mt-4 inline-block">
              <Button>{lang === "en" ? "Post your first job" : "ပထမဆုံး အလုပ်တင်ရန်"}</Button>
            </Link>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <ul className="mt-6 space-y-3">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{catName(j.category_slug)}</div>
                    {j.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {j.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {cityName(j.city_slug)}
                        {j.address ? ` · ${j.address}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {urgencyName(j.urgency)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      j.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : j.status === "cancelled"
                          ? "bg-muted text-muted-foreground"
                          : "bg-secondary text-foreground/80"
                    }`}
                  >
                    {statusName(j.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}