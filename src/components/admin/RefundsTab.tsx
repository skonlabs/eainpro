import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmt } from "@/lib/wallet";

export function RefundsTab() {
  const [unlocks, setUnlocks] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const load = async () => {
    setUnlocks(null);
    const { data, error } = await supabase
      .from("provider_lead_unlocks")
      .select("*")
      .order("unlocked_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error(`Load unlocks failed: ${error.message}`);
      setUnlocks([]);
      return;
    }
    const list = data ?? [];
    const provIds = [...new Set(list.map((r) => r.provider_id).filter(Boolean))];
    const leadIds = [...new Set(list.map((r) => r.lead_id).filter(Boolean))];
    const [{ data: provs }, leadRes] = await Promise.all([
      provIds.length
        ? supabase.from("providers").select("id, business_name").in("id", provIds)
        : Promise.resolve({ data: [] as any[] }),
      leadIds.length
        ? supabase.rpc("get_customer_leads", { _lead_ids: leadIds })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const provMap = new Map((provs ?? []).map((p: any) => [p.id, p.business_name ?? null]));
    const leads = Array.isArray(leadRes?.data) ? leadRes.data : [];
    const leadMap = new Map(leads.map((l: any) => [l.id, l]));
    setUnlocks(
      list.map((u) => ({
        ...u,
        providers: { business_name: provMap.get(u.provider_id) ?? null },
        customer_leads: leadMap.get(u.lead_id) ?? null,
      })),
    );
  };
  useEffect(() => { load(); }, []);
  const filtered = (unlocks ?? []).filter((u) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return u.providers?.business_name?.toLowerCase().includes(s)
      || u.customer_leads?.customer_phone?.includes(s)
      || u.customer_leads?.customer_name?.toLowerCase().includes(s);
  });
  const submit = async () => {
    if (!picked || !amount || !reason.trim()) return toast.error("Amount and reason required");
    const { data, error } = await supabase.rpc("refund_unlock", { p_unlock_id: picked.id, p_amount: amount, p_reason: reason });
    if (error) toast.error(error.message);
    else if (!data?.ok) toast.error(data?.error ?? "Failed");
    else { toast.success("Refunded"); setPicked(null); setAmount(0); setReason(""); load(); }
  };
  return (
    <div className="mt-4 space-y-3">
      <Input placeholder="Search by provider name, customer name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {!unlocks ? <Skeleton className="h-48 w-full" /> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {filtered.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium">{u.providers?.business_name ?? u.provider_id.slice(0,8)} → {u.customer_leads?.customer_name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(u.unlock_price_credits)} credits · refunded {fmt(u.refunded_amount_credits)} · {u.status}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={u.refunded_amount_credits >= u.unlock_price_credits} onClick={() => { setPicked(u); setAmount(u.unlock_price_credits - u.refunded_amount_credits); }}>
                Refund
              </Button>
            </li>
          ))}
        </ul>
      }
      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue refund</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium">Amount (credits)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))} />
            </div>
            <div>
              <label className="text-xs font-medium">Reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Invalid phone, duplicate lead, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>Cancel</Button>
            <Button onClick={submit}>Refund {fmt(amount)} credits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}