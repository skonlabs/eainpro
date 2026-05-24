import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ChevronRight, MapPin, Plus, Inbox } from "lucide-react";
import { deriveBookingState, statusMeta } from "@/lib/booking-status";
import { LoadingState } from "@/components/site/LoadingState";

const TONE_CLASS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  active: "bg-primary/10 text-primary",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export const Route = createFileRoute("/my-requests")({
  component: MyRequestsPage,
  head: () => ({ meta: [{ title: "My Requests — Fixido" }] }),
});

function MyRequestsPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/signin", search: { redirect: "/my-requests" } });
  }, [authLoading, user, nav]);

  const { data: rows } = useQuery({
    queryKey: ["my-leads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: leads } = await supabase
        .from("customer_leads")
        .select("id, short_description, city_slug, address, status, created_at")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (!leads?.length) return [];
      const ids = leads.map((l) => l.id);
      const [{ data: qs }, { data: bks }] = await Promise.all([
        supabase.from("quotes").select("lead_id").in("lead_id", ids),
        supabase
          .from("bookings")
          .select("lead_id, status, scheduled_at, time_confirmed_by_customer, time_confirmed_by_provider")
          .in("lead_id", ids),
      ]);
      const counts = new Map<string, number>();
      (qs ?? []).forEach((r) => counts.set(r.lead_id, (counts.get(r.lead_id) ?? 0) + 1));
      const bookingMap = new Map<string, any>();
      (bks ?? []).forEach((b) => bookingMap.set(b.lead_id, b));
      return leads.map((l) => ({
        ...l,
        quote_count: counts.get(l.id) ?? 0,
        booking: bookingMap.get(l.id) ?? null,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{L("My Requests", "တောင်းဆို")}</h1>
          <Link to="/request/new" search={{}}><Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" />{L("New", "အသစ်")}</Button></Link>
        </div>
        {!rows && <LoadingState label={L("Loading requests…", "ခဏစောင့်ပါ…")} />}
        {rows && rows.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-bold">{L("No requests yet", "တောင်းဆိုမှု မရှိသေးပါ")}</h3>
            <Link to="/request/new" search={{}}><Button className="mt-4 rounded-xl">{L("Request a service", "တောင်းရန်")}</Button></Link>
          </div>
        )}
        {rows && rows.length > 0 && (
          <ul className="mt-6 grid gap-2 min-w-0">
            {rows.map((r) => {
              const state = deriveBookingState(r.booking, { status: r.status, quotes_count: r.quote_count });
              const meta = statusMeta(state);
              return (
              <li key={r.id} className="min-w-0">
                <Link to="/request/$leadId" params={{ leadId: r.id }} search={{ tab: "details" }} className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold">{r.short_description}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[meta.tone] ?? "bg-muted"}`}>
                        {L(meta.en, meta.my)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{r.city_slug}{r.address ? ` · ${r.address}` : ""}
                      <span className="mx-1">·</span>{new Date(r.created_at).toLocaleDateString()}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{r.quote_count} {L("quotes", "စျေး")}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
