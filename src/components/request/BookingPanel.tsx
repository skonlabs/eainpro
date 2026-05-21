import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, AlertTriangle, Phone, MessageCircle, MapPin, ShieldCheck, User } from "lucide-react";
import { RescheduleControl } from "./RescheduleControl";
import type { Lead, Booking, T } from "./types";

const NEXT_STATUS: Record<string, { key: string; en: string; my: string }> = {
  accepted: { key: "on_the_way", en: "On the way", my: "လမ်းပေါ်" },
  on_the_way: { key: "started", en: "Start work", my: "စတင်" },
  started: { key: "completed", en: "Complete", my: "ပြီး" },
  in_progress: { key: "completed", en: "Complete", my: "ပြီး" },
};

export function BookingPanel({
  lead,
  booking,
  isCustomer,
  isProvider,
  userId,
  L,
  onChange,
}: {
  lead: Lead;
  booking: Booking | null;
  isCustomer: boolean;
  isProvider: boolean;
  userId: string;
  L: T;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hasMyReview, setHasMyReview] = useState<boolean | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<"no_show" | "bad_quality" | "rude" | "fraud" | "other">("bad_quality");
  const [reportText, setReportText] = useState("");
  const [reported, setReported] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{
    id: string;
    business_name: string | null;
    is_verified: boolean;
    rating_avg: number | null;
    rating_count: number | null;
    logo_url: string | null;
  } | null>(null);

  useEffect(() => {
    if (!booking?.provider_id) { setProviderInfo(null); return; }
    let active = true;
    supabase
      .from("providers")
      .select("id, business_name, is_verified, rating_avg, rating_count, logo_url")
      .eq("id", booking.provider_id)
      .maybeSingle()
      .then(({ data }) => { if (active) setProviderInfo(data as any); });
    return () => { active = false; };
  }, [booking?.provider_id]);

  const myRole: "customer" | "provider" | null = isCustomer ? "customer" : (isProvider && booking?.provider_id === userId ? "provider" : null);

  useEffect(() => {
    if (!booking || booking.status !== "completed" || !myRole) return;
    supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("rated_by", myRole)
      .maybeSingle()
      .then(({ data }) => setHasMyReview(!!data));
    supabase
      .from("reports")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("reporter_id", userId)
      .maybeSingle()
      .then(({ data }) => setReported(!!data));
  }, [booking?.id, booking?.status, myRole, userId]);

  if (!booking) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {L("No booking yet. Accept a quote to create one.", "စျေး လက်ခံပါ။")}
      </p>
    );
  }

  const isMyBooking = booking.provider_id === userId || booking.customer_id === userId;
  const next = NEXT_STATUS[booking.status];
  const canAdvance = isProvider && booking.provider_id === userId && next;
  const reviewsUnlocked = booking.status === "completed" && !!booking.customer_confirmed_at;

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status: next.key };
    if (next.key === "completed") patch.provider_confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    if (next.key === "completed") {
      await supabase.from("customer_leads").update({ status: "completed" }).eq("id", lead.id);
    }
    onChange();
    toast.success(L("Updated", "ပြောင်းပြီး"));
  };

  const cancel = async () => {
    setBusy(true);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    setBusy(false);
    onChange();
  };

  const confirmCompleted = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("bookings")
      .update({ customer_confirmed_at: new Date().toISOString() })
      .eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange();
    toast.success(L("Confirmed — thanks!", "အတည်ပြုပြီး — ကျေးဇူးတင်ပါသည်!"));
  };

  const submitReview = async () => {
    if (!myRole) return;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id,
      rating,
      comment: comment || null,
      rated_by: myRole,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setHasMyReview(true);
    toast.success(L("Thanks for the review!", "ကျေးဇူးတင်ပါသည်!"));
  };

  const submitReport = async () => {
    if (!reportText.trim()) { toast.error(L("Tell us what happened", "ဖြစ်ပျက်ပုံ ပြောပါ")); return; }
    setBusy(true);
    const targetId = myRole === "customer" ? booking.provider_id : booking.customer_id;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      target_user_id: targetId,
      booking_id: booking.id,
      lead_id: lead.id,
      kind: reportKind,
      reason: reportText.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setReported(true);
    setReportOpen(false);
    toast.success(L("Report submitted", "တိုင်ကြားပြီး"));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      {/* Counterparty card */}
      {isCustomer && providerInfo && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-base font-bold text-primary">
            {providerInfo.logo_url
              ? <img src={providerInfo.logo_url} alt="" className="h-full w-full object-cover" />
              : (providerInfo.business_name ?? "?").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{providerInfo.business_name ?? L("Provider", "ပညာရှင်")}</span>
              {providerInfo.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              {providerInfo.rating_avg != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {providerInfo.rating_avg.toFixed(1)}{providerInfo.rating_count ? ` (${providerInfo.rating_count})` : ""}
                </span>
              )}
              <Link to="/p/$providerId" params={{ providerId: providerInfo.id }} className="font-semibold text-primary hover:underline">
                {L("View profile", "ပရိုဖိုင်")}
              </Link>
            </div>
          </div>
          <Link
            to="/request/$leadId"
            params={{ leadId: lead.id }}
            search={{ tab: "messages" }}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <MessageCircle className="h-3 w-3" /> {L("Chat", "စကား")}
          </Link>
        </div>
      )}
      {isProvider && booking.provider_id === userId && (
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{lead.customer_name || L("Customer", "ဖောက်သည်")}</div>
              {lead.customer_phone && (
                <a href={`tel:${lead.customer_phone}`} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <Phone className="h-3 w-3" /> {lead.customer_phone}
                </a>
              )}
            </div>
            <Link
              to="/request/$leadId"
              params={{ leadId: lead.id }}
              search={{ tab: "messages" }}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <MessageCircle className="h-3 w-3" /> {L("Chat", "စကား")}
            </Link>
          </div>
          {lead.address && (
            <div className="mt-2 flex items-start gap-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{lead.address}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">{L("Status", "အခြေအနေ")}</div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{booking.status.replace(/_/g, " ")}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl bg-muted/30 p-3.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">{L("Amount", "ပမာဏ")}</div>
          <div className="mt-1.5 text-sm font-semibold text-foreground">{booking.amount ? `${Number(booking.amount).toLocaleString()} MMK` : "—"}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">{L("Scheduled", "သတ်မှတ်")}</div>
          <div className="mt-1.5 text-sm font-medium text-foreground">{booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "—"}</div>
        </div>
      </div>

      {booking.status !== "completed" && booking.status !== "cancelled" && (
        <RescheduleControl booking={booking} isCustomer={isCustomer} isProvider={isProvider && booking.provider_id === userId} L={L} onChanged={onChange} />
      )}

      {canAdvance && (
        <Button onClick={advance} disabled={busy} className="w-full">{L(next.en, next.my)}</Button>
      )}
      {isMyBooking && booking.status !== "completed" && booking.status !== "cancelled" && (
        <Button onClick={cancel} disabled={busy} variant="outline" className="w-full">{L("Cancel booking", "ပယ်ဖျက်")}</Button>
      )}

      {booking.status === "completed" && isCustomer && !booking.customer_confirmed_at && (
        <div className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <div className="font-semibold">{L("Did the provider complete the job?", "ဝန်ဆောင်မှု ပြီးစီးပါသလား?")}</div>
          <p className="text-xs text-muted-foreground">
            {L("Confirm completion to leave a review. If something went wrong, report instead.", "ပြီးစီးကြောင်း အတည်ပြုပါ။ ပြဿနာရှိပါက တိုင်ကြားနိုင်ပါသည်။")}
          </p>
          <Button onClick={confirmCompleted} disabled={busy} className="w-full">
            {L("Confirm completed", "ပြီးစီးကြောင်း အတည်ပြု")}
          </Button>
        </div>
      )}
      {booking.status === "completed" && myRole === "provider" && !booking.customer_confirmed_at && (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          {L("Waiting for the customer to confirm completion before reviews open.", "ဖောက်သည် အတည်ပြုပြီးမှ သုံးသပ်ချက် ဖွင့်ပါမည်။")}
        </p>
      )}
      {reviewsUnlocked && myRole && hasMyReview === false && (
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <div className="text-sm font-semibold">
            {myRole === "customer" ? L("Rate the provider", "ပညာရှင်ကို အဆင့်ပေး") : L("Rate the customer", "ဖောက်သည်ကို အဆင့်ပေး")}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-amber-500" : "text-muted-foreground"}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-current" : ""}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder={L("Optional comment", "မှတ်ချက်")} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          <Button onClick={submitReview} disabled={busy} className="w-full">{L("Submit", "ပေးပို့")}</Button>
        </div>
      )}
      {reviewsUnlocked && hasMyReview && (
        <p className="text-xs text-muted-foreground">{L("Your review was submitted.", "သင်၏ သုံးသပ်ချက် ပေးပို့ပြီး။")}</p>
      )}

      {booking.status === "completed" && myRole && (
        <div className="border-t border-border/60 pt-3">
          {reported ? (
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> {L("You've reported this booking. Admin will review.", "တိုင်ကြားပြီး။ Admin စစ်ဆေးပါမည်။")}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
            >
              <AlertTriangle className="h-3 w-3" />
              {myRole === "customer" ? L("Report the provider", "ပညာရှင်ကို တိုင်ကြား") : L("Report the customer", "ဖောက်သည်ကို တိုင်ကြား")}
            </button>
          )}
        </div>
      )}
      {reportOpen && (
        <div className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <div className="font-semibold">{L("What happened?", "ဘာဖြစ်ခဲ့သလဲ?")}</div>
          <select
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
            value={reportKind}
            onChange={(e) => setReportKind(e.target.value as typeof reportKind)}
          >
            {myRole === "customer" ? (
              <>
                <option value="bad_quality">Poor quality of work</option>
                <option value="no_show">Provider did not show up</option>
                <option value="rude">Rude or unprofessional</option>
                <option value="fraud">Fraud / overcharged</option>
                <option value="other">Other</option>
              </>
            ) : (
              <>
                <option value="no_show">Customer no-show</option>
                <option value="rude">Rude or abusive</option>
                <option value="fraud">Fraud / refused to pay</option>
                <option value="other">Other</option>
              </>
            )}
          </select>
          <Textarea rows={3} value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder={L("Details", "အသေးစိတ်")} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setReportOpen(false)} disabled={busy}>{L("Cancel", "ပယ်")}</Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={submitReport} disabled={busy || !reportText.trim()}>
              {busy ? L("Sending…", "ပို့နေ…") : L("Submit", "တိုင်ကြား")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}