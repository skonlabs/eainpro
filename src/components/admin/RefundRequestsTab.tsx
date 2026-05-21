import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchProviderNames, fetchLeadsByIds, fetchUnlocksByIds } from "@/lib/admin-joins";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmt } from "@/lib/wallet";

export function RefundRequestsTab() {
  const [filter, setFilter] = useState<"open" | "approved" | "rejected" | "all">("all");
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin", "refund-requests", filter],
    queryFn: async () => {
      let q = supabase.from("unlock_refund_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) { toast.error(error.message); return []; }
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
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "refund-requests"] });

  const approve = async (row: any) => {
    const { data, error } = await supabase.rpc("approve_unlock_refund", { p_request_id: row.id });
    if (error) return toast.error(error.message);
    if (!data?.ok) return toast.error(data?.error ?? "Failed");
    toast.success(data.already_refunded ? "Marked approved" : `Refunded ${data.amount} credits`);
    refresh();
  };
  const reject = async (row: any) => {
    const note = prompt("Reason for rejection?") ?? null;
    const { error } = await supabase.from("unlock_refund_requests").update({ status: "rejected", resolution_note: note, resolved_at: new Date().toISOString() }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Rejected"); refresh(); }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {(["open", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{f}</button>
        ))}
      </div>
      {!rows ? <Skeleton className="h-48 w-full" /> :
        rows.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No requests.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{r.provider_name} · {r.lead?.customer_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.unlock?.unlock_price_credits ?? "?"} credits paid · {fmt(r.unlock?.refunded_amount_credits ?? 0)} refunded</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                  r.status === "rejected" ? "bg-destructive/10 text-destructive" :
                  "bg-amber-100 text-amber-700"
                }`}>{r.status}</span>
              </div>
              <p className="rounded-md bg-muted p-2 text-xs">{r.reason}</p>
              {r.resolution_note && <p className="text-xs text-muted-foreground"><strong>Admin note:</strong> {r.resolution_note}</p>}
              {r.status === "open" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r)}>Approve & refund</Button>
                  <Button size="sm" variant="outline" onClick={() => reject(r)}>Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}