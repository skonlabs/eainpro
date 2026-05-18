import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/catalog";

export const Route = createFileRoute("/provider/calendar")({
  component: CalendarPage,
});

type Row = {
  id: string;
  job_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  time_confirmed_by_customer?: boolean | null;
  time_confirmed_by_provider?: boolean | null;
  job: {
    id: string;
    category_slug: string;
    city_slug: string;
    address: string | null;
    description: string | null;
  } | null;
};

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function fmtDayHeader(d: Date, lang: "en" | "my") {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return lang === "en" ? "Today" : "ဒီနေ့";
  if (diff === 1) return lang === "en" ? "Tomorrow" : "မနက်ဖြန်";
  return d.toLocaleDateString(lang === "en" ? "en-US" : "my-MM", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function CalendarPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/provider/calendar" } as never });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, job_id, status, scheduled_at, amount, time_confirmed_by_customer, time_confirmed_by_provider, job:job_requests(id, category_slug, city_slug, address, description)",
        )
        .eq("provider_id", user.id)
        .in("status", ["accepted", "on_the_way", "started", "in_progress", "completed"])
        .order("scheduled_at", { ascending: true });
      setRows((data ?? []) as unknown as Row[]);
    })();
  }, [user?.id, loading, nav]);

  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const { upcoming, past, unscheduled, pending } = useMemo(() => {
    const u: Row[] = [];
    const p: Row[] = [];
    const n: Row[] = [];
    const pend: Row[] = [];
    const now = Date.now();
    for (const r of rows ?? []) {
      const confirmed = !!r.time_confirmed_by_customer && !!r.time_confirmed_by_provider;
      if (!r.scheduled_at) n.push(r);
      else if (!confirmed && r.status !== "completed") pend.push(r);
      else if (new Date(r.scheduled_at).getTime() >= now - 6 * 3600_000) u.push(r);
      else p.push(r);
    }
    p.reverse();
    return { upcoming: u, past: p, unscheduled: n, pending: pend };
  }, [rows]);

  // Group upcoming bookings by day
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of upcoming) {
      const d = new Date(r.scheduled_at as string);
      const key = startOfDay(d).toISOString();
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ date: new Date(key), items }));
  }, [upcoming]);

  if (loading || rows === null) {
    return (
      <div className="px-1 py-6">
        <h1 className="text-2xl font-bold tracking-tight">{L("My Calendar", "ပြက္ခဒိန်")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{L("Loading…", "တင်နေသည်…")}</p>
      </div>
    );
  }

  const renderRow = (r: Row) => {
    const cat = CATEGORIES.find((c) => c.slug === r.job?.category_slug);
    const city = CITIES.find((c) => c.slug === r.job?.city_slug);
    const time = r.scheduled_at
      ? new Date(r.scheduled_at).toLocaleTimeString(lang === "en" ? "en-US" : "my-MM", {
          hour: "numeric",
          minute: "2-digit",
        })
      : L("No time set", "အချိန် မသတ်မှတ်ရသေး");
    return (
      <Link
        key={r.id}
        to="/request/$jobId"
        params={{ jobId: r.job_id }}
        search={{ tab: "booking" } as never}
        className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{time}</span>
          </div>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {r.status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="mt-2 text-sm font-semibold">
          {cat ? (lang === "en" ? cat.en : cat.my) : r.job?.category_slug}
        </div>
        {r.job?.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.job.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {[r.job?.address, city ? (lang === "en" ? city.en : city.my) : null].filter(Boolean).join(", ")}
          </span>
          {r.amount != null && (
            <span className="ml-auto shrink-0 font-semibold text-foreground">
              {Number(r.amount).toLocaleString()} MMK
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="px-1 py-4 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold tracking-tight">{L("My Calendar", "ပြက္ခဒိန်")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {L("Your upcoming visits and bookings.", "သင်၏ လာမည့် ဘွတ်ကင်များ။")}
      </p>

      {rows.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">{L("No bookings yet", "ဘွတ်ကင် မရှိသေးပါ")}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {L(
              "Accepted jobs from customers will show up here.",
              "လက်ခံပြီးသော အလုပ်များ ဤနေရာတွင် ပြပါမည်။",
            )}
          </p>
        </div>
      )}

      {grouped.length > 0 && (
        <section className="mt-4 space-y-4">
          {grouped.map((g) => (
            <div key={g.date.toISOString()}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {fmtDayHeader(g.date, lang)}
              </h2>
              <div className="space-y-2">{g.items.map(renderRow)}</div>
            </div>
          ))}
        </section>
      )}

      {unscheduled.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {L("Awaiting scheduling", "အချိန် မသတ်မှတ်ရသေး")}
          </h2>
          <div className="space-y-2">{unscheduled.map(renderRow)}</div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">
            {L("Pending confirmation", "အတည်ပြုရန် စောင့်ဆိုင်း")}
          </h2>
          <div className="space-y-2">{pending.map(renderRow)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {L("Past", "ပြီးခဲ့သော")}
          </h2>
          <div className="space-y-2">{past.slice(0, 20).map(renderRow)}</div>
        </section>
      )}
    </div>
  );
}
