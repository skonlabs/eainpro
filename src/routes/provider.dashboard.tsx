import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Clock, MapPin, Zap, Inbox, Hourglass, CalendarCheck } from "lucide-react";
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

  // Split jobs into "new leads" (no quote yet) vs "awaiting" (quoted, waiting on customer)
  const { newLeads, awaiting } = useMemo(() => {
    const nl: Job[] = [];
    const aw: Job[] = [];
    (jobs ?? []).forEach((j) => (myQuotes[j.id] ? aw.push(j) : nl.push(j)));
    return { newLeads: nl, awaiting: aw };
  }, [jobs, myQuotes]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const tomorrow = new Date(t);
    tomorrow.setDate(t.getDate() + 1);
    return activeBookings.filter((b) => {
      if (!b.scheduled_at) return false;
      const d = new Date(b.scheduled_at);
      return d >= t && d < tomorrow;
    });
  }, [activeBookings]);

  const [tab, setTab] = useState<"leads" | "awaiting" | "today">("leads");
  useEffect(() => {
    if (today.length > 0) setTab("today");
  }, [today.length]);

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
            {lang === "en" ? "Your work" : "သင်၏ အလုပ်"}
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

        {/* Stat strip */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatCard
            icon={<Inbox className="h-4 w-4" />}
            label={lang === "en" ? "New leads" : "အလုပ်အသစ်"}
            value={newLeads.length}
            active={tab === "leads"}
            onClick={() => setTab("leads")}
          />
          <StatCard
            icon={<Hourglass className="h-4 w-4" />}
            label={lang === "en" ? "Awaiting" : "စောင့်နေ"}
            value={awaiting.length}
            active={tab === "awaiting"}
            onClick={() => setTab("awaiting")}
          />
          <StatCard
            icon={<CalendarCheck className="h-4 w-4" />}
            label={lang === "en" ? "Today" : "ယနေ့"}
            value={today.length}
            active={tab === "today"}
            onClick={() => setTab("today")}
          />
        </div>

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

        {jobs && tab === "leads" && (
          newLeads.length === 0 ? (
            <EmptyHint lang={lang} kind="leads" />
          ) : (
            <ul className="mt-6 space-y-3">
              {newLeads.map((j) => (
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
                    {lang === "en" ? "View & quote" : "ကြည့်ပြီး စျေးပေး"}
                  </Button>
                </Link>
              </div>
            </li>
              ))}
            </ul>
          )
        )}

        {jobs && tab === "awaiting" && (
          awaiting.length === 0 ? (
            <EmptyHint lang={lang} kind="awaiting" />
          ) : (
            <ul className="mt-6 space-y-3">
              {awaiting.map((j) => (
                <li key={j.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{catName(j.category_slug)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {lang === "en" ? "You quoted" : "စျေးပေးပြီး"}{" "}
                        <span className="font-semibold text-foreground">
                          {myQuotes[j.id]?.amount.toLocaleString()} MMK
                        </span>
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {cityName(j.city_slug)}
                      </div>
                    </div>
                    <Link to="/request/$jobId" params={{ jobId: j.id }}>
                      <Button size="sm" variant="outline">
                        {lang === "en" ? "View" : "ကြည့်"}
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "today" && (
          today.length === 0 ? (
            <div className="mt-6">
              <EmptyHint lang={lang} kind="today" />
              {activeBookings.length > 0 && (
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  {lang === "en"
                    ? `${activeBookings.length} upcoming booking(s) scheduled later.`
                    : `နောက်ပိုင်း ဘွတ်ကင် ${activeBookings.length} ခု ရှိ။`}
                </div>
              )}
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {today.map((b) => (
                <li key={b.id}>
                  <Link
                    to="/request/$jobId"
                    params={{ jobId: b.job_id }}
                    search={{ tab: "booking" } as never}
                    className="block rounded-xl border border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 text-sm font-semibold">
                        {b.job ? catName(b.job.category_slug) : lang === "en" ? "Booking" : "ဘွတ်ကင်"}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleTimeString(lang === "en" ? "en" : "my-MM", {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : lang === "en"
                            ? "Time TBD"
                            : "အချိန် ညှိရန်"}
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
          )
        )}
      </main>

    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
        active
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${active ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </span>
      <span className="mt-1 text-2xl font-extrabold tabular-nums">{value}</span>
    </button>
  );
}

function EmptyHint({ lang, kind }: { lang: "en" | "my"; kind: "leads" | "awaiting" | "today" }) {
  const msg = {
    leads:
      lang === "en"
        ? "No new leads matching your services. Check back soon."
        : "သင်နှင့် ကိုက်ညီသော အလုပ်အသစ် မရှိသေး။",
    awaiting:
      lang === "en"
        ? "No quotes waiting on a customer reply."
        : "ဖောက်သည် ပြန်ဖြေချက် စောင့်နေသော စျေး မရှိ။",
    today:
      lang === "en" ? "No jobs scheduled for today." : "ယနေ့အတွက် ဘွတ်ကင် မရှိ။",
  }[kind];
  return (
    <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {msg}
    </p>
  );
}

