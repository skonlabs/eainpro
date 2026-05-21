import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CalendarCheck, Inbox, TrendingUp, CheckCircle2, Star } from "lucide-react";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/provider/dashboard")({ component: DashboardPage });

type Booking = { id: string; lead_id: string; status: string; scheduled_at: string | null; amount: number | null; lead: { short_description: string; city_slug: string; address: string | null } | null };

type EarningsRow = { id: string; amount: number | null; provider_confirmed_at: string | null; scheduled_at: string | null; status: string };

type ReviewRow = { id: string; rating: number; comment: string | null; created_at: string };

function DashboardPage() {
  const { lang } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/signin", search: { redirect: "/provider/dashboard" } });
    }
  }, [loading, user, nav]);

  const { data } = useQuery({
    queryKey: ["provider-dashboard", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const uid = user!.id;
      const { data: prov } = await supabase
        .from("providers").select("id, rating_avg").eq("id", uid).maybeSingle();
      if (!prov) {
        nav({ to: "/provider/onboarding" });
        return { missing: true as const };
      }
      const [{ data: bks }, { data: done }, { data: rvs }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, lead_id, status, scheduled_at, amount, lead:customer_leads(short_description, city_slug, address)")
          .eq("provider_id", uid)
          .in("status", ["accepted", "on_the_way", "started", "in_progress"])
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("bookings")
          .select("id, amount, provider_confirmed_at, scheduled_at, status")
          .eq("provider_id", uid)
          .eq("status", "completed")
          .order("provider_confirmed_at", { ascending: false })
          .limit(500),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("provider_id", uid)
          .eq("rated_by", "customer")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        missing: false as const,
        bookings: (bks ?? []) as unknown as Booking[],
        earnings: (done ?? []) as EarningsRow[],
        reviews: (rvs ?? []) as ReviewRow[],
        ratingAvg: prov.rating_avg ?? null,
      };
    },
  });

  const bookings = data && !data.missing ? data.bookings : null;
  const earnings = data && !data.missing ? data.earnings : [];
  const reviews = data && !data.missing ? data.reviews : [];
  const ratingAvg = data && !data.missing ? data.ratingAvg : null;

  const { totalEarned, monthEarned } = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    let total = 0, month = 0;
    for (const r of earnings) {
      const amt = Number(r.amount) || 0;
      total += amt;
      const t = r.provider_confirmed_at ?? r.scheduled_at;
      if (t && new Date(t).getTime() >= monthStart) month += amt;
    }
    return { totalEarned: total, monthEarned: month };
  }, [earnings]);
  const fmtMmk = (n: number) => `${Math.round(n).toLocaleString()} MMK`;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight">{L("Active jobs", "ဆောင်ရွက်ဆဲ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{L("Bookings from accepted quotes.", "လက်ခံပြီးသော ဘုတ်ကင်")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground"><TrendingUp className="h-3 w-3" />{L("This month", "ဤလ")}</div>
            <div className="mt-1 text-base font-bold tabular-nums">{fmtMmk(monthEarned)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground"><CheckCircle2 className="h-3 w-3" />{L("All time", "စုစုပေါင်း")}</div>
            <div className="mt-1 text-base font-bold tabular-nums">{fmtMmk(totalEarned)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Completed", "ပြီးစီး")}</div>
            <div className="mt-1 text-base font-bold tabular-nums">{earnings.length}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link to="/provider/leads"><Button variant="outline" size="sm"><Inbox className="mr-1.5 h-4 w-4" />{L("Browse new leads", "Lead အသစ်")}</Button></Link>
          <Link to="/provider/calendar"><Button variant="outline" size="sm"><CalendarCheck className="mr-1.5 h-4 w-4" />{L("Calendar", "ပြက္ခဒိန်")}</Button></Link>
        </div>
        {bookings === null ? (
          <LoadingState label={L("Loading…", "ခဏစောင့်ပါ…")} className="mt-6 min-h-[20vh]" />
        ) : bookings.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{L("No active jobs. Unlock leads to start.", "လက်ရှိ အလုပ် မရှိသေးပါ။ Lead များကို ဖွင့်၍ စတင်ပါ။")}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {bookings.map((b) => (
              <li key={b.id} className="rounded-xl border border-border bg-card p-4">
                <Link to="/request/$leadId" params={{ leadId: b.lead_id }} search={{ tab: "booking" }} className="block">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{b.lead?.short_description ?? L("Booking", "ဘုတ်ကင်")}</div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{b.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : L("TBD", "မသတ်မှတ်")}</span>
                    {b.lead && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{b.lead.city_slug}</span>}
                    {b.amount && <span className="ml-auto font-semibold text-foreground">{Number(b.amount).toLocaleString()} MMK</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{L("Customer reviews", "သုံးသပ်ချက်များ")}</h2>
            {ratingAvg != null && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {ratingAvg.toFixed(1)}
              </span>
            )}
          </div>
          {reviews.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {L("No reviews yet.", "သုံးသပ်ချက် မရှိသေး။")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
