import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
      <div className="text-xs">
        {bothConfirmed
          ? <span className="font-semibold text-emerald-600">{L("Visit time confirmed by both sides", "နှစ်ဖက်လုံး အတည်ပြုပြီး")}</span>
          : booking.scheduled_at
          ? <span className="text-muted-foreground">{L("Proposed time — awaiting confirmation from the other side", "တင်ပြထား — အခြားဖက် အတည်ပြုရန် စောင့်")}</span>
          : <span className="text-muted-foreground">{L("No visit time scheduled yet", "လည်ပတ်ရန် အချိန် မသတ်မှတ်ရသေး")}</span>}
      </div>
      {!open && !needsMyConfirm && (
        <Button
          size="sm"
          variant={booking.scheduled_at ? "outline" : "default"}
          onClick={() => { setValue(toLocal(booking.scheduled_at)); setOpen(true); }}
          className="w-full"
        >
          {booking.scheduled_at ? L("Reschedule visit", "ပြန်ချိန်း") : L("Schedule visit", "အချိန် သတ်မှတ်")}
        </Button>
      )}
      {needsMyConfirm && !open && (
        <div className="space-y-2">
          <Button size="sm" onClick={confirm} disabled={busy} className="w-full">
            {L("Confirm this time", "ဤအချိန် အတည်ပြု")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setValue(toLocal(booking.scheduled_at)); setOpen(true); }}
            className="w-full"
          >
            {L("Propose a different time", "အခြားအချိန် တင်ပြ")}
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {booking.scheduled_at ? L("Reschedule visit", "ပြန်ချိန်း") : L("Schedule visit", "အချိန် သတ်မှတ်")}
            </DialogTitle>
            <DialogDescription>
              {L("Pick a date and time. The other side will be asked to confirm.", "ရက်/အချိန် ရွေးပါ။ အခြားဖက်က အတည်ပြုပါမည်။")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-muted-foreground">{L("Date & time", "ရက်/အချိန်")}</label>
            <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>{L("Cancel", "ပယ်")}</Button>
            <Button onClick={propose} disabled={busy}>{busy ? L("Saving…", "သိမ်းနေ…") : L("Propose", "တင်ပြ")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}