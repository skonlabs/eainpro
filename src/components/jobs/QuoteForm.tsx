import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export function QuoteForm({
  jobId,
  onSubmitted,
  existing,
}: {
  jobId: string;
  onSubmitted: () => void;
  existing?: {
    amount: number;
    eta_text: string | null;
    notes: string | null;
    price_type?: string | null;
    included?: string | null;
    warranty?: string | null;
    cancellation_policy?: string | null;
  };
}) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const [priceType, setPriceType] = useState<"fixed" | "starting_from" | "per_hour">(
    (existing?.price_type as "fixed" | "starting_from" | "per_hour") ?? "fixed",
  );
  const [eta, setEta] = useState(existing?.eta_text ?? "");
  const [included, setIncluded] = useState(existing?.included ?? "");
  const [warranty, setWarranty] = useState(existing?.warranty ?? "");
  const [cancellation, setCancellation] = useState(existing?.cancellation_policy ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setErr(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setErr(L("Enter a valid amount", "ပမာဏ မှန်ကန်စွာ ဖြည့်ပါ"));
      return;
    }
    if (amt > 100_000_000) {
      setErr(L("Amount is too large", "ပမာဏ ကြီးလွန်း"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("quotes").upsert(
      {
        job_id: jobId,
        provider_id: user.id,
        amount: amt,
        price_type: priceType,
        eta_text: eta || null,
        included: included || null,
        warranty: warranty || null,
        cancellation_policy: cancellation || null,
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

  const PRICE_TYPES = [
    { value: "fixed", en: "Fixed price", my: "ဈေးတည်" },
    { value: "starting_from", en: "Starting from", my: "စဈေး" },
    { value: "per_hour", en: "Per hour", my: "နာရီ" },
  ] as const;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-semibold">
        {existing
          ? L("Update your quote", "သင်၏ စျေးနှုန်း ပြင်ရန်")
          : L("Send a quote", "စျေးနှုန်း ပေးပို့ရန်")}
      </div>

      {/* Amount + Price type */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder={L("Amount (MMK)", "ပမာဏ (ကျပ်)")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          value={priceType}
          onChange={(e) => setPriceType(e.target.value as typeof priceType)}
          className="rounded-md border border-input bg-background px-2 py-2 text-xs"
        >
          {PRICE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {L(t.en, t.my)}
            </option>
          ))}
        </select>
      </div>

      {/* ETA */}
      <Input
        placeholder={L("Earliest availability (e.g. Tomorrow 9am)", "မြောင်းမည့်အချိန်")}
        value={eta}
        onChange={(e) => setEta(e.target.value)}
      />

      {/* What's included */}
      <Input
        placeholder={L("What's included (optional)", "ပါဝင်သည်များ (ရွေး)")}
        value={included}
        onChange={(e) => setIncluded(e.target.value)}
      />

      {/* Warranty */}
      <Input
        placeholder={L("Warranty / guarantee (optional)", "အာမခံ (ရွေး)")}
        value={warranty}
        onChange={(e) => setWarranty(e.target.value)}
      />

      {/* Notes */}
      <Textarea
        rows={2}
        placeholder={L("Additional notes (optional)", "မှတ်ချက် (ရွေး)")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {err && <p className="text-xs text-destructive">{err}</p>}

      <Button onClick={submit} disabled={busy} className="w-full rounded-xl font-semibold">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {L("Sending…", "ပေးပို့နေ…")}
          </>
        ) : existing
          ? L("Update quote", "စျေး ပြင်ရန်")
          : L("Send quote", "စျေး ပေးပို့ရန်")}
      </Button>
    </div>
  );
}
