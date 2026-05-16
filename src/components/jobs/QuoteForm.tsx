import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function QuoteForm({
  jobId,
  onSubmitted,
  existing,
}: {
  jobId: string;
  onSubmitted: () => void;
  existing?: { amount: number; eta_text: string | null; notes: string | null };
}) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const [eta, setEta] = useState(existing?.eta_text ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setErr(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setErr(lang === "en" ? "Enter a valid amount" : "ပမာဏ မှန်ကန်စွာ ဖြည့်ပါ");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("quotes").upsert(
      {
        job_id: jobId,
        provider_id: user.id,
        amount: amt,
        eta_text: eta || null,
        notes: notes || null,
        status: "pending",
      },
      { onConflict: "job_id,provider_id" },
    );
    if (!error) {
      await supabase
        .from("job_requests")
        .update({ status: "quoted" })
        .eq("id", jobId)
        .eq("status", "open");
    }
    setBusy(false);
    if (error) setErr(error.message);
    else onSubmitted();
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-semibold">
        {existing
          ? lang === "en"
            ? "Update your quote"
            : "သင်၏ စျေးနှုန်း ပြင်ရန်"
          : lang === "en"
            ? "Send a quote"
            : "စျေးနှုန်း ပေးပို့ရန်"}
      </div>
      <Input
        type="number"
        inputMode="numeric"
        placeholder={lang === "en" ? "Amount (MMK)" : "ပမာဏ (ကျပ်)"}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        placeholder={lang === "en" ? "ETA (e.g. tomorrow 10am)" : "ရောက်မည့်အချိန်"}
        value={eta}
        onChange={(e) => setEta(e.target.value)}
      />
      <Textarea
        rows={3}
        placeholder={lang === "en" ? "Notes (optional)" : "မှတ်ချက် (ရွေး)"}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button onClick={submit} disabled={busy} className="w-full">
        {busy
          ? "…"
          : existing
            ? lang === "en"
              ? "Update quote"
              : "စျေး ပြင်ရန်"
            : lang === "en"
              ? "Send quote"
              : "စျေး ပေးပို့ရန်"}
      </Button>
    </div>
  );
}
