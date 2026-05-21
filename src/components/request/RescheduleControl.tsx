import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Booking, T } from "./types";

export function RescheduleControl({
  booking,
  isCustomer,
  isProvider,
  onChanged,
  L,
}: {
  booking: Booking;
  isCustomer: boolean;
  isProvider: boolean;
  onChanged: () => void;
  L: T;
}) {
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toLocal(booking.scheduled_at));
  const [busy, setBusy] = useState(false);

  if (!isCustomer && !isProvider) return null;

  const role: "customer" | "provider" = isCustomer ? "customer" : "provider";
  const myConfirmed = role === "customer" ? booking.time_confirmed_by_customer : booking.time_confirmed_by_provider;
  const otherConfirmed = role === "customer" ? booking.time_confirmed_by_provider : booking.time_confirmed_by_customer;
  const bothConfirmed = !!booking.time_confirmed_by_customer && !!booking.time_confirmed_by_provider;

  const propose = async () => {
    if (!value) return toast.error(L("Pick a date & time", "ရက်/အချိန် ရွေးပါ"));
    setBusy(true);
    const iso = new Date(value).toISOString();
    const patch: Record<string, unknown> = {
      scheduled_at: iso,
      time_confirmed_by_customer: role === "customer",
      time_confirmed_by_provider: role === "provider",
    };
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    onChanged();
    toast.success(L("Time proposed — waiting for the other side", "အချိန် တင်ပြီး — အခြားဖက် စောင့်"));
  };

  const confirm = async () => {
    setBusy(true);
    const patch: Record<string, unknown> = role === "customer"
      ? { time_confirmed_by_customer: true }
      : { time_confirmed_by_provider: true };
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
    toast.success(L("Time confirmed", "အချိန် အတည်ပြုပြီး"));
  };

  const needsMyConfirm = !!booking.scheduled_at && !myConfirmed && otherConfirmed;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          {bothConfirmed
            ? <span className="font-semibold text-emerald-600">{L("Time confirmed by both sides", "နှစ်ဖက်လုံး အတည်ပြုပြီး")}</span>
            : booking.scheduled_at
            ? <span className="text-muted-foreground">{L("Proposed time — awaiting confirmation", "တင်ပြထား — အတည်ပြုရန် စောင့်")}</span>
            : <span className="text-muted-foreground">{L("No time set yet", "အချိန် မသတ်မှတ်ရသေး")}</span>}
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => { setValue(toLocal(booking.scheduled_at)); setOpen(true); }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {booking.scheduled_at ? L("Reschedule", "ပြန်ချိန်း") : L("Propose time", "အချိန် တင်ပြ")}
          </button>
        )}
      </div>
      {needsMyConfirm && !open && (
        <Button size="sm" onClick={confirm} disabled={busy} className="w-full">
          {L("Confirm this time", "ဤအချိန် အတည်ပြု")}
        </Button>
      )}
      {open && (
        <div className="space-y-2">
          <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>{L("Cancel", "ပယ်")}</Button>
            <Button size="sm" className="flex-1" onClick={propose} disabled={busy}>{busy ? L("Saving…", "သိမ်းနေ…") : L("Propose", "တင်ပြ")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}