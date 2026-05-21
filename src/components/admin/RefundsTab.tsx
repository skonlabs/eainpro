import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchProviderNames, fetchLeadsByIds, fetchUnlocksByIds } from "@/lib/admin-joins";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmt } from "@/lib/wallet";

export function RefundsTab() {
  const [q, setQ] = useState("");
  const { data: rows } = useQuery({
    queryKey: ["admin", "refunds-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unlock_refund_requests")
        .select("*")
        .eq("status", "approved")
        .order("resolved_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) { toast.error(`Load refunds failed: ${error.message}`); return []; }
      const list = data ?? [];
      const [provMap, leadMap, unlockMap] = await Promise.all([
        fetchProviderNames(list.map((r: any) => r.provider_id)),
        fetchLeadsByIds(list.map((r: any) => r.lead_id)),
        fetchUnlocksByIds(list.map((r: any) => r.unlock_id)),
      ]);
      return list.map((r: any) => ({
        ...r,
        provider_name: provMap.get(r.provider_id) ?? r.provider_id.slice(0, 8),
        lead: leadMap.get(r.lead_id) ?? null,
        unlock: unlockMap.get(r.unlock_id) ?? null,
      }));
    },
  });
  const filtered = (rows ?? []).filter((r: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.provider_name?.toLowerCase().includes(s)
      || r.lead?.customer_phone?.includes(s)
      || r.lead?.customer_name?.toLowerCase().includes(s)
      || r.reason?.toLowerCase().includes(s);
  });
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted-foreground">Approved refund requests. To approve or reject pending requests, see <strong>Refund requests</strong>.</p>
      <Input placeholder="Search by provider, customer, phone or reason" value={q} onChange={(e) => setQ(e.target.value)} />
      {!rows ? <Skeleton className="h-48 w-full" /> :
        filtered.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No approved refunds.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {filtered.map((r: any) => (
            <li key={r.id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{r.provider_name} → {r.lead?.customer_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    Refunded {fmt(r.unlock?.refunded_amount_credits ?? 0)} of {fmt(r.unlock?.unlock_price_credits ?? 0)} credits
                    {r.resolved_at && <> · {new Date(r.resolved_at).toLocaleString()}</>}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">approved</span>
              </div>
              {r.reason && <p className="rounded-md bg-muted p-2 text-xs">{r.reason}</p>}
              {r.resolution_note && <p className="text-xs text-muted-foreground"><strong>Admin note:</strong> {r.resolution_note}</p>}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}