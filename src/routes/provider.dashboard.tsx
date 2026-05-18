import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
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

type ActiveBooking = {
  id: string;
  job_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  job: {
    category_slug: string;
    city_slug: string;
    address: string | null;
    description: string | null;
  } | null;
};

type DashSnapshot = {
  jobs: Job[];
  provider: { is_verified: boolean } | null;
  myQuotes: Record<string, { amount: number; status: string }>;
  activeBookings: ActiveBooking[];
  needsOnboarding: boolean;
  error: string | null;
};

export const providerDashboardQuery = (userId: string) =>
  queryOptions({
    queryKey: ["provider-dashboard", userId],
    queryFn: async (): Promise<DashSnapshot> => {
      const empty: DashSnapshot = {
        jobs: [],
        provider: null,
        myQuotes: {},
        activeBookings: [],
        needsOnboarding: false,
        error: null,
      };
      const { data: prov } = await supabase
        .from("providers")
        .select("is_verified")
        .eq("id", userId)
        .maybeSingle();
      if (!prov) return { ...empty, needsOnboarding: true };

      const [{ data: svcRows }, { data: areaRows }] = await Promise.all([
        supabase.from("provider_services").select("category_slug").eq("provider_id", userId),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", userId),
      ]);
      const cats = (svcRows ?? []).map((r) => r.category_slug);
      const cities = (areaRows ?? []).map((r) => r.city_slug);

      // Build the jobs query first (depends on cats/cities), then fire it
      // in parallel with the quotes + bookings fetches so all three resolve
      // together instead of sequentially.
      let jobsQuery = supabase
        .from("job_requests")
        .select("id, category_slug, description, city_slug, address, urgency, status, created_at")
        .in("status", ["open", "quoted"])
        .order("created_at", { ascending: false });
      if (cats.length > 0) jobsQuery = jobsQuery.in("category_slug", cats);
      if (cities.length > 0) jobsQuery = jobsQuery.in("city_slug", cities);

      const [jobRes, quotesRes, bookingsRes] = await Promise.all([
        cats.length > 0 ? jobsQuery : Promise.resolve({ data: [], error: null }),
        supabase.from("quotes").select("job_id, amount, status").eq("provider_id", userId),
        supabase
          .from("bookings")
          .select("id, job_id, status, scheduled_at, amount, job:job_requests(category_slug, city_slug, address, description)")
          .eq("provider_id", userId)
          .in("status", ["accepted", "on_the_way", "started", "in_progress"])
          .order("scheduled_at", { ascending: true }),
      ]);

      let jobs: Job[] = [];
      let error: string | null = null;
      if (jobRes.error) error = jobRes.error.message;
      else jobs = (jobRes.data ?? []) as Job[];

      const myQuotes: Record<string, { amount: number; status: string }> = {};
      ((quotesRes.data ?? []) as { job_id: string; amount: number; status: string }[])
        .forEach((q) => (myQuotes[q.job_id] = { amount: Number(q.amount), status: q.status }));

      const bs = bookingsRes.data as unknown as ActiveBooking[] | null;

      return {
        jobs,
        provider: prov,
        myQuotes,
        activeBookings: bs ?? [],
        needsOnboarding: false,
        error,
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

function DashboardPage() {
  const { lang } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/signin", search: { redirect: "/provider/dashboard" } });
    }
  }, [loading, user, nav]);

  const { data } = useQuery({
    ...providerDashboardQuery(user?.id ?? ""),
    enabled: !!user,
  });

  useEffect(() => {
    if (data?.needsOnboarding) nav({ to: "/provider/onboarding" });
  }, [data?.needsOnboarding, nav]);

  const jobs = data?.jobs ?? null;
  const provider = data?.provider ?? null;
  const myQuotes = data?.myQuotes ?? {};
  const activeBookings = data?.activeBookings ?? [];
  const err = data?.error ?? null;

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

        {activeBookings.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {lang === "en" ? "Active bookings" : "လုပ်ဆောင်နေသော ဘွတ်ကင်"}
            </h2>
            <ul className="space-y-2">
              {activeBookings.map((b) => (
                <li key={b.id}>
                  <Link
                    to="/request/$jobId"
                    params={{ jobId: b.job_id }}
                    search={{ tab: "booking" } as never}
                    className="block rounded-xl border border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 text-sm font-semibold">
                        {b.job ? catName(b.job.category_slug) : (lang === "en" ? "Booking" : "ဘွတ်ကင်")}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {b.job?.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{b.job.description}</p>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleString(lang === "en" ? "en" : "my-MM")
                          : lang === "en" ? "Time TBD" : "အချိန် ညှိရန်"}
                      </span>
                      {b.amount != null && (
                        <span className="ml-auto font-semibold text-foreground">
                          {Number(b.amount).toLocaleString()} MMK
                        </span>
                      )}
                    </div>
                    {b.job && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {[b.job.address, cityName(b.job.city_slug)].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
                <Link to="/request/$jobId" params={{ jobId: j.id }}>
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

