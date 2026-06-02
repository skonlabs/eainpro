import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AdjustWalletTab() {
  const [providerId, setProviderId] = useState("");
  const [delta, setDelta] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("providers").select("id,business_name").order("business_name").limit(200)
      .then(({ data }) => setProviders(data ?? []));
  }, []);
  const submit = async () => {
    const n = Number(delta);
    if (!providerId) return toast.error("Pick a provider");
    if (!n || isNaN(n)) return toast.error("Enter a non-zero amount");
    if (!note.trim()) return toast.error("Note is required for audit log");
    setBusy(true);
    const { data, error } = await supabase.rpc("adjust_wallet", { p_provider_id: providerId, p_delta: n, p_note: note.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data?.ok) return toast.error(data?.error ?? "Failed");
    toast.success(`Adjusted. New balance: ${data.balance}`);
    setDelta(""); setNote("");
  };
  return (
    <div className="mt-4 max-w-xl space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        Manually credit (positive) or debit (negative) a provider's wallet. Recorded as an <strong>adjustment</strong> transaction with your note in the audit log.
      </p>
      <div>
        <Label className="text-xs">Provider</Label>
        <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={providerId} onChange={(e) => setProviderId(e.target.value)}>
          <option value="">— Select provider —</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.business_name ?? p.id.slice(0,8)}</option>)}
        </select>
      </div>
      <div>
        <Label className="text-xs">Amount (credits, negative to debit)</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={delta}
          onChange={(e) => setDelta(e.target.value.replace(/[^0-9-]/g, ""))}
          placeholder="e.g. 5000 or -2000"
        />
      </div>
      <div>
        <Label className="text-xs">Reason / note *</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Goodwill credit / correction for ticket #123" />
      </div>
      <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Applying…" : "Apply adjustment"}</Button>
    </div>
  );
}