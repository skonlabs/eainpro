import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/catalog";
import {
  ChevronRight,
  Hammer,
  Search,
  CalendarClock,
  Inbox,
  Star,
  Clock,
  RotateCw,
} from "lucide-react";
import {
  HeroCard,
  SectionHeader,
  ActionRow,
  StatusPill,
  ICONS,
  type Lang,
  type Lfn,
} from "./atoms";

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

export function CustomerHome({
  userId,
  name,
  lang,
  L,
}: {
  userId: string;
  name: string;
  lang: Lang;
  L: Lfn;
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
          <InlineLoading label={L("Loading…", "ခဏစောင့်ပါ…")} />
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