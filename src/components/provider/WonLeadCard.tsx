import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Phone, MessageCircle, Calendar, MapPin, CheckCircle2, Truck, Play, Clock, ChevronRight } from "lucide-react";
import type { Booking } from "@/components/request/types";
import { useI18n } from "@/lib/i18n";
import { bookingStatusPair } from "@/lib/status-i18n";
import { CITIES, TOWNSHIPS } from "@/lib/catalog";

const ADVANCE: Record<string, { key: string; label: string; icon: any }> = {
  accepted: { key: "on_the_way", label: "I'm on the way", icon: Truck },
  on_the_way: { key: "started", label: "Start work", icon: Play },
  started: { key: "completed", label: "Mark completed", icon: CheckCircle2 },
  in_progress: { key: "completed", label: "Mark completed", icon: CheckCircle2 },
};

export function WonLeadCard({ unlock, userId, onChange }: { unlock: any; userId: string; onChange: () => void }) {
  const { lang } = useI18n();
  const l = unlock.customer_leads;
  const leadId: string = unlock.lead_id;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [when, setWhen] = useState("");

  const loadBooking = async () => {
    const { data } = await supabase.from("bookings").select("*").eq("lead_id", leadId).maybeSingle();
    setBooking((data as Booking) ?? null);
    if (data?.scheduled_at) {
      const d = new Date(data.scheduled_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  };

  useEffect(() => { loadBooking(); /* eslint-disable-next-line */ }, [leadId]);

  const status = booking?.status ?? "accepted";
  const next = ADVANCE[status];
  const scheduled = booking?.scheduled_at ? new Date(booking.scheduled_at) : null;
  const bothConfirmed = !!booking?.time_confirmed_by_customer && !!booking?.time_confirmed_by_provider;
  const customerConfirmed = !!booking?.time_confirmed_by_customer;

  const advance = async () => {
    if (!booking || !next) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status: next.key };
    if (next.key === "completed") patch.provider_confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    await loadBooking();
    onChange();
  };

  const proposeTime = async () => {
    if (!booking || !when) return;
    setBusy(true);
    const iso = new Date(when).toISOString();
    const { error } = await supabase.from("bookings").update({
      scheduled_at: iso,
      time_confirmed_by_provider: true,
      time_confirmed_by_customer: false,
    }).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("New time sent to customer");
    setReschedOpen(false);
    await loadBooking();
  };

  const confirmTime = async () => {
    if (!booking) return;
    setBusy(true);
    const { error } = await supabase.from("bookings").update({ time_confirmed_by_provider: true }).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Time confirmed");
    await loadBooking();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-primary/5 px-4 py-3">
        <div>
          {l?.customer_id ? (
            <Link
              to="/c/$customerId"
              params={{ customerId: l.customer_id }}
              className="text-base font-semibold text-primary underline-offset-2 hover:underline"
            >
              {l?.customer_name ?? "Customer"}
            </Link>
          ) : (
            <div className="text-base font-semibold">{l?.customer_name ?? "Customer"}</div>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              {lang === "en" ? bookingStatusPair(status).en : bookingStatusPair(status).my}
            </span>
            {booking?.amount && <span className="font-semibold text-foreground">{Number(booking.amount).toLocaleString()} MMK</span>}
          </div>
        </div>
        {l?.customer_phone && (
          <a href={`tel:${l.customer_phone}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow">
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
        )}
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 py-3">
        {/* Scheduled time block */}
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Calendar className="h-3 w-3" /> Scheduled
              </div>
              <div className="mt-1 text-sm font-semibold">
                {scheduled ? scheduled.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not scheduled yet"}
              </div>
              {booking && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {bothConfirmed
                    ? "Both sides confirmed"
                    : customerConfirmed
                      ? "Customer confirmed — please confirm"
                      : "Waiting for customer to confirm"}
                </div>
              )}
            </div>
          </div>

          {booking && !bothConfirmed && customerConfirmed && booking.provider_id === userId && !reschedOpen && (
            <Button size="sm" className="mt-2 w-full" onClick={confirmTime} disabled={busy}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm this time
            </Button>
          )}

          {reschedOpen && (
            <Dialog open={reschedOpen} onOpenChange={setReschedOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{scheduled ? "Reschedule visit" : "Schedule visit"}</DialogTitle>
                  <DialogDescription>
                    Pick a date and time. The customer will be asked to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <label className="text-xs font-medium text-muted-foreground">Date &amp; time</label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => setReschedOpen(false)} disabled={busy}>Cancel</Button>
                  <Button onClick={proposeTime} disabled={busy || !when}>Send to customer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Address */}
        {(l?.address || l?.township_slug || l?.city_slug) && (() => {
          const city = CITIES.find((c) => c.slug === l.city_slug);
          const cityLabel = city ? (lang === "en" ? city.en : city.my) : l.city_slug;
          const ts = l.township_slug
            ? TOWNSHIPS[l.city_slug]?.find((t) => t.slug === l.township_slug)
            : null;
          const tsLabel = ts ? (lang === "en" ? ts.en : ts.my) : l.township_slug ?? null;
          const parts = [l.address, tsLabel, cityLabel].filter(Boolean);
          return (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{parts.join(", ")}</span>
            </div>
          );
        })()}

        {/* Primary action: advance status */}
        {next && status !== "completed" && status !== "cancelled" && (() => {
          const blocked = status === "accepted" && !bothConfirmed;
          return (
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={blocked ? "default" : "outline"}
                  onClick={() => setReschedOpen((v) => !v)}
                  disabled={busy}
                >
                  <Calendar className="mr-1.5 h-4 w-4" />
                  {scheduled ? "Reschedule" : "Schedule visit"}
                </Button>
                <Button
                  onClick={advance}
                  disabled={busy || blocked}
                  title={blocked ? "Both sides must confirm the visit time first" : undefined}
                >
                  <next.icon className="mr-1.5 h-4 w-4" /> {next.label}
                </Button>
              </div>
              {blocked && (
                <p className="text-center text-[11px] text-muted-foreground">
                  {scheduled
                    ? "Waiting for the customer to confirm the visit time."
                    : "Schedule a visit time and get the customer to confirm to enable this."}
                </p>
              )}
            </div>
          );
        })()}

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/request/$leadId"
            params={{ leadId }}
            search={{ tab: "messages" }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </Link>
          <Link
            to="/request/$leadId"
            params={{ leadId }}
            search={{ tab: "booking" }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            Full booking <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {status === "completed" && !booking?.customer_confirmed_at && (
          <p className="flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <Clock className="h-3 w-3" /> Waiting for customer to confirm completion.
          </p>
        )}
      </div>
    </div>
  );
}