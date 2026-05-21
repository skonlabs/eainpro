import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Quote, T } from "./types";

export function ProviderQuoteForm({
  leadId,
  providerId,
  existing,
  onSaved,
  L,
}: {
  leadId: string;
  providerId: string;
  existing: Quote | null;
  onSaved: () => void;
  L: T;
}) {
  const [amount, setAmount] = useState(existing?.amount.toString() ?? "");
  const [eta, setEta] = useState(existing?.eta_text ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error(L("Enter a valid amount", "ပမာဏ ဖြည့်ပါ"));
    setBusy(true);
    const { error } = await supabase.from("quotes").upsert(
      {
        lead_id: leadId,
        provider_id: providerId,
        amount: amt,
        eta_text: eta || null,
        notes: notes || null,
        status: "pending",
      },
      { onConflict: "lead_id,provider_id" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    onSaved();
  };

  return (
    <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="font-semibold">{existing ? L("Update your quote", "စျေး ပြင်") : L("Send a quote", "စျေး ပေး")}</div>
      <Input placeholder={L("Price (MMK)", "စျေး (MMK)")} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      <Input placeholder={L("When you can do it (e.g. Tomorrow 10am)", "လုပ်နိုင်တဲ့ အချိန်")} value={eta} onChange={(e) => setEta(e.target.value)} />
      <Textarea placeholder={L("Notes (optional)", "မှတ်ချက်")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      <Button onClick={submit} disabled={busy} className="w-full">{busy ? L("Saving…", "သိမ်းနေ…") : (existing ? L("Update quote", "ပြင်") : L("Send quote", "ပေး"))}</Button>
    </div>
  );
}