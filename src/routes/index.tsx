import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/catalog";
import { listAvailableLeads } from "@/lib/leads";
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
  CalendarClock,
  MessageCircle,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Inbox,
  TrendingUp,
  MapPin,
  Calendar as CalendarIcon,
  BadgeCheck,
  Search,
  RotateCw,
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

function Index() {
  const { lang } = useI18n();
  const { user, roles, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (authLoading) return;
    if (!user) nav({ to: "/signin", search: { redirect: "/" } });
  }, [authLoading, user, nav]);

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

  if (isAdmin && !isProvider) return <AdminHome name={firstName} L={L} />;
  if (isProvider) return <ProviderHome userId={user.id} name={firstName} lang={lang} L={L} />;
  return <CustomerHome userId={user.id} name={firstName} lang={lang} L={L} />;
}

// ---------- Customer ----------

type CustomerReq = {
  id: string;
  category_slug: string;
  area: string | null;
  status: string;
  created_at: string;
  quotes_count: number;
};

type CustomerBooking = {
  id: string;
  lead_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  customer_confirmed_at: string | null;
  provider_confirmed_at: string | null;
  lead: { category_slug: string; address: string | null } | null;
};

function CustomerHome({
  userId,
  name,
  lang,
  L,
}: {
  userId: string;
  name: string;
  lang: "en" | "my";
  L: (en: string, my: string) => string;
}) {
  const [requests, setRequests] = useState<CustomerReq[] | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [needsReview, setNeedsReview] = useState<CustomerBooking[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [reqRes, bookRes] = await Promise.all([
        supabase
          .from("customer_leads")
          .select("id, address, status, created_at, service_type:service_types(category_slug), quotes(id)")
          .eq("customer_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("bookings")
          .select(
            "id, lead_id, status, scheduled_at, amount, customer_confirmed_at, provider_confirmed_at, lead:customer_leads(address, service_type:service_types(category_slug))",
          )
          .eq("customer_id", userId)
          .order("scheduled_at", { ascending: true, nullsFirst: false }),
      ]);

      const reqs = (reqRes.data ?? []).map(
        (r: { id: string; address: string | null; status: string; created_at: string; service_type: { category_slug: string } | { category_slug: string }[] | null; quotes: unknown[] }) => ({
          id: r.id,
          category_slug: Array.isArray(r.service_type)
            ? r.service_type[0]?.category_slug ?? ""
            : r.service_type?.category_slug ?? "",
          area: r.address,
          status: r.status,
          created_at: r.created_at,
          quotes_count: (r.quotes ?? []).length,
        }),
      );
      setRequests(reqs);
      const bks = (bookRes.data ?? []).map((b: any) => ({
        ...b,
        lead: b.lead
          ? {
              address: b.lead.address ?? null,
              category_slug: Array.isArray(b.lead.service_type)
                ? b.lead.service_type[0]?.category_slug ?? ""
                : b.lead.service_type?.category_slug ?? "",
            }
          : null,
      })) as CustomerBooking[];
      setBookings(bks);

      // Completed bookings without a review
      const completedIds = bks.filter((b) => b.status === "completed").map((b) => b.id);
      if (completedIds.length) {
        const { data: rv } = await supabase.from("reviews").select("booking_id").in("booking_id", completedIds);
        const reviewed = new Set((rv ?? []).map((r) => r.booking_id as string));
        setNeedsReview(bks.filter((b) => b.status === "completed" && !reviewed.has(b.id)));
      } else {
        setNeedsReview([]);
      }
    })();
  }, [userId]);

  // Derive action items
  const awaitingMyTime = (bookings ?? []).filter(
    (b) =>
      ["accepted", "on_the_way", "started", "in_progress"].includes(b.status) &&
      b.scheduled_at &&
      !b.customer_confirmed_at,
  );
  const newQuotes = (requests ?? []).filter((r) => r.status === "quoted" && r.quotes_count > 0);
  const upcoming = (bookings ?? [])
    .filter(
      (b) =>
        ["accepted", "on_the_way", "started", "in_progress"].includes(b.status) &&
        b.scheduled_at &&
        b.customer_confirmed_at &&
        b.provider_confirmed_at &&
        new Date(b.scheduled_at).getTime() >= Date.now() - 6 * 3600_000,
    )
    .slice(0, 3);

  const attentionCount = awaitingMyTime.length + newQuotes.length + needsReview.length;

  // Most-used categories (from this user's history), filtered by the search
  // query. Falls back to the first N catalog entries for new users.
  const usedSlugs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of requests ?? []) counts.set(r.category_slug, (counts.get(r.category_slug) ?? 0) + 1);
    for (const b of bookings ?? []) {
      const s = b.lead?.category_slug;
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [requests, bookings]);

  const filteredCats = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle) {
      return CATEGORIES.filter(
        (c) => c.en.toLowerCase().includes(needle) || c.my.includes(q.trim()) || c.slug.includes(needle),
      ).slice(0, 12);
    }
    const usedSet = new Set(usedSlugs);
    const used = usedSlugs
      .map((s) => CATEGORIES.find((c) => c.slug === s))
      .filter((c): c is typeof CATEGORIES[number] => !!c);
    const rest = CATEGORIES.filter((c) => !usedSet.has(c.slug));
    return [...used, ...rest].slice(0, 8);
  }, [q, usedSlugs]);

  // "Book again" — past completed bookings, deduped by category+provider.
  const bookAgain = useMemo(() => {
    const list = (bookings ?? []).filter((b) => b.status === "completed" && b.lead?.category_slug);
    const seen = new Set<string>();
    const out: CustomerBooking[] = [];
    for (const b of list) {
      const key = b.lead!.category_slug;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(b);
      if (out.length >= 3) break;
    }
    return out;
  }, [bookings]);

  return (
    <div className="space-y-5">
      <HeroCard
        eyebrow={L("Welcome back", "ပြန်လည် ကြိုဆို")}
        name={name}
        sub={L("What can we help with today?", "ဘာကို ကူညီပေးရမလဲ?")}
        ctaTo="/request/new"
        ctaSearch={{ category: "" }}
        ctaLabel={L("Book a service", "ဝန်ဆောင်မှု ဘွတ်ကင်")}
        ctaHint={L("3 quick steps to get matched", "အဆင့် ၃ ဆင့်ဖြင့် ပွဲစား")}
      />

      {/* Search + smart category chips — the fastest path to a job brief */}
      <section className="-mt-2 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L("What needs fixing? e.g. aircon, leak…", "ဘာဖြစ်နေသလဲ? ဥပမာ - အဲကွန်း, ပိုက်")}
            className="h-12 rounded-2xl border-border bg-card pl-10 pr-4 text-sm shadow-soft"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {filteredCats.map((c) => {
            const Icon = ICONS[c.icon] ?? Hammer;
            return (
              <Link
                key={c.slug}
                to="/request/new"
                search={{ cat: c.slug }}
                className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-center text-[11px] font-semibold leading-tight">
                  {lang === "en" ? c.en : c.my}
                </span>
              </Link>
            );
          })}
        </div>
        {filteredCats.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">
            {L("No services match — start a custom request anyway.", "မတွေ့ရှိ — ကိုယ်တိုင် ဖော်ပြ၍ တောင်းဆိုနိုင်သည်။")}
            <div className="mt-2">
              <Link to="/request/new" search={{}} className="text-xs font-semibold text-primary">
                {L("Start custom request →", "စတင် တောင်းဆို →")}
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Book again — instant rebook from past completed jobs */}
      {bookAgain.length > 0 && (
        <section>
          <SectionHeader title={L("Book again", "ပြန် မှာ")} />
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {bookAgain.map((b) => {
              const cat = CATEGORIES.find((c) => c.slug === b.lead?.category_slug);
              const Icon = ICONS[cat?.icon ?? "Hammer"] ?? Hammer;
              return (
                <Link
                  key={b.id}
                  to="/request/new"
                  search={{ cat: b.lead?.category_slug }}
                  className="flex w-44 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="truncate text-sm font-semibold">
                      {cat ? (lang === "en" ? cat.en : cat.my) : b.lead?.category_slug}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {b.lead?.address ?? L("Same as last time", "ယခင် နေရာ")}
                    </div>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <RotateCw className="h-3 w-3" />
                    {L("Book again", "ပြန် မှာ")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Needs your attention */}
      {attentionCount > 0 && (
        <section>
          <SectionHeader
            title={L("Needs your attention", "သင် လုပ်ဆောင်ရန်")}
            badge={attentionCount}
          />
          <ul className="space-y-2">
            {awaitingMyTime.map((b) => (
              <ActionRow
                key={`t-${b.id}`}
                to="/request/$leadId"
                params={{ leadId: b.lead_id }}
                search={{ tab: "booking" }}
                icon={<CalendarClock className="h-5 w-5" />}
                tone="amber"
                title={L("Confirm visit time", "လည်ပတ်ချိန် အတည်ပြုပါ")}
                sub={
                  b.scheduled_at
                    ? new Date(b.scheduled_at).toLocaleString(lang === "en" ? "en" : "my-MM")
                    : ""
                }
                cta={L("Review", "ကြည့်")}
              />
            ))}
            {newQuotes.map((r) => {
              const cat = CATEGORIES.find((c) => c.slug === r.category_slug);
              return (
                <ActionRow
                  key={`q-${r.id}`}
                  to="/request/$leadId"
                  params={{ leadId: r.id }}
                  search={{ tab: "quotes" }}
                  icon={<Inbox className="h-5 w-5" />}
                  tone="primary"
                  title={L(
                    `${r.quotes_count} new quote${r.quotes_count > 1 ? "s" : ""}`,
                    `စျေး ${r.quotes_count} ခု အသစ်`,
                  )}
                  sub={cat ? (lang === "en" ? cat.en : cat.my) : r.category_slug}
                  cta={L("Compare", "နှိုင်းယှဉ်")}
                />
              );
            })}
            {needsReview.map((b) => (
              <ActionRow
                key={`r-${b.id}`}
                to="/request/$leadId"
                params={{ leadId: b.lead_id }}
                search={{ tab: "booking" }}
                icon={<Star className="h-5 w-5" />}
                tone="emerald"
                title={L("Leave a review", "သုံးသပ်ချက် ပေး")}
                sub={L("Your provider would appreciate it", "ပညာရှင်အတွက် အသုံးဝင်ပါမည်")}
                cta={L("Rate", "အဆင့်ပေး")}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Upcoming visits */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeader title={L("Upcoming visits", "လာမည့် ဘွတ်ကင်")} />
          <ul className="space-y-2">
            {upcoming.map((b) => {
              const cat = CATEGORIES.find((c) => c.slug === b.lead?.category_slug);
              const Icon = ICONS[cat?.icon ?? "Hammer"] ?? Hammer;
              return (
                <li key={b.id}>
                  <Link
                    to="/request/$leadId"
                    params={{ leadId: b.lead_id }}
                    search={{ tab: "booking" }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {cat ? (lang === "en" ? cat.en : cat.my) : b.lead?.category_slug}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleString(lang === "en" ? "en" : "my-MM")
                          : "—"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

        {requests === null ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            {L("Loading…", "ခဏစောင့်ပါ…")}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <div className="text-sm font-semibold">{L("No requests yet", "တောင်းဆိုမှု မရှိသေးပါ")}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {L("Book your first service above.", "ပထမဆုံး ဝန်ဆောင်မှု ဘွတ်ကင်လုပ်ပါ။")}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {requests.slice(0, 4).map((r) => {
              const cat = CATEGORIES.find((c) => c.slug === r.category_slug);
              const Icon = ICONS[cat?.icon ?? "Hammer"] ?? Hammer;
              return (
                <li key={r.id}>
                  <Link
                    to="/request/$leadId"
                    params={{ leadId: r.id }}
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
                    <StatusPill status={r.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Provider ----------

type ProviderBooking = {
  id: string;
  lead_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  customer_confirmed_at: string | null;
  provider_confirmed_at: string | null;
  lead: { category_slug: string; city_slug: string; address: string | null } | null;
};

type ProviderProfile = {
  is_verified: boolean;
  rating_avg: number | null;
  rating_count: number | null;
  jobs_completed: number | null;
};

function ProviderHome({
  userId,
  name,
  lang,
  L,
}: {
  userId: string;
  name: string;
  lang: "en" | "my";
  L: (en: string, my: string) => string;
}) {
  const nav = useNavigate();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<ProviderBooking[] | null>(null);
  const [newJobsCount, setNewJobsCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: prov } = await supabase
        .from("providers")
        .select("is_verified, rating_avg, rating_count, jobs_completed")
        .eq("id", userId)
        .maybeSingle();
      if (!prov) {
        nav({ to: "/provider/onboarding" });
        return;
      }
      setProfile(prov as ProviderProfile);

      const [bkRes, svcRes, areaRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, lead_id, status, scheduled_at, amount, customer_confirmed_at, provider_confirmed_at, lead:customer_leads(city_slug, address, service_type:service_types(category_slug))",
          )
          .eq("provider_id", userId)
          .in("status", ["accepted", "on_the_way", "started", "in_progress"])
          .order("scheduled_at", { ascending: true, nullsFirst: false }),
        supabase.from("provider_services").select("category_slug").eq("provider_id", userId),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", userId),
      ]);
      setBookings(
        (bkRes.data ?? []).map((b: any) => ({
          ...b,
          lead: b.lead
            ? {
                city_slug: b.lead.city_slug,
                address: b.lead.address ?? null,
                category_slug: Array.isArray(b.lead.service_type)
                  ? b.lead.service_type[0]?.category_slug ?? ""
                  : b.lead.service_type?.category_slug ?? "",
              }
            : null,
        })) as ProviderBooking[],
      );

      const cats = (svcRes.data ?? []).map((r) => r.category_slug);
      const cities = (areaRes.data ?? []).map((r) => r.city_slug);
      if (cats.length && cities.length) {
        // Use the same source as the Leads page so the count always matches
        // what the provider will actually see when they tap through.
        try {
          const leads = await listAvailableLeads(userId);
          setNewJobsCount(leads.length);
        } catch {
          setNewJobsCount(0);
        }
      } else {
        setNewJobsCount(0);
      }
    })();
  }, [userId, nav]);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return (bookings ?? []).filter((b) => {
      if (!b.scheduled_at) return false;
      const t = new Date(b.scheduled_at).getTime();
      const confirmed = b.customer_confirmed_at && b.provider_confirmed_at;
      return confirmed && t >= start.getTime() && t < end.getTime();
    });
  }, [bookings]);

  const awaitingMyTime = (bookings ?? []).filter(
    (b) => b.scheduled_at && !b.provider_confirmed_at,
  );

  const activeCount = bookings?.length ?? 0;
  const attentionCount = awaitingMyTime.length;

  return (
    <div className="space-y-5">
      <Greeting
        name={name}
        sub={
          profile?.is_verified === false
            ? L("Profile pending verification.", "ပရိုဖိုင် အတည်ပြုစဉ်")
            : L("Manage your jobs.", "သင်၏ အလုပ်များကို စီမံပါ။")
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={<Briefcase className="h-4 w-4" />}
          label={L("Active", "ဆောင်ရွက်ဆဲ")}
          value={String(activeCount)}
          to="/provider/calendar"
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label={L("New jobs", "အသစ်")}
          value={String(newJobsCount)}
          to="/provider/leads"
        />
        <StatTile
          icon={<Star className="h-4 w-4" />}
          label={L("Rating", "အဆင့်")}
          value={profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : "—"}
          sub={profile?.rating_count ? `(${profile.rating_count})` : undefined}
        />
      </div>

      {profile && !profile.is_verified && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {L(
              "Your profile is awaiting admin verification. You can still quote on jobs.",
              "Admin အတည်ပြုနေပါသည်။ စျေးနှုန်း ဆက်ပေးနိုင်ပါသည်။",
            )}
          </span>
        </div>
      )}

      {/* Today */}
      <section>
        <SectionHeader
          title={L("Today's visits", "ဒီနေ့ ဘွတ်ကင်")}
          link={{ to: "/provider/calendar", label: L("Calendar", "ပြက္ခဒိန်") }}
        />
        {bookings === null ? (
          <Loading L={L} />
        ) : today.length === 0 ? (
          <Empty
            icon={<CalendarIcon className="h-5 w-5" />}
            title={L("Nothing scheduled today", "ဒီနေ့ အလုပ်မရှိပါ")}
            sub={L("Check new opportunities below.", "အောက်တွင် အလုပ်အသစ်များ ကြည့်ပါ")}
          />
        ) : (
          <ul className="space-y-2">
            {today.map((b) => {
              const cat = CATEGORIES.find((c) => c.slug === b.lead?.category_slug);
              const Icon = ICONS[cat?.icon ?? "Hammer"] ?? Hammer;
              return (
                <li key={b.id}>
                  <Link
                    to="/request/$leadId"
                    params={{ leadId: b.lead_id }}
                    search={{ tab: "booking" }}
                    className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 transition hover:border-primary"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleTimeString(
                              lang === "en" ? "en-US" : "my-MM",
                              { hour: "numeric", minute: "2-digit" },
                            )
                          : "—"}
                        <span className="text-muted-foreground">·</span>
                        <span className="truncate">
                          {cat ? (lang === "en" ? cat.en : cat.my) : b.lead?.category_slug}
                        </span>
                      </div>
                      {b.lead?.address && (
                        <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {b.lead.address}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Needs your attention */}
      {attentionCount > 0 && (
        <section>
          <SectionHeader
            title={L("Needs your attention", "သင် လုပ်ဆောင်ရန်")}
            badge={attentionCount}
          />
          <ul className="space-y-2">
            {awaitingMyTime.map((b) => (
              <ActionRow
                key={`t-${b.id}`}
                to="/request/$leadId"
                params={{ leadId: b.lead_id }}
                search={{ tab: "booking" }}
                icon={<CalendarClock className="h-5 w-5" />}
                tone="amber"
                title={L("Confirm visit time", "လည်ပတ်ချိန် အတည်ပြုပါ")}
                sub={
                  b.scheduled_at
                    ? new Date(b.scheduled_at).toLocaleString(lang === "en" ? "en" : "my-MM")
                    : ""
                }
                cta={L("Review", "ကြည့်")}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-2">
        <QuickAction
          to="/provider/dashboard"
          icon={<Briefcase className="h-5 w-5" />}
          title={L("Browse jobs", "အလုပ် ရှာ")}
          sub={L("Find new work", "အလုပ်အသစ်")}
        />
        <QuickAction
          to="/messages"
          icon={<MessageCircle className="h-5 w-5" />}
          title={L("Messages", "မက်ဆေ့")}
          sub={L("Customer chats", "ဖောက်သည် စကား")}
        />
        <QuickAction
          to="/provider/calendar"
          icon={<CalendarIcon className="h-5 w-5" />}
          title={L("Calendar", "ပြက္ခဒိန်")}
          sub={L("Schedule", "အချိန်ဇယား")}
        />
        <QuickAction
          to="/provider/onboarding"
          icon={<BadgeCheck className="h-5 w-5" />}
          title={L("Edit profile", "ပရိုဖိုင် ပြင်")}
          sub={L("Services & areas", "ဝန်ဆောင်မှု၊ နေရာ")}
        />
      </section>
    </div>
  );
}

// ---------- Admin ----------

function AdminHome({ name, L }: { name: string; L: (en: string, my: string) => string }) {
  return (
    <div className="space-y-4">
      <Greeting name={name} sub={L("Admin overview.", "Admin ခြုံငုံကြည့်ရှုမှု")} />
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

// ---------- Shared atoms ----------

function Greeting({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg shadow-primary/20" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">Hi</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">{sub}</p>
      </div>
    </div>
  );
}

function HeroCard({
  eyebrow,
  name,
  sub,
  ctaTo,
  ctaSearch,
  ctaLabel,
  ctaHint,
}: {
  eyebrow: string;
  name: string;
  sub: string;
  ctaTo: string;
  ctaSearch?: Record<string, string>;
  ctaLabel: string;
  ctaHint: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-xl shadow-primary/25"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[color:var(--accent)]/30 blur-3xl" />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 max-w-sm text-sm text-primary-foreground/85">{sub}</p>
        <Link
          to={ctaTo as "/"}
          search={ctaSearch as Record<string, never>}
          className="mt-4 flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 text-foreground shadow-md transition active:scale-[0.99]"
        >
          <div>
            <div className="text-sm font-bold tracking-tight">{ctaLabel}</div>
            <div className="text-[11px] text-muted-foreground">{ctaHint}</div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/40">
            <Plus className="h-5 w-5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  badge,
  link,
}: {
  title: string;
  badge?: number;
  link?: { to: string; label: string };
}) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
        {title}
        {badge !== undefined && badge > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </h2>
      {link && (
        <Link to={link.to} className="text-xs font-semibold text-primary">
          {link.label}
        </Link>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  to?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <div className="text-xl font-extrabold tracking-tight">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

function ActionRow({
  to,
  params,
  search,
  icon,
  tone,
  title,
  sub,
  cta,
}: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  icon: React.ReactNode;
  tone: "amber" | "primary" | "emerald";
  title: string;
  sub: string;
  cta: string;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-500/40 bg-amber-500/5"
      : tone === "emerald"
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-primary/40 bg-primary/5";
  const iconClasses =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-700"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-700"
        : "bg-primary/15 text-primary";
  return (
    <li>
      <Link
        to={to}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params={params as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search={search as any}
        className={`flex items-center gap-3 rounded-2xl border p-3 transition hover:border-foreground/30 ${toneClasses}`}
      >
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconClasses}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
          {cta}
        </span>
      </Link>
    </li>
  );
}

function QuickAction({
  to,
  icon,
  title,
  sub,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const tint: Record<string, string> = {
    open: "bg-amber-500/15 text-amber-700",
    quoted: "bg-sky-500/15 text-sky-700",
    accepted: "bg-emerald-500/15 text-emerald-700",
    in_progress: "bg-violet-500/15 text-violet-700",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tint[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function Loading({ L }: { L: (en: string, my: string) => string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
      {L("Loading…", "ခဏစောင့်ပါ…")}
    </div>
  );
}

function Empty({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

// Suppress unused
void Sparkles;
void CheckCircle2;
