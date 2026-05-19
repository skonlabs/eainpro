import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { ChevronRight, MapPin, Plus, Inbox, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/my-requests")({
  component: MyRequestsPage,
  head: () => ({ meta: [{ title: "My Requests — Eain Pro" }] }),
});

type Row = {
  id: string;
  category_slug: string;
  city_slug: string;
  area: string | null;
  status: string;
  created_at: string;
  invite_count: number;
  quote_count: number;
};

export const myRequestsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-requests", userId],
    queryFn: async (): Promise<Row[]> => {
      const { data: jobs } = await supabase
        .from("job_requests")
        .select("id, category_slug, city_slug, area, status, created_at")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      if (!jobs || jobs.length === 0) return [];
      const ids = jobs.map((j) => j.id);
      const [{ data: inv }, { data: qs }] = await Promise.all([
        supabase.from("request_invitations").select("job_id").in("job_id", ids),
        supabase.from("quotes").select("job_id").in("job_id", ids),
      ]);
      const ic = new Map<string, number>();
      const qc = new Map<string, number>();
      (inv ?? []).forEach((r) => ic.set(r.job_id, (ic.get(r.job_id) ?? 0) + 1));
      (qs ?? []).forEach((r) => qc.set(r.job_id, (qc.get(r.job_id) ?? 0) + 1));
      return jobs.map((j) => ({
        ...j,
        invite_count: ic.get(j.id) ?? 0,
        quote_count: qc.get(j.id) ?? 0,
      }));
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

function MyRequestsPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (!authLoading && !user) {
      nav({ to: "/signin", search: { redirect: "/my-requests" } });
    }
  }, [authLoading, user, nav]);

  const { data: rows } = useQuery({
    ...myRequestsQuery(user?.id ?? ""),
    enabled: !!user,
  });

  const [view, setView] = useState<"active" | "past">("active");
  const PAST = new Set(["completed", "cancelled"]);
  const { active, past } = useMemo(() => {
    const a: Row[] = [];
    const p: Row[] = [];
    (rows ?? []).forEach((r) => (PAST.has(r.status) ? p.push(r) : a.push(r)));
    return { active: a, past: p };
  }, [rows]);
  const shown = view === "active" ? active : past;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {L("My Requests", "ကျွန်ုပ်၏ တောင်းဆိုချက်များ")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {L(
                "Track your service requests, quotes, and bookings.",
                "သင်၏ တောင်းဆိုချက်များ၊ စျေးနှုန်းများကို ခြေရာခံပါ။",
              )}
            </p>
          </div>
          <Link to="/request/new" search={{ cat: undefined, sub: undefined }}>
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" />
              {L("New", "အသစ်")}
            </Button>
          </Link>
        </div>

        {rows && rows.length > 0 && (
          <div className="mt-5 inline-flex rounded-xl border border-border bg-card p-1 text-sm">
            <button
              onClick={() => setView("active")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                view === "active"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {L("Active", "လုပ်နေ")} ({active.length})
            </button>
            <button
              onClick={() => setView("past")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                view === "past"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {L("Past", "ပြီးခဲ့")} ({past.length})
            </button>
          </div>
        )}

        {!rows && (
          <ul className="mt-6 grid gap-2">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-card/60"
              />
            ))}
          </ul>
        )}

        {rows && rows.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-bold">
              {L("No requests yet", "တောင်းဆိုချက် မရှိသေး")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {L(
                "When you request a service, it will appear here.",
                "သင် ဝန်ဆောင်မှု တောင်းဆိုလျှင် ဤနေရာတွင် ပေါ်လာပါမည်။",
              )}
            </p>
            <Link to="/request/new" search={{ cat: undefined, sub: undefined }}>
              <Button className="mt-4 rounded-xl">{L("Find a Service", "ဝန်ဆောင်မှု ရှာ")}</Button>
            </Link>
          </div>
        )}

        {rows && rows.length > 0 && shown.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {view === "active"
              ? L("No active requests.", "လုပ်နေသော တောင်းဆိုချက် မရှိ။")
              : L("No past requests yet.", "ပြီးခဲ့သော တောင်းဆိုချက် မရှိ။")}
          </p>
        )}

        {rows && rows.length > 0 && shown.length > 0 && (
          <ul className="mt-6 grid gap-2">
            {shown.map((r) => {
              const cat = CATEGORIES.find((c) => c.slug === r.category_slug);
              const city = CITIES.find((c) => c.slug === r.city_slug);
              const isPast = PAST.has(r.status);
              return (
                <li key={r.id}>
                  <div className="relative">
                    <Link
                    to="/request/$jobId"
                    params={{ jobId: r.id }}
                    search={{ tab: "details" }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">
                          {lang === "en" ? cat?.en : cat?.my}
                        </span>
                        <StatusPill status={r.status} lang={lang} />
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {lang === "en" ? city?.en : city?.my}
                        {r.area ? ` · ${r.area}` : ""}
                        <span className="mx-1">·</span>
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.invite_count} {L("providers", "ဦး")} · {r.quote_count} {L("quotes", "စျေး")}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    {isPast && (
                      <Link
                        to="/request/new"
                        search={{ cat: r.category_slug, sub: undefined, city: r.city_slug }}
                        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RotateCcw className="h-3 w-3" />
                        {L("Book again", "ပြန်ဘုတ်ကင်")}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

    </div>
  );
}

function StatusPill({ status, lang }: { status: string; lang: "en" | "my" }) {
  const map: Record<string, { en: string; my: string; cls: string }> = {
    open: { en: "Looking for providers", my: "ပညာရှင် ရှာနေ", cls: "bg-muted text-foreground/70" },
    quoted: { en: "Quotes coming", my: "စျေး စောင့်", cls: "bg-primary/10 text-primary" },
    accepted: { en: "Selected", my: "ရွေးပြီး", cls: "bg-primary text-primary-foreground" },
    on_the_way: { en: "On the way", my: "လမ်းပေါ်", cls: "bg-primary text-primary-foreground" },
    started: { en: "In progress", my: "လုပ်နေ", cls: "bg-primary text-primary-foreground" },
    in_progress: { en: "In progress", my: "လုပ်နေ", cls: "bg-primary text-primary-foreground" },
    completed: { en: "Completed", my: "ပြီးဆုံး", cls: "bg-emerald-500/15 text-emerald-700" },
    cancelled: { en: "Cancelled", my: "ပယ်ဖျက်", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? map.open;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {lang === "en" ? s.en : s.my}
    </span>
  );
}