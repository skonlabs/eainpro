import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import type { T } from "./types";

export function CustomerCancelCard({
  leadId,
  onCancelled,
  L,
}: {
  leadId: string;
  onCancelled: () => void;
  L: T;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("customer_leads")
      .update({ status: "cancelled" })
      .eq("id", leadId);
    setBusy(false);
    setConfirming(false);
    if (error) return toast.error(error.message);
    onCancelled();
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
      >
        <XCircle className="h-4 w-4" />
        {L("Cancel this request", "ဤတောင်းဆိုမှု ပယ်ဖျက်")}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="font-medium">{L("Cancel this request?", "ပယ်ဖျက်မလား?")}</p>
      <p className="text-xs text-muted-foreground">
        {L(
          "Providers will no longer be able to send quotes. You can post a new request anytime.",
          "ပညာရှင်များ စျေးပေးခြင်း မရတော့ပါ။ နောက်တစ်ကြိမ် တင်နိုင်ပါသည်။",
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirming(false)} disabled={busy}>
          {L("Keep it", "ထားရှိ")}
        </Button>
        <Button variant="destructive" size="sm" className="flex-1" onClick={cancel} disabled={busy}>
          {busy ? L("Cancelling…", "ပယ်ဖျက်နေ…") : L("Yes, cancel", "ပယ်ဖျက်ပါ")}
        </Button>
      </div>
    </div>
  );
}