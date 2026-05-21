import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Star } from "lucide-react";
import type { Quote, Booking, T } from "./types";

export function QuoteCard({
  quote,
  isCustomer,
  isMine,
  booking,
  L,
  onAccept,
}: {
  quote: Quote;
  isCustomer: boolean;
  isMine: boolean;
  booking: Booking | null;
  L: T;
  onAccept: () => void;
}) {
  const accepted = booking?.quote_id === quote.id || quote.status === "accepted";
  const withdrawn = quote.status === "withdrawn";
  const [busy, setBusy] = useState(false);
  const withdraw = async () => {
    if (!confirm("Withdraw this quote?")) return;
    setBusy(true);
    const { error } = await supabase.from("quotes").update({ status: "withdrawn" }).eq("id", quote.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(L("Quote withdrawn", "ပယ်ဖျက်ပြီး"));
  };
  return (
    <li className={`rounded-xl border p-3 ${accepted ? "border-emerald-500/50 bg-emerald-500/5" : withdrawn ? "border-border bg-muted/30 opacity-60" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {quote.provider_id ? (
              <Link
                to="/p/$providerId"
                params={{ providerId: quote.provider_id }}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {quote.provider?.business_name ?? L("Provider", "ပညာရှင်")}
              </Link>
            ) : (
              <span className="font-semibold">{quote.provider?.business_name ?? L("Provider", "ပညာရှင်")}</span>
            )}
            {quote.provider?.rating_avg != null && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-current" />
                {Number(quote.provider.rating_avg).toFixed(1)}
              </span>
            )}
            {isMine && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{L("Mine", "ကိုယ်")}</span>}
          </div>
          {quote.eta_text && <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{quote.eta_text}</div>}
          {quote.notes && <p className="mt-1 text-sm text-muted-foreground">{quote.notes}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold">{Number(quote.amount).toLocaleString()} MMK</div>
          {accepted && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3 w-3" />{L("Accepted", "လက်ခံပြီး")}</span>}
        </div>
      </div>
      {isCustomer && !booking && !accepted && (
        <Button size="sm" className="mt-2 w-full" onClick={onAccept} disabled={withdrawn}>{L("Accept this quote", "လက်ခံ")}</Button>
      )}
      {isMine && !booking && !accepted && !withdrawn && (
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={withdraw} disabled={busy}>
          {L("Withdraw quote", "ပယ်ဖျက်")}
        </Button>
      )}
      {withdrawn && (
        <p className="mt-2 text-xs text-muted-foreground">{L("Withdrawn", "ပယ်ဖျက်ပြီး")}</p>
      )}
    </li>
  );
}