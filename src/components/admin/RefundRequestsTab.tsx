import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchProviderNames, fetchLeadsByIds } from "@/lib/admin-joins";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmt } from "@/lib/wallet";

export function RefundRequestsTab() {
  const [filter, setFilter] = useState<"open" | "approved" | "rejected" | "all">("all");
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin", "refund-requests"],
    queryFn: async () => {
      const [{ data: requestData, error: requestError }, { data: legacyData, error: legacyError }] = await Promise.all([
        supabase
          .from("unlock_refund_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("lead_refunds")
          .select("id, unlock_id, amount_credits, reason, approved_by, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (requestError) {
        toast.error(requestError.message);
        return [];
      }
      if (legacyError) {
        toast.error(legacyError.message);
      }

      const requestList = requestData ?? [];
      const requestUnlockIds = new Set(requestList.map((r: any) => r.unlock_id));
      const groupedLegacy = new Map<string, any>();

      for (const refund of legacyData ?? []) {
        if (!refund.unlock_id || requestUnlockIds.has(refund.unlock_id)) continue;
        const existing = groupedLegacy.get(refund.unlock_id);
        const reason = refund.reason?.trim() || "Legacy refund";

        if (!existing) {
          groupedLegacy.set(refund.unlock_id, {
            id: `legacy-${refund.unlock_id}`,
            unlock_id: refund.unlock_id,
            provider_id: null,
            lead_id: null,
            reason,
            status: "approved",
            resolution_note: "Legacy provider lead refund",
            resolved_at: refund.created_at,
            resolved_by: refund.approved_by,
            created_at: refund.created_at,
            legacy: true,
            amount_credits: refund.amount_credits ?? 0,
          });
          continue;
        }

        existing.amount_credits += refund.amount_credits ?? 0;
        existing.created_at = new Date(refund.created_at) < new Date(existing.created_at) ? refund.created_at : existing.created_at;
        existing.resolved_at = new Date(refund.created_at) > new Date(existing.resolved_at) ? refund.created_at : existing.resolved_at;
        if (!existing.reason.includes(reason)) {
          existing.reason = `${existing.reason} | ${reason}`;
        }
      }

      const combinedBase = [...requestList, ...groupedLegacy.values()];
      const unlockIds = [...new Set(combinedBase.map((r: any) => r.unlock_id).filter(Boolean))];
      const { data: unlocks, error: unlockError } = await supabase
        .from("provider_lead_unlocks")
        .select("id, provider_id, lead_id, unlock_price_credits, refunded_amount_credits, status")
        .in("id", unlockIds);

      if (unlockError) {
        toast.error(unlockError.message);
      }

      const unlockMap = new Map((unlocks ?? []).map((u: any) => [u.id, u]));
      const hydrated = combinedBase
        .map((r: any) => {
          const unlock = unlockMap.get(r.unlock_id) ?? null;
          return {
            ...r,
            provider_id: r.provider_id ?? unlock?.provider_id ?? null,
            lead_id: r.lead_id ?? unlock?.lead_id ?? null,
            unlock,
          };
        })
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const [provMap, leadMap] = await Promise.all([
        fetchProviderNames(hydrated.map((r: any) => r.provider_id)),
        fetchLeadsByIds(hydrated.map((r: any) => r.lead_id)),
      ]);

      return hydrated.map((r: any) => ({
        ...r,
        provider_name: r.provider_id ? (provMap.get(r.provider_id) ?? r.provider_id.slice(0, 8)) : "Unknown provider",
        lead: leadMap.get(r.lead_id) ?? null,
        unlock: r.unlock,
      }));
    },
  });
  useEffect(() => {
    setFilter("all");
  }, []);
  const visibleRows = useMemo(() => {
    const list = rows ?? [];
    return filter === "all" ? list : list.filter((row) => row.status === filter);
  }, [filter, rows]);
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
        visibleRows.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No requests.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {visibleRows.map((r) => (
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