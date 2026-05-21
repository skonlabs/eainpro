import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CalendarCheck, Inbox, TrendingUp, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/provider/dashboard")({ component: DashboardPage });

type Booking = { id: string; lead_id: string; status: string; scheduled_at: string | null; amount: number | null; lead: { short_description: string; city_slug: string; address: string | null } | null };

type EarningsRow = { id: string; amount: number | null; provider_confirmed_at: string | null; scheduled_at: string | null; status: string };

function DashboardPage() {
  const { lang } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [earnings, setEarnings] = useState<EarningsRow[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/signin", search: { redirect: "/provider/dashboard" } }); return; }
    (async () => {
      const { data: prov } = await supabase.from("providers").select("id").eq("id", user.id).maybeSingle();
      if (!prov) { nav({ to: "/provider/onboarding" }); return; }
      const { data } = await supabase
        .from("bookings")
        .select("id, lead_id, status, scheduled_at, amount, lead:customer_leads(short_description, city_slug, address)")
        .eq("provider_id", user.id)
        .in("status", ["accepted", "on_the_way", "started", "in_progress"])
        .order("scheduled_at", { ascending: true });
      setBookings((data ?? []) as unknown as Booking[]);
      const { data: done } = await supabase
        .from("bookings")
        .select("id, amount, provider_confirmed_at, scheduled_at, status")
        .eq("provider_id", user.id)
        .eq("status", "completed")
        .order("provider_confirmed_at", { ascending: false })
        .limit(500);
      setEarnings((done ?? []) as EarningsRow[]);
    })();
  }, [loading, user, nav]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const totalEarned = earnings.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const monthEarned = earnings
    .filter((r) => {
      const t = r.provider_confirmed_at ?? r.scheduled_at;
      return t && new Date(t).getTime() >= monthStart;
    })
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
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
          <p className="mt-6 text-sm text-muted-foreground">{L("Loading…", "…")}</p>
        ) : bookings.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{L("No active jobs. Unlock leads to start.", "မရှိ။ Lead ဖွင့်ပါ")}</p>
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
      </main>
    </div>
  );
}
