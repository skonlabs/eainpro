import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/provider/calendar")({ component: CalendarPage });

type Row = {
  id: string;
  lead_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  lead: { short_description: string; city_slug: string; address: string | null } | null;
};

function CalendarPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/signin", search: { redirect: "/provider/calendar" } }); return; }
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, lead_id, status, scheduled_at, amount, lead:customer_leads(short_description, city_slug, address)")
        .eq("provider_id", user.id)
        .order("scheduled_at", { ascending: true });
      setRows((data ?? []) as unknown as Row[]);
    })();
  }, [user?.id, loading, nav]);

  if (loading || rows === null) return <div className="px-1 py-6"><h1 className="text-2xl font-bold">{L("My Calendar", "ပြက္ခဒိန်")}</h1></div>;

  return (
    <div className="px-1 py-4 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold tracking-tight">{L("My Calendar", "ပြက္ခဒိန်")}</h1>
      {rows.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">{L("No bookings yet", "မရှိ")}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to="/request/$leadId" params={{ leadId: r.lead_id }} search={{ tab: "booking" }} className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : L("No time set", "မသတ်မှတ်")}</span>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{r.status.replace(/_/g, " ")}</span>
                </div>
                {r.lead && <div className="mt-1 text-sm">{r.lead.short_description}</div>}
                {r.lead?.address && <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />{r.lead.address}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
