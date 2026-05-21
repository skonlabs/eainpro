import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmt } from "@/lib/wallet";

export function TopupsTab() {
  const [filter, setFilter] = useState<"pending"|"approved"|"rejected">("pending");
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin", "topups", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_credit_topups")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) { toast.error(`Load top-ups failed: ${error.message}`); return []; }
      const list = data ?? [];
      const ids = [...new Set(list.map((r) => r.provider_id).filter(Boolean))];
      let nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: provs } = await supabase.from("providers").select("id, business_name").in("id", ids);
        nameMap = new Map((provs ?? []).map((p) => [p.id, p.business_name ?? ""]));
      }
      return list.map((r) => ({ ...r, providers: { business_name: nameMap.get(r.provider_id) ?? null } }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "topups"] });
  const approve = async (id: string) => {
    const { data, error } = await supabase.rpc("approve_topup", { p_topup_id: id, p_notes: null });
    if (error) toast.error(error.message);
    else if (!data?.ok) toast.error(data?.error ?? "Failed");
    else toast.success("Approved");
    refresh();
  };
  const reject = async (id: string) => {
    const reason = window.prompt("Rejection note (optional):") ?? "";
    const { data, error } = await supabase.rpc("reject_topup", { p_topup_id: id, p_notes: reason || null });
    if (error) toast.error(error.message);
    else if (!data?.ok) toast.error(data?.error ?? "Failed");
    else toast.success("Rejected");
    refresh();
  };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {(["pending","approved","rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter===s?"default":"outline"} onClick={() => setFilter(s)}>{s}</Button>
        ))}
      </div>
      {!rows ? <Skeleton className="h-48 w-full" /> :
        rows.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No {filter} top-ups.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="font-medium">{t.providers?.business_name ?? t.provider_id.slice(0,8)} · {t.package_name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(t.payment_amount_mmk)} MMK → {fmt(t.total_credits)} credits · {t.payment_method ?? "—"} · ref {t.payment_reference ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                {t.payment_proof_url && (
                  <button className="mt-1 text-xs text-primary underline" onClick={async () => {
                    const { data } = await supabase.storage.from("topup-proofs").createSignedUrl(t.payment_proof_url, 300);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                  }}>View proof</button>
                )}
              </div>
              {filter === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reject(t.id)}>Reject</Button>
                  <Button size="sm" onClick={() => approve(t.id)}>Approve</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}