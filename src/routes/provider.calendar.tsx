import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, X as XIcon, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/provider/calendar")({ component: CalendarPage });

type Row = {
  id: string;
  lead_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number | null;
  lead: { short_description: string; city_slug: string; address: string | null } | null;
};

type Blackout = { id: string; date: string; reason: string | null };

function CalendarPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [savingBlackout, setSavingBlackout] = useState(false);
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
      const { data: bl } = await supabase
        .from("provider_unavailable_dates")
        .select("id, date, reason")
        .eq("provider_id", user.id)
        .order("date", { ascending: true });
      setBlackouts((bl ?? []) as Blackout[]);
    })();
  }, [user?.id, loading, nav]);

  const addBlackout = async () => {
    if (!user || !newDate) return;
    setSavingBlackout(true);
    const { data, error } = await supabase
      .from("provider_unavailable_dates")
      .insert({ provider_id: user.id, date: newDate, reason: newReason.trim() || null })
      .select("id, date, reason")
      .maybeSingle();
    setSavingBlackout(false);
    if (error) return toast.error(error.message);
    if (data) setBlackouts((p) => [...p, data as Blackout].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate(""); setNewReason("");
  };
  const removeBlackout = async (id: string) => {
    const prev = blackouts;
    setBlackouts((p) => p.filter((b) => b.id !== id));
    const { error } = await supabase.from("provider_unavailable_dates").delete().eq("id", id);
    if (error) { setBlackouts(prev); toast.error(error.message); }
  };

  if (loading || rows === null) return <div className="px-1 py-6"><h1 className="text-2xl font-bold">{L("My Calendar", "ပြက္ခဒိန်")}</h1></div>;

  return (
    <div className="px-1 py-4 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold tracking-tight">{L("My Calendar", "ပြက္ခဒိန်")}</h1>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{L("Block off dates", "မအားသော ရက်များ")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {L("Mark days you can't take jobs. Customers can still message you.", "လုပ်ငန်း မလက်ခံနိုင်တဲ့ ရက်များကို ပိတ်ထားပါ။")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input type="date" className="w-40" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Input placeholder={L("Reason (optional)", "အကြောင်းပြချက် (ရွေး)")} value={newReason} onChange={(e) => setNewReason(e.target.value)} className="flex-1 min-w-[160px]" />
          <Button size="sm" onClick={addBlackout} disabled={!newDate || savingBlackout}>
            <Plus className="mr-1 h-3.5 w-3.5" />{L("Add", "ထည့်")}
          </Button>
        </div>
        {blackouts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {blackouts.map((b) => (
              <li key={b.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs">
                <span className="font-medium">{b.date}</span>
                {b.reason && <span className="text-muted-foreground">· {b.reason}</span>}
                <button onClick={() => removeBlackout(b.id)} className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={L("Remove", "ဖျက်")}>
                  <XIcon className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
