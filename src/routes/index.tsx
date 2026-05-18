import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/catalog";
import {
  Plus,
  ChevronRight,
  Sparkles,
  Wrench,
  Plug,
  Snowflake,
  PaintBucket,
  Truck,
  Bug,
  Hammer,
  Sofa,
  Refrigerator,
  Droplets,
  Zap,
  Camera,
  Wifi,
  Lock,
  Trees,
  Shirt,
  Briefcase,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Home — Eain Pro" },
      { name: "description", content: "Your Eain Pro home." },
    ],
  }),
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Wrench, Plug, Snowflake, PaintBucket, Truck, Bug, Hammer, Sofa,
  Refrigerator, Droplets, Zap, Camera, Wifi, Lock, Trees, Shirt,
  Saw: Hammer, Brick: Hammer,
};

type ReqRow = {
  id: string;
  category_slug: string;
  area: string | null;
  status: string;
  created_at: string;
};

const STATUS_TINT: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  matched: "bg-sky-100 text-sky-700",
  booked: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function Index() {
  const { lang } = useI18n();
  const { user, roles, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<ReqRow[] | null>(null);

  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");

  // Unauthenticated → sign in
  useEffect(() => {
    if (authLoading) return;
    if (!user) nav({ to: "/signin", search: { redirect: "/" } });
  }, [authLoading, user, nav]);

  // Load active requests for customers
  useEffect(() => {
    if (!user || isProvider || isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("job_requests")
        .select("id, category_slug, area, status, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      setRows((data ?? []) as ReqRow[]);
    })();
  }, [user, isProvider, isAdmin]);

  if (authLoading || !user) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        {L("Loading…", "ခဏစောင့်ပါ…")}
      </div>
    );
  }

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    L("there", "မိတ်ဆွေ");

  // Provider home
  if (isProvider) {
    return (
      <div className="space-y-4">
        <Greeting name={firstName} sub={L("Manage your jobs.", "သင်၏ အလုပ်များကို စီမံပါ။")} />
        <Link
          to="/provider/dashboard"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold">{L("Open jobs", "ပွင့်နေသော အလုပ်များ")}</div>
              <div className="text-xs text-muted-foreground">
                {L("View invitations & send quotes", "ဖိတ်ကြားမှုများ ကြည့်ရန်")}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>
    );
  }

  // Admin home
  if (isAdmin) {
    return (
      <div className="space-y-4">
        <Greeting name={firstName} sub={L("Admin overview.", "Admin ခြုံငုံကြည့်ရှုမှု")} />
        <Link
          to="/admin"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold">{L("Open admin", "Admin ဖွင့်ရန်")}</div>
              <div className="text-xs text-muted-foreground">
                {L("Users, jobs, settings", "အသုံးပြုသူ၊ အလုပ်၊ ဆက်တင်")}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>
    );
  }

  // Customer home
  const popular = CATEGORIES.slice(0, 8);

  return (
    <div className="space-y-5">
      <Greeting name={firstName} sub={L("What can we help with today?", "ဘာကို ကူညီပေးရမလဲ?")} />

      {/* Primary CTA */}
      <Link to="/request/new" search={{ category: "" }} className="block">
        <div className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.99]">
          <div>
            <div className="text-base font-bold">{L("Book a service", "ဝန်ဆောင်မှု ဘွတ်ကင်လုပ်ရန်")}</div>
            <div className="text-xs text-primary-foreground/80">
              {L("3 quick steps to get matched", "အဆင့် ၃ ဆင့်ဖြင့် ပွဲစား")}
            </div>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15">
            <Plus className="h-5 w-5" />
          </span>
        </div>
      </Link>

      {/* Active requests */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold tracking-tight">
            {L("Active requests", "လက်ရှိ တောင်းဆိုမှုများ")}
          </h2>
          <Link to="/my-requests" className="text-xs font-semibold text-primary">
            {L("See all", "အားလုံး")}
          </Link>
        </div>

        {rows === null ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            {L("Loading…", "ခဏစောင့်ပါ…")}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <div className="text-sm font-semibold">{L("No requests yet", "တောင်းဆိုမှု မရှိသေးပါ")}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {L("Book your first service above.", "ပထမဆုံး ဝန်ဆောင်မှု ဘွတ်ကင်လုပ်ပါ။")}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const cat = CATEGORIES.find((c) => c.slug === r.category_slug);
              const Icon = ICONS[cat?.icon ?? "Hammer"] ?? Hammer;
              return (
                <li key={r.id}>
                  <Link
                    to="/request/$jobId"
                    params={{ jobId: r.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {cat ? (lang === "en" ? cat.en : cat.my) : r.category_slug}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.area ?? L("Any area", "နေရာအားလုံး")}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TINT[r.status] ?? "bg-muted text-muted-foreground"}`}>
                      {r.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Browse categories */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold tracking-tight">
            {L("Browse services", "ဝန်ဆောင်မှု ရှာရန်")}
          </h2>
          <Link to="/services" className="text-xs font-semibold text-primary">
            {L("All", "အားလုံး")}
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {popular.map((c) => {
            const Icon = ICONS[c.icon] ?? Hammer;
            return (
              <Link
                key={c.slug}
                to="/services/$category"
                params={{ category: c.slug }}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-center text-[11px] font-semibold leading-tight">
                  {lang === "en" ? c.en : c.my}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Greeting({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="px-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Hi
      </div>
      <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{name}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
