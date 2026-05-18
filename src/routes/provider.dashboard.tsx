import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Clock, MapPin, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/provider/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Provider dashboard — Eain Pro" }] }),
});

type Job = {
  id: string;
  category_slug: string;
  description: string | null;
  city_slug: string;
  address: string | null;
  urgency: string;
  status: string;
  created_at: string;
};

function DashboardPage() {
  const { lang } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [provider, setProvider] = useState<{ is_verified: boolean } | null>(null);
  const [myQuotes, setMyQuotes] = useState<Record<string, { amount: number; status: string }>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void nav({ to: "/signin", search: { redirect: "/provider/dashboard" } });
    (async () => {
      const { data: prov } = await supabase
        .from("providers")
        .select("is_verified")
        .eq("id", user.id)
        .maybeSingle();
      if (!prov) return void nav({ to: "/provider/onboarding" });
      setProvider(prov);

      // Match jobs to provider's own service categories AND service-area cities.
      const [{ data: svcRows }, { data: areaRows }] = await Promise.all([
        supabase.from("provider_services").select("category_slug").eq("provider_id", user.id),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", user.id),
      ]);
      const cats = (svcRows ?? []).map((r) => r.category_slug);
      const cities = (areaRows ?? []).map((r) => r.city_slug);
      if (cats.length === 0) {
        setJobs([]);
      } else {
        let q = supabase
          .from("job_requests")
          .select("id, category_slug, description, city_slug, address, urgency, status, created_at")
          .in("status", ["open", "quoted"])
          .in("category_slug", cats)
          .order("created_at", { ascending: false });
        if (cities.length > 0) q = q.in("city_slug", cities);
        const { data, error } = await q;
        if (error) setErr(error.message);
        else setJobs(data as Job[]);
      }

      const { data: qs } = await supabase
        .from("quotes")
        .select("job_id, amount, status")
        .eq("provider_id", user.id);
      const m: Record<string, { amount: number; status: string }> = {};
      (qs ?? []).forEach((q) => (m[q.job_id] = { amount: Number(q.amount), status: q.status }));
      setMyQuotes(m);
    })();
  }, [loading, user, nav]);

  const catName = (s: string) => {
    const c = CATEGORIES.find((x) => x.slug === s);
    return c ? (lang === "en" ? c.en : c.my) : s;
  };
  const cityName = (s: string) => {
    const c = CITIES.find((x) => x.slug === s);
    return c ? (lang === "en" ? c.en : c.my) : s;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {lang === "en" ? "Incoming jobs" : "ဝင်လာသော အလုပ်များ"}
          </h1>
          <Link to="/provider/onboarding">
            <Button variant="ghost" size="sm">
              {lang === "en" ? "Edit profile" : "ပရိုဖိုင် ပြင်ရန်"}
            </Button>
          </Link>
        </div>

        {provider && !provider.is_verified && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            {lang === "en"
              ? "Your profile is pending admin verification. You can still send quotes."
              : "သင်၏ ပရိုဖိုင်ကို Admin အတည်ပြုနေပါသည်။ စျေးနှုန်း ဆက်ပေးနိုင်ပါသည်။"}
          </div>
        )}

        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
        {!jobs && !err && (
          <ul className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {jobs && jobs.length === 0 && (
          <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {lang === "en"
              ? "No matching jobs yet. Make sure your services and service areas are set."
              : "ကိုက်ညီသော အလုပ်မရှိသေးပါ။ ဝန်ဆောင်မှု နှင့် ဧရိယာ မှန်ကန်ကြောင်း သေချာပါ။"}
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {(jobs ?? []).map((j) => (
            <li key={j.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{catName(j.category_slug)}</div>
                  {j.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {cityName(j.city_slug)}
                    </span>
                    {j.urgency === "today" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                        <Zap className="h-3 w-3" />
                        {lang === "en" ? "Urgent" : "အရေးပေါ်"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {j.urgency === "tomorrow" ? (lang === "en" ? "1–2 days" : "၁-၂ ရက်")
                          : j.urgency === "flexible" ? (lang === "en" ? "Flexible" : "ပြောင်းလဲနိုင်")
                          : j.urgency}
                      </span>
                    )}
                  </div>
                </div>
                <Link to="/jobs/$jobId" params={{ jobId: j.id }}>
                  <Button size="sm" variant="outline">
                    {myQuotes[j.id]
                      ? lang === "en"
                        ? `Quoted ${myQuotes[j.id].amount.toLocaleString()}`
                        : `စျေးပေးပြီး ${myQuotes[j.id].amount.toLocaleString()}`
                      : lang === "en"
                        ? "View & quote"
                        : "ကြည့်ပြီး စျေးပေး"}
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>

    </div>
  );
}

