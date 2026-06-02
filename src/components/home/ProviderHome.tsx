import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/hooks/useNotifications";
import { translateNotificationTitle, translateNotificationBody } from "@/lib/notification-i18n";
import { CATEGORIES } from "@/lib/catalog";
import { listAvailableLeads } from "@/lib/leads";
import {
  ChevronRight,
  Hammer,
  Briefcase,
  CalendarClock,
  MessageCircle,
  Star,
  Clock,
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar as CalendarIcon,
  BadgeCheck,
  Bell,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  Greeting,
  SectionHeader,
  StatTile,
  ActionRow,
  QuickAction,
  ICONS,
  Loading,
  Empty,
  type Lang,
  type Lfn,
} from "./atoms";

type ProviderBooking = {
  id: string;
  lead_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  customer_confirmed_at: string | null;
  provider_confirmed_at: string | null;
  time_confirmed_by_customer: boolean | null;
  time_confirmed_by_provider: boolean | null;
  lead: { category_slug: string; city_slug: string; address: string | null } | null;
};

type ProviderProfile = {
  is_verified: boolean;
  rating_avg: number | null;
  rating_count: number | null;
  jobs_completed: number | null;
};

export function ProviderHome({
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
  const nav = useNavigate();
  const { items: activity } = useNotifications(userId, 8);
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
            "id, lead_id, status, scheduled_at, amount, customer_confirmed_at, provider_confirmed_at, time_confirmed_by_customer, time_confirmed_by_provider, lead:customer_leads(city_slug, address, service_type:service_types(category_slug))",
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
      const confirmed = b.time_confirmed_by_customer && b.time_confirmed_by_provider;
      return confirmed && t >= start.getTime() && t < end.getTime();
    });
  }, [bookings]);

  const awaitingMyTime = (bookings ?? []).filter(
    (b) => b.scheduled_at && !b.time_confirmed_by_provider,
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

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={<Briefcase className="h-4 w-4" />}
          label={L("Active jobs", "ဆောင်ရွက်ဆဲ")}
          value={String(activeCount)}
          to="/provider/calendar"
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label={L("New leads", "Lead များ")}
          value={String(newJobsCount)}
          to="/provider/leads"
        />
        <StatTile
          icon={<Star className="h-4 w-4" />}
          label={L("My rating", "ကျွန်ုပ် အဆင့်")}
          value={profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : "—"}
          sub={profile?.rating_count ? `(${profile.rating_count})` : undefined}
          to="/provider/reviews"
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

      <section>
        <SectionHeader title={L("Recent activity", "လတ်တလော လှုပ်ရှားမှု")} />
        {activity.length === 0 ? (
          <Empty
            icon={<Bell className="h-5 w-5" />}
            title={L("No notifications yet", "အသိပေးချက် မရှိသေးပါ")}
            sub={L("New leads and customer updates will appear here.", "Lead အသစ်များနှင့် customer update များ ဒီမှာ ပေါ်မည်။")}
          />
        ) : (
          <ul className="space-y-2">
            {activity.map((n) => {
              const icon =
                n.kind === "new_matching_lead" ? <Briefcase className="h-4 w-4" /> :
                n.kind === "quote_accepted" ? <Trophy className="h-4 w-4" /> :
                n.kind === "lead_lost" || n.kind === "booking_cancelled" ? <XCircle className="h-4 w-4" /> :
                <Bell className="h-4 w-4" />;
              return (
                <li key={n.id}>
                  <Link
                    to={(n.link || "/provider/leads") as never}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
                  >
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{translateNotificationTitle(n.title, lang)}</div>
                      {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{translateNotificationBody(n.body, lang)}</div>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <QuickAction
          to="/provider/leads"
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