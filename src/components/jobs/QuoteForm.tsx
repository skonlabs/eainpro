import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Existing = { amount?: number; eta_text?: string | null; notes?: string | null };

export function QuoteForm({ leadId, onSubmitted, existing }: { leadId: string; onSubmitted: () => void; existing?: Existing }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const [eta, setEta] = useState(existing?.eta_text ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr(L("Enter a valid amount", "ပမာဏ ဖြည့်ပါ")); return; }
    setBusy(true);
    const { error } = await supabase.from("quotes").upsert(
      { lead_id: leadId, provider_id: user.id, amount: amt, eta_text: eta || null, notes: notes || null, status: "pending" },
      { onConflict: "lead_id,provider_id" },
    );
    setBusy(false);
    if (error) setErr(error.message); else onSubmitted();
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <Input placeholder={L("Price (MMK)", "စျေး")} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      <Input placeholder={L("ETA (e.g. Tomorrow 10am)", "လုပ်နိုင်တဲ့ အချိန်")} value={eta} onChange={(e) => setEta(e.target.value)} />
      <Textarea rows={3} placeholder={L("Notes (optional)", "မှတ်ချက်")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button onClick={submit} disabled={busy} className="w-full">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {existing ? L("Update quote", "ပြင်") : L("Send quote", "ပေး")}
      </Button>
    </div>
  );
}
